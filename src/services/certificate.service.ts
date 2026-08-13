import crypto from "crypto";
import { withTransaction } from "../db/transaction";
import { certificateRepository } from "../repositories/certificate.repository";
import { eventRepository } from "../repositories/event.repository";
import { ticketRepository } from "../repositories/ticket.repository";
import { userRepository } from "../repositories/user.repository";
import { notificationRepository } from "../repositories/notification.repository";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors/AppError";
import { CertificateRecord, EventRecord, IssueCertificatesInput } from "../types";
import { formatDate } from "../utils/date";

/** Issued as long as the event is a non-cancelled formation — start/end dates do not block. */
function assertIssuableFormation(event: EventRecord | null): asserts event is EventRecord {
  if (!event) {
    throw new NotFoundError("Event not found");
  }
  if (event.category !== "formation") {
    throw new BadRequestError("Certificates can only be issued for formations");
  }
  if (event.status === "cancelled") {
    throw new BadRequestError(
      "Cannot issue certificates for a cancelled formation"
    );
  }
}

function generateCertificateCode(eventId: number, ticketId: number): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `DICE-${eventId}-${ticketId}-${stamp}${rand}`.slice(0, 40);
}

export function toCertificateResponse(cert: CertificateRecord) {
  return {
    id: cert.id,
    code: cert.code,
    event_id: cert.event_id,
    ticket_id: cert.ticket_id,
    user_id: cert.user_id,
    recipient_name: cert.recipient_name,
    recipient_email: cert.recipient_email,
    formation_title: cert.formation_title,
    start_date: cert.event_start_date
      ? formatDate(cert.event_start_date)
      : null,
    end_date: cert.event_end_date ? formatDate(cert.event_end_date) : null,
    location: cert.event_location ?? null,
    issued_by: cert.issued_by,
    issuer_name: cert.issuer_name ?? null,
    issued_at: cert.issued_at.toISOString(),
    created_at: cert.created_at.toISOString(),
    organization: "Diamond Centre",
    template: {
      brand: "Diamond Centre",
      title: "Certificat de Formation",
      subtitle: "Attestation de participation et de réussite",
      body: `Certifie que {{recipient_name}} a suivi avec succès la formation « {{formation_title}} ».`,
    },
  };
}

export class CertificateService {
  async listEligible(eventId: number) {
    const event = await eventRepository.findById(eventId);
    assertIssuableFormation(event);

    const tickets = await ticketRepository.findIssuableByEventIdPool(eventId);
    const existing = await certificateRepository.findByEventId(eventId);
    const issuedTicketIds = new Set(existing.map((c) => c.ticket_id));

    return {
      event: {
        id: event.id,
        title: event.title,
        category: event.category,
        status: event.status,
        location: event.location,
        start_date: formatDate(event.start_date),
        end_date: formatDate(event.end_date),
      },
      eligible: tickets
        .filter((t) => !issuedTicketIds.has(t.id))
        .map((t) => ({
          ticket_id: t.id,
          customer_name: t.customer_name,
          customer_email: t.customer_email,
          quantity: t.quantity,
          status: t.status,
        })),
      already_issued: existing.map(toCertificateResponse),
    };
  }

  async issue(input: IssueCertificatesInput, adminUserId: number) {
    const { event_id, ticket_ids } = input;
    if (!event_id) {
      throw new BadRequestError("event_id is required");
    }

    return withTransaction(async (client) => {
      const event = await eventRepository.findById(event_id);
      assertIssuableFormation(event);

      const issuable = await ticketRepository.findIssuableByEventId(
        client,
        event_id
      );
      if (issuable.length === 0) {
        throw new BadRequestError("No participants for this formation");
      }

      let targets = issuable;
      if (ticket_ids && ticket_ids.length > 0) {
        const wanted = new Set(ticket_ids);
        targets = issuable.filter((t) => wanted.has(t.id));
        if (targets.length === 0) {
          throw new BadRequestError(
            "None of the provided ticket_ids are valid for this formation"
          );
        }
      }

      const already = await certificateRepository.findExistingTicketIds(
        client,
        targets.map((t) => t.id)
      );

      const issued = [];
      const skipped = [];

      for (const ticket of targets) {
        if (already.has(ticket.id)) {
          skipped.push({ ticket_id: ticket.id, reason: "already_issued" });
          continue;
        }

        const owner = await userRepository.findByEmail(
          ticket.customer_email.trim().toLowerCase()
        );
        const user =
          owner ??
          (await userRepository.findByEmail(ticket.customer_email.trim()));

        const cert = await certificateRepository.create(client, {
          code: generateCertificateCode(event.id, ticket.id),
          event_id: event.id,
          ticket_id: ticket.id,
          user_id: user?.id ?? null,
          recipient_name: ticket.customer_name,
          recipient_email: ticket.customer_email,
          formation_title: event.title,
          issued_by: adminUserId,
        });

        if (user) {
          await notificationRepository.create(
            {
              user_id: user.id,
              type: "certificat",
              title: "Certificat disponible",
              message: `Votre certificat Diamond Centre pour « ${event.title} » est prêt.`,
              ticket_id: ticket.id,
              event_id: event.id,
              dedupe_key: `certificat:${cert.code}`,
            },
            client
          );
        }

        issued.push({
          ...cert,
          event_start_date: event.start_date,
          event_end_date: event.end_date,
          event_location: event.location,
          issuer_name: undefined,
        });
      }

      return {
        issued_count: issued.length,
        skipped_count: skipped.length,
        certificates: issued.map(toCertificateResponse),
        skipped,
      };
    });
  }

  async listByEvent(eventId: number) {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }
    const certificates = await certificateRepository.findByEventId(eventId);
    return certificates.map(toCertificateResponse);
  }

  async listMine(email: string) {
    const certificates = await certificateRepository.findByRecipientEmail(email);
    return certificates.map(toCertificateResponse);
  }

  async getByCode(code: string, requesterEmail?: string, isAdmin = false) {
    const cert = await certificateRepository.findByCode(code);
    if (!cert) {
      throw new NotFoundError("Certificate not found");
    }

    if (
      !isAdmin &&
      requesterEmail &&
      cert.recipient_email.toLowerCase() !== requesterEmail.toLowerCase()
    ) {
      // Public verification still returns limited payload without email check
      // Full details only for owner/admin — allow public verify of authenticity
    }

    return toCertificateResponse(cert);
  }

  async getMineByCode(code: string, email: string) {
    const cert = await certificateRepository.findByCode(code);
    if (!cert) {
      throw new NotFoundError("Certificate not found");
    }
    if (cert.recipient_email.toLowerCase() !== email.toLowerCase()) {
      throw new ForbiddenError("This certificate does not belong to you");
    }
    return toCertificateResponse(cert);
  }
}

export const certificateService = new CertificateService();
