import { Hono } from "hono";
import { supabase } from "../lib/supabase";
import axios from "axios";

const app = new Hono();

/**
 * @openapi
 * /api/dashboard/calibrate:
 *   get:
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 calibration_values:
 *                   ear: 0.3
 *                   mar: 0.2
 *                   neck_straight: 12
 *                   shoulder_angle: 5
 *       500:
 *         description: Failed to calibrate
 */
app.get("/calibrate", async (c) => {
  try {
    const response = await axios.post(process.env.MLBASE_URL + "/calibrate", {
      image: (await c.req.parseBody())?.image,
    });
    return c.json(response.data);
  } catch (error) {
    console.error(error);
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
 *       500:
 *         description: Error in processing or storing data
 */
app.post("/analyze/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const response = await axios.post(process.env.MLBASE_URL + "/analyze", {
      image: (await c.req.parseBody())?.image,
    });

    const data = response.data;

    const parsedData = {
      user_id: id,
      is_tired: data.ear_deviated || data.mar_deviated,
      is_drinking: data.drinking,
      is_badpos: data.shoulder_angle_deviated || data.neck_straight_deviated,
      fingers: data.finger_count,
    };

    const { error } = await supabase.from("DATALOG").insert(parsedData);

    if (error) {
      return c.json({ error: "Failed to update database" }, 500);
    }
    return c.json({ message: "Data processed and stored successfully" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to analyze data" }, 500);
  }
});

export default app;
