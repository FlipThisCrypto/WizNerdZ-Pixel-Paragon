// Scheduled settlement watcher — runs every 5 minutes on Netlify's cron.
//
// Detects sold boxes from public chain data (see lib/settlement.mjs), marks
// them SOLD, and retires their offers so a dead offer is never dispensed to a
// buyer. Detection only: delivery, recipients, and contents remain strictly
// operator-side.
import { detectSettlements } from "./lib/settlement.mjs";

export default async () => {
  try {
    const summary = await detectSettlements("schedule");
    // Netlify surfaces function logs; settled boxes are worth finding there.
    if (summary.settled.length || summary.status !== "OK") {
      console.log("[watch-settlements]", JSON.stringify(summary));
    }
    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error("[watch-settlements] failed", e);
    return new Response(JSON.stringify({ status: "ERROR", error: String(e.message || e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

export const config = {
  schedule: "*/5 * * * *",
};
