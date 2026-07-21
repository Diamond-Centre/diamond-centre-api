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
import { CreateEventInput, PromotionRecord } from "../types";

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
}

export const eventService = new EventService();
