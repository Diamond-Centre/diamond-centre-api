import { withTransaction } from "../db/transaction";
import { qrCodeRepository } from "../repositories/qrCode.repository";
import { ticketRepository } from "../repositories/ticket.repository";
import { BadRequestError } from "../errors/AppError";
import { ScanQrInput } from "../types";
import { PoolClient } from "pg";
import { QrCodeRecord } from "../types";

async function validateQrRecord(qr: QrCodeRecord | null, client: PoolClient) {
  if (!qr) {
    return { valid: false, error: "Invalid code" };
  }

  // Lazy-expire confirme tickets past expires_at
  if (qr.ticket_status === "confirme") {
    const ticket = await ticketRepository.findByIdForUpdate(client, qr.ticket_id);
    if (ticket?.expires_at && new Date(ticket.expires_at) < new Date()) {
      await ticketRepository.markExpired(client, qr.ticket_id);
      return { valid: false, error: "Ticket expired" };
    }
  }

  if (qr.ticket_status === "scanne") {
    return { valid: false, error: "Ticket already scanned" };
  }

  if (qr.ticket_status === "expire") {
    return { valid: false, error: "Ticket expired" };
  }

  if (qr.ticket_status === "rembourse") {
    return { valid: false, error: "Ticket refunded" };
  }

  if (qr.ticket_status !== "confirme") {
    return { valid: false, error: "Ticket not confirmed" };
  }

  // confirme already means the reservation is paid
  if (qr.validated) {
    return { valid: false, error: "Ticket already validated" };
  }

  const validatedAt = new Date();
  await qrCodeRepository.markValidated(client, qr.id, validatedAt);
  await ticketRepository.markScanned(client, qr.ticket_id);

  return {
    valid: true,
    ticket_id: qr.ticket_id,
    event_title: qr.event_title,
    customer_name: qr.customer_name,
    entry_code: qr.entry_code,
    qr_code: qr.code,
    status: "scanne" as const,
    validated_at: validatedAt.toISOString(),
  };
}

export class ValidationService {
  async scan(input: ScanQrInput) {
    const { qr_code } = input;

    if (!qr_code) {
      throw new BadRequestError("qr_code is required");
    }

    return withTransaction(async (client) => {
      const qr = await qrCodeRepository.findByCodeForUpdate(client, qr_code);
      return validateQrRecord(qr, client);
    });
  }

  /** Admin web: validate by typing the 8-digit code under the QR. */
  async validateByEntryCode(entryCodeRaw: string) {
    const entry_code = String(entryCodeRaw || "").trim();

    if (!/^\d{8}$/.test(entry_code)) {
      throw new BadRequestError("entry_code must be an 8-digit number");
    }

    return withTransaction(async (client) => {
      const qr = await qrCodeRepository.findByEntryCodeForUpdate(
        client,
        entry_code
      );
      return validateQrRecord(qr, client);
    });
  }
}

export const validationService = new ValidationService();
