import { withTransaction } from "../db/transaction";
import { eventRepository } from "../repositories/event.repository";
import { promotionRepository } from "../repositories/promotion.repository";
import {
  toCreatedEventResponse,
  toEventResponse,
  toPromotionResponse,
  isValidEventStatus,
  isValidPromotionSexe,
} from "../models/mappers";
import { BadRequestError, NotFoundError } from "../errors/AppError";
import {
  CreateEventInput,
  CreatePromotionInput,
  PromotionRecord,
  UpdateEventInput,
} from "../types";
import { formatDate, formatTime, isValidTime } from "../utils/date";
import { eventChangeService } from "./event_change.service";

function normalizePromotion(promotion: CreatePromotionInput): {
  nombre: number;
  sexe: "homme" | "femme" | "tous";
  pourcentage: number;
  duree: number;
  description?: string;
} {
  const reductionRaw =
    promotion.reduction != null ? promotion.reduction : promotion.pourcentage;

  if (reductionRaw == null) {
    throw new BadRequestError("promotion.reduction is required");
  }

  const pourcentage = Number(reductionRaw);
  if (!Number.isFinite(pourcentage) || pourcentage <= 0 || pourcentage > 100) {
    throw new BadRequestError("promotion.reduction must be between 1 and 100");
  }

  const nombre =
    promotion.nombre != null ? Number(promotion.nombre) : 999999;
  if (!Number.isFinite(nombre) || nombre <= 0) {
    throw new BadRequestError("Invalid promotion.nombre");
  }

  const sexe = promotion.sexe ?? "tous";
  if (!isValidPromotionSexe(sexe)) {
    throw new BadRequestError("Invalid promotion sexe");
  }

  const duree = promotion.duree != null ? Number(promotion.duree) : 30;
  if (!Number.isFinite(duree) || duree <= 0) {
    throw new BadRequestError("Invalid promotion.duree");
  }

  return {
    nombre,
    sexe,
    pourcentage,
    duree,
    description: promotion.description,
  };
}

function normalizeTimes(input: {
  start_time?: string;
  end_time?: string;
}): { start_time: string; end_time: string } {
  const start_time = input.start_time ?? "09:00";
  const end_time = input.end_time ?? "18:00";
  if (!isValidTime(start_time) || !isValidTime(end_time)) {
    throw new BadRequestError("Invalid time format (use HH:MM)");
  }
  return { start_time, end_time };
}

function normalizeCoord(value: number | string | null | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export class EventService {
  async listPublished() {
    const events = await eventRepository.findPublished();
    const promotions = await promotionRepository.findByEventIds(
      events.map((event) => event.id)
    );
    const promotionByEventId = new Map(
      promotions.map((promotion) => [promotion.event_id, promotion])
    );
    return events.map((event) =>
      toEventResponse(event, promotionByEventId.get(event.id) ?? null)
    );
  }

  async listAll() {
    const events = await eventRepository.findAll();
    const promotions = await promotionRepository.findByEventIds(
      events.map((event) => event.id)
    );
    const promotionByEventId = new Map(
      promotions.map((promotion) => [promotion.event_id, promotion])
    );
    return events.map((event) =>
      toEventResponse(event, promotionByEventId.get(event.id) ?? null)
    );
  }

  async getById(id: number | string) {
    const event = await eventRepository.findById(id);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    const promotion = await promotionRepository.findByEventId(event.id);
    return toEventResponse(event, promotion);
  }

  async create(input: CreateEventInput) {
    const {
      title,
      description,
      price,
      currency = "XAF",
      start_date,
      end_date,
      location,
      category,
      capacity,
      image_url,
      status: requestedStatus = "draft",
      promotion,
    } = input;

    const latitude = normalizeCoord(input.latitude);
    const longitude = normalizeCoord(input.longitude);

    if (
      !title ||
      price == null ||
      !start_date ||
      !end_date ||
      !location ||
      !category ||
      capacity == null
    ) {
      throw new BadRequestError("Missing required fields");
    }

    if (new Date(end_date) < new Date(start_date)) {
      throw new BadRequestError("end_date must be on or after start_date");
    }

    let normalizedPromotion: ReturnType<typeof normalizePromotion> | null =
      null;
    if (promotion) {
      normalizedPromotion = normalizePromotion(promotion);
    }

    const { start_time, end_time } = normalizeTimes(input);
    const status = isValidEventStatus(requestedStatus) ? requestedStatus : "draft";

    return withTransaction(async (client) => {
      const event = await eventRepository.create(client, {
        title,
        description,
        price,
        currency,
        start_date,
        end_date,
        start_time,
        end_time,
        location,
        latitude,
        longitude,
        category,
        capacity,
        image_url,
        status,
      });

      let createdPromotion: PromotionRecord | null = null;
      if (normalizedPromotion) {
        createdPromotion = await promotionRepository.create(client, {
          event_id: event.id,
          ...normalizedPromotion,
        });
      }

      return {
        ...toCreatedEventResponse(event),
        promotion: createdPromotion
          ? toPromotionResponse(createdPromotion, Number(event.price))
          : null,
      };
    });
  }

  async update(
    id: number | string,
    input: UpdateEventInput,
    adminUserId?: number | null
  ) {
    return withTransaction(async (client) => {
      const existing = await eventRepository.findByIdForUpdate(client, id);
      if (!existing) {
        throw new NotFoundError("Event not found");
      }

      const start_date = input.start_date ?? formatDate(existing.start_date);
      const end_date = input.end_date ?? formatDate(existing.end_date);
      const start_time =
        input.start_time ?? formatTime(existing.start_time ?? "09:00");
      const end_time = input.end_time ?? formatTime(existing.end_time ?? "18:00");

      if (new Date(end_date) < new Date(start_date)) {
        throw new BadRequestError("end_date must be on or after start_date");
      }

      if (!isValidTime(start_time) || !isValidTime(end_time)) {
        throw new BadRequestError("Invalid time format (use HH:MM)");
      }

      if (input.status != null && !isValidEventStatus(input.status)) {
        throw new BadRequestError("Invalid status");
      }

      const capacity = input.capacity ?? existing.capacity;
      if (capacity <= 0) {
        throw new BadRequestError("Invalid capacity");
      }

      const soldTickets = existing.capacity - existing.available_tickets;
      if (capacity < soldTickets) {
        throw new BadRequestError(
          `Capacity cannot be less than already sold tickets (${soldTickets})`
        );
      }
      const available_tickets = capacity - soldTickets;

      const updated = await eventRepository.update(client, existing.id, {
        title: input.title ?? existing.title,
        description:
          input.description !== undefined
            ? input.description
            : existing.description,
        price: input.price ?? Number(existing.price),
        currency: input.currency ?? existing.currency,
        start_date,
        end_date,
        start_time,
        end_time,
        location: input.location ?? existing.location,
        latitude:
          input.latitude !== undefined
            ? normalizeCoord(input.latitude)
            : normalizeCoord(existing.latitude),
        longitude:
          input.longitude !== undefined
            ? normalizeCoord(input.longitude)
            : normalizeCoord(existing.longitude),
        category: input.category ?? existing.category,
        capacity,
        available_tickets,
        image_url:
          input.image_url !== undefined ? input.image_url : existing.image_url,
        status: input.status ?? existing.status,
      });

      const changeId = await eventChangeService.notifyScheduleChange(
        client,
        existing,
        updated,
        adminUserId ?? null
      );

      let promotion: PromotionRecord | null = null;
      if (input.promotion === null) {
        await promotionRepository.deleteByEventId(client, existing.id);
        promotion = null;
      } else if (input.promotion) {
        const normalized = normalizePromotion(input.promotion);
        promotion = await promotionRepository.upsert(client, {
          event_id: existing.id,
          ...normalized,
        });
      } else {
        promotion = await promotionRepository.findByEventId(existing.id);
      }

      return {
        ...toEventResponse(updated, promotion),
        schedule_change_id: changeId,
        clients_notified: changeId != null,
      };
    });
  }

  async remove(id: number | string) {
    return withTransaction(async (client) => {
      const existing = await eventRepository.findByIdForUpdate(client, id);
      if (!existing) {
        throw new NotFoundError("Event not found");
      }

      await eventRepository.delete(client, existing.id);
      return { message: "Event deleted" };
    });
  }
}

export const eventService = new EventService();
