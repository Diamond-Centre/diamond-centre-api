import { withTransaction } from "../db/transaction";
import { paymentRepository } from "../repositories/payment.repository";
import { ticketRepository } from "../repositories/ticket.repository";
import {
  toPaymentResponse,
  toPaymentStatusResponse,
} from "../models/mappers";
import { generatePaymentReference } from "../utils/qr";
import { BadRequestError, NotFoundError } from "../errors/AppError";
import { InitiatePaymentInput, MtnCallbackInput, PaymentMethod } from "../types";

export class PaymentService {
  async initiate(input: InitiatePaymentInput) {
    const { ticket_id, method, phone } = input;

    if (!ticket_id || !method || !phone) {
      throw new BadRequestError("Missing required fields");
    }

    if (!this.isValidMethod(method)) {
      throw new BadRequestError("Invalid payment method");
    }

    const ticket = await ticketRepository.findById(ticket_id);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    if (ticket.status !== "pending") {
      throw new BadRequestError("Ticket is not pending payment");
    }

    const reference = generatePaymentReference(method);
    const providerFee = Math.round(Number(ticket.total_price) * 0.005);

    const payment = await paymentRepository.create({
      ticket_id,
      amount: ticket.total_price,
      currency: ticket.currency,
      method,
      reference,
      provider_fee: providerFee,
    });

    return toPaymentResponse(payment);
  }

  async processMtnCallback(input: MtnCallbackInput) {
    const { reference, status, transaction_id } = input;

    if (!reference || !status) {
      throw new BadRequestError("Missing required fields");
    }

    return withTransaction(async (client) => {
      const payment = await paymentRepository.findByReferenceForUpdate(client, reference);

      if (!payment) {
        throw new NotFoundError("Payment not found");
      }

      const paymentStatus = status === "successful" ? "successful" : "failed";
      const paidAt = paymentStatus === "successful" ? new Date() : null;

      await paymentRepository.updateStatus(
        client,
        payment.id,
        paymentStatus,
        transaction_id,
        paidAt
      );

      if (paymentStatus === "successful") {
        await ticketRepository.confirm(client, payment.ticket_id);
      }

      return { message: "Callback processed", status: paymentStatus };
    });
  }

  async getStatus(id: number | string) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }
    return toPaymentStatusResponse(payment);
  }

  private isValidMethod(method: string): method is PaymentMethod {
    return method === "mtn_momo" || method === "orange_money";
  }
}

export const paymentService = new PaymentService();
