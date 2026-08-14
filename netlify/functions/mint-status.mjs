// What happened to one sealed box.
//
// GET /api/mint-status?box=<boxNftId>
//   -> { state, tier, nfts: [...] | null, ... }
//
// WHY THIS EXISTS
// The browser cannot be trusted to know what a buyer received, and the wallet
// does not know either — approving an offer buys a SEALED box and reveals
// nothing about its contents. The reveal animation is a consumer of verified
// results, so it has to read them from somewhere that actually knows.
//
// That somewhere is the operator, who observes settlement on chain, delivers
// the committed WizNerdZ, and publishes the outcome here. This endpoint is a
// read-only mirror of that: it never computes, decides, or randomises anything.
//
// CONTENTS ARE WITHHELD UNTIL DELIVERY IS PROVEN
// Before state FULFILLED there is no `nfts` array at all. A box that has been
// paid for but not yet delivered must look exactly like a box whose contents we
// simply will not tell you, because revealing an allocation early would let a
// buyer learn what a box holds before the chain has committed the delivery.
import { getStore } from "@netlify/blobs";

const json = (o, s = 200) =>
  new Response(JSON.stringify(o, null, 2), {
    status: s,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });

export default async (req) => {
  const url = new URL(req.url);
  const box = (url.searchParams.get("box") || "").trim();
  if (!box || !/^nft1[a-z0-9]{50,70}$/.test(box)) {
    return json({ error: "bad_box", message: "box must be an nft1... id" }, 400);
  }

  let store;
  try {
    store = getStore("wiznerdz-mint");
  } catch (e) {
    return json({ error: "store_unavailable", message: String(e.message || e) }, 503);
  }

  const rec = await store.get(`status/${box}`, { type: "json" });
  if (!rec) {
    // Not an error: a box we have never seen settle looks the same as one that
    // has not settled yet. The client should keep polling.
    return json({ box, state: "UNKNOWN", nfts: null, pending: true });
  }

  const fulfilled = rec.state === "FULFILLED";
  return json({
    box,
    state: rec.state,
    tier: rec.tier ?? null,
    tierLabel: rec.tierLabel ?? null,
    settlementHeight: rec.settlementHeight ?? null,
    deliveryHeight: rec.deliveryHeight ?? null,
    transactionId: rec.transactionId ?? null,
    // withheld until delivery is confirmed on chain
    nfts: fulfilled ? rec.nfts || [] : null,
    pending: !fulfilled,
    updatedAt: rec.updatedAt ?? null,
  });
};
