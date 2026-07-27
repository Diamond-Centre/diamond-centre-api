export type MobileCheckinRecord = {
  ticket_id: string;
  event_title: string;
  customer_name: string;
  location?: string;
  date_label?: string;
  time?: string;
  qr_raw?: string;
  scanned_by?: string;
  scanned_at: string;
};

type CheckInInput = {
  ticket_id: string;
  event_title: string;
  customer_name: string;
  location?: string;
  date_label?: string;
  time?: string;
  qr_raw?: string;
  scanned_by?: string;
};

/**
 * In-memory door check-ins so the attendee phone can poll and play the tear
 * animation when a staff phone scans the same ticket QR.
 * (Ephemeral — cleared on process restart.)
 */
export class MobileCheckinService {
  private readonly byTicketId = new Map<string, MobileCheckinRecord>();

  checkIn(input: CheckInInput) {
    const record: MobileCheckinRecord = {
      ticket_id: input.ticket_id,
      event_title: input.event_title,
      customer_name: input.customer_name,
      location: input.location,
      date_label: input.date_label,
      time: input.time,
      qr_raw: input.qr_raw,
      scanned_by: input.scanned_by,
      scanned_at: new Date().toISOString(),
    };
    this.byTicketId.set(input.ticket_id, record);
    return {
      ok: true,
      scanned: true,
      ...record,
    };
  }

  status(ticketId: string) {
    const record = this.byTicketId.get(ticketId);
    if (!record) {
      return { scanned: false as const };
    }
    return {
      scanned: true as const,
      ...record,
    };
  }
}

export const mobileCheckinService = new MobileCheckinService();
