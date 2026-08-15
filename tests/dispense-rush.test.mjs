/**
 * Drop-rush simulation for pickBoxForDispense.
 *
 * A real drop is dozens of buyers hammering a shrinking pool while holds
 * expire and reads go stale. The example tests pin single calls; these pin
 * the PROPERTIES a rush must not break:
 *
 *   1. never a false 410 - a box is always returned while any candidate exists
 *   2. holds spread buyers: with enough unheld boxes, concurrent buyers land
 *      on distinct boxes at high rate
 *   3. a fully-held pool yields the STALEST hold (fair recycling, no starvation)
 *   4. expired holds are pruned and their boxes become dispensable again
 *
 * Deterministic on purpose: a seeded PRNG (mulberry32) makes every failure
 * reproducible by seed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickBoxForDispense } from "../netlify/functions/lib/settlement.mjs";

const HOLD_MS = 3 * 60 * 1000;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const boxes = (n) => Array.from({ length: n }, (_, i) => `box_${String(i).padStart(3, "0")}`);

test("property: a box is always returned while candidates exist - across 200 seeded scenarios", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rand = mulberry32(seed);
    const pool = boxes(1 + Math.floor(rand() * 12));
    let holds = {};
    let now = 1_000_000_000_000;
    const requests = 50 + Math.floor(rand() * 150);
    for (let i = 0; i < requests; i++) {
      now += Math.floor(rand() * 30_000); // bursts and lulls
      const r = pickBoxForDispense(pool, holds, now, { holdMs: HOLD_MS, rand });
      assert.ok(pool.includes(r.nftId),
        `seed ${seed} req ${i}: returned ${r.nftId} not in pool - false 410 territory`);
      holds = r.holds;
    }
  }
});

test("property: concurrent buyers spread across an ample pool", () => {
  // simultaneous burst: same `now`, sequential hold-state (what strong
  // consistency guarantees the store serializes into)
  for (const seed of [7, 42, 1337]) {
    const rand = mulberry32(seed);
    const pool = boxes(10);
    let holds = {};
    const now = 1_000_000_000_000;
    const got = [];
    for (let buyer = 0; buyer < 10; buyer++) {
      const r = pickBoxForDispense(pool, holds, now, { holdMs: HOLD_MS, rand });
      got.push(r.nftId);
      holds = r.holds;
    }
    // 10 buyers, 10 boxes, serialized holds: every buyer gets a DISTINCT box
    assert.equal(new Set(got).size, 10,
      `seed ${seed}: ${10 - new Set(got).size} collisions with ample inventory`);
  }
});

test("property: random pick keeps STALE-READ collisions rare", () => {
  // The randomness exists for exactly one regime: two requests that read the
  // SAME holds snapshot (a stale read) both see the same free list, and only
  // the random pick keeps them off the same box. Observed live before the
  // strong-consistency fix - this pins the mitigation for any regression.
  const rand = mulberry32(31337);
  const pool = boxes(10);
  let collisions = 0;
  const PAIRS = 200;
  for (let i = 0; i < PAIRS; i++) {
    const now = 1_000_000_000_000 + i * 60_000;
    const staleHolds = {}; // both buyers read the same (empty) snapshot
    const a = pickBoxForDispense(pool, staleHolds, now, { holdMs: HOLD_MS, rand });
    const b = pickBoxForDispense(pool, staleHolds, now, { holdMs: HOLD_MS, rand });
    if (a.nftId === b.nftId) collisions++;
  }
  // expected rate 1/10; fail well above it so noise can't flake the suite
  assert.ok(collisions < PAIRS * 0.25,
    `${collisions}/${PAIRS} stale-read pairs collided - random spread is broken`);
});

test("property: a fully-held pool yields the stalest hold and never starves one box", () => {
  const pool = boxes(4);
  let holds = {};
  let now = 1_000_000_000_000;
  const rand = mulberry32(99);
  // hold everything at staggered times
  for (const b of pool) { holds[b] = now; now += 1000; }
  // pool fully held: next dispenses must walk the holds oldest-first
  const order = [];
  for (let i = 0; i < 4; i++) {
    const r = pickBoxForDispense(pool, holds, now, { holdMs: HOLD_MS, rand });
    order.push(r.nftId);
    holds = r.holds;
    now += 1000;
  }
  assert.deepEqual(order, pool,
    "fully-held dispensing must recycle oldest-first (fair, starvation-free)");
});

test("property: expired holds are pruned and their boxes dispensable again", () => {
  const pool = boxes(3);
  const rand = mulberry32(5);
  let now = 1_000_000_000_000;
  let r = pickBoxForDispense(pool, {}, now, { holdMs: HOLD_MS, rand });
  const first = r.nftId;
  // long past expiry, someone else asks: the expired hold must not repel them
  now += HOLD_MS * 2;
  const seen = new Set();
  let holds = r.holds;
  for (let i = 0; i < 30; i++) {
    const rr = pickBoxForDispense(pool, holds, now, { holdMs: HOLD_MS, rand });
    seen.add(rr.nftId);
    // do NOT accumulate holds - each request sees only the original expired one
  }
  assert.ok(seen.has(first), "an expired hold permanently repelled buyers from its box");
  // and pruning: after a fresh dispense, the stale entry is gone from the map
  const rr = pickBoxForDispense(pool, holds, now, { holdMs: HOLD_MS, rand });
  const staleLeft = Object.entries(rr.holds).filter(([k, t]) => t <= now - HOLD_MS && k !== rr.nftId);
  assert.equal(staleLeft.length, 0, "expired holds must be pruned from the stored map");
});

test("property: seeded runs are exactly reproducible", () => {
  const run = () => {
    const rand = mulberry32(2024);
    const pool = boxes(6);
    let holds = {}; let now = 1_000_000_000_000; const out = [];
    for (let i = 0; i < 40; i++) {
      now += Math.floor(rand() * 20_000);
      const r = pickBoxForDispense(pool, holds, now, { holdMs: HOLD_MS, rand });
      out.push(r.nftId); holds = r.holds;
    }
    return out.join(",");
  };
  assert.equal(run(), run(), "same seed must yield the identical dispense sequence");
});
