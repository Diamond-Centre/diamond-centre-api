import { withTransaction } from "../db/transaction";
import { pool } from "../db";
import { paymentRepository } from "../repositories/payment.repository";
import { ticketRepository } from "../repositories/ticket.repository";
import { eventRepository } from "../repositories/event.repository";
import {
  toPaymentResponse,
  toPaymentStatusResponse,
} from "../models/mappers";
import { generatePaymentReference } from "../utils/qr";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/AppError";
import { InitiatePaymentInput, MtnCallbackInput, PaymentMethod } from "../types";
import { notificationService } from "./notification.service";
import { isAdminRole } from "../models/mappers";
import { JwtPayload } from "../utils/jwt";

function assertOwnsTicketEmail(user: JwtPayload, customerEmail: string) {
  if (isAdminRole(user.role)) return;
  if (
    user.email &&
    customerEmail &&
    user.email.toLowerCase() === customerEmail.toLowerCase()
  ) {
    return;
  }
  throw new ForbiddenError("You do not have access to this payment");
}

export class PaymentService {
  async initiate(
    input: InitiatePaymentInput & { ticketId?: number },
    user: JwtPayload
  ) {
    const ticket_id = Number(
      (input as { ticket_id?: number; ticketId?: number }).ticket_id ??
        (input as { ticketId?: number }).ticketId
    );
    const method = input.method;

    if (!ticket_id || Number.isNaN(ticket_id)) {
      throw new BadRequestError("Missing required field: ticket_id");
    }

    if (!method) {
      throw new BadRequestError("Missing required field: method");
    }

    if (!this.isValidMethod(method)) {
      throw new BadRequestError("Invalid payment method");
    }

    const ticket = await ticketRepository.findById(ticket_id);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    assertOwnsTicketEmail(user, ticket.customer_email);

    if (ticket.status !== "confirme") {
      throw new BadRequestError("Ticket is not payable in its current status");
    }

    const alreadyPaid = ticket.booking_id
      ? await paymentRepository.hasSuccessfulForBooking(ticket.booking_id)
      : await paymentRepository.hasSuccessfulForTicket(ticket.id);
    if (alreadyPaid) {
      throw new BadRequestError("Ticket already paid");
    }

    const phone = String(input.phone || ticket.customer_phone || "").trim();
    if (!phone) {
      throw new BadRequestError("Missing required field: phone");
    }

    let amount = Number(ticket.total_price);
    if (ticket.booking_id) {
      const siblings = await ticketRepository.findByBookingId(
        pool,
        ticket.booking_id
      );
      amount = siblings.reduce((sum, t) => sum + Number(t.total_price), 0);
    }

    const reference = generatePaymentReference(method);
    const providerFee = Math.round(amount * 0.005);

    const payment = await paymentRepository.create({
      ticket_id,
      amount,
      currency: ticket.currency,
      method,
      reference,
      provider_fee: providerFee,
    });

    return toPaymentResponse(payment);
  }

  async processMtnCallback(input: MtnCallbackInput) {
    const reference = input?.reference;
    const status = input?.status;
    const transaction_id = input?.transaction_id;

    if (!reference || !status) {
      throw new BadRequestError(
        `Missing required fields: ${[
          !reference && "reference",
          !status && "status",
        ]
          .filter(Boolean)
          .join(", ")}`
      );
    }

    return withTransaction(async (client) => {
      const payment = await paymentRepository.findByReferenceForUpdate(client, reference);

      if (!payment) {
        throw new NotFoundError("Payment not found");
      }

      const wasAlreadySuccessful = payment.status === "successful";
      const paymentStatus = status === "successful" ? "successful" : "failed";
      const paidAt = paymentStatus === "successful" ? new Date() : null;

      await paymentRepository.updateStatus(
        client,
        payment.id,
        paymentStatus,
        transaction_id,
        paidAt
      );

      // First successful payment for this booking: reserve seats + keep tickets confirme
      if (paymentStatus === "successful" && !wasAlreadySuccessful) {
        const ticket = await ticketRepository.findByIdForUpdate(
          client,
          payment.ticket_id
        );
        if (!ticket) {
          throw new NotFoundError("Ticket not found");
        }

        const groupTickets = ticket.booking_id
          ? await ticketRepository.findByBookingIdForUpdate(
              client,
              ticket.booking_id
            )
          : [ticket];

        const payableTickets = groupTickets.filter((t) => t.status === "confirme");
        if (payableTickets.length > 0) {
          const seats = payableTickets.reduce(
            (sum, t) => sum + Number(t.quantity || 1),
            0
          );
          const event = await eventRepository.findPublishedForUpdate(
            client,
            ticket.event_id
          );
          if (!event) {
            throw new NotFoundError("Event not found or not published");
          }
          if (event.available_tickets < seats) {
            throw new BadRequestError("Not enough tickets available");
          }
          await eventRepository.decrementAvailableTickets(
            client,
            ticket.event_id,
            seats
          );
          await notificationService.notifyReservationConfirmed(
            payableTickets[0].id,
            client
          );
        }
      }

      return { message: "Callback processed", status: paymentStatus };
    });
  }

  async getStatus(id: number | string, user: JwtPayload) {
    if (!user) throw new UnauthorizedError("Unauthorized");
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }
    const ticket = await ticketRepository.findById(payment.ticket_id);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }
    assertOwnsTicketEmail(user, ticket.customer_email);
    return toPaymentStatusResponse(payment);
  }

  private isValidMethod(method: string): method is PaymentMethod {
    return method === "mtn_momo" || method === "orange_money";
  }
}

export const paymentService = new PaymentService();
