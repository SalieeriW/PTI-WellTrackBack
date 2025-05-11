import { Hono } from "hono";
import { apiReference } from "@scalar/hono-api-reference";
import authHandler from "./routes/authHandler";
import dashboardHandler from "./routes/dashboardHandler";
import challengeHandler from "./routes/challengeHandler";
import globalSettingsHandler from "./routes/globalSettingsHandler";
import openapi from "../openapi.json";

const app = new Hono();

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

export default app;
