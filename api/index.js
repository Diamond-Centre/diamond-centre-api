/**
 * Vercel serverless entry — exports the Express app.
 * Must be CommonJS (package has no "type": "module").
 * Build with `npm run build` so dist/ is available.
 */
const { app } = require("../dist/app");

module.exports = app;
