import { formatDate } from "../utils/date";
import {
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
    location: event.location,
    category: event.category,
    capacity: event.capacity,
    available_tickets: event.available_tickets,
    image_url: event.image_url,
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
    status: event.status,
    created_at: event.created_at.toISOString(),
  };
}

export function toTicketReserveResponse(
  ticket: TicketRecord,
  eventTitle: string,
  qrCodes: string[]
) {
  return {
    id: ticket.id,
    event_id: ticket.event_id,
    event_title: eventTitle,
    quantity: ticket.quantity,
    total_price: Number(ticket.total_price),
    currency: ticket.currency,
    status: ticket.status,
    qr_codes: qrCodes,
    expires_at: ticket.expires_at?.toISOString() ?? null,
  };
}

export function toTicketDetailResponse(
  ticket: TicketRecord,
  qrCodes: Array<{ code: string; validated: boolean }>
) {
  return {
    id: ticket.id,
    event_id: ticket.event_id,
    event_title: ticket.event_title,
    quantity: ticket.quantity,
    total_price: Number(ticket.total_price),
    currency: ticket.currency,
    status: ticket.status,
    customer_name: ticket.customer_name,
    customer_email: ticket.customer_email,
    qr_codes: qrCodes,
    created_at: ticket.created_at.toISOString(),
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
  return role === "admin" || role === "client";
}

export function isValidUserSexe(sexe: string): sexe is UserSexe {
  return sexe === "homme" || sexe === "femme";
}

export function isValidEventStatus(status: string): status is EventStatus {
  return ["draft", "published", "cancelled", "completed"].includes(status);
}

export function isValidPromotionSexe(sexe: string): sexe is PromotionSexe {
  return sexe === "homme" || sexe === "femme" || sexe === "tous";
}
