import { randomUUID } from "crypto";
import bcryptjs from "bcryptjs";
import { Context } from "hono";
import ENV from "../../config/env";
import { db } from "../../lib/db";
import { transporter } from "../../lib/mailer";

const validateUser = async (email: string, password: string) => {
  const result = await db`SELECT * FROM users WHERE email = ${email}`;
  if (result.length === 0) {
    throw new Error("User not found");
  }
  const user = result[0];
  const match = password == user.password;

  if (!match) {
    throw new Error("Invalid password");
  }
  return user;
};

export const login_handler = async (c: Context) => {
  const { email, password }: { email: string; password: string } =
    await c.req.json();
  try {
    const user = await validateUser(email, password);
    return c.json(user);
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : "An unknown error occurred";
    return c.json({ message: errorMessage }, 401);
  }
};

export const register_handler = async (c: Context) => {
  const { email, password }: { email: string; password: string } =
    await c.req.json();
  try {
    const existingUser = await db`SELECT * FROM users WHERE email = ${email}`;
    if (existingUser.length > 0) {
      return c.json({ message: "Email is already registered" }, 400);
    }

    // Hashear la contraseña (recomendado)

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await db`
      INSERT INTO token (email, token, password, expires_at)
      VALUES (${email}, ${token}, ${password}, ${expiresAt})
      ON CONFLICT (email) DO UPDATE
        SET token = ${token}, password = ${password}, expires_at = ${expiresAt}
    `;

    const verificationUrl = `http://localhost:3000/verify-email?token=${token}`;
    await transporter.sendMail({
      from: ENV.MAIL_USER,
      to: email,
      subject: "Verifica tu correo",
      html: `<p>Haz clic aquí para verificar tu correo:</p><a href="${verificationUrl}">${verificationUrl}</a>`,
    });

    return c.json({ message: "Correo de verificación enviado" });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : "An unknown error occurred";
    return c.json({ message: errorMessage }, 400);
  }
};

export const verify_email_handler = async (c: Context) => {
  const token = c.req.query("token");
  console.log(token);

  const result = await db`SELECT * FROM token WHERE token = ${token}`;
  if (result.length === 0) {
    return c.json({ message: "Token inválido o expirado" }, 400);
  }

  const { email, password, expires_at } = result[0];
  if (new Date() > expires_at) {
    return c.json({ message: "Token expirado" }, 400);
  }

  // Crear el usuario
  const [user] =
    await db`INSERT INTO users (email, password) VALUES (${email}, ${password}) RETURNING id`;

  // Insertar datos relacionados en otras tablas
  await db`INSERT INTO conf_user (user_id) VALUES (${user.id})`;
  await db`INSERT INTO conf_report (user_id) VALUES (${user.id})`;
  await db`INSERT INTO conf_pomodoro (user_id) VALUES (${user.id})`;

  // Eliminar el token
  await db`DELETE FROM token WHERE token = ${token}`;

  return c.json({
    message: "Correo verificado. Usuario registrado con éxito.",
  });
};

export const recover_password_handler = async (c: Context) => {
  const { email }: { email: string } = await c.req.json();
  try {
    const result = await db`SELECT * FROM users WHERE email = ${email}`;
    if (result.length === 0) {
      return c.json({ message: "Email not found" }, 404);
    }
    const user = result[0];
    const password = user.password;
    await transporter.sendMail({
      from: ENV.MAIL_USER,
      to: email,
      subject: "Contraseña olvidada",
      html: `<p>Tu contraseña es: ${password}</p>`,
    });
    return c.json({ message: "Password sent to email" });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : "An unknown error occurred";
    return c.json({ message: errorMessage }, 500);
  }
};
