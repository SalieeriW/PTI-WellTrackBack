import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import axios from "axios";
import { enqueueAnalyze } from "../lib/analyzeQueue.js";

const app = new Hono();

/**
 * @openapi
 * /api/dashboard/calibrate:
 *   post:
 *     summary: Trigger ML calibration using an image
 *     description: |
 *       Sends a calibration image to the external ML service to compute baseline posture and facial feature metrics.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Calibration data response
 *       400:
 *         description: Invalid image
 *       500:
 *         description: Failed to calibrate
 */
app.post("/calibrate", async (c) => {
  try {
    const body = await c.req.parseBody();
    const image = body?.image as Blob & { name: string; type: string };

    if (
      !image ||
      typeof image.arrayBuffer !== "function" ||
      !["image/jpeg", "image/png"].includes(image.type)
    ) {
      return c.json(
        { error: "Imagen no válida. Solo se aceptan JPG o PNG." },
        400
      );
    }

    const form = new FormData();
    form.append(
      "image",
      new Blob([await image.arrayBuffer()], { type: image.type }),
      image.name
    );

    const response = await fetch(
      "http://welltrack-ml.welltrack.svc.cluster.local:5000/calibrate",
      {
        method: "POST",
        body: form,
      }
    );

    const result = await response.json();
    return c.json(result);
  } catch (err) {
    console.error("❌ Error en /calibrate:", err);
    return c.json({ error: "Failed to fetch calibration data" }, 500);
  }
});

/**
 * @openapi
 * /api/dashboard/analyze/{id}:
 *   post:
 *     summary: Analyze image posture and store results
 *     description: |
 *       Sends an image to the ML model, receives analysis data (like is_tired, is_drinking),
 *       and stores the result in the DATALOG table for the specified user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user being analyzed
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Data analyzed and stored
 *       400:
 *         description: Invalid image
 *       500:
 *         description: Error in processing or storing data
 */

app.post("/analyze/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.parseBody();
    const image = body?.image as Blob & { name: string; type: string };

    if (
      !image ||
      typeof image.arrayBuffer !== "function" ||
      !["image/jpeg", "image/png"].includes(image.type)
    ) {
      return c.json(
        { error: "Imagen no válida. Solo se aceptan JPG o PNG." },
        400
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());

    enqueueAnalyze({
      id,
      buffer,
      type: image.type,
      name: image.name,
    });

    return c.json({ message: "Imagen encolada para análisis" });
  } catch (error) {
    console.error("❌ Error en /analyze:", error);
    return c.json({ error: "Error al procesar imagen" }, 500);
  }
});

export default app;
