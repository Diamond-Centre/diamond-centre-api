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

export const app = express();

// Vercel / proxies send X-Forwarded-For; required by express-rate-limit.
app.set("trust proxy", 1);

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
  assertSecurityConfig();
  if (!bootPromise) {
    bootPromise = (async () => {
      const ok = await testConnection();
      if (!ok) {
        throw new Error("PostgreSQL is not available");
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

const uploadPath = process.env.UPLOAD_PATH || "uploads";
app.use("/uploads", express.static(uploadPath));
app.use("/brand", express.static("public/brand"));

setupSwagger(app);

app.get(["/health", "/api/health"], (_req, res) => {
  res.json({
    status: "ok",
    service: "diamond-centre-api",
    timestamp: new Date().toISOString(),
  });
});

app.get(["/", "/api"], (_req, res) => {
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

function isPublicPath(path: string): boolean {
  return path === "/health" || path === "/api/health" || path === "/" || path === "/api";
}

// Bootstrap DB before API routes (needed on Vercel cold starts)
app.use(async (req, res, next) => {
  if (isPublicPath(req.path)) {
    next();
    return;
  }
  try {
    await ensureBootstrapped();
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bootstrap failed";
    console.error("Bootstrap failed:", err);
    res.status(503).json({
      error: "Service Unavailable",
      message,
    });
  }
});

app.use("/api", apiRoutes);
app.use(errorHandler);
