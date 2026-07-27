import { Response } from "express";
import { validationService } from "../services/validation.service";
import { mobileCheckinService } from "../services/mobileCheckin.service";
import { AuthRequest } from "../middleware/auth";
import { BadRequestError } from "../errors/AppError";

export class ValidationController {
  scan = async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await validationService.scan(req.body);
    res.json(result);
  };

  /** Staff phone publishes a DiCe mobile QR check-in (cross-device sync). */
  mobileCheckin = async (req: AuthRequest, res: Response): Promise<void> => {
    const {
      ticket_id,
      event_title,
      customer_name,
      location,
      date_label,
      time,
      qr_raw,
    } = req.body ?? {};

    if (!ticket_id || !event_title || !customer_name) {
      throw new BadRequestError(
        "ticket_id, event_title and customer_name are required"
      );
    }

    const result = mobileCheckinService.checkIn({
      ticket_id: String(ticket_id),
      event_title: String(event_title),
      customer_name: String(customer_name),
      location: location != null ? String(location) : undefined,
      date_label: date_label != null ? String(date_label) : undefined,
      time: time != null ? String(time) : undefined,
      qr_raw: qr_raw != null ? String(qr_raw) : undefined,
      scanned_by: req.user?.email,
    });

    res.json(result);
  };

  /** Attendee phone polls whether their ticket was scanned at the door. */
  mobileStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    const ticketId = String(req.params.ticketId || "").trim();
    if (!ticketId) {
      throw new BadRequestError("ticketId is required");
    }
    res.json(mobileCheckinService.status(ticketId));
  };
}

export const validationController = new ValidationController();
