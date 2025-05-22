import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";

const app = new Hono();

/**
 * @openapi
 * /api/dashboard/{id}:
 *   get:
 *     summary: Get daily and weekly user summary data
 *     description: |
 *       Returns aggregated challenge activity and status data for a given user:
 *       - Counts of `is_tired`, `is_drinking`, `is_badpos` today
 *       - Count of `rest` activities today
 *       - 7-day drinking activity breakdown
 *       - List of today's challenge progress values
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Aggregated summary data for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 is_tired:
 *                   type: integer
 *                 is_drinking:
 *                   type: integer
 *                 is_badpos:
 *                   type: integer
 *                 rest:
 *                   type: integer
 *                 weeklyDrinking:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 challengesProgress:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       progress:
 *                         type: number
 *       500:
 *         description: Error querying data
 */
app.get("/:id", async (c) => {
  const { id } = c.req.param();

  let summaryData = {};

  const { data, error } = await supabase
    .from("DATALOG")
    .select("is_tired, is_drinking, is_badpos")
    .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .eq("user_id", id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  if (data) {
    const result = data.reduce(
      (acc, curr) => {
        acc.is_tired += curr.is_tired ? 1 : 0;
        acc.is_drinking += curr.is_drinking ? 1 : 0;
        acc.is_badpos += curr.is_badpos ? 1 : 0;
        return acc;
      },
      { is_tired: 0, is_drinking: 0, is_badpos: 0 }
    );
    summaryData = result;
  }

  const { count: countREST, error: errorREST } = await supabase
    .from("ACTIVITY_LOG")
    .select("*", { count: "exact", head: true })
    .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .eq("user_id", id)
    .eq("activity", "rest");

  if (errorREST) {
    return c.json({ error: errorREST.message }, 500);
  }

  summaryData = { ...summaryData, rest: countREST };

  const { data: weeklyData, error: weeklyError } = await supabase
    .from("DATALOG")
    .select("is_drinking, created_at")
    .gte(
      "created_at",
      new Date(new Date().setDate(new Date().getDate() - 7)).toISOString()
    )
    .eq("user_id", id);

  if (weeklyError) {
    return c.json({ error: weeklyError.message }, 500);
  }

  if (weeklyData) {
    const past7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    });

    const drinkingCounts = past7Days.map((day) => {
      const value = weeklyData.filter(
        (entry) => entry.is_drinking && entry.created_at.startsWith(day)
      ).length;
      return { day, value };
    });

    summaryData = { ...summaryData, weeklyDrinking: drinkingCounts };
  }

  const { data: challengesData, error: challengesError } = await supabase
    .from("CHALLENGES")
    .select("meta, name")
    .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .eq("user_id", id)
    .eq("completed", true)
    .eq("metric", "time");

  if (challengesError) {
    return c.json({ error: challengesError.message }, 500);
  }

  if (challengesData) {
    summaryData = { ...summaryData, challengesProgress: challengesData };
  }

  return c.json(summaryData);
});

export default app;
