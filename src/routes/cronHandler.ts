import { Hono } from "hono";
import { supabase } from "../lib/supabase";
import { sendEmail } from "../lib/send-email";

const app = new Hono();

// Frecuencia en milisegundos
const frequencyToMs: Record<string, number> = {
  daily: 1000 * 60 * 60 * 24,
  weekly: 1000 * 60 * 60 * 24 * 7,
  monthly: 1000 * 60 * 60 * 24 * 30,
  trimesterly: 1000 * 60 * 60 * 24 * 90,
};

app.get("/send-emails", async (c) => {
  const now = Date.now();

  const { data: users, error } = await supabase
    .from("CHALLENGE_SETTINGS")
    .select(
      "user_id, alert_frecuency, auto_email, allow_deepanalisis, last_notified"
    )
    .eq("auto_email", true)
    .not("alert_frecuency", "is", null);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  const results: { userId: number; emailSent: boolean; reason?: string }[] = [];

  for (const user of users) {
    const { user_id, alert_frecuency, last_notified } = user;

    const { data: userData, error: userError } = await supabase
      .from("USERS")
      .select("email")
      .eq("user_id", user_id)
      .single();

    if (userError || !userData?.email) {
      results.push({
        userId: user_id,
        emailSent: false,
        reason: "No se pudo obtener el email del usuario",
      });
      continue;
    }

    const email = userData.email;
    const interval = frequencyToMs[alert_frecuency];

    if (!interval) {
      results.push({
        userId: user_id,
        emailSent: false,
        reason: `Frecuencia no válida: ${alert_frecuency}`,
      });
      continue;
    }

    const last = last_notified ? new Date(last_notified).getTime() : 0;
    if (now - last < interval) {
      results.push({
        userId: user_id,
        emailSent: false,
        reason: `Intervalo de notificación aún no cumplido (${alert_frecuency})`,
      });
      continue;
    }

    const { data: challenges, error: challengeError } = await supabase
      .from("CHALLENGES")
      .select("*")
      .eq("user_id", user_id)
      .eq("completed", true);

    if (challengeError || !challenges || challenges.length === 0) {
      results.push({
        userId: user_id,
        emailSent: false,
        reason: "No hay desafíos completados para notificar",
      });
      continue;
    }

    const html = await generateEmailBody(challenges, user.allow_deepanalisis);

    try {
      await sendEmail(email, {
        subject: "Resumen de tus desafíos completados",
        html,
      });

      await supabase
        .from("CHALLENGE_SETTINGS")
        .update({ last_notified: new Date().toISOString() })
        .eq("user_id", user_id);

      results.push({ userId: user_id, emailSent: true });
    } catch (err) {
      results.push({
        userId: user_id,
        emailSent: false,
        reason: "Error al enviar el correo",
      });
    }
  }
  return c.json({ success: true, results });
});

export async function generateEmailBody(
  challenges: { name: string; completed_at?: string }[],
  deep: boolean
): Promise<string> {
  const listItems = challenges
    .map(
      (c) =>
        `<li style="padding: 6px 0; border-bottom: 1px solid #eee;">
          <strong>${c.name}</strong>${
            c.completed_at
              ? ` <small style="color: gray;">(${c.completed_at})</small>`
              : ""
          }
        </li>`
    )
    .join("");

  let deepComment = "";

  if (deep) {
    const prompt = `
Actúa como un coach motivacional. Analiza esta lista de desafíos completados por un usuario:

${challenges.map((c) => `- ${c.name}`).join("\n")}

Genera un párrafo motivacional personalizado, destacando constancia, progreso y disciplina.
`;

    try {
      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content:
                  "Eres un coach experto que brinda análisis motivacionales sobre hábitos y productividad.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        }
      );

      const json = await response.json();
      console.log("Respuesta de DeepSeek:", json);
      deepComment = json.choices?.[0]?.message?.content || "";
      console.log("📬 Comentario generado por DeepSeek:", deepComment);
    } catch (error) {
      console.error("Error llamando a DeepSeek:", error);
    }
  }

  const html = `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #f9fafb; padding: 20px; border-radius: 8px; color: #111;">
    <h2 style="color: #2563eb;">🎯 Resumen de desafíos completados</h2>
    <p style="font-size: 15px;">¡Buen trabajo! Aquí tienes un resumen de tus logros más recientes:</p>
    <ul style="list-style: none; padding: 0; font-size: 14px;">
      ${listItems}
    </ul>

    ${
      deep && deepComment
        ? `
      <div style="margin-top: 24px; padding: 16px; background: #e0f2fe; border-left: 4px solid #0ea5e9; border-radius: 4px;">
        <h3 style="margin: 0 0 8px 0;">📊 Análisis automático</h3>
        <p style="margin: 0; font-size: 14px;">${deepComment}</p>
      </div>`
        : ""
    }

    <p style="margin-top: 32px; font-size: 12px; color: #666;">WellTrack. Inc</p>
  </div>
  `;

  return html;
}

app.get("/cleanup-logs", async (c) => {
  const now = new Date();

  const { data: settings, error } = await supabase
    .from("GENERAL_SETTINGS")
    .select("user_id, data_retention");

  if (error || !settings) {
    return c.json({ error: error?.message || "No settings found" }, 500);
  }

  const results: { userId: number; deleted: boolean; message: string }[] = [];

  for (const { user_id, data_retention } of settings) {
    const days = parseInt(data_retention);

    if (isNaN(days) || days <= 0) {
      results.push({
        userId: user_id,
        deleted: false,
        message: `Retención inválida: ${data_retention}`,
      });
      continue;
    }

    const cutoffDate = new Date(now.getTime() - days * 86400000).toISOString();

    const tables = ["ACTIVITY_LOG", "DATALOG"];

    for (const table of tables) {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("user_id", user_id)
        .lt("created_at", cutoffDate);

      if (deleteError) {
        results.push({
          userId: user_id,
          deleted: false,
          message: `Error al limpiar ${table}: ${deleteError.message}`,
        });
      } else {
        results.push({
          userId: user_id,
          deleted: true,
          message: `Se eliminaron registros antiguos de ${table} (anteriores a ${cutoffDate})`,
        });
      }
    }
  }

  return c.json({ success: true, results });
});

export default app;
