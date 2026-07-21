export type UserRole = "admin" | "client";

export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type EventCategory =
  | "conference"
  | "formation"
  | "seminaire"
  | "atelier"
  | "webinaire";

export type PromotionSexe = "homme" | "femme" | "tous";

export type TicketStatus = "pending" | "confirmed" | "cancelled" | "refunded";

export type PaymentMethod = "mtn_momo" | "orange_money";
export type PaymentStatus = "pending" | "successful" | "failed" | "refunded";

export interface UserRecord {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  created_at: Date;
}

export interface EventRecord {
  id: number;
  title: string;
  description: string | null;
  price: string | number;
  currency: string;
  start_date: Date | string;
  end_date: Date | string;
  location: string;
  category: string;
  capacity: number;
  available_tickets: number;
  image_url: string | null;
  status: EventStatus;
  created_at: Date;
  updated_at: Date;
}

export interface PromotionRecord {
  id: number;
  event_id: number;
  nombre: number;
  sexe: PromotionSexe;
  pourcentage: string | number;
  duree: number;
  description: string | null;
  created_at: Date;
}

export interface TicketRecord {
  id: number;
  event_id: number;
  quantity: number;
  total_price: string | number;
  currency: string;
  status: TicketStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  expires_at: Date | null;
  created_at: Date;
  event_title?: string;
}

export interface QrCodeRecord {
  id: number;
  ticket_id: number;
  code: string;
  validated: boolean;
  validated_at: Date | null;
  ticket_status?: TicketStatus;
  customer_name?: string;
  event_title?: string;
}

export interface PaymentRecord {
  id: number;
  ticket_id: number;
  amount: string | number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  provider_fee: string | number;
  transaction_id: string | null;
  paid_at: Date | null;
  created_at: Date;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreatePromotionInput {
  nombre: number;
  sexe: PromotionSexe;
  pourcentage: number;
  duree: number;
  description?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  price: number;
  currency?: string;
  start_date: string;
  end_date: string;
  location: string;
  category: string;
  capacity: number;
  image_url?: string;
  status?: EventStatus;
  promotion?: CreatePromotionInput;
}

export interface ReserveTicketInput {
  event_id: number;
  quantity: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

export interface InitiatePaymentInput {
  ticket_id: number;
  method: PaymentMethod;
  phone: string;
}

export interface MtnCallbackInput {
  reference: string;
  status: string;
  transaction_id?: string;
}

export interface ScanQrInput {
  qr_code: string;
}
