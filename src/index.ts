import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { testConnection } from "./db";
import { runMigrations } from "./db/migrate";
import { setupSwagger } from "./config/swagger";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

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

async function start() {
  const dbConnected = await testConnection();

  if (dbConnected) {
    await runMigrations();
  }

  app.listen(PORT, () => {
    console.log(`DICE backend running on http://localhost:${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
    if (!dbConnected) {
      console.warn(
        "PostgreSQL is not available. Start it with: npm run db:start"
      );
    }
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
