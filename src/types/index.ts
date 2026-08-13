export type UserRole = "super_admin" | "admin" | "client";
export type UserSexe = "homme" | "femme";
export type AuthProvider = "local" | "google" | "facebook";

export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type EventCategory =
  | "conference"
  | "formation"
  | "seminaire"
  | "atelier";

export type PromotionSexe = "homme" | "femme" | "tous";

/** Ticket lifecycle: confirme → scanne | expire | rembourse */
export type TicketStatus = "confirme" | "scanne" | "expire" | "rembourse";

export type PaymentMethod = "mtn_momo" | "orange_money";
export type PaymentStatus = "pending" | "successful" | "failed" | "refunded";

export interface UserRecord {
  id: number;
  email: string;
  password_hash: string | null;
  name: string;
  role: UserRole;
  telephone: string;
  sexe: UserSexe;
  picture: string;
  auth_provider: AuthProvider;
  provider_id: string | null;
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
  start_time: string | Date;
  end_time: string | Date;
  location: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
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
  booking_id?: string | null;
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
  entry_code: string;
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
  /** Ignored on public register — always created as client. */
  role?: UserRole;
  telephone: string;
  sexe: UserSexe;
  picture: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  name?: string;
  telephone?: string;
  sexe?: UserSexe;
  picture?: string;
}

export interface SocialAuthInput {
  id_token?: string;
  access_token?: string;
  telephone?: string;
  sexe?: UserSexe;
}

export interface CreatePromotionInput {
  /** Discount percentage 1–100 (preferred name). */
  reduction?: number;
  /** Alias of reduction (backward compatible). */
  pourcentage?: number;
  nombre?: number;
  sexe?: PromotionSexe;
  duree?: number;
  description?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  price: number;
  currency?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  category: string;
  capacity: number;
  image_url?: string;
  status?: EventStatus;
  promotion?: CreatePromotionInput;
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  price?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  category?: string;
  capacity?: number;
  image_url?: string | null;
  status?: EventStatus;
  promotion?: CreatePromotionInput | null;
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

export interface CertificateRecord {
  id: number;
  code: string;
  event_id: number;
  ticket_id: number;
  user_id: number | null;
  recipient_name: string;
  recipient_email: string;
  formation_title: string;
  issued_by: number;
  issued_at: Date;
  created_at: Date;
  event_start_date?: Date | string;
  event_end_date?: Date | string;
  event_location?: string;
  issuer_name?: string;
}

export interface IssueCertificatesInput {
  event_id: number;
  ticket_ids?: number[];
}


export interface CertificateRecord {
  id: number;
  code: string;
  event_id: number;
  ticket_id: number;
  user_id: number | null;
  recipient_name: string;
  recipient_email: string;
  formation_title: string;
  issued_by: number;
  issued_at: Date;
  created_at: Date;
  event_start_date?: Date | string;
  event_end_date?: Date | string;
  event_location?: string;
  issuer_name?: string;
}

export interface IssueCertificatesInput {
  event_id: number;
  ticket_ids?: number[];
}

