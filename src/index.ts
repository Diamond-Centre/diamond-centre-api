import os from "os";
import { app, ensureBootstrapped } from "./app";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

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
  await ensureBootstrapped();

  app.listen(PORT, HOST, () => {
    const lanIps = getLanIPv4Addresses();

    console.log(`DICE backend listening on ${HOST}:${PORT}`);
    console.log(`Local:   http://localhost:${PORT}`);
    lanIps.forEach((ip) => {
      console.log(`Network: http://${ip}:${PORT}`);
      console.log(`API:     http://${ip}:${PORT}/api`);
      if (process.env.NODE_ENV !== "production") {
        console.log(`Swagger: http://${ip}:${PORT}/api-docs`);
      }
    });
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
