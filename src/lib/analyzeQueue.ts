import { supabase } from "../lib/supabase.js";

type AnalyzeTask = {
  id: string;
  buffer: Uint8Array;
  type: string;
  name: string;
};

const queue: AnalyzeTask[] = [];
export const results = new Map<string, any[]>(); // id → array de resultados

export const enqueueAnalyze = (task: AnalyzeTask) => {
  queue.push(task);
};

const processQueue = async () => {
  while (true) {
    if (queue.length > 0) {
      const task = queue.shift();
      if (task) {
        try {
          const form = new FormData();
          form.append(
            "image",
            new Blob([new Uint8Array(task.buffer)], { type: task.type }),
            task.name
          );

          const res = await fetch(
            "http://welltrack-ml.welltrack.svc.cluster.local:5000/analyze",
            {
              method: "POST",
              body: form,
            }
          );

          const data = await res.json();

          const parsedData = {
            user_id: task.id,
            is_tired: data.ear_deviated || data.mar_deviated,
            is_drinking: data.drinking,
            is_badpos:
              data.shoulder_angle_deviated || data.neck_straight_deviated,
            fingers: data.finger_count,
          };

          await supabase.from("DATALOG").insert({
            user_id: parseInt(parsedData.user_id),
            is_tired: parsedData.is_tired,
            is_drinking: parsedData.is_drinking,
            is_badpos: parsedData.is_badpos,
          });

          const rpcErrors: string[] = [];

          if (parsedData.is_tired) {
            const { error } = await supabase.rpc(
              "increment_challenge_progress",
              {
                metricname: "fatigue",
                userid: task.id,
              }
            );
            if (error) rpcErrors.push("fatigue");
          }

          if (parsedData.is_drinking) {
            const { error } = await supabase.rpc(
              "increment_challenge_progress",
              {
                metricname: "drink",
                userid: task.id,
              }
            );
            if (error) rpcErrors.push("drink");
          }

          if (parsedData.is_badpos) {
            const { error } = await supabase.rpc(
              "increment_challenge_progress",
              {
                metricname: "bad_posture",
                userid: task.id,
              }
            );
            if (error) rpcErrors.push("bad_posture");
          }

          if (parsedData.fingers) {
            await supabase
              .from("CHALLENGES")
              .update({ started: true })
              .eq("user_id", task.id)
              .eq("fingers", parsedData.fingers)
              .select("name");
          }

          const result = {
            message: "Análisis listo",
            rpcErrors,
            parsedData,
          };

          if (!results.has(task.id)) {
            results.set(task.id, []);
          }
          results.get(task.id)?.push(result);

          console.log(`✅ Resultado guardado para ${task.id}`);
        } catch (err) {
          console.error("❌ Error en worker analyze:", err);
        }
      }
    }

    await new Promise((res) => setTimeout(res, 500));
  }
};

processQueue();
