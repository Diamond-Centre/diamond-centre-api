/**
 * Generates Diamond Centre Vercel deploy + test guide PDF on Desktop.
 * Run: npx ts-node scripts/generate-deploy-guide-pdf.ts
 */
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE = 14;
const BLUE = rgb(0.04, 0.54, 0.95);
const DARK = rgb(0.12, 0.14, 0.18);
const MUTED = rgb(0.4, 0.42, 0.45);
const LIGHT = rgb(0.96, 0.97, 0.98);

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
};

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
}

function ensureSpace(ctx: Ctx, need: number) {
  if (ctx.y - need < MARGIN + 20) newPage(ctx);
}

function drawFooter(ctx: Ctx, pageIndex: number, total: number) {
  ctx.page.drawText(`Diamond Centre - Vercel Deploy Guide  |  ${pageIndex}/${total}`, {
    x: MARGIN,
    y: 28,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
}

function title(ctx: Ctx, text: string) {
  ensureSpace(ctx, 40);
  ctx.page.drawText(text, {
    x: MARGIN,
    y: ctx.y,
    size: 18,
    font: ctx.bold,
    color: DARK,
  });
  ctx.y -= 8;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y,
    width: 80,
    height: 2.5,
    color: BLUE,
  });
  ctx.y -= 28;
}

function h2(ctx: Ctx, text: string) {
  ensureSpace(ctx, 32);
  ctx.page.drawText(text, {
    x: MARGIN,
    y: ctx.y,
    size: 13,
    font: ctx.bold,
    color: BLUE,
  });
  ctx.y -= 22;
}

function h3(ctx: Ctx, text: string) {
  ensureSpace(ctx, 24);
  ctx.page.drawText(text, {
    x: MARGIN,
    y: ctx.y,
    size: 11,
    font: ctx.bold,
    color: DARK,
  });
  ctx.y -= 18;
}

function wrapLines(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxW) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function para(ctx: Ctx, text: string, size = 10) {
  const lines = wrapLines(text, ctx.font, size, CONTENT_W);
  for (const line of lines) {
    ensureSpace(ctx, LINE + 2);
    ctx.page.drawText(line, {
      x: MARGIN,
      y: ctx.y,
      size,
      font: ctx.font,
      color: DARK,
    });
    ctx.y -= LINE;
  }
  ctx.y -= 6;
}

function bullet(ctx: Ctx, text: string) {
  const lines = wrapLines(text, ctx.font, 10, CONTENT_W - 18);
  for (let i = 0; i < lines.length; i++) {
    ensureSpace(ctx, LINE + 2);
    if (i === 0) {
      ctx.page.drawText("•", {
        x: MARGIN,
        y: ctx.y,
        size: 10,
        font: ctx.bold,
        color: BLUE,
      });
    }
    ctx.page.drawText(lines[i], {
      x: MARGIN + 14,
      y: ctx.y,
      size: 10,
      font: ctx.font,
      color: DARK,
    });
    ctx.y -= LINE;
  }
  ctx.y -= 3;
}

function codeBlock(ctx: Ctx, lines: string[]) {
  const pad = 10;
  const lineH = 12;
  const boxH = pad * 2 + lines.length * lineH;
  ensureSpace(ctx, boxH + 10);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - boxH + 4,
    width: CONTENT_W,
    height: boxH,
    color: LIGHT,
    borderColor: rgb(0.85, 0.87, 0.9),
    borderWidth: 0.8,
  });
  let ty = ctx.y - pad;
  for (const line of lines) {
    ctx.page.drawText(line.slice(0, 95), {
      x: MARGIN + pad,
      y: ty,
      size: 8.5,
      font: ctx.font,
      color: DARK,
    });
    ty -= lineH;
  }
  ctx.y -= boxH + 12;
}

function table(ctx: Ctx, headers: string[], rows: string[][], colW: number[]) {
  const rowH = 22;
  const headerH = 24;
  ensureSpace(ctx, headerH + rows.length * rowH + 10);

  let x = MARGIN;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - headerH + 6,
    width: CONTENT_W,
    height: headerH,
    color: BLUE,
  });
  for (let i = 0; i < headers.length; i++) {
    ctx.page.drawText(headers[i], {
      x: x + 6,
      y: ctx.y - 10,
      size: 9,
      font: ctx.bold,
      color: rgb(1, 1, 1),
    });
    x += colW[i];
  }
  ctx.y -= headerH;

  rows.forEach((row, idx) => {
    ensureSpace(ctx, rowH + 4);
    if (idx % 2 === 0) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: ctx.y - rowH + 8,
        width: CONTENT_W,
        height: rowH,
        color: LIGHT,
      });
    }
    let cx = MARGIN;
    for (let i = 0; i < row.length; i++) {
      ctx.page.drawText(row[i].slice(0, 42), {
        x: cx + 6,
        y: ctx.y - 6,
        size: 8,
        font: ctx.font,
        color: DARK,
      });
      cx += colW[i];
    }
    ctx.y -= rowH;
  });
  ctx.y -= 12;
}

function checkItem(ctx: Ctx, text: string) {
  ensureSpace(ctx, LINE + 4);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 2,
    width: 10,
    height: 10,
    borderColor: BLUE,
    borderWidth: 1.2,
    color: rgb(1, 1, 1),
  });
  const lines = wrapLines(text, ctx.font, 10, CONTENT_W - 20);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ensureSpace(ctx, LINE);
    ctx.page.drawText(lines[i], {
      x: MARGIN + 18,
      y: ctx.y,
      size: 10,
      font: ctx.font,
      color: DARK,
    });
    ctx.y -= LINE;
  }
  ctx.y -= 4;
}

async function main() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE_W, PAGE_H]),
    font,
    bold,
    y: PAGE_H - MARGIN,
  };

  // Cover
  ctx.page.drawRectangle({
    x: 0,
    y: PAGE_H - 160,
    width: PAGE_W,
    height: 160,
    color: BLUE,
  });
  ctx.page.drawText("DIAMOND CENTRE (DICE)", {
    x: MARGIN,
    y: PAGE_H - 60,
    size: 12,
    font: bold,
    color: rgb(1, 1, 1),
  });
  ctx.page.drawText("Vercel Deployment & Test Guide", {
    x: MARGIN,
    y: PAGE_H - 95,
    size: 22,
    font: bold,
    color: rgb(1, 1, 1),
  });
  ctx.page.drawText("Backend (Express API) + Frontend (Next.js)", {
    x: MARGIN,
    y: PAGE_H - 120,
    size: 11,
    font,
    color: rgb(0.9, 0.95, 1),
  });
  ctx.y = PAGE_H - 190;

  para(
    ctx,
    "Use this guide when you are ready to deploy. Follow the steps in order, then use the checklist at the end to test production."
  );

  h2(ctx, "Architecture");
  bullet(ctx, "Frontend (Next.js) on Vercel - browser calls /api on the same domain.");
  bullet(ctx, "Backend (Express) on Vercel serverless - api/index.js wraps the Express app.");
  bullet(ctx, "Postgres must be hosted (Neon, Supabase, or Vercel Postgres). Local DB will not work on Vercel.");
  bullet(ctx, "Next.js rewrites /api/* to BACKEND_URL/api/* (server-side proxy).");

  h2(ctx, "Important limits on Vercel");
  bullet(ctx, "Uploaded files on local disk are ephemeral (lost on redeploy). Prefer cloud storage later.");
  bullet(ctx, "Cold starts may take a few seconds on first request.");
  bullet(ctx, "Set strong JWT secrets - weak placeholders are rejected in production.");

  // Page 2 content continues
  h2(ctx, "Step 1 - Create hosted Postgres");
  para(ctx, "1. Go to https://neon.tech (or Supabase) and create a free project.");
  para(ctx, "2. Copy the connection string (DATABASE_URL), e.g. postgres://user:pass@host/db?sslmode=require");

  h2(ctx, "Step 2 - Deploy the Backend");
  para(ctx, "From the backend repo:");
  codeBlock(ctx, [
    "cd ~/Desktop/DICE-PROJECT-BACKEND",
    "npx vercel login",
    "npx vercel",
  ]);
  para(ctx, "In Vercel Dashboard -> Project -> Settings -> Environment Variables, add:");

  table(
    ctx,
    ["Variable", "Value / notes"],
    [
      ["NODE_ENV", "production"],
      ["DATABASE_URL", "Neon/Supabase connection string"],
      ["JWT_SECRET", "Long random string (>=16 chars)"],
      ["REFRESH_TOKEN_SECRET", "Long random string (>=16 chars)"],
      ["PAYMENT_CALLBACK_SECRET", "Long random string (>=16 chars)"],
      ["FRONTEND_ORIGINS", "https://your-web.vercel.app"],
      ["DEFAULT_ADMIN_EMAIL", "admin@dice.cm (or yours)"],
      ["DEFAULT_ADMIN_PASSWORD", "Strong password - change later"],
    ],
    [200, 295]
  );

  para(ctx, "Then promote to production:");
  codeBlock(ctx, ["npx vercel --prod"]);
  para(ctx, "Save the API URL, for example: https://dice-api.vercel.app");
  para(ctx, "Quick health check:");
  codeBlock(ctx, ["curl https://dice-api.vercel.app/health"]);

  h2(ctx, "Step 3 - Deploy the Frontend");
  para(ctx, "From the web repo:");
  codeBlock(ctx, [
    "cd ~/Desktop/diamond-centre-web-main",
    "npx vercel login",
    "npx vercel",
  ]);
  para(ctx, "Set these environment variables on the frontend Vercel project:");
  table(
    ctx,
    ["Variable", "Value"],
    [
      ["NEXT_PUBLIC_API_URL", "/api"],
      ["NEXT_PUBLIC_APP_NAME", "Diamond Centre"],
      ["BACKEND_URL", "https://dice-api.vercel.app  (no /api)"],
    ],
    [200, 295]
  );
  codeBlock(ctx, ["npx vercel --prod"]);
  para(
    ctx,
    "After you have the web URL, go back to the API project and set FRONTEND_ORIGINS to that exact URL (https://your-web.vercel.app), then redeploy the API."
  );

  h2(ctx, "Step 4 - Default login");
  bullet(ctx, "Super admin (bootstrapped): admin@dice.cm / Admin@123 (or your DEFAULT_* env values)");
  bullet(ctx, "Public register only creates clients - only super_admin can create other admins.");
  bullet(ctx, "Change the default password after first login.");

  h2(ctx, "Production test checklist");
  para(ctx, "Mark each item when it works:");
  checkItem(ctx, "GET /health on API returns { status: \"ok\" }");
  checkItem(ctx, "Frontend loads on Vercel URL");
  checkItem(ctx, "Login as super admin works");
  checkItem(ctx, "Create event (admin) works");
  checkItem(ctx, "Public register creates client only");
  checkItem(ctx, "Reserve ticket works");
  checkItem(ctx, "Payment initiate requires JWT (401 without token)");
  checkItem(ctx, "GET ticket by id requires ownership / admin");
  checkItem(ctx, "MTN callback without X-Payment-Callback-Secret fails");
  checkItem(ctx, "Validation scan / entry-code works as admin");
  checkItem(ctx, "CORS: browser from FRONTEND_ORIGINS can call API (via /api proxy)");
  checkItem(ctx, "Swagger /api-docs is hidden in production (unless ENABLE_SWAGGER=true)");

  h2(ctx, "Useful commands");
  codeBlock(ctx, [
    "# API health",
    "curl https://YOUR-API.vercel.app/health",
    "",
    "# Login",
    "curl -X POST https://YOUR-API.vercel.app/api/auth/login \\",
    "  -H 'Content-Type: application/json' \\",
    "  -d '{\"email\":\"admin@dice.cm\",\"password\":\"Admin@123\"}'",
  ]);

  h2(ctx, "If something fails");
  bullet(ctx, "API 500 on start -> check JWT_SECRET / DATABASE_URL in Vercel env.");
  bullet(ctx, "Frontend /api 502 -> BACKEND_URL wrong or API not deployed.");
  bullet(ctx, "CORS errors -> set FRONTEND_ORIGINS to exact web URL and redeploy API.");
  bullet(ctx, "DB errors -> ensure Neon URL includes ?sslmode=require if required.");
  bullet(ctx, "Uploads disappear -> expected on Vercel disk; use cloud storage later.");

  // Footers
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    ctx.page = page;
    drawFooter(ctx, i + 1, pages.length);
  });

  const out = path.join(
    process.env.HOME || "/home/brandon",
    "Desktop",
    "DICE_Vercel_Deploy_and_Test_Guide.pdf"
  );
  fs.writeFileSync(out, await doc.save());
  console.log(`Wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
