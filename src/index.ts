import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "DICE-PROJECT-BACKEND",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.json({
    message: "DICE Project Backend API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
    },
  });
});

async function start() {
  const dbConnected = await testConnection();

  app.listen(PORT, () => {
    console.log(`DICE backend running on http://localhost:${PORT}`);
    if (!dbConnected) {
      console.warn(
        "PostgreSQL is not available. Start it with: docker compose up -d"
      );
    }
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
