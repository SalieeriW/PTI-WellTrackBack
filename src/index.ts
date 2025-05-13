import { Hono } from "hono";
import { apiReference } from "@scalar/hono-api-reference";
import authHandler from "./routes/authHandler";
import dashboardHandler from "./routes/dashboardHandler";
import challengeHandler from "./routes/challengeHandler";
import globalSettingsHandler from "./routes/globalSettingsHandler";
import openapi from "../openapi.json";
import { cors } from "hono/cors";
import activityHandler from "./routes/activityHandler";
import cronHandler from "./routes/cronHandler";
import metricHandler from "./routes/metricHandler";
import mlHandler from "./routes/mlHandler";

const app = new Hono();
app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
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

export default {
  port: 3001, // <-- Set Bun port here
  fetch: app.fetch,
};

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
