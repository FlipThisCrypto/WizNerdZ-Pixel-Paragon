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
    // STRONG consistency on the dispense path: with the default eventual
    // reads, two back-to-back dispenses each saw a holds record missing the
    // other's write and handed out the same box - observed live, 2/3 rapid
    // pairs colliding. Strong reads cost a little latency; a buyer approving
    // an offer that was already someone else's costs a failed purchase.
    offers = getStore({ name: "wiznerdz-offers", consistency: "strong" });
    mint = getStore({ name: "wiznerdz-mint", consistency: "strong" });
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

  // SOFT HOLD: a just-dispensed box sits out for a few minutes so two buyers
  // browsing at the same time don't both approve the same offer (the chain
  // settles one; the other learns via a cryptic wallet failure AFTER
  // approving). Blobs have no transactions, so a sub-second race remains -
  // but the window shrinks from the buyer's whole pairing-and-approval
  // minutes to blob propagation time. Expired holds return automatically,
  // and a fully-held pool falls back to the OLDEST hold rather than lying
  // about being sold out.
  const HOLD_MS = 3 * 60 * 1000;
  const holds = (await mint.get("holds", { type: "json" })) || {};
  const now = Date.now();
  const free = candidates.filter((id) => !(holds[id] > now - HOLD_MS));
  let nftId;
  if (free.length) {
    nftId = free[Math.floor(Math.random() * free.length)];
  } else {
    // everything is on hold: hand out the stalest hold, never a false 410
    nftId = candidates.slice().sort((a, b) => (holds[a] || 0) - (holds[b] || 0))[0];
  }
  holds[nftId] = now;
  // prune expired entries so the record can't grow without bound
  for (const [k, t] of Object.entries(holds)) {
    if (t <= now - HOLD_MS && k !== nftId) delete holds[k];
  }
  await mint.setJSON("holds", holds).catch(() => {});
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
