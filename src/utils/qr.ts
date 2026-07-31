import crypto from "crypto";

export function generateQrCode(ticketId: number): string {
  const suffix = crypto.randomBytes(4).toString("hex");
  return `dc_${ticketId}_${suffix}`;
}

/** 8-digit numeric code shown under the QR for manual admin validation. */
export function generateEntryCode(): string {
  return String(crypto.randomInt(10_000_000, 100_000_000));
}

export function generatePaymentReference(method: string): string {
  const prefix = method === "mtn_momo" ? "MTN-REF" : "OM-REF";
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}
