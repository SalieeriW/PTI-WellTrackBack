import { googleAuth } from "@hono/oauth-providers/google";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import * as dotenv from "dotenv";
import ENV from "../config/env";
import { login, recoverPassword, register, verifyemail } from "./routes/login";
import {
  show_calendar,
  show_challenges,
  show_data,
  show_weekly_analysis,
} from "./routes/main";
import { show_data_metrics } from "./routes/metrics";
import {
  create_challenge,
  create_setup,
  delete_challenge,
  modify_challenge,
  update_pomodoro_settings,
} from "./routes/pomodoro";
import { getReport, updateReportSettings } from "./routes/report_conf";
import {
  change_password,
  delete_account,
  updateUserSettings,
} from "./routes/user_conf";
import { cors } from "hono/cors";

dotenv.config();

const app = new OpenAPIHono();

app.use(
  "*",
  cors({
    origin: "http://localhost:3000", // Specify the frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allow OPTIONS for preflight
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // If you're using cookies or credentials
  })
);

// app.openapi(route, (c) => {
//   return c.json({ id: "1", username: "John Doe", password: "examplePassword" });
// });

app.openapi(login, async (c) => {
  const res = await login.handler(c);
  return res;
});

app.openapi(register, async (c) => {
  const res = await register.handler(c);
  return res;
});

app.openapi(verifyemail, async (c) => {
  const res = await verifyemail.handler(c);
  return res;
});

app.openapi(updateUserSettings, async (c) => {
  const res = await updateUserSettings.handler(c);
  return res;
});

app.openapi(change_password, async (c) => {
  const res = await change_password.handler(c);
  return res;
});

app.openapi(delete_account, async (c) => {
  const res = await delete_account.handler(c);
  return res;
});

app.openapi(recoverPassword, async (c) => {
  const res = await recoverPassword.handler(c);
  return res;
});

app.openapi(show_data, async (c) => {
  const res = await show_data.handler(c);
  return res;
});

app.openapi(show_weekly_analysis, async (c) => {
  const res = await show_weekly_analysis.handler(c);
  return res;
});

app.openapi(show_calendar, async (c) => {
  const res = await show_calendar.handler(c);
  return res;
});

app.openapi(show_challenges, async (c) => {
  const res = await show_challenges.handler(c);
  return res;
});

app.openapi(delete_account, async (c) => {
  const res = await delete_account.handler(c);
  return res;
});

app.openapi(change_password, async (c) => {
  const res = await change_password.handler(c);
  return res;
});

app.openapi(updateUserSettings, async (c) => {
  const res = await updateUserSettings.handler(c);
  return res;
});

app.openapi(updateReportSettings, async (c) => {
  const res = await updateReportSettings.handler(c);
  return res;
});

app.openapi(create_challenge, async (c) => {
  const res = await create_challenge.handler(c);
  return res;
});

app.openapi(modify_challenge, async (c) => {
  const res = await modify_challenge.handler(c);
  return res;
});

app.openapi(delete_challenge, async (c) => {
  const res = await delete_challenge.handler(c);
  return res;
});

app.openapi(update_pomodoro_settings, async (c) => {
  const res = await update_pomodoro_settings.handler(c);
  return res;
});

app.openapi(create_setup, async (c) => {
  const res = await create_setup.handler(c);
  return res;
});

app.openapi(show_data_metrics, async (c) => {
  const res = await show_data_metrics.handler(c);
  return res;
});

app.openapi(getReport, async (c) => {
  const res = await getReport.handler(c);
  return c.json(res);
});

// Google OAuth for login
app.use(
  "/google",
  googleAuth({
    client_id: ENV.GOOGLE_CLIENT_ID,
    client_secret: ENV.GOOGLE_CLIENT_SECRET,
    scope: ["openid", "email", "profile"],
  })
);

app.get("/google", (c) => {
  const token = c.get("token");
  const grantedScopes = c.get("granted-scopes");
  const user = c.get("user-google");

  return c.json({
    token,
    grantedScopes,
    user,
  });
});

app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Example",
    description: "The API reference for the PTI - WellTrack",
    version: "v1",
  },
});

// Load the middleware
app.get(
  "/api-reference",
  apiReference({
    spec: {
      url: "/openapi.json",
    },
    theme: "solarized",
    pageTitle: "PTI API Reference",
  })
);

// Set up Swagger UI
export default {
  port: 3001, // <-- Set Bun port here
  fetch: app.fetch,
};
