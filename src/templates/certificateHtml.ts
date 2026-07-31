import fs from "fs";
import path from "path";
import { toPublicUrl } from "../utils/publicUrl";

type CertificateView = {
  code: string;
  recipient_name: string;
  formation_title: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  issued_at: string;
  issuer_name: string | null;
  organization: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatIssuedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function resolveLogoSrc(): string {
  const candidates = [
    path.join(process.cwd(), "public", "brand", "dice-logo.jpg"),
    path.join(process.cwd(), "public", "brand", "dice-logo.png"),
    path.join(__dirname, "..", "..", "public", "brand", "dice-logo.jpg"),
    path.join(__dirname, "..", "..", "public", "brand", "dice-logo.png"),
  ];

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      const base64 = fs.readFileSync(file).toString("base64");
      const mime =
        file.endsWith(".jpg") || file.endsWith(".jpeg")
          ? "image/jpeg"
          : "image/png";
      return `data:${mime};base64,${base64}`;
    }
  }

  return toPublicUrl("/brand/dice-logo.jpg") || "/brand/dice-logo.jpg";
}

/** Diamond Centre certificate — fonts/colors aligned with brand logo. */
export function renderCertificateHtml(cert: CertificateView): string {
  const name = escapeHtml(cert.recipient_name);
  const formation = escapeHtml(cert.formation_title);
  const location = escapeHtml(cert.location || "—");
  const code = escapeHtml(cert.code);
  const issuer = escapeHtml(cert.issuer_name || "Direction Diamond Centre");
  const org = escapeHtml(cert.organization);
  const logoSrc = resolveLogoSrc();
  const period =
    cert.start_date && cert.end_date
      ? escapeHtml(
          cert.start_date === cert.end_date
            ? cert.start_date
            : `${cert.start_date} → ${cert.end_date}`
        )
      : "—";
  const issued = escapeHtml(formatIssuedAt(cert.issued_at));

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Certificat — ${formation}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@500;700;800&family=Roboto+Slab:wght@600;700;800&display=swap');
    :root {
      --ink: #0b1c33;
      --blue: #0047ab;
      --blue-deep: #003380;
      --red: #e30613;
      --paper: #ffffff;
      --mist: #eef2f7;
      --line: #c5d3e8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: var(--mist);
      font-family: "Montserrat", "Arial", sans-serif;
      color: var(--ink);
      padding: 20px;
    }
    .certificate {
      width: min(1000px, 100%);
      max-width: 1000px;
      background: var(--paper);
      border: 1px solid var(--line);
      box-shadow: 0 18px 40px rgba(0, 71, 171, 0.12);
      position: relative;
      padding: 48px 56px 40px;
      overflow: hidden;
    }
    .certificate::before {
      content: "";
      position: absolute;
      inset: 14px;
      border: 3px solid var(--blue);
      pointer-events: none;
    }
    .certificate::after {
      content: "";
      position: absolute;
      inset: 22px;
      border: 1.5px solid var(--red);
      pointer-events: none;
    }
    .inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      text-align: center;
      min-height: 620px;
    }
    .header {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-bottom: 8px;
    }
    .logo {
      width: min(300px, 55%);
      height: auto;
      object-fit: contain;
      display: block;
      margin: 0 auto 10px;
    }
    .eyebrow {
      margin: 0 0 14px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: var(--red);
    }
    .title {
      font-family: "Roboto Slab", "Rockwell", Georgia, serif;
      font-size: clamp(26px, 4vw, 38px);
      margin: 0 0 8px;
      font-weight: 800;
      color: var(--blue);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      line-height: 1.15;
    }
    .subtitle {
      margin: 0;
      font-family: "Libre Baskerville", Georgia, serif;
      font-style: italic;
      color: var(--red);
      font-size: 14px;
      line-height: 1.4;
    }
    .divider {
      width: min(420px, 70%);
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--blue), transparent);
      margin: 22px auto;
      border: 0;
    }
    .main {
      width: 100%;
      max-width: 780px;
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      justify-content: center;
      padding: 4px 12px 8px;
    }
    .awarded {
      margin: 0 0 10px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      font-size: 11px;
      font-weight: 700;
      color: var(--blue-deep);
    }
    .recipient {
      font-family: "Roboto Slab", "Rockwell", Georgia, serif;
      font-size: clamp(28px, 4.5vw, 44px);
      font-weight: 700;
      margin: 0 0 14px;
      padding: 0 16px 10px;
      border-bottom: 2px solid var(--blue);
      color: var(--ink);
      line-height: 1.2;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .body {
      margin: 0;
      max-width: 640px;
      line-height: 1.65;
      font-size: clamp(13px, 1.6vw, 15px);
      font-weight: 500;
      padding: 0 8px;
    }
    .formation {
      font-family: "Roboto Slab", Georgia, serif;
      font-weight: 700;
      color: var(--blue);
      display: inline;
    }
    .tagline {
      margin: 14px 0 0;
      font-family: "Libre Baskerville", Georgia, serif;
      font-style: italic;
      color: var(--red);
      font-size: 13px;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
      width: 100%;
      max-width: 820px;
      margin: 28px auto 0;
      text-align: left;
    }
    .meta div {
      border-top: 2px solid var(--blue);
      padding-top: 10px;
      min-width: 0;
    }
    .meta strong {
      display: block;
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--red);
      margin-bottom: 6px;
      font-weight: 800;
    }
    .meta span {
      display: block;
      font-weight: 500;
      font-size: 13px;
      line-height: 1.4;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .footer {
      width: 100%;
      max-width: 820px;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: end;
      gap: 20px;
      margin-top: 32px;
      padding-top: 8px;
    }
    .sign {
      text-align: left;
      justify-self: start;
    }
    .sign .line {
      border-top: 2px solid var(--blue);
      margin-bottom: 8px;
      width: 170px;
    }
    .sign .name {
      font-weight: 700;
      font-size: 13px;
      line-height: 1.3;
      max-width: 200px;
      overflow-wrap: anywhere;
    }
    .sign .role {
      margin-top: 2px;
      font-size: 10px;
      color: var(--red);
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .seal {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      border: 3px solid var(--blue);
      box-shadow: inset 0 0 0 2px var(--red);
      display: grid;
      place-items: center;
      background: #fff;
      overflow: hidden;
      padding: 10px;
      justify-self: center;
    }
    .seal img {
      width: 100%;
      height: auto;
      object-fit: contain;
    }
    .code {
      text-align: right;
      justify-self: end;
      font-size: 11px;
      color: #5a6b82;
      line-height: 1.45;
      max-width: 220px;
      overflow-wrap: anywhere;
    }
    @media (max-width: 700px) {
      .certificate { padding: 36px 28px 28px; }
      .meta { grid-template-columns: 1fr; gap: 14px; }
      .footer {
        grid-template-columns: 1fr;
        justify-items: center;
        text-align: center;
      }
      .sign, .code { justify-self: center; text-align: center; }
      .sign .line { margin-left: auto; margin-right: auto; }
    }
    @media print {
      body { background: white; padding: 0; }
      .certificate { box-shadow: none; width: 100%; min-height: 100vh; }
    }
  </style>
</head>
<body>
  <article class="certificate" role="document">
    <div class="inner">
      <header class="header">
        <img class="logo" src="${logoSrc}" alt="Diamond Centre" />
        <p class="eyebrow">Excellence · Formation · Certification</p>
        <h1 class="title">Certificat de Formation</h1>
        <p class="subtitle">Attestation de participation et de réussite</p>
      </header>

      <hr class="divider" />

      <section class="main">
        <p class="awarded">Décerné à</p>
        <p class="recipient">${name}</p>
        <p class="body">
          pour avoir suivi avec succès la formation
          <span class="formation">« ${formation} »</span>
          organisée par ${org}.
        </p>
        <p class="tagline">Fulfil your dreams...</p>

        <div class="meta">
          <div><strong>Période</strong><span>${period}</span></div>
          <div><strong>Lieu</strong><span>${location}</span></div>
          <div><strong>Délivré le</strong><span>${issued}</span></div>
        </div>
      </section>

      <footer class="footer">
        <div class="sign">
          <div class="line"></div>
          <div class="name">${issuer}</div>
          <div class="role">Direction</div>
        </div>
        <div class="seal">
          <img src="${logoSrc}" alt="DiCe" />
        </div>
        <div class="code">
          N° ${code}<br/>
          Vérifiable auprès de Diamond Centre
        </div>
      </footer>
    </div>
  </article>
</body>
</html>`;
}
