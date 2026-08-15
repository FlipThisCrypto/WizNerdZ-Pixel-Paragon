// Live mint counters, derived from what actually happened.
//
// GET /api/mint-stats
//   -> { byTier: { blind_single: { dispensable, sold, opened }, ... },
//        totals: { dispensable, sold, opened } }
//
// The static catalog (mint/sealed_boxes.json) can never know a box sold — it
// is a file. The truth lives here, in this site's blob store:
//   - "sold"       = operator-published status records at SOLD or beyond,
//                    i.e. the settlement anchor was observed spent on chain
//   - "opened"     = FULFILLED records — delivery confirmed on chain
//   - "dispensable"= offers loaded and still available to hand out right now
//
// The page combines these with the catalog total:
//   available = catalog_total - sold
// Counters therefore move exactly when the chain does (as published by the
// operator), not when a browser claims something happened.
import { getStore } from "@netlify/blobs";

const SOLD_STATES = new Set(["SOLD", "DELIVERY_RESERVED", "BROADCAST", "CONFIRMED", "FULFILLED"]);

const json = (o, s = 200) =>
  new Response(JSON.stringify(o, null, 2), {
    status: s,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      // CDN absorbs polling; 15s staleness is fine for a counter
      "cache-control": "public, max-age=0, s-maxage=15",
    },
  });

export default async () => {
  let offers, mint;
  try {
    offers = getStore("wiznerdz-offers");
    mint = getStore("wiznerdz-mint");
  } catch (e) {
    return json({ error: "store_unavailable", message: String(e.message || e) }, 503);
  }

  const byTier = {};
  const tier = (t) => (byTier[t] ||= { dispensable: 0, sold: 0, opened: 0 });

  // offers still dispensable (loaded minus taken/in-flight)
  const index = (await offers.get("index", { type: "json" })) || { available: {} };
  const taken = new Set(((await mint.get("taken", { type: "json" })) || {}).nftIds || []);
  for (const [t, ids] of Object.entries(index.available || {})) {
    tier(t).dispensable = (ids || []).filter((id) => !taken.has(id)).length;
  }

  // operator-published outcomes
  const listing = await mint.list({ prefix: "status/" });
  const keys = (listing?.blobs || []).map((b) => b.key);
  const records = await Promise.all(keys.map((k) => mint.get(k, { type: "json" })));
  for (const rec of records) {
    if (!rec?.state) continue;
    const t = tier(rec.tier || "unknown");
    if (SOLD_STATES.has(rec.state)) t.sold++;
    if (rec.state === "FULFILLED") t.opened++;
  }

  const totals = { dispensable: 0, sold: 0, opened: 0 };
  for (const t of Object.values(byTier)) {
    totals.dispensable += t.dispensable;
    totals.sold += t.sold;
    totals.opened += t.opened;
  }

  // watcher liveness: a lastRun older than a few schedule intervals is
  // visible evidence the autonomous settlement path is down
  const watcher = (await mint.get("watch/lastRun", { type: "json" })) || null;

  return json({ byTier, totals, watcher, asOf: new Date().toISOString() });
};
