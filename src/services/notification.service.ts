import { notificationRepository } from "../repositories/notification.repository";
import { userRepository } from "../repositories/user.repository";
import { pool } from "../db";
import { NotFoundError } from "../errors/AppError";
import { PoolClient } from "pg";

function toResponse(row: {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  ticket_id: number | null;
  event_id: number | null;
  change_id?: number | null;
  created_at: Date;
}) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    is_read: row.is_read,
    ticket_id: row.ticket_id,
    event_id: row.event_id,
    change_id: row.change_id ?? null,
    created_at: row.created_at,
  };
}

export class NotificationService {
  async list(userId: number) {
    const rows = await notificationRepository.listForUser(userId);
    return rows.map(toResponse);
  }

  async unreadCount(userId: number) {
    const count = await notificationRepository.unreadCount(userId);
    return { count };
  }

  async markRead(userId: number, id: number) {
    const row = await notificationRepository.markRead(userId, id);
    if (!row) throw new NotFoundError("Notification not found");
    return toResponse(row);
  }

  async markAllRead(userId: number) {
    const updated = await notificationRepository.markAllRead(userId);
    return { updated };
  }

  /** Create a reservation confirmation for the ticket owner (by email). */
  async notifyReservationConfirmed(
    ticketId: number,
    client?: PoolClient
  ): Promise<void> {
    const db = client ?? pool;
    const ticketResult = await db.query<{
      id: number;
      event_id: number;
      customer_email: string;
      event_title: string;
    }>(
      `SELECT t.id, t.event_id, t.customer_email, e.title AS event_title
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       WHERE t.id = $1`,
      [ticketId]
    );
    const ticket = ticketResult.rows[0];
    if (!ticket) return;

    const user = await userRepository.findByEmail(
      ticket.customer_email.trim().toLowerCase()
    );
    // Also try exact email if case differs in DB
    const owner =
      user ?? (await userRepository.findByEmail(ticket.customer_email.trim()));
    if (!owner) return;

    await notificationRepository.create(
      {
        user_id: owner.id,
        type: "reservation",
        title: "Réservation confirmée",
        message: `Votre place pour « ${ticket.event_title} » est confirmée. Présentez votre QR à l'entrée.`,
        ticket_id: ticket.id,
        event_id: ticket.event_id,
        dedupe_key: `reservation:${ticket.id}`,
      },
      client
    );
  }

  /**
   * Backfill reminders / reservation / cancellation for THIS user's tickets only.
   * Never copies platform-wide events into a new inbox.
   */
  async syncForUser(userId: number, email: string) {
    // Reminders for upcoming confirmed tickets (within 7 days)
    const upcoming = await pool.query<{
      ticket_id: number;
      event_id: number;
      event_title: string;
      start_date: Date;
      location: string;
    }>(
      `SELECT t.id AS ticket_id, e.id AS event_id, e.title AS event_title,
              e.start_date, e.location
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       WHERE lower(t.customer_email) = lower($1)
         AND t.status = 'confirme'
         AND e.start_date >= CURRENT_DATE
         AND e.start_date <= CURRENT_DATE + INTERVAL '7 days'`,
      [email]
    );

    for (const row of upcoming.rows) {
      const start = new Date(row.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDay = new Date(start);
      startDay.setHours(0, 0, 0, 0);
      const days = Math.round(
        (startDay.getTime() - today.getTime()) / 86400000
      );
      const when =
        days <= 0
          ? "aujourd'hui"
          : days === 1
            ? "demain"
            : `dans ${days} jours`;

      await notificationRepository.create({
        user_id: userId,
        type: "rappel",
        title: "Rappel d'événement",
        message: `« ${row.event_title} » a lieu ${when} à ${row.location}.`,
        ticket_id: row.ticket_id,
        event_id: row.event_id,
        dedupe_key: `rappel:${row.ticket_id}:${startDay.toISOString().slice(0, 10)}`,
      });
    }

    // Also backfill reservation notifications if missing
    const confirmed = await pool.query<{
      ticket_id: number;
      event_id: number;
      event_title: string;
    }>(
      `SELECT t.id AS ticket_id, e.id AS event_id, e.title AS event_title
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       WHERE lower(t.customer_email) = lower($1)
         AND t.status = 'confirme'`,
      [email]
    );

    for (const row of confirmed.rows) {
      await notificationRepository.create({
        user_id: userId,
        type: "reservation",
        title: "Réservation confirmée",
        message: `Votre place pour « ${row.event_title} » est confirmée. Présentez votre QR à l'entrée.`,
        ticket_id: row.ticket_id,
        event_id: row.event_id,
        dedupe_key: `reservation:${row.ticket_id}`,
      });
    }

    // Cancelled events the user had booked
    const cancelled = await pool.query<{
      ticket_id: number;
      event_id: number;
      event_title: string;
    }>(
      `SELECT t.id AS ticket_id, e.id AS event_id, e.title AS event_title
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       WHERE lower(t.customer_email) = lower($1)
         AND (t.status = 'expire' OR e.status = 'cancelled')`,
      [email]
    );

    for (const row of cancelled.rows) {
      await notificationRepository.create({
        user_id: userId,
        type: "annulation",
        title: "Événement annulé",
        message: `« ${row.event_title} » a été annulé. Contactez le support si besoin.`,
        ticket_id: row.ticket_id,
        event_id: row.event_id,
        dedupe_key: `annulation:${row.ticket_id}`,
      });
    }

    return this.list(userId);
  }

  /**
   * Tell every client a new event was just published.
   * Called at publish time only — never backfilled on sync.
   */
  async notifyNewPublishedEvent(event: { id: number; title: string }): Promise<void> {
    const title = String(event.title || "").trim() || "un événement";
    const eventId = Number(event.id);
    if (!Number.isFinite(eventId)) return;

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id, dedupe_key)
       SELECT u.id,
              'info',
              'Nouvel événement',
              $1,
              $2,
              $3
         FROM users u
        WHERE u.role = 'client'
       ON CONFLICT DO NOTHING`,
      [
        `« ${title} » vient d’être publié. Découvrez-le et réservez votre place.`,
        eventId,
        `info:published:${eventId}`,
      ]
    );
  }
}

export const notificationService = new NotificationService();
