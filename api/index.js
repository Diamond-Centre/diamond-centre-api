/**
 * Vercel serverless entry — exports the Express app.
 * Must be CommonJS (package has no "type": "module").
 * Build with `npm run build` so dist/ is available.
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
      return require(candidate).app;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

try {
  module.exports = loadApp();
} catch (err) {
  console.error("Failed to load Express app:", err);
  module.exports = (_req, res) => {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "FUNCTION_LOAD_FAILED",
        message: err instanceof Error ? err.message : String(err),
      })
    );
  };
}
