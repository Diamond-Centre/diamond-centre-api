import { formatDate } from "../utils/date";
import {
  EventRecord,
  EventStatus,
  PaymentRecord,
  TicketRecord,
  UserRecord,
  UserRole,
} from "../types";

export function toUserResponse(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    created_at: user.created_at.toISOString(),
  };
}

export function toEventResponse(event: EventRecord) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    price: Number(event.price),
    currency: event.currency,
    date: formatDate(event.date),
    time: event.time,
    location: event.location,
    category: event.category,
    capacity: event.capacity,
    available_tickets: event.available_tickets,
    image_url: event.image_url,
    status: event.status,
    created_at: event.created_at.toISOString(),
    updated_at: event.updated_at.toISOString(),
  };
}

export function toCreatedEventResponse(event: EventRecord) {
  return {
    id: event.id,
    title: event.title,
    price: Number(event.price),
    date: formatDate(event.date),
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

export function isValidEventStatus(status: string): status is EventStatus {
  return ["draft", "published", "cancelled", "completed"].includes(status);
}
