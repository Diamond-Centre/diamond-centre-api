/**
 * Vercel serverless entry — default export must be the Express app.
 */
const path = require("path");

function loadApp() {
  const candidates = [
    path.join(__dirname, "..", "dist", "app.js"),
    path.join(process.cwd(), "dist", "app.js"),
  ];

  let lastError;
  for (const candidate of candidates) {
    try {
      const mod = require(candidate);
      const app = mod.default || mod.app;
      if (typeof app === "function") return app;
      lastError = new Error(`Invalid export in ${candidate}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

const app = loadApp();
module.exports = app;
module.exports.default = app;
