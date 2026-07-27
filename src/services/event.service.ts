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
import { formatDate } from "../utils/date";

function validatePromotion(promotion: CreatePromotionInput): void {
  const { nombre, sexe, pourcentage, duree } = promotion;
  if (nombre == null || !sexe || pourcentage == null || duree == null) {
    throw new BadRequestError("Missing required promotion fields");
  }
  if (!isValidPromotionSexe(sexe)) {
    throw new BadRequestError("Invalid promotion sexe");
  }
  if (nombre <= 0 || pourcentage <= 0 || pourcentage > 100 || duree <= 0) {
    throw new BadRequestError("Invalid promotion values");
  }
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

    if (promotion) {
      validatePromotion(promotion);
    }

    const status = isValidEventStatus(requestedStatus) ? requestedStatus : "draft";

    return withTransaction(async (client) => {
      const event = await eventRepository.create(client, {
        title,
        description,
        price,
        currency,
        start_date,
        end_date,
        location,
        category,
        capacity,
        image_url,
        status,
      });

      let createdPromotion: PromotionRecord | null = null;
      if (promotion) {
        createdPromotion = await promotionRepository.create(client, {
          event_id: event.id,
          nombre: promotion.nombre,
          sexe: promotion.sexe,
          pourcentage: promotion.pourcentage,
          duree: promotion.duree,
          description: promotion.description,
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

  async update(id: number | string, input: UpdateEventInput) {
    return withTransaction(async (client) => {
      const existing = await eventRepository.findByIdForUpdate(client, id);
      if (!existing) {
        throw new NotFoundError("Event not found");
      }

      const start_date = input.start_date ?? formatDate(existing.start_date);
      const end_date = input.end_date ?? formatDate(existing.end_date);

      if (new Date(end_date) < new Date(start_date)) {
        throw new BadRequestError("end_date must be on or after start_date");
      }

      if (input.status != null && !isValidEventStatus(input.status)) {
        throw new BadRequestError("Invalid status");
      }

      if (input.promotion) {
        validatePromotion(input.promotion);
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
        location: input.location ?? existing.location,
        category: input.category ?? existing.category,
        capacity,
        available_tickets,
        image_url:
          input.image_url !== undefined ? input.image_url : existing.image_url,
        status: input.status ?? existing.status,
      });

      let promotion: PromotionRecord | null = null;
      if (input.promotion === null) {
        await promotionRepository.deleteByEventId(client, existing.id);
        promotion = null;
      } else if (input.promotion) {
        promotion = await promotionRepository.upsert(client, {
          event_id: existing.id,
          nombre: input.promotion.nombre,
          sexe: input.promotion.sexe,
          pourcentage: input.promotion.pourcentage,
          duree: input.promotion.duree,
          description: input.promotion.description,
        });
      } else {
        promotion = await promotionRepository.findByEventId(existing.id);
      }

      return toEventResponse(updated, promotion);
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
