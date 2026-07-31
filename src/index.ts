import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import os from "os";
import { testConnection } from "./db";
import { runMigrations } from "./db/migrate";
import { ensureDefaultAdmin } from "./db/ensureDefaultAdmin";
import { setupSwagger } from "./config/swagger";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const corsOptions: cors.CorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],
  exposedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

app.use(cors(corsOptions));
// Ensure every preflight gets CORS headers (avoids 405 without Allow-Origin)
app.options("*", cors(corsOptions));

app.use(morgan("dev"));
app.use(express.json({ limit: "8mb" }));

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
      docs: "/api-docs",
      openapi: "/api-docs.json",
    },
  });
});

app.use("/api", apiRoutes);
app.use(errorHandler);

function getLanIPv4Addresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const iface of entries) {
      if (iface.internal) continue;
      if (iface.family === "IPv4" || (iface.family as unknown) === 4) {
        addresses.push(iface.address);
      }
    }
  }

  return addresses;
}

async function start() {
  const dbConnected = await testConnection();

  if (dbConnected) {
    await runMigrations();
    await ensureDefaultAdmin();
  }

  app.listen(PORT, HOST, () => {
    const lanIps = getLanIPv4Addresses();

    console.log(`DICE backend listening on ${HOST}:${PORT}`);
    console.log(`Local:   http://localhost:${PORT}`);
    lanIps.forEach((ip) => {
      console.log(`Network: http://${ip}:${PORT}`);
      console.log(`API:     http://${ip}:${PORT}/api`);
      console.log(`Swagger: http://${ip}:${PORT}/api-docs`);
    });
    if (!dbConnected) {
      console.warn(
        "PostgreSQL is not available. Start it with: npm run db:start",
      );
    }
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
