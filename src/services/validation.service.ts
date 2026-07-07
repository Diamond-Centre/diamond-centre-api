import { withTransaction } from "../db/transaction";
import { qrCodeRepository } from "../repositories/qrCode.repository";
import { BadRequestError } from "../errors/AppError";
import { ScanQrInput } from "../types";

export class ValidationService {
  async scan(input: ScanQrInput) {
    const { qr_code } = input;

    if (!qr_code) {
      throw new BadRequestError("qr_code is required");
    }

    return withTransaction(async (client) => {
      const qr = await qrCodeRepository.findByCodeForUpdate(client, qr_code);

      if (!qr) {
        return { valid: false, error: "Invalid QR code" };
      }

      if (qr.ticket_status !== "confirmed") {
        return { valid: false, error: "Ticket not confirmed" };
      }

      if (qr.validated) {
        return { valid: false, error: "Ticket already validated" };
      }

      const validatedAt = new Date();
      await qrCodeRepository.markValidated(client, qr.id, validatedAt);

      return {
        valid: true,
        ticket_id: qr.ticket_id,
        event_title: qr.event_title,
        customer_name: qr.customer_name,
        validated_at: validatedAt.toISOString(),
      };
    });
  }
}

export const validationService = new ValidationService();
