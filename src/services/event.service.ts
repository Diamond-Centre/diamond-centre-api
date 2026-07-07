import { eventRepository } from "../repositories/event.repository";
import {
  toCreatedEventResponse,
  toEventResponse,
  isValidEventStatus,
} from "../models/mappers";
import { BadRequestError, NotFoundError } from "../errors/AppError";
import { CreateEventInput } from "../types";

export class EventService {
  async listPublished() {
    const events = await eventRepository.findPublished();
    return events.map(toEventResponse);
  }

  async getById(id: number | string) {
    const event = await eventRepository.findById(id);
    if (!event) {
      throw new NotFoundError("Event not found");
    }
    return toEventResponse(event);
  }

  async create(input: CreateEventInput) {
    const {
      title,
      description,
      price,
      currency = "XAF",
      date,
      time,
      location,
      category,
      capacity,
      image_url,
      status: requestedStatus = "draft",
    } = input;

    if (!title || price == null || !date || !time || !location || !category || !capacity) {
      throw new BadRequestError("Missing required fields");
    }

    const status = isValidEventStatus(requestedStatus) ? requestedStatus : "draft";

    const event = await eventRepository.create({
      title,
      description,
      price,
      currency,
      date,
      time,
      location,
      category,
      capacity,
      image_url,
      status,
    });

    return toCreatedEventResponse(event);
  }
}

export const eventService = new EventService();
