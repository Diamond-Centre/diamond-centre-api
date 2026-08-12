import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { setupSwagger } from "./config/swagger";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { assertSecurityConfig, isProduction } from "./utils/security";
import { testConnection } from "./db";
import { runMigrations } from "./db/migrate";
import { ensureDefaultAdmin } from "./db/ensureDefaultAdmin";

dotenv.config();
assertSecurityConfig();

export const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

function buildCorsOrigin(): cors.CorsOptions["origin"] {
  const raw = process.env.FRONTEND_ORIGINS || process.env.CORS_ORIGINS || "";
  const allowlist = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowlist.length === 0) {
    if (isProduction()) {
      console.warn(
        "[security] FRONTEND_ORIGINS unset in production — CORS will deny browser origins"
      );
      return false;
    }
    return true;
  }

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowlist.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  };
}

const corsOptions: cors.CorsOptions = {
  origin: buildCorsOrigin(),
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
    "X-Payment-Callback-Secret",
  ],
  exposedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(morgan(isProduction() ? "combined" : "dev"));
app.use(express.json({ limit: "8mb" }));

let bootPromise: Promise<void> | null = null;

/** Run once per cold start (Vercel) or before listen (local). */
export async function ensureBootstrapped(): Promise<void> {
  if (!bootPromise) {
    bootPromise = (async () => {
      const ok = await testConnection();
      if (!ok) {
        console.warn("PostgreSQL not available during bootstrap");
        return;
      }
      await runMigrations();
      await ensureDefaultAdmin();
    })().catch((err) => {
      bootPromise = null;
      throw err;
    });
  }
  await bootPromise;
}

// Bootstrap DB before any route (needed on Vercel cold starts)
app.use(async (_req, _res, next) => {
  try {
    await ensureBootstrapped();
    next();
  } catch (err) {
    next(err);
  }
});

const uploadPath = process.env.UPLOAD_PATH || "uploads";
app.use("/uploads", express.static(uploadPath));
app.use("/brand", express.static("public/brand"));

setupSwagger(app);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "diamond-centre-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.json({
    message: "Diamond Centre API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      api: "/api",
      docs: isProduction() ? undefined : "/api-docs",
      openapi: isProduction() ? undefined : "/api-docs.json",
    },
  });
});

app.use("/api", apiRoutes);
app.use(errorHandler);
