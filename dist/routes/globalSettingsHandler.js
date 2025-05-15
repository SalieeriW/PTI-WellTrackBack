import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
const app = new Hono();
/**
 * @openapi
 * /api/generalSettings/{id}:
 *   get:
 *     summary: Get general settings for a user
 *     description: Returns general configuration values for a specific user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user's ID
 *     responses:
 *       200:
 *         description: General settings object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 user_id: 1
 *                 notify_email: true
 *                 dark_mode: false
 *       500:
 *         description: Server error
 */
app.get("/:id", async (c) => {
    const { id } = c.req.param();
    const { data, error } = await supabase
        .from("GENERAL_SETTINGS")
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
 * /api/generalSettings/{id}:
 *   post:
 *     summary: Update general settings for a user
 *     description: Updates user configuration settings like notifications, theme, etc.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user's ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               notify_email: false
 *               dark_mode: true
 *     responses:
 *       200:
 *         description: Updated settings object
 *       500:
 *         description: Server error
 */
app.post("/:id", async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { data, error } = await supabase
        .from("GENERAL_SETTINGS")
        .update(body)
        .eq("user_id", id)
        .select("*");
    if (error) {
        return c.json({ error: error.message }, 500);
    }
    return c.json(data);
});
export default app;
