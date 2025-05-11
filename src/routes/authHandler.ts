import { Hono } from "hono";
import { supabase } from "../lib/supabase";

const app = new Hono();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User authenticated
 *       401:
 *         description: Invalid credentials
 */
app.post("/login", async (c) => {
  const { email, password } = await c.req.json();

  const { data: user, error } = await supabase
    .from("USERS")
    .select("user_id, email, password")
    .eq("email", email)
    .single();

  if (error || !user) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const isPasswordCorrect = password === user.password;

  if (!isPasswordCorrect) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  return c.json({ user_id: user.user_id, email: user.email });
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *       409:
 *         description: Email already registered
 *       400:
 *         description: Error inserting user
 */
app.post("/register", async (c) => {
  try {
    const { email, password } = await c.req.json();
    console.log("Attempting registration:", { email });

    const { data: existingUser, error: fetchError } = await supabase
      .from("USERS")
      .select("user_id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return c.json({ error: "Email is already registered" }, 409);
    }

    const { data, error: insertError } = await supabase
      .from("USERS")
      .insert({ email, password })
      .select();

    if (insertError) {
      console.error("Error inserting user:", insertError);
      return c.json({ error: insertError.message }, 400);
    }

    return c.json({ message: "User registered successfully", user: data });
  } catch (err) {
    console.error("Unexpected error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * @openapi
 * /api/auth/change_name:
 *   post:
 *     summary: Change the user's name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, firstname, lastname]
 *             properties:
 *               user_id:
 *                 type: integer
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *     responses:
 *       200:
 *         description: Name updated successfully
 *       400:
 *         description: Failed to update name
 */
app.post("/change_name", async (c) => {
  const { user_id, firstname, lastname } = await c.req.json();

  const { data, error } = await supabase
    .from("USERS")
    .update({ firstname, lastname })
    .eq("user_id", user_id)
    .select("firstname, lastname");

  if (error) {
    return c.json({ error: "Failed to update name" }, 400);
  }

  return c.json({ message: "Name updated successfully", data });
});

/**
 * @openapi
 * /api/auth/change_password:
 *   post:
 *     summary: Change the user's password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, old_password, new_password]
 *             properties:
 *               user_id:
 *                 type: integer
 *               old_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       401:
 *         description: Old password incorrect
 *       404:
 *         description: User not found
 *       400:
 *         description: Failed to update password
 */
app.post("/change_password", async (c) => {
  const { user_id, old_password, new_password } = await c.req.json();

  const { data: user, error: fetchError } = await supabase
    .from("USERS")
    .select("password")
    .eq("user_id", user_id)
    .single();

  if (fetchError || !user) {
    return c.json({ error: "User not found" }, 404);
  }

  if (user.password !== old_password) {
    return c.json({ error: "Old password is incorrect" }, 401);
  }

  const { error: updateError } = await supabase
    .from("USERS")
    .update({ password: new_password })
    .eq("user_id", user_id);

  if (updateError) {
    return c.json({ error: "Failed to update password" }, 400);
  }

  return c.json({ message: "Password updated successfully" });
});

/**
 * @openapi
 * /api/auth/get_names/{id}:
 *   get:
 *     summary: Get the user's first and last name
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User's names
 *       500:
 *         description: Failed to fetch user
 */
app.get("/get_names/:id", async (c) => {
  const { id } = c.req.param();

  const { data, error } = await supabase
    .from("USERS")
    .select("firstname, lastname")
    .eq("user_id", id)
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json(data);
});

/**
 * @openapi
 * /api/auth/delete_account/{id}:
 *   delete:
 *     summary: Delete the user account
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       500:
 *         description: Failed to delete account
 */
app.delete("/delete_account/:id", async (c) => {
  const { id } = c.req.param();
  const { error } = await supabase.from("USERS").delete().eq("user_id", id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ message: "Account deleted successfully" });
});

export default app;
