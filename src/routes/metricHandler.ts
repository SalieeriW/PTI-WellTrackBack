import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";

const app = new Hono();

app.get("/", async (c) => {
  const { data, error } = await supabase.from("METRICS").select("name");

  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json(data);
});

export default app;
