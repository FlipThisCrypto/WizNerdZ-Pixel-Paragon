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
  }

  return json({ ok: true, written, problems });
};
