import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";

const app = new Hono();

app.post("/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { data, error } = await supabase
    .from("ACTIVITY_LOG")
    .insert([{ ...body, user_id: id }]);

  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json("Activity logged successfully");
});

app.post("/rest/:id", async (c) => {
  const { id } = c.req.param();

  const { error } = await supabase.rpc("increment_challenge_progress", {
    metricname: "rest",
    userid: id,
  });
  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json("Activity logged successfully");
});

export default app;
