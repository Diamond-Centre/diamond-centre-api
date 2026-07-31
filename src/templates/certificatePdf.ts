import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

type CertificatePdfInput = {
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

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          const t = chunk + ch;
          if (font.widthOfTextAtSize(t, size) <= maxWidth) chunk = t;
          else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
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

function resolveLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "brand", "dice-logo.jpg"),
    path.join(__dirname, "..", "..", "public", "brand", "dice-logo.jpg"),
  ];
  return candidates.find((file) => fs.existsSync(file)) ?? null;
}

export async function renderCertificatePdf(
  cert: CertificatePdfInput
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const slab = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const paper = rgb(1, 1, 1);
  const ink = rgb(0.043, 0.11, 0.2);
  const blue = rgb(0, 0.278, 0.671);
  const red = rgb(0.89, 0.024, 0.075);
  const muted = rgb(0.35, 0.42, 0.51);

  const contentLeft = 68;
  const contentRight = width - 68;
  const contentWidth = contentRight - contentLeft;
  const centerX = width / 2;

  const drawCentered = (
    text: string,
    y: number,
    size: number,
    fnt: typeof font,
    color: ReturnType<typeof rgb>
  ) => {
    const tw = fnt.widthOfTextAtSize(text, size);
    page.drawText(text, { x: centerX - tw / 2, y, size, font: fnt, color });
  };

  const drawCenteredWrapped = (
    text: string,
    yStart: number,
    size: number,
    fnt: typeof font,
    color: ReturnType<typeof rgb>,
    maxW: number,
    lineGap: number
  ) => {
    const lines = wrapText(text, fnt, size, maxW);
    let y = yStart;
    for (const line of lines) {
      drawCentered(line, y, size, fnt, color);
      y -= size + lineGap;
    }
    return y;
  };

  page.drawRectangle({ x: 0, y: 0, width, height, color: paper });
  page.drawRectangle({
    x: 18,
    y: 18,
    width: width - 36,
    height: height - 36,
    borderColor: blue,
    borderWidth: 3,
  });
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    borderColor: red,
    borderWidth: 1.5,
  });

  const logoPath = resolveLogoPath();
  let logo: Awaited<ReturnType<typeof pdfDoc.embedJpg>> | null = null;
  let y = height - 70;

  if (logoPath) {
    logo = await pdfDoc.embedJpg(fs.readFileSync(logoPath));
    const logoW = 260;
    const logoH = (logo.height / logo.width) * logoW;
    y = height - 52 - logoH;
    page.drawImage(logo, {
      x: centerX - logoW / 2,
      y,
      width: logoW,
      height: logoH,
    });
    y -= 22;
  }

  drawCentered(
    "EXCELLENCE  ·  FORMATION  ·  CERTIFICATION",
    y,
    9,
    fontBold,
    red
  );
  y -= 28;
  drawCentered("CERTIFICAT DE FORMATION", y, 26, slab, blue);
  y -= 22;
  drawCentered(
    "Attestation de participation et de reussite",
    y,
    12,
    italic,
    red
  );
  y -= 18;
  page.drawLine({
    start: { x: centerX - 160, y },
    end: { x: centerX + 160, y },
    thickness: 1.5,
    color: blue,
  });

  y -= 28;
  drawCentered("DECERNE A", y, 9, fontBold, blue);
  y -= 28;
  y = drawCenteredWrapped(
    cert.recipient_name,
    y,
    30,
    slab,
    ink,
    contentWidth * 0.75,
    6
  );
  y -= 4;
  page.drawLine({
    start: { x: centerX - 140, y },
    end: { x: centerX + 140, y },
    thickness: 2,
    color: blue,
  });

  y -= 24;
  drawCentered(
    "pour avoir suivi avec succes la formation",
    y,
    12,
    font,
    ink
  );
  y -= 18;
  y = drawCenteredWrapped(
    `« ${cert.formation_title} »`,
    y,
    13,
    slab,
    blue,
    contentWidth * 0.8,
    4
  );
  y -= 2;
  drawCentered(`organisee par ${cert.organization}.`, y, 12, font, ink);
  y -= 18;
  drawCentered("Fulfil your dreams...", y, 11, italic, red);

  const period =
    cert.start_date && cert.end_date
      ? cert.start_date === cert.end_date
        ? cert.start_date
        : `${cert.start_date} - ${cert.end_date}`
      : "—";

  const metaTop = 155;
  const colGap = 24;
  const colW = (contentWidth - colGap * 2) / 3;
  const cols = [
    { label: "PERIODE", value: period },
    { label: "LIEU", value: cert.location || "—" },
    { label: "DELIVRE LE", value: formatIssuedAt(cert.issued_at) },
  ];
  cols.forEach((c, i) => {
    const x = contentLeft + i * (colW + colGap);
    page.drawLine({
      start: { x, y: metaTop },
      end: { x: x + colW, y: metaTop },
      thickness: 2,
      color: blue,
    });
    page.drawText(c.label, {
      x,
      y: metaTop - 16,
      size: 8,
      font: fontBold,
      color: red,
    });
    const valueLines = wrapText(c.value, font, 10, colW);
    let vy = metaTop - 32;
    for (const line of valueLines) {
      page.drawText(line, { x, y: vy, size: 10, font, color: ink });
      vy -= 13;
    }
  });

  const fy = 62;
  page.drawLine({
    start: { x: contentLeft, y: fy + 30 },
    end: { x: contentLeft + 160, y: fy + 30 },
    thickness: 2,
    color: blue,
  });
  page.drawText(cert.issuer_name || "Direction Diamond Centre", {
    x: contentLeft,
    y: fy + 14,
    size: 10,
    font: fontBold,
    color: ink,
  });
  page.drawText("DIRECTION", {
    x: contentLeft,
    y: fy,
    size: 8,
    font: fontBold,
    color: red,
  });

  const sealX = centerX;
  const sealY = fy + 22;
  page.drawCircle({
    x: sealX,
    y: sealY,
    size: 30,
    borderColor: blue,
    borderWidth: 2.5,
    color: rgb(1, 1, 1),
  });
  page.drawCircle({
    x: sealX,
    y: sealY,
    size: 26,
    borderColor: red,
    borderWidth: 1.2,
    color: rgb(1, 1, 1),
  });
  if (logo) {
    const sealW = 44;
    const sealH = (logo.height / logo.width) * sealW;
    page.drawImage(logo, {
      x: sealX - sealW / 2,
      y: sealY - sealH / 2,
      width: sealW,
      height: sealH,
    });
  }

  const codeLines = [
    `N° ${cert.code}`,
    "Verifiable aupres de Diamond Centre",
  ];
  let cy = fy + 14;
  for (const [idx, line] of codeLines.entries()) {
    const size = idx === 0 ? 9 : 8;
    const tw = font.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: contentRight - tw,
      y: cy,
      size,
      font,
      color: muted,
    });
    cy -= 12;
  }

  return pdfDoc.save();
}
