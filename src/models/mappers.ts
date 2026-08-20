import { formatDate, formatTime } from "../utils/date";
import {
  resolvePublicEventImageUrl,
} from "../utils/eventImage";
import {
  EventCategory,
  EventRecord,
  EventStatus,
  PaymentRecord,
  PromotionRecord,
  PromotionSexe,
  TicketRecord,
  UserRecord,
  UserRole,
  UserSexe,
} from "../types";

export function toUserResponse(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    telephone: user.telephone,
    sexe: user.sexe,
    picture: user.picture,
    auth_provider: user.auth_provider ?? "local",
    has_password: Boolean(user.password_hash),
    created_at: user.created_at.toISOString(),
  };
}

export function calculatePromoPrice(
  eventPrice: number,
  pourcentage: number
): number {
  const discounted = eventPrice * (1 - pourcentage / 100);
  return Math.round(discounted * 100) / 100;
}

export function toPromotionResponse(
  promotion: PromotionRecord,
  eventPrice: number
) {
  const pourcentage = Number(promotion.pourcentage);
  return {
    id: promotion.id,
    event_id: promotion.event_id,
    nombre: promotion.nombre,
    sexe: promotion.sexe,
    reduction: pourcentage,
    pourcentage,
    prix_promo: calculatePromoPrice(eventPrice, pourcentage),
    duree: promotion.duree,
    description: promotion.description,
    created_at: promotion.created_at.toISOString(),
  };
}

export function toEventResponse(
  event: EventRecord,
  promotion: PromotionRecord | null = null
) {
  const price = Number(event.price);
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    price,
    currency: event.currency,
    start_date: formatDate(event.start_date),
    end_date: formatDate(event.end_date),
    start_time: formatTime(event.start_time),
    end_time: formatTime(event.end_time),
    location: event.location,
    latitude:
      event.latitude == null || Number.isNaN(Number(event.latitude))
        ? null
        : Number(event.latitude),
    longitude:
      event.longitude == null || Number.isNaN(Number(event.longitude))
        ? null
        : Number(event.longitude),
    category: event.category,
    capacity: event.capacity,
    available_tickets: event.available_tickets,
    image_url: resolvePublicEventImageUrl(event.id, event.image_url),
    has_image: Boolean(event.image_url?.trim()),
    status: event.status,
    promotion: promotion ? toPromotionResponse(promotion, price) : null,
    created_at: event.created_at.toISOString(),
    updated_at: event.updated_at.toISOString(),
  };
}

export function toCreatedEventResponse(event: EventRecord) {
  return {
    id: event.id,
    title: event.title,
    price: Number(event.price),
    start_date: formatDate(event.start_date),
    end_date: formatDate(event.end_date),
    start_time: formatTime(event.start_time),
    end_time: formatTime(event.end_time),
    status: event.status,
    created_at: event.created_at.toISOString(),
  };
}

export function isShareableHolder(name: string | null | undefined): boolean {
  return !String(name ?? "").trim();
}

export function toTicketReserveResponse(
  tickets: TicketRecord[],
  eventTitle: string,
  qrByTicketId: Map<number, Array<{ code: string; entry_code: string }>>
) {
  const primary = tickets[0];
  const quantity = tickets.length;
  const totalPrice = tickets.reduce((sum, t) => sum + Number(t.total_price), 0);
  const allQrCodes = tickets.flatMap((t) => qrByTicketId.get(t.id) ?? []);

  return {
    id: primary.id,
    booking_id: primary.booking_id ?? null,
    event_id: primary.event_id,
    event_title: eventTitle,
    quantity,
    total_price: totalPrice,
    currency: primary.currency,
    status: primary.status,
    ticket_ids: tickets.map((t) => t.id),
    tickets: tickets.map((t) => ({
      id: t.id,
      quantity: t.quantity,
      total_price: Number(t.total_price),
      currency: t.currency,
      status: t.status,
      customer_name: t.customer_name,
      shareable: isShareableHolder(t.customer_name),
      qr_codes: qrByTicketId.get(t.id) ?? [],
    })),
    qr_codes: allQrCodes,
    expires_at: primary.expires_at?.toISOString() ?? null,
  };
}

export function toTicketDetailResponse(
  ticket: TicketRecord & {
    event_start_date?: Date | string;
    event_end_date?: Date | string;
    event_start_time?: string | Date;
    event_end_time?: string | Date;
    event_location?: string;
  },
  qrCodes: Array<{ code: string; entry_code: string; validated: boolean }>
) {
  return {
    id: ticket.id,
    booking_id: ticket.booking_id ?? null,
    event_id: ticket.event_id,
    event_title: ticket.event_title,
    quantity: ticket.quantity,
    total_price: Number(ticket.total_price),
    currency: ticket.currency,
    status: ticket.status,
    customer_name: ticket.customer_name,
    customer_email: ticket.customer_email,
    customer_phone: ticket.customer_phone,
    shareable: isShareableHolder(ticket.customer_name),
    qr_codes: qrCodes,
    entry_code: qrCodes[0]?.entry_code ?? null,
    created_at: ticket.created_at.toISOString(),
    event_start_date: ticket.event_start_date
      ? formatDate(ticket.event_start_date)
      : null,
    event_end_date: ticket.event_end_date
      ? formatDate(ticket.event_end_date)
      : null,
    event_start_time: ticket.event_start_time
      ? formatTime(ticket.event_start_time)
      : null,
    event_end_time: ticket.event_end_time
      ? formatTime(ticket.event_end_time)
      : null,
    event_location: ticket.event_location ?? null,
  };
}

export function toPaymentResponse(payment: PaymentRecord) {
  return {
    id: payment.id,
    ticket_id: payment.ticket_id,
    amount: Number(payment.amount),
    currency: payment.currency,
    method: payment.method,
    status: payment.status,
    reference: payment.reference,
    provider_fee: Number(payment.provider_fee),
    created_at: payment.created_at.toISOString(),
  };
}

export function toPaymentStatusResponse(payment: PaymentRecord) {
  return {
    id: payment.id,
    ticket_id: payment.ticket_id,
    amount: Number(payment.amount),
    method: payment.method,
    status: payment.status,
    reference: payment.reference,
    paid_at: payment.paid_at?.toISOString() ?? null,
  };
}

export function isValidUserRole(role: string): role is UserRole {
  return role === "super_admin" || role === "admin" || role === "client";
}

export function isAdminRole(role: string | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isValidUserSexe(sexe: string): sexe is UserSexe {
  return sexe === "homme" || sexe === "femme";
}

export function isValidEventStatus(status: string): status is EventStatus {
  return ["draft", "published", "cancelled", "completed"].includes(status);
}

export function isValidEventCategory(
  category: string
): category is EventCategory {
  return ["conference", "formation", "seminaire", "atelier"].includes(category);
}

export function isValidPromotionSexe(sexe: string): sexe is PromotionSexe {
  return sexe === "homme" || sexe === "femme" || sexe === "tous";
}
