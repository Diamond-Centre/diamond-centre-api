import crypto from "crypto";

export function generateQrCode(ticketId: number): string {
  const suffix = crypto.randomBytes(4).toString("hex");
  return `dc_${ticketId}_${suffix}`;
}

export function generatePaymentReference(method: string): string {
  const prefix = method === "mtn_momo" ? "MTN-REF" : "OM-REF";
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}
