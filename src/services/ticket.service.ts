import { withTransaction } from "../db/transaction";
import { eventRepository } from "../repositories/event.repository";
import { promotionRepository } from "../repositories/promotion.repository";
import { ticketRepository } from "../repositories/ticket.repository";
import { qrCodeRepository } from "../repositories/qrCode.repository";
import {
  calculatePromoPrice,
  toTicketDetailResponse,
  toTicketReserveResponse,
} from "../models/mappers";
import { formatDate } from "../utils/date";
import { generateQrCode } from "../utils/qr";
import { BadRequestError, NotFoundError } from "../errors/AppError";
import { ReserveTicketInput } from "../types";

export class TicketService {
  async reserve(input: ReserveTicketInput) {
    const { event_id, quantity, customer_name, customer_email, customer_phone } = input;

    if (!event_id || !quantity || !customer_name || !customer_email || !customer_phone) {
      throw new BadRequestError("Missing required fields");
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
      const totalPrice = unitPrice * quantity;
      const expiresAt = new Date(`${formatDate(event.start_date)}T23:59:59Z`);

      const ticket = await ticketRepository.create(client, {
        event_id,
        quantity,
        total_price: totalPrice,
        currency: event.currency,
        customer_name,
        customer_email,
        customer_phone,
        expires_at: expiresAt,
      });

      await eventRepository.decrementAvailableTickets(client, event_id, quantity);

      const qrCodes: string[] = [];
      for (let i = 0; i < quantity; i++) {
        const code = generateQrCode(ticket.id);
        await qrCodeRepository.create(client, ticket.id, code);
        qrCodes.push(code);
      }

      return toTicketReserveResponse(ticket, event.title, qrCodes);
    });
  }

  async getById(id: number | string) {
    const ticket = await ticketRepository.findByIdWithEvent(id);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    const qrCodes = await qrCodeRepository.findByTicketId(ticket.id);
    return toTicketDetailResponse(ticket, qrCodes);
  }
}

export const ticketService = new TicketService();
