// Regression tests for the settlement watcher's safety-critical pure logic.
//
//   node --test netlify/functions/lib/
//
// Runs OFFLINE: the mainnet coin records below were captured once from
// api.coinset.org and embedded as fixtures. Each coin's id is independently
// known (they are real coins from this project's own mints), so a change that
// breaks coin-id derivation - the thing that decides which boxes the watcher
// believes are SOLD - fails here instead of silently blinding production.
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import { coinId, clvmIntBytes, bytesToHex, hexToBytes, RANK, pickBoxForDispense, computePendingDeliveries, publishTransitionAllowed } from "./settlement.mjs";

// Real mainnet coins with independently-known ids:
//   87f9a78b... = the settlement spend of WizNerd #695's delivery
//   a6a6050d... = sealed box serial 2's pre-sale tip coin
//   32f5775d... = the child coin created by #695's settlement
const KNOWN_COINS = [
  {
    id: "87f9a78b0a5b888f48e3e87e555627414193fc2935d52b8af11b78f7afdbf9cd",
    coin: {
      parent_coin_info: "0x7ab4eeb180d24bed3b39d150699076d92629104db2129f005955629cc6f84b9f",
      puzzle_hash: "0x08ab08189e0fa4bee462c379f97d5ffe694d2f67a6b10c038d2206118eef56a9",
      amount: 1,
    },
  },
  {
    id: "a6a6050d38ec8e9d9215fc6f8b5ddf869c5dbf16c8d9792a005cfa91963d994a",
    coin: {
      parent_coin_info: "0xa4d362be023c157c2c1d98d7061f39bc4634c52df02515f33947f0cf261246ec",
      puzzle_hash: "0xd067ace0c0dc3798ac0303674ab2c9236eb7ac3f010dd92cabb82aa4d14955b4",
      amount: 1,
    },
  },
  {
    id: "32f5775d57e7d00573ab334e24be3e8ca73350a978f20edd82f6b744ea8c9028",
    coin: {
      parent_coin_info: "0x87f9a78b0a5b888f48e3e87e555627414193fc2935d52b8af11b78f7afdbf9cd",
      puzzle_hash: "0xfcf08e1ab1ff6c2821089c981d96959e414498606efe88aa2640f2e3762a437d",
      amount: 1,
    },
  },
];

test("coinId reproduces real mainnet coin ids", async () => {
  for (const k of KNOWN_COINS) {
    assert.equal(await coinId({ coin: k.coin }), k.id, `coin ${k.id.slice(0, 12)}`);
  }
});

test("clvmIntBytes: CLVM minimal big-endian encoding", () => {
  // zero is the empty atom
  assert.equal(clvmIntBytes(0n).length, 0);
  // small positives
  assert.equal(bytesToHex(clvmIntBytes(1n)), "01");
  assert.equal(bytesToHex(clvmIntBytes(127n)), "7f");
  // high bit set requires a 0x00 sign pad or the int reads negative
  assert.equal(bytesToHex(clvmIntBytes(128n)), "0080");
  assert.equal(bytesToHex(clvmIntBytes(255n)), "00ff");
  // multi-byte, no unnecessary padding
  assert.equal(bytesToHex(clvmIntBytes(256n)), "0100");
  assert.equal(bytesToHex(clvmIntBytes(100000n)), "0186a0");
  // a realistic XCH amount (1 XCH = 1e12 mojos)
  assert.equal(bytesToHex(clvmIntBytes(1000000000000n)), "00e8d4a51000");
});

test("hex round-trip", () => {
  const h = "00deadbeef80ff";
  assert.equal(bytesToHex(hexToBytes(h)), h);
  assert.equal(bytesToHex(hexToBytes("0x" + h)), h, "0x prefix accepted");
});

test("state ladder: SOLD and beyond outrank everything the watcher writes", () => {
  // the watcher may only ever move a box UP this ladder; these orderings are
  // what prevents it from downgrading an operator-advanced status
  assert.ok(RANK.SOLD > RANK.OFFER_ISSUED);
  assert.ok(RANK.OFFER_ISSUED > RANK.SEALED);
  assert.ok(RANK.DELIVERY_RESERVED > RANK.SOLD);
  assert.ok(RANK.BROADCAST > RANK.DELIVERY_RESERVED);
  assert.ok(RANK.CONFIRMED > RANK.BROADCAST);
  assert.ok(RANK.FULFILLED > RANK.CONFIRMED);
  assert.equal(RANK.UNKNOWN, 0, "unknown must rank below every real state");
});

test("dispenser selection: unheld boxes are preferred", () => {
  const now = 1_000_000_000;
  // A was just dispensed; B is free -> B must win regardless of randomness
  for (let i = 0; i < 20; i++) {
    const { nftId } = pickBoxForDispense(["A", "B"], { A: now - 1000 }, now);
    assert.equal(nftId, "B");
  }
});

test("dispenser selection: fully-held pool hands out the stalest hold", () => {
  const now = 1_000_000_000;
  const holds = { A: now - 5000, B: now - 60_000, C: now - 30_000 };
  const { nftId } = pickBoxForDispense(["A", "B", "C"], holds, now);
  assert.equal(nftId, "B", "oldest hold wins - never a false sold-out");
});

test("dispenser selection: expired holds free the box and get pruned", () => {
  const now = 1_000_000_000;
  const HOLD = 3 * 60 * 1000;
  const holds = { A: now - HOLD - 1, B: now - 1000 };
  const { nftId, holds: next } = pickBoxForDispense(["A", "B"], holds, now);
  assert.equal(nftId, "A", "expired hold means A is free again");
  assert.equal(next.A, now, "winner re-stamped");
  assert.ok(next.B, "unexpired holds survive");
  // and a stale loser is pruned
  const { holds: pruned } = pickBoxForDispense(["B"], { B: now - 1000, Z: now - HOLD - 1 }, now);
  assert.ok(!("Z" in pruned), "expired non-winner pruned");
});

test("dispenser selection: does not mutate the input holds record", () => {
  const holds = { A: 5 };
  pickBoxForDispense(["A", "B"], holds, 1_000_000);
  assert.deepEqual(holds, { A: 5 });
});

test("pending deliveries: sold-not-fulfilled counts, oldest measured", () => {
  const now = Date.parse("2026-08-15T12:00:00Z");
  const records = [
    { state: "SOLD", updatedAt: "2026-08-15T10:00:00Z" },        // 120m pending
    { state: "DELIVERY_RESERVED", updatedAt: "2026-08-15T11:30:00Z" }, // 30m pending
    { state: "FULFILLED", updatedAt: "2026-08-15T09:00:00Z" },   // delivered - excluded
    { state: "OFFER_ISSUED", updatedAt: "2026-08-15T08:00:00Z" },// not sold - excluded
    null,                                                         // tolerated
    { state: "NOT_A_STATE", updatedAt: "2026-08-15T08:00:00Z" }, // unknown - excluded
  ];
  const pd = computePendingDeliveries(records, now);
  assert.equal(pd.count, 2);
  assert.equal(pd.oldestMinutes, 120, "the tail defines the backlog");
});

test("pending deliveries: empty and all-fulfilled report zero", () => {
  const now = Date.now();
  assert.deepEqual(computePendingDeliveries([], now), { count: 0, oldestMinutes: 0 });
  assert.deepEqual(
    computePendingDeliveries([{ state: "FULFILLED", updatedAt: new Date(now - 9e7).toISOString() }], now),
    { count: 0, oldestMinutes: 0 }
  );
});

test("pending deliveries: a record with no timestamp reads as OLD, never fresh", () => {
  const now = Date.now();
  const pd = computePendingDeliveries([{ state: "SOLD" }], now);
  assert.equal(pd.count, 1);
  assert.ok(pd.oldestMinutes > 1e9, "unknown age must exceed any lag threshold");
  assert.equal(pd.unknownAge, true);
});

test("clvmIntBytes matches Chia's own encoder across 2,733 ground-truth values", () => {
  const { fixtures } = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "tests", "fixtures", "clvm_int_fixtures.json"), "utf8")
  );
  assert.ok(fixtures.length > 2500, "corpus is substantial");
  const bad = [];
  for (const { v, hex } of fixtures) {
    const got = bytesToHex(clvmIntBytes(BigInt(v)));
    if (got !== hex) bad.push(`${v}: got ${got}, chia says ${hex}`);
  }
  assert.deepEqual(bad.slice(0, 5), [], `${bad.length} divergences from Chia's encoder`);
});

test("publish transitions: forward and same-rank writes pass, downgrades refuse, force overrides", () => {
  // forward moves and re-publishing the same state are the normal paths
  assert.equal(publishTransitionAllowed("SOLD", "FULFILLED").allowed, true);
  assert.equal(publishTransitionAllowed("FULFILLED", "FULFILLED").allowed, true);
  assert.equal(publishTransitionAllowed(undefined, "SOLD").allowed, true); // first write
  assert.equal(publishTransitionAllowed("OFFER_ISSUED", "SOLD").allowed, true);

  // a downgrade re-hides a buyer's delivered contents - refused by default
  const down = publishTransitionAllowed("FULFILLED", "SOLD");
  assert.equal(down.allowed, false);
  assert.match(down.why, /downgrade refused/);
  assert.equal(publishTransitionAllowed("SOLD", "OFFER_ISSUED").allowed, false);

  // deliberate corrections must stay possible, but only explicitly
  assert.equal(publishTransitionAllowed("FULFILLED", "SOLD", { force: true }).allowed, true);
});
