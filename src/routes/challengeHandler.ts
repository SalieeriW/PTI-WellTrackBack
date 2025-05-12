import { Hono } from "hono";
import { supabase } from "../lib/supabase";

const app = new Hono();

/**
 * @openapi
 * /api/dashboard/{id}:
 *   get:
 *     summary: Get all challenges for a user
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of challenges
 *       500:
 *         description: Internal server error
 */
app.get("/:id", async (c) => {
  const { id } = c.req.param();

  const { data, error } = await supabase
    .from("CHALLENGES")
    .select("*")
    .eq("user_id", id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json(data);
});

/**
 * @openapi
 * /api/dashboard/settings/{id}:
 *   post:
 *     summary: Update challenge settings for a user
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               alert_frecuen: "daily"
 *               auto_email: true
 *     responses:
 *       200:
 *         description: Settings updated
 *       500:
 *         description: Internal server error
 */
app.post("/settings/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("CHALLENGE_SETTINGS")
    .update(body)
    .eq("user_id", id)
    .select("*")
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json(data);
});

/**
 * @openapi
 * /api/dashboard/settings/{id}:
 *   get:
 *     summary: Get challenge settings for a user
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Settings data
 *       500:
 *         description: Internal server error
 */
app.get("/settings/:id", async (c) => {
  const { id } = c.req.param();

  const { data, error } = await supabase
    .from("CHALLENGE_SETTINGS")
    .select("*")
    .eq("user_id", id)
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json(data);
});

/**
 * @openapi
 * /api/dashboard/{id}/{id2}:
 *   patch:
 *     summary: Update a specific challenge for a user
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *       - name: id2
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               progress: 60
 *     responses:
 *       200:
 *         description: Challenge updated
 *       500:
 *         description: Internal server error
 */
app.patch("/:id/:id2", async (c) => {
  const { id } = c.req.param();
  const { id2 } = c.req.param();
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("CHALLENGES")
    .update(body)
    .eq("user_id", id)
    .eq("id", id2)
    .select("*")
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json(data);
});

/**
 * @openapi
 * /api/dashboard/{id}/{id2}:
 *   delete:
 *     summary: Delete a challenge by user and challenge ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *       - name: id2
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Challenge deleted successfully
 *       500:
 *         description: Internal server error
 */
app.delete("/:id/:id2", async (c) => {
  const { id } = c.req.param();
  const { id2 } = c.req.param();

  const { data, error } = await supabase
    .from("CHALLENGES")
    .delete()
    .eq("user_id", id)
    .eq("id", id2);

  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json("Challenge deleted successfully");
});

app.get("/:id/:id2", async (c) => {
  const { id } = c.req.param();
  const { id2 } = c.req.param();

  const { data, error } = await supabase
    .from("CHALLENGES")
    .select("*")
    .eq("user_id", id)
    .eq("id", id2)
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json(data);
});

app.post("/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { data, error } = await supabase
    .from("CHALLENGES")
    .insert([{ ...body, user_id: id }]);
  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json("Challenge created successfully");
});

app.delete("/:id/:id2", async (c) => {
  const { id } = c.req.param();
  const { id2 } = c.req.param();
  const { data, error } = await supabase
    .from("CHALLENGES")
    .delete()
    .eq("user_id", id)
    .eq("id", id2);

  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json("Challenge deleted successfully");
});

export default app;
