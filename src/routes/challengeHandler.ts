import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";

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

  // 1. Get all completed challenges with no PDF
  const { data: challenges, error } = await supabase
    .from("CHALLENGES")
    .select("id, name, description")
    .eq("user_id", id)
    .eq("completed", true)
    .is("pdf_url", null);

  console.log("Challenges:", challenges);
  console.log("Error:", error);

  if (challenges && !error) {
    // 2. For each, generate and upload PDF
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

    for (const challenge of challenges) {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const { width, height } = page.getSize();

      const title = `Certificado de desafío completado`;
      const lines = [
        `Usuario: ${id}`,
        `Desafío: ${challenge.name}`,
        `Descripción: ${challenge.description || "Sin descripción."}`,
        `Comentarios: Integración futura con IA`,
      ];

      page.drawText(title, {
        x: 50,
        y: height - 60,
        size: 20,
        font,
        color: rgb(0, 0, 0),
      });
      lines.forEach((line, i) => {
        page.drawText(line, {
          x: 50,
          y: height - 100 - i * 25,
          size: 14,
          font,
          color: rgb(0, 0, 0),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const fileName = `${id}_${challenge.name}_certificado.pdf`;

      // 3. Upload to Supabase Storage
      const { data: uploaded, error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(fileName, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload failed:", uploadError);
        continue;
      }

      const publicUrl = supabase.storage
        .from("certificates")
        .getPublicUrl(fileName).data.publicUrl;

      // 4. Update challenge row
      const { error: updateError } = await supabase
        .from("CHALLENGES")
        .update({ pdf_url: publicUrl })
        .eq("id", challenge.id);

      if (updateError) {
        console.error("Update failed:", updateError);
      }
    }
  }

  const { data: allChallenges, error: allChallengesError } = await supabase
    .from("CHALLENGES")
    .select("*")
    .eq("user_id", id);

  if (allChallengesError) {
    return c.json({ error: allChallengesError.message }, 500);
  }
  return c.json(allChallenges);
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

  if (data.progress >= data.meta) {
    const { error: updateError } = await supabase
      .from("CHALLENGES")
      .update({ completed: true })
      .eq("user_id", id)
      .eq("id", id2);

    if (updateError) {
      return c.json({ error: updateError.message }, 500);
    }
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

export default app;
