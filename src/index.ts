import { Hono } from "hono";
import { apiReference } from "@scalar/hono-api-reference";

import authHandler from "./routes/authHandler.js";
import dashboardHandler from "./routes/dashboardHandler.js";
import challengeHandler from "./routes/challengeHandler.js";
import globalSettingsHandler from "./routes/globalSettingsHandler.js";
import activityHandler from "./routes/activityHandler.js";
import cronHandler from "./routes/cronHandler.js";
import metricHandler from "./routes/metricHandler.js";
import mlHandler from "./routes/mlHandler.js";
import { readFile } from "fs/promises";
import dotenv from "dotenv";
dotenv.config();
const openapi = JSON.parse(
  await readFile(new URL("../openapi.json", import.meta.url), "utf-8")
);

import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

const app = new Hono();
app.use(
  "*",
  cors({
    origin: "http://app.welltrack.local",
    credentials: true,
  })
);
app.get("/openapi.json", (c) => c.json(openapi));
/**
 * @openapi
 * /reference:
 *   get:
 *     summary: View the Swagger UI for the API
 *     description: This serves the Scalar API reference interface.
 *     responses:
 *       200:
 *         description: HTML page showing the API documentation
 */
app.get(
  "/reference",
  apiReference({
    pageTitle: "Hono API Reference",
    spec: {
      url: "/openapi.json", // Serve this from a file or route later
    },
  })
);

/**
 * @openapi
 * /:
 *   get:
 *     summary: Root endpoint
 *     description: Basic welcome message
 *     responses:
 *       200:
 *         description: Returns welcome text
 */
app.get("/", (c) =>
  c.text("Welcome to the Hono API! Explore the API reference at /reference.")
);

// Mount subroutes with logical prefixes
app.route("/api/auth", authHandler); // Handles /register, /login
app.route("/api/dashboard", dashboardHandler); // Handles /analyze/:id etc.
app.route("/api/challenges", challengeHandler); // Handles smart task/challenges
app.route("/api/generalSettings", globalSettingsHandler); // Handles /settings/:id
app.route("/api/activity", activityHandler); // Handles /settings/:id
app.route("/api/cron", cronHandler); // Handles /settings/:id
app.route("/api/metrics", metricHandler); // Handles /metrics
app.route("/api/ml", mlHandler); // Handles /metrics

serve({
  fetch: app.fetch,
  port: 3001,
});

setTimeout(() => {
  fetch("http://localhost:3001/api/cron/send-emails")
    .then((res) => res.text())
    .then((data) => {
      console.log("🔥 Cron auto-ejecutado al iniciar:", data);
    })
    .catch((err) => {
      console.error("❌ Error llamando al cron al iniciar:", err);
    });

  fetch("http://localhost:3001/api/cron/cleanup-logs")
    .then((res) => res.text())
    .then((data) => {
      console.log("🧹 Cron de limpieza ejecutado al iniciar:", data);
    })
    .catch((err) => {
      console.error("❌ Error al ejecutar cron de limpieza:", err);
    });
}, 1000); // espera 1 segundo
