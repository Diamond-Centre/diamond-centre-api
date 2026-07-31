import { randomBytes } from "crypto";
import { formatDate } from "../utils/date";
import { toPublicUrl } from "../utils/publicUrl";
import { CertificateRecord } from "../types";

export function generateCertificateCode(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `DICE-${stamp}-${rand}`;
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
    organization: "Diamond Centre",
    verify_url: toPublicUrl(`/api/certificates/${cert.code}`),
    template_url: toPublicUrl(`/api/certificates/${cert.code}/template`),
    created_at: cert.created_at.toISOString(),
  };
}

/** Structured fields for a Diamond Centre certificate UI template. */
export function toCertificateTemplateData(cert: CertificateRecord) {
  const base = toCertificateResponse(cert);
  return {
    ...base,
    template: {
      brand: "Diamond Centre",
      brand_short: "DICE",
      title: "Certificat de Formation",
      subtitle: "Certificate of Completion",
      statement_fr: `Ceci certifie que`,
      statement_en: `This is to certify that`,
      completed_fr: `a suivi avec succès la formation`,
      completed_en: `has successfully completed the training`,
      footer_fr: "Délivré par Diamond Centre",
      footer_en: "Issued by Diamond Centre",
      colors: {
        primary: "#0B1F3A",
        accent: "#C9A227",
        background: "#F7F4EE",
        text: "#1A1A1A",
        muted: "#5C6570",
      },
    },
  };
}
