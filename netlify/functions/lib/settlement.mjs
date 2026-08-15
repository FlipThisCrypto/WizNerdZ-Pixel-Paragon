// Shared settlement-detection core, used by the scheduled watcher and the
// manual trigger endpoint.
//
// WHAT THIS DOES
// A Chia offer names the exact coin whose spend IS its settlement (the
// "anchor"). Every offer record loaded by the operator carries that anchor
// coin id, so detection is one batched public-node query about coins we
// already know: absent = not taken, spent = sold. No wallet, no keys, no
// indexer, no guessing.
//
// WHAT THIS DELIBERATELY DOES NOT DO
// - It never resolves WHO bought (that needs puzzle parsing and stays with
//   the operator, who alone performs delivery).
// - It never writes contents. A box paid-for-but-undelivered must look
//   exactly like a box we simply won't describe.
// - It never downgrades a status the operator already advanced.
// - When the chain is unreachable it does NOTHING: a delayed detection is
//   recoverable, a wrong one is not.
import { getStore } from "@netlify/blobs";

const NODE = "https://api.coinset.org";

// forward-only state machine; a write may only move a box UP this ladder
const RANK = {
  UNKNOWN: 0, SEALED: 1, OFFER_ISSUED: 2, SOLD: 3,
  DELIVERY_RESERVED: 4, BROADCAST: 5, CONFIRMED: 6, FULFILLED: 7,
};

async function coinRecordsByNames(names) {
  const res = await fetch(`${NODE}/get_coin_records_by_names`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "wiznerdz-watcher/1.0" },
    body: JSON.stringify({ names, include_spent_coins: true }),
  });
  if (!res.ok) throw new Error(`coinset HTTP ${res.status}`);
  const body = await res.json();
  if (!body.success) throw new Error(`coinset: ${body.error || "unknown error"}`);
  return body.coin_records || [];
}

// sha256(parent || puzzle_hash || amount-as-clvm-int) — a coin id is derived
// from its record, because get_coin_records_by_names does not echo the name.
async function coinId(rec) {
  const { parent_coin_info, puzzle_hash, amount } = rec.coin;
  const parent = hexToBytes(parent_coin_info);
  const puzzle = hexToBytes(puzzle_hash);
  const amt = clvmIntBytes(BigInt(amount));
  const buf = new Uint8Array(parent.length + puzzle.length + amt.length);
  buf.set(parent, 0);
  buf.set(puzzle, parent.length);
  buf.set(amt, parent.length + puzzle.length);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return bytesToHex(new Uint8Array(digest));
}

function hexToBytes(h) {
  const s = h.startsWith("0x") ? h.slice(2) : h;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
  return out;
}

function bytesToHex(b) {
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Chia serializes coin amounts as minimal big-endian two's-complement ints. */
function clvmIntBytes(n) {
  if (n === 0n) return new Uint8Array(0);
  const out = [];
  let v = n;
  while (v > 0n) {
    out.unshift(Number(v & 0xffn));
    v >>= 8n;
  }
  if (out[0] & 0x80) out.unshift(0); // keep it positive
  return new Uint8Array(out);
}

/**
 * The heartbeat is the difference between "the cron is configured" and "the
 * cron demonstrably runs". Every run - scheduled or manual, OK or DEGRADED -
 * stamps watch/lastRun; mint-stats serves it, so a heartbeat older than a few
 * schedule intervals is visible evidence the autonomous path is down.
 */
async function stampHeartbeat(mint, trigger, summary) {
  try {
    await mint.setJSON("watch/lastRun", {
      at: summary.checkedAt,
      trigger,
      status: summary.status,
      watched: summary.watched,
      settled: summary.settled.length,
      errors: summary.errors.length,
    });
  } catch (_) {
    /* a failed stamp must never fail the sweep itself */
  }
}

export async function detectSettlements(trigger = "manual") {
  const offers = getStore("wiznerdz-offers");
  const mint = getStore("wiznerdz-mint");

  const summary = {
    checkedAt: new Date().toISOString(),
    status: "OK",
    watched: 0,
    settled: [],
    skipped: [],
    errors: [],
  };

  const index = (await offers.get("index", { type: "json" })) || { available: {} };
  const taken = new Set(((await mint.get("taken", { type: "json" })) || {}).nftIds || []);

  // every dispensable offer that carries an anchor
  const watch = [];
  for (const [tier, ids] of Object.entries(index.available || {})) {
    for (const id of ids || []) {
      if (taken.has(id)) continue;
      const rec = await offers.get(`offer/${id}`, { type: "json" });
      if (!rec) continue;
      if (!rec.anchorCoin) {
        summary.skipped.push({ nftId: id, why: "no anchorCoin on record" });
        continue;
      }
      watch.push({ nftId: id, tier, anchor: rec.anchorCoin.replace(/^0x/, "") });
    }
  }
  summary.watched = watch.length;
  if (!watch.length) { await stampHeartbeat(mint, trigger, summary); return summary; }

  let records;
  try {
    records = await coinRecordsByNames(watch.map((w) => "0x" + w.anchor));
  } catch (e) {
    // Chain unreachable: report DEGRADED and change nothing. "No sales seen"
    // and "we could not look" must never be the same outcome.
    summary.status = "DEGRADED";
    summary.errors.push(String(e.message || e));
    await stampHeartbeat(mint, trigger, summary);
    return summary;
  }

  const spentByName = new Map();
  for (const rec of records) {
    if (rec.spent) spentByName.set(await coinId(rec), rec);
  }

  for (const w of watch) {
    const rec = spentByName.get(w.anchor);
    if (!rec) continue; // absent or unspent -> not settled

    const height = Number(rec.spent_block_index);

    // never downgrade a status the operator already advanced
    const existing = await mint.get(`status/${w.nftId}`, { type: "json" });
    const existingRank = RANK[existing?.state] ?? 0;
    if (existingRank < RANK.SOLD) {
      await mint.setJSON(`status/${w.nftId}`, {
        state: "SOLD",
        tier: w.tier,
        tierLabel: existing?.tierLabel ?? null,
        settlementHeight: height,
        nfts: null,
        detectedBy: "watcher",
        updatedAt: new Date().toISOString(),
      });
    }

    // retire the dead offer so it can never be dispensed again
    if (!taken.has(w.nftId)) {
      const takenRec = (await mint.get("taken", { type: "json" })) || { nftIds: [] };
      if (!takenRec.nftIds.includes(w.nftId)) {
        takenRec.nftIds.push(w.nftId);
        await mint.setJSON("taken", takenRec);
      }
    }
    const idx = (await offers.get("index", { type: "json" })) || { available: {} };
    let touched = false;
    for (const [t, ids] of Object.entries(idx.available || {})) {
      const next = (ids || []).filter((x) => x !== w.nftId);
      if (next.length !== ids.length) {
        idx.available[t] = next;
        touched = true;
      }
    }
    if (touched) await offers.setJSON("index", idx);

    summary.settled.push({ nftId: w.nftId, tier: w.tier, height });
  }

  await stampHeartbeat(mint, trigger, summary);
  return summary;
}
