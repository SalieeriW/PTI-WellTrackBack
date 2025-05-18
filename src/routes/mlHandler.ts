import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import axios from "axios";

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

    const form = new FormData();
    form.append(
      "image",
      new Blob([await image.arrayBuffer()], { type: image.type }),
      image.name
    );

    const response = await fetch(
      "http://welltrack-ml.welltrack.svc.cluster.local:5000/analyze",
      {
        method: "POST",
        body: form,
      }
    );

    const data = await response.json();

    const parsedData = {
      user_id: id,
      is_tired: data.ear_deviated || data.mar_deviated,
      is_drinking: data.drinking,
      is_badpos: data.shoulder_angle_deviated || data.neck_straight_deviated,
      fingers: data.finger_count,
    };

    const { error } = await supabase.from("DATALOG").insert({
      user_id: parseInt(parsedData.user_id),
      is_tired: parsedData.is_tired,
      is_drinking: parsedData.is_drinking,
      is_badpos: parsedData.is_badpos,
    });

    if (error) {
      return c.json({ error: "Failed to update database" }, 500);
    }

    const rpcErrors: string[] = [];

    if (parsedData.is_tired) {
      const { error } = await supabase.rpc("increment_challenge_progress", {
        metricname: "fatigue",
        userid: id,
      });
      if (error) rpcErrors.push("fatigue");
    }

    if (parsedData.is_drinking) {
      const { error } = await supabase.rpc("increment_challenge_progress", {
        metricname: "drink",
        userid: id,
      });
      if (error) rpcErrors.push("drink");
    }

    if (parsedData.is_badpos) {
      const { error } = await supabase.rpc("increment_challenge_progress", {
        metricname: "bad_posture",
        userid: id,
      });
      if (error) rpcErrors.push("bad_posture");
    }

    if (parsedData.fingers) {
      const { data: finger, error: fingerError } = await supabase
        .from("CHALLENGES")
        .update({ started: true })
        .eq("user_id", id)
        .eq("fingers", parsedData.fingers)
        .select("name");

      if (fingerError) {
        return c.json(
          { error: "Failed to update challenges for finger count" },
          500
        );
      }

      return c.json({
        finger,
        updated: true,
        rpcErrors,
      });
    }

    return c.json({
      message: "Data analyzed and stored successfully",
      rpcErrors,
      parsedData,
    });
  } catch (error) {
    console.error("❌ Error en /analyze:", error);
    return c.json({ error: "Failed to analyze data" }, 500);
  }
});

export default app;
