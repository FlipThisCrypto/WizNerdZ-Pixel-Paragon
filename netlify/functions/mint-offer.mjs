// Dispense a sealed-box offer for a buyer to take.
//
// GET/POST /api/mint-offer?tier=blind_single
//   -> { tier, offer, boxNftId, priceXch, claimToken }
//
// WHY THE OFFER IS FOR A GENERIC BOX
// Chia offers are transparent: the taker's wallet enumerates both sides before
// they sign. If we offered the real WizNerd, a bot could request offers in a
// loop, check each token against the public rarity ranking, refuse commons and
// take only Legendaries — draining the rares. Every box within a tier is
// byte-identical, so there is nothing to select on. The real WizNerdZ are
// pushed after settlement.
//
// STATE (Netlify Blobs, scoped to THIS site only — cannot touch another site's
// stores such as Bepe Love's):
//   wiznerdz-offers  key "offer/<nftId>"  -> { tier, offer, priceMojos, boxId }
//   wiznerdz-offers  key "index"          -> { available: { tier: [nftId,...] } }
//   wiznerdz-mint    key "dispensed/<claim>" -> audit
//   wiznerdz-mint    key "taken"          -> { nftIds: [...] }
import { getStore } from "@netlify/blobs";

const TIERS = ["blind_single", "standard_bundle", "rare", "elite", "premium_named"];

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });

export default async (req) => {
  const url = new URL(req.url);
  const tier = (url.searchParams.get("tier") || "").trim();
  if (!TIERS.includes(tier)) {
    return json({ error: "bad_tier", message: `tier must be one of ${TIERS.join(", ")}` }, 400);
  }

  let offers, mint;
  try {
    offers = getStore("wiznerdz-offers");
    mint = getStore("wiznerdz-mint");
  } catch (e) {
    return json({ error: "store_unavailable", message: String(e.message || e) }, 503);
  }

  const index = (await offers.get("index", { type: "json" })) || { available: {} };
  const pool = index.available?.[tier] || [];
  if (!pool.length) {
    return json({ error: "sold_out", tier, message: "No sealed boxes available in this tier." }, 410);
  }

  // Exclude anything already taken/in-flight.
  const taken = new Set(((await mint.get("taken", { type: "json" })) || {}).nftIds || []);
  const candidates = pool.filter((id) => !taken.has(id));
  if (!candidates.length) {
    return json({ error: "sold_out", tier }, 410);
  }

  // Random pick. Which box you get does not matter — they are identical — but
  // random keeps dispensing uniform and avoids a predictable draw order.
  const nftId = candidates[Math.floor(Math.random() * candidates.length)];
  const rec = await offers.get(`offer/${nftId}`, { type: "json" });
  if (!rec?.offer) {
    return json({ error: "offer_missing", nftId }, 500);
  }

  // Claim token ties a later confirm back to this dispense.
  const claimToken = crypto.randomUUID();
  await mint
    .setJSON(`dispensed/${claimToken}`, {
      nftId, tier, ts: Date.now(), priceMojos: rec.priceMojos, boxId: rec.boxId ?? null,
    })
    .catch(() => {});

  return json({
    ok: true,
    tier,
    boxNftId: nftId,
    priceXch: (rec.priceMojos || 0) / 1e12,
    offer: rec.offer,
    claimToken,
    // Deliberately NOT returned: contents, token ids, box allocation id.
    sealed: true,
  });
};
