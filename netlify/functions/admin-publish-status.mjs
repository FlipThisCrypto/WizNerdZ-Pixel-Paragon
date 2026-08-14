// Publish verified delivery results for sealed boxes. OPERATOR ONLY.
//
// POST /api/admin-publish-status
//   headers: x-admin-secret: <MINT_ADMIN_SECRET>
//   body: { statuses: [ { boxNftId, state, tier, tierLabel, nfts?, ... } ] }
//
// The site cannot observe the chain, so the operator — who does — pushes what
// actually happened. mint-status.mjs then serves it read-only to the reveal.
//
// A status is a claim about a completed on-chain delivery. It is only accepted
// with the admin secret, and contents are refused unless the box is FULFILLED:
// publishing an allocation before delivery is confirmed would leak what a box
// holds while it could still be resold.
import { getStore } from "@netlify/blobs";

const json = (o, s = 200) =>
  new Response(JSON.stringify(o, null, 2), {
    status: s,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const STATES = new Set([
  "SEALED", "OFFER_ISSUED", "SOLD", "DELIVERY_RESERVED",
  "BROADCAST", "CONFIRMED", "FULFILLED",
]);

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = process.env.MINT_ADMIN_SECRET;
  if (!secret) return json({ error: "not_configured" }, 503);
  if (req.headers.get("x-admin-secret") !== secret) return json({ error: "unauthorized" }, 401);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const list = Array.isArray(body?.statuses) ? body.statuses : null;
  if (!list?.length) return json({ error: "no_statuses" }, 400);

  const store = getStore("wiznerdz-mint");
  let written = 0;
  const problems = [];

  for (const s of list) {
    if (!s?.boxNftId || !/^nft1[a-z0-9]{50,70}$/.test(s.boxNftId)) {
      problems.push({ why: "bad boxNftId", got: s?.boxNftId ?? null });
      continue;
    }
    if (!STATES.has(s.state)) {
      problems.push({ boxNftId: s.boxNftId, why: `unknown state ${s.state}` });
      continue;
    }
    // contents only ever accompany a confirmed delivery
    if (s.nfts && s.state !== "FULFILLED") {
      problems.push({ boxNftId: s.boxNftId, why: "contents sent for a non-FULFILLED box" });
      continue;
    }
    if (s.state === "FULFILLED" && (!Array.isArray(s.nfts) || !s.nfts.length)) {
      problems.push({ boxNftId: s.boxNftId, why: "FULFILLED with no contents" });
      continue;
    }

    await store.setJSON(`status/${s.boxNftId}`, {
      state: s.state,
      tier: s.tier ?? null,
      tierLabel: s.tierLabel ?? null,
      settlementHeight: s.settlementHeight ?? null,
      deliveryHeight: s.deliveryHeight ?? null,
      transactionId: s.transactionId ?? null,
      nfts: s.state === "FULFILLED" ? s.nfts : null,
      updatedAt: new Date().toISOString(),
    });
    written++;

    // A sold box's offer must leave the dispenser. Its NFT coin was spent by
    // the settlement, so the offer is dead - handing it out again would give
    // a buyer an offer that cannot possibly be taken.
    if (s.state !== "SEALED" && s.state !== "OFFER_ISSUED") {
      try {
        const offers = getStore("wiznerdz-offers");
        const index = (await offers.get("index", { type: "json" })) || { available: {} };
        let touched = false;
        for (const [t, ids] of Object.entries(index.available || {})) {
          const next = (ids || []).filter((id) => id !== s.boxNftId);
          if (next.length !== ids.length) {
            index.available[t] = next;
            touched = true;
          }
        }
        if (touched) await offers.setJSON("index", index);
        const takenRec = (await store.get("taken", { type: "json" })) || { nftIds: [] };
        if (!takenRec.nftIds.includes(s.boxNftId)) {
          takenRec.nftIds.push(s.boxNftId);
          await store.setJSON("taken", takenRec);
        }
      } catch (e) {
        problems.push({ boxNftId: s.boxNftId, why: `status written but offer retirement failed: ${e.message}` });
      }
    }
  }

  return json({ ok: true, written, problems });
};
