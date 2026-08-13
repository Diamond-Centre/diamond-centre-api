import { randomUUID } from "crypto";
import { withTransaction } from "../db/transaction";
import { eventRepository } from "../repositories/event.repository";
import { promotionRepository } from "../repositories/promotion.repository";
import { ticketRepository } from "../repositories/ticket.repository";
import { qrCodeRepository } from "../repositories/qrCode.repository";
import { certificateRepository } from "../repositories/certificate.repository";
import {
  calculatePromoPrice,
  toTicketDetailResponse,
  toTicketReserveResponse,
} from "../models/mappers";
import { formatDate } from "../utils/date";
import { generateEntryCode, generateQrCode } from "../utils/qr";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors/AppError";
import { ReserveTicketInput, TicketRecord } from "../types";
import { JwtPayload } from "../utils/jwt";
import { isAdminRole } from "../models/mappers";

export class TicketService {
  async list() {
    await ticketRepository.expireOverdue();
    const tickets = await ticketRepository.listAll();
    const qrRows = await qrCodeRepository.findByTicketIds(tickets.map((t) => t.id));
    const qrByTicket = new Map<
      number,
      Array<{ code: string; entry_code: string; validated: boolean }>
    >();

    for (const row of qrRows) {
      const list = qrByTicket.get(row.ticket_id) ?? [];
      list.push({
        code: row.code,
        entry_code: row.entry_code,
        validated: row.validated,
      });
      qrByTicket.set(row.ticket_id, list);
    }

    return tickets.map((ticket) =>
      toTicketDetailResponse(ticket, qrByTicket.get(ticket.id) ?? [])
    );
  }

  async reserve(input: ReserveTicketInput) {
    const { event_id, quantity, customer_name, customer_email, customer_phone } = input;

    if (!event_id || !quantity || !customer_name || !customer_email || !customer_phone) {
      const missing = [
        !event_id && "event_id",
        !quantity && "quantity",
        !customer_name && "customer_name",
        !customer_email && "customer_email",
        !customer_phone && "customer_phone",
      ].filter(Boolean);
      throw new BadRequestError(`Missing required fields: ${missing.join(", ")}`);
    }

    if (quantity < 1 || quantity > 10) {
      throw new BadRequestError("quantity must be between 1 and 10");
    }

    return withTransaction(async (client) => {
      const event = await eventRepository.findPublishedForUpdate(client, event_id);

      if (!event) {
        throw new NotFoundError("Event not found or not published");
      }

      if (event.available_tickets < quantity) {
        throw new BadRequestError("Not enough tickets available");
      }

      const promotion = await promotionRepository.findByEventId(event.id);
      const unitPrice = promotion
        ? calculatePromoPrice(Number(event.price), Number(promotion.pourcentage))
        : Number(event.price);
      const expiresAt = new Date(`${formatDate(event.end_date)}T23:59:59Z`);
      const bookingId = randomUUID();

      const createdTickets: TicketRecord[] = [];
      const qrByTicketId = new Map<
        number,
        Array<{ code: string; entry_code: string }>
      >();

      // One ticket per place, each with its own QR + 8-digit entry code
      for (let i = 0; i < quantity; i++) {
        const ticket = await ticketRepository.create(client, {
          event_id,
          booking_id: bookingId,
          quantity: 1,
          total_price: unitPrice,
          currency: event.currency,
          customer_name,
          customer_email,
          customer_phone,
          expires_at: expiresAt,
        });

        const code = generateQrCode(ticket.id);
        let entryCode = generateEntryCode();
        for (let attempt = 0; attempt < 5; attempt++) {
          if (!(await qrCodeRepository.entryCodeExists(client, entryCode))) break;
          entryCode = generateEntryCode();
        }
        await qrCodeRepository.create(client, ticket.id, code, entryCode);
        qrByTicketId.set(ticket.id, [{ code, entry_code: entryCode }]);
        createdTickets.push(ticket);
      }

      return toTicketReserveResponse(createdTickets, event.title, qrByTicketId);
    });
  }

  async getById(id: number | string, user: JwtPayload) {
    await ticketRepository.expireOverdue();
    const ticket = await ticketRepository.findByIdWithEvent(id);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    if (
      !isAdminRole(user.role) &&
      user.email?.toLowerCase() !== ticket.customer_email.toLowerCase()
    ) {
      throw new ForbiddenError("You do not have access to this ticket");
    }

    const qrCodes = await qrCodeRepository.findByTicketId(ticket.id);
    return toTicketDetailResponse(ticket, qrCodes);
  }

  async remove(id: number | string, user: JwtPayload) {
    return withTransaction(async (client) => {
      const ticket = await ticketRepository.findByIdForUpdate(client, id);
      if (!ticket) {
        throw new NotFoundError("Ticket not found");
      }

      if (
        !isAdminRole(user.role) &&
        user.email?.toLowerCase() !== ticket.customer_email.toLowerCase()
      ) {
        throw new ForbiddenError("You do not have access to this ticket");
      }

      if (ticket.status === "scanne") {
        throw new BadRequestError(
          "Impossible de supprimer un ticket déjà scanné."
        );
      }

      const certificate = await certificateRepository.findByTicketId(
        ticket.id,
        client
      );
      if (certificate) {
        throw new BadRequestError(
          "Impossible de supprimer un ticket associé à un certificat."
        );
      }

      if (ticket.status === "confirme" || ticket.status === "expire") {
        await eventRepository.incrementAvailableTickets(
          client,
          ticket.event_id,
          ticket.quantity
        );
      }

      const deleted = await ticketRepository.delete(client, ticket.id);
      if (!deleted) {
        throw new NotFoundError("Ticket not found");
      }

      return { message: "Ticket deleted", id: ticket.id };
    });
  }
}

export const ticketService = new TicketService();
