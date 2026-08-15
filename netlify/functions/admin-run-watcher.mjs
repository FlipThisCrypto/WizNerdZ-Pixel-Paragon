// Manual trigger for the settlement watcher. OPERATOR ONLY.
//
// POST /api/admin-run-watcher   headers: x-admin-secret
//
// Exists for two reasons: verifying the watcher end-to-end without waiting
// for the cron tick, and forcing an immediate sweep right after a drop or an
// incident. Same core as the scheduled run — one code path, two doors.
import { detectSettlements } from "./lib/settlement.mjs";

const json = (o, s = 200) =>
  new Response(JSON.stringify(o, null, 2), {
    status: s,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const secret = process.env.MINT_ADMIN_SECRET;
  if (!secret) return json({ error: "not_configured" }, 503);
  if (req.headers.get("x-admin-secret") !== secret) return json({ error: "unauthorized" }, 401);

  try {
    return json(await detectSettlements());
  } catch (e) {
    return json({ status: "ERROR", error: String(e.message || e) }, 500);
  }
};
