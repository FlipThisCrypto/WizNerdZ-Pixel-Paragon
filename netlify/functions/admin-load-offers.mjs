// Load sealed-box offers into this site's blob store. OPERATOR ONLY.
//
// POST /api/admin-load-offers
//   headers: x-admin-secret: <MINT_ADMIN_SECRET>
//   body: { offers: [ { nftId, tier, offer, priceMojos, boxId } ], replace?: bool }
//
// Offers are generated locally by mint_system/create_box_offer.py (which needs
// the wallet + keys) and pushed here. Keys never leave the operator machine —
// an offer is just a signed blob that anyone may take, so it is safe to serve.
//
// Guarded by a shared secret in the site's env. If MINT_ADMIN_SECRET is unset
// the endpoint refuses outright rather than defaulting open.
import { getStore } from "@netlify/blobs";

const json = (o, s = 200) =>
  new Response(JSON.stringify(o, null, 2), {
    status: s,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = process.env.MINT_ADMIN_SECRET;
  if (!secret) {
    return json({ error: "not_configured", message: "MINT_ADMIN_SECRET is not set on this site." }, 503);
  }
  if (req.headers.get("x-admin-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const list = Array.isArray(body?.offers) ? body.offers : null;
  if (!list?.length) return json({ error: "no_offers" }, 400);

  const offers = getStore("wiznerdz-offers");
  const index = body.replace
    ? { available: {} }
    : (await offers.get("index", { type: "json" })) || { available: {} };

  let loaded = 0;
  const problems = [];
  for (const o of list) {
    if (!o?.nftId || !o?.tier || !o?.offer) { problems.push({ o, why: "missing nftId/tier/offer" }); continue; }
    if (typeof o.offer !== "string" || !o.offer.startsWith("offer1")) {
      problems.push({ nftId: o.nftId, why: "offer text does not look like an offer" }); continue;
    }
    await offers.setJSON(`offer/${o.nftId}`, {
      tier: o.tier, offer: o.offer, priceMojos: o.priceMojos ?? null, boxId: o.boxId ?? null,
      // The coin whose spend IS this offer's settlement. Knowable pre-sale and
      // public, it lets the scheduled watcher detect sales and retire dead
      // offers with no operator present.
      anchorCoin: o.anchorCoin ?? null,
    });
    index.available[o.tier] = index.available[o.tier] || [];
    if (!index.available[o.tier].includes(o.nftId)) index.available[o.tier].push(o.nftId);
    loaded++;
  }
  await offers.setJSON("index", index);

  const counts = Object.fromEntries(Object.entries(index.available).map(([t, a]) => [t, a.length]));
  return json({ ok: true, loaded, problems, availableByTier: counts });
};
