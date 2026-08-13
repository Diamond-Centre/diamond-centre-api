import { PoolClient } from "pg";
import { withTransaction } from "../db/transaction";
import { eventRepository } from "../repositories/event.repository";
import {
  eventChangeRepository,
  ScheduleChangeRecord,
} from "../repositories/event_change.repository";
import { ticketRepository } from "../repositories/ticket.repository";
import { notificationRepository } from "../repositories/notification.repository";
import { paymentRepository } from "../repositories/payment.repository";
import { userRepository } from "../repositories/user.repository";
import { promotionRepository } from "../repositories/promotion.repository";
import { toEventResponse } from "../models/mappers";
import { formatDate, formatTime } from "../utils/date";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../errors/AppError";
import { EventRecord } from "../types";

function scheduleLabel(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  location: string
): string {
  const datePart =
    startDate === endDate
      ? startDate
      : `${startDate} → ${endDate}`;
  return `${datePart} · ${startTime}–${endTime} · ${location}`;
}

function scheduleChanged(
  existing: EventRecord,
  next: {
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    location: string;
  }
): boolean {
  return (
    formatDate(existing.start_date) !== next.start_date ||
    formatDate(existing.end_date) !== next.end_date ||
    formatTime(existing.start_time) !== next.start_time ||
    formatTime(existing.end_time) !== next.end_time ||
    existing.location !== next.location
  );
}

export class EventChangeService {
  async notifyScheduleChange(
    client: PoolClient,
    existing: EventRecord,
    updated: EventRecord,
    adminUserId: number | null
  ): Promise<{ changeId: number; notifiedCount: number } | null> {
    const next = {
      start_date: formatDate(updated.start_date),
      end_date: formatDate(updated.end_date),
      start_time: formatTime(updated.start_time),
      end_time: formatTime(updated.end_time),
      location: updated.location,
    };

    if (!scheduleChanged(existing, next)) return null;

    const change = await eventChangeRepository.createChange(client, {
      event_id: existing.id,
      old_start_date: formatDate(existing.start_date),
      old_end_date: formatDate(existing.end_date),
      old_start_time: formatTime(existing.start_time),
      old_end_time: formatTime(existing.end_time),
      old_location: existing.location,
      new_start_date: next.start_date,
      new_end_date: next.end_date,
      new_start_time: next.start_time,
      new_end_time: next.end_time,
      new_location: next.location,
      created_by: adminUserId,
    });

    const tickets = await ticketRepository.findConfirmedByEventId(
      client,
      existing.id
    );

    const oldLabel = scheduleLabel(
      change.old_start_date.toString().slice(0, 10),
      change.old_end_date.toString().slice(0, 10),
      formatTime(change.old_start_time),
      formatTime(change.old_end_time),
      change.old_location
    );
    const newLabel = scheduleLabel(
      next.start_date,
      next.end_date,
      next.start_time,
      next.end_time,
      next.location
    );

    let notifiedCount = 0;

    for (const ticket of tickets) {
      await eventChangeRepository.createResponse(client, change.id, ticket.id);

      const user =
        (await userRepository.findByEmail(
          ticket.customer_email.trim().toLowerCase()
        )) ??
        (await userRepository.findByEmail(ticket.customer_email.trim()));

      if (!user) continue;

      const created = await notificationRepository.create(
        {
          user_id: user.id,
          type: "modification",
          title: "Modification d'événement",
          message: `« ${existing.title} » a changé.\nAvant : ${oldLabel}\nAprès : ${newLabel}\nAcceptez pour mettre à jour votre agenda.`,
          ticket_id: ticket.id,
          event_id: existing.id,
          change_id: change.id,
          dedupe_key: `modification:${change.id}:${ticket.id}`,
        },
        client
      );
      if (created) notifiedCount += 1;
    }

    return { changeId: change.id, notifiedCount };
  }

  private async assertTicketOwner(
    changeId: number,
    ticketId: number,
    email: string,
    client?: PoolClient
  ) {
    const change = await eventChangeRepository.findChangeById(changeId);
    if (!change) throw new NotFoundError("Schedule change not found");

    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw new NotFoundError("Ticket not found");

    if (
      ticket.customer_email.trim().toLowerCase() !== email.trim().toLowerCase()
    ) {
      throw new ForbiddenError("This ticket does not belong to you");
    }

    const response = await eventChangeRepository.findResponse(
      changeId,
      ticketId,
      client
    );
    if (!response) throw new NotFoundError("Change response not found");

    return { change, ticket, response };
  }

  async accept(changeId: number, ticketId: number, email: string) {
    return withTransaction(async (client) => {
      const { change, response } = await this.assertTicketOwner(
        changeId,
        ticketId,
        email,
        client
      );

      if (response.status !== "pending") {
        throw new BadRequestError(`Already ${response.status}`);
      }

      await eventChangeRepository.updateResponseStatus(
        client,
        changeId,
        ticketId,
        "accepted"
      );

      return {
        status: "accepted",
        change: eventChangeRepository.toChangeResponse(change),
      };
    });
  }

  async getAlternatives(
    changeId: number,
    ticketId: number,
    email: string,
    filter: "all" | "category" | "date" | "price" = "all"
  ) {
    const { change, ticket } = await this.assertTicketOwner(
      changeId,
      ticketId,
      email
    );

    const originalEvent = await eventRepository.findById(change.event_id);
    if (!originalEvent) throw new NotFoundError("Event not found");

    const allPublished = await eventRepository.findPublished();
    const price = Number(originalEvent.price);
    const minPrice = price * 0.7;
    const maxPrice = price * 1.3;
    const newStart = formatDate(change.new_start_date);
    const newEnd = formatDate(change.new_end_date);

    type Scored = { event: EventRecord; score: number; reason: string };

    const scored: Scored[] = [];
    for (const event of allPublished) {
      if (event.id === change.event_id) continue;

      const sameCategory = event.category === originalEvent.category;
      const eventStart = formatDate(event.start_date);
      const eventEnd = formatDate(event.end_date);
      const overlaps =
        eventStart <= newEnd && eventEnd >= newStart;
      const eventPrice = Number(event.price);
      const similarPrice =
        eventPrice >= minPrice && eventPrice <= maxPrice;

      let score = 0;
      const reasons: string[] = [];
      if (sameCategory) {
        score += 3;
        reasons.push("category");
      }
      if (overlaps) {
        score += 2;
        reasons.push("date");
      }
      if (similarPrice) {
        score += 1;
        reasons.push("price");
      }

      if (filter === "category" && !sameCategory) continue;
      if (filter === "date" && !overlaps) continue;
      if (filter === "price" && !similarPrice) continue;

      scored.push({
        event,
        score,
        reason: reasons.join(",") || "all",
      });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return formatDate(a.event.start_date).localeCompare(
        formatDate(b.event.start_date)
      );
    });

    const top = scored.slice(0, 12);
    const promotions = await promotionRepository.findByEventIds(
      top.map((s) => s.event.id)
    );
    const promoMap = new Map(promotions.map((p) => [p.event_id, p]));

    return {
      change: eventChangeRepository.toChangeResponse(change),
      ticket_id: ticket.id,
      filter,
      alternatives: top.map(({ event, reason }) => ({
        ...toEventResponse(event, promoMap.get(event.id) ?? null),
        match_reason: reason,
      })),
    };
  }

  async swap(
    changeId: number,
    ticketId: number,
    alternativeEventId: number,
    email: string
  ) {
    return withTransaction(async (client) => {
      const { change, ticket, response } = await this.assertTicketOwner(
        changeId,
        ticketId,
        email,
        client
      );

      if (response.status !== "pending") {
        throw new BadRequestError(`Already ${response.status}`);
      }

      const alt = await eventRepository.findPublishedForUpdate(
        client,
        alternativeEventId
      );
      if (!alt) {
        throw new NotFoundError("Alternative event not found or not published");
      }
      if (alt.available_tickets < ticket.quantity) {
        throw new BadRequestError("Not enough tickets on alternative event");
      }

      await eventRepository.incrementAvailableTickets(
        client,
        change.event_id,
        ticket.quantity
      );
      await eventRepository.decrementAvailableTickets(
        client,
        alternativeEventId,
        ticket.quantity
      );
      await ticketRepository.updateEventId(client, ticketId, alternativeEventId);
      await eventChangeRepository.updateResponseStatus(
        client,
        changeId,
        ticketId,
        "swapped",
        alternativeEventId
      );

      return {
        status: "swapped",
        ticket_id: ticketId,
        new_event_id: alternativeEventId,
        new_event_title: alt.title,
      };
    });
  }

  async refund(changeId: number, ticketId: number, email: string) {
    return withTransaction(async (client) => {
      const { change, ticket, response } = await this.assertTicketOwner(
        changeId,
        ticketId,
        email,
        client
      );

      if (response.status === "refunded") {
        throw new BadRequestError("Already refunded");
      }

      await eventRepository.incrementAvailableTickets(
        client,
        change.event_id,
        ticket.quantity
      );
      await ticketRepository.markRefunded(client, ticketId);
      await paymentRepository.refundByTicketId(client, ticketId);
      await eventChangeRepository.updateResponseStatus(
        client,
        changeId,
        ticketId,
        "refunded"
      );

      const user =
        (await userRepository.findByEmail(email.trim().toLowerCase())) ??
        (await userRepository.findByEmail(email.trim()));

      if (user) {
        await notificationRepository.create(
          {
            user_id: user.id,
            type: "remboursement",
            title: "Remboursement initié",
            message: `Votre billet pour « ${change.event_title ?? "l'événement" } » a été remboursé (${ticket.total_price} ${ticket.currency}).`,
            ticket_id: ticketId,
            event_id: change.event_id,
            change_id: changeId,
            dedupe_key: `remboursement:${changeId}:${ticketId}`,
          },
          client
        );
      }

      return {
        status: "refunded",
        ticket_id: ticketId,
        amount: Number(ticket.total_price),
        currency: ticket.currency,
      };
    });
  }

  async getChange(changeId: number, email: string) {
    const change = await eventChangeRepository.findChangeById(changeId);
    if (!change) throw new NotFoundError("Schedule change not found");
    return eventChangeRepository.toChangeResponse(change);
  }
}

export const eventChangeService = new EventChangeService();

export { scheduleChanged };
