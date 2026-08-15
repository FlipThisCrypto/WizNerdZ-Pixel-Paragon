/**
 * Reveal subsystem contract tests.
 *
 * Runs the REAL browser sources (state-machine.js, reveal-config.js,
 * reveal-video.js) under node via a stubbed `window`, and pins the seams the
 * buyer experience depends on:
 *
 *  - the state machine's transition graph and its safety invariants
 *  - the narration config narrates states that actually exist
 *  - rarity -> video selection can never oversell what the box delivered
 *  - every video file the config references exists on disk
 *
 * These are the guarantees the reveal claims in its own comments; until now
 * they were proven only by manual browser walks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const revealDir = join(repo, "docs", "js", "reveal");

// Execute the real browser IIFEs against a minimal window stub.
const windowStub = {};
const context = vm.createContext({
  window: windowStub,
  navigator: {},
  document: undefined,
  Date,
  Object,
  Array,
  String,
  Promise,
  Error,
  isFinite,
  setTimeout,
  clearTimeout,
});
for (const f of ["state-machine.js", "reveal-config.js", "reveal-video.js"]) {
  vm.runInContext(readFileSync(join(revealDir, f), "utf8"), context, { filename: f });
}

const CFG = windowStub.WIZNERDZ_REVEAL_CONFIG;
const STATES = windowStub.WIZNERDZ_REVEAL_STATES;
const Machine = windowStub.WizNerdzRevealStateMachine;
const RevealVideo = windowStub.WizNerdzRevealVideo;

test("the browser sources loaded and exported their globals", () => {
  assert.ok(CFG && STATES && Machine && RevealVideo);
});

test("every narrated phase is a state the machine actually has", () => {
  for (const key of Object.keys(CFG.narration || {})) {
    assert.ok(STATES.includes(key), `narration key "${key}" is not a machine state`);
  }
});

test("the full happy path, including the legendary loop, is legal", () => {
  const seen = [];
  const m = new Machine({ onChange: (to) => seen.push(to) });
  const path = [
    "transaction", "spell_build", "consume_ui", "portal_open",
    "video_transition_in", "video_playing", "video_transition_out",
    "summoning", "legendary_interrupt", "summoning", "portal_collapse", "results",
  ];
  for (const s of path) m.go(s);
  assert.equal(m.state, "results");
  assert.deepEqual(seen, path, "onChange fired exactly once per transition, in order");
});

test("every no-video fallback edge is legal", () => {
  // the controller takes these shortcuts when the video is missing, slow,
  // autoplay-blocked, or the buyer asked to save data
  for (const [from, to] of [
    ["portal_open", "summoning"],
    ["video_transition_in", "summoning"],
    ["video_playing", "summoning"],
  ]) {
    const m = new Machine();
    m.forceTo(from);
    assert.ok(m.can(to), `${from} -> ${to} must be legal`);
  }
});

test("error is reachable from every non-terminal state, and error -> results is legal", () => {
  for (const s of STATES) {
    if (s === "results" || s === "error") continue;
    const m = new Machine();
    m.forceTo(s);
    assert.ok(m.can("error"), `${s} cannot route to error - a thrown animation would strand the buyer`);
  }
  const m = new Machine();
  m.forceTo("error");
  assert.ok(m.can("results"), "a broken animation must still be able to show the reveal");
});

test("illegal and unknown transitions throw; forceTo works from anywhere", () => {
  const m = new Machine();
  assert.throws(() => m.go("results"), /illegal transition/);
  assert.throws(() => m.go("nope"), /unknown state/);
  const seen = [];
  const f = new Machine({ onChange: (to, prev) => seen.push([prev, to]) });
  f.forceTo("summoning");
  f.forceTo("results"); // the skip path's exact move
  assert.deepEqual(seen, [["idle", "summoning"], ["summoning", "results"]]);
});

const pick = (nfts) => new RevealVideo(null)._src({ nfts });

test("the video never oversells: selection follows the best rarity actually in the box", () => {
  assert.match(pick([{ rarity: "1 of 1" }]).url, /Tier5/);
  assert.match(pick([{ isOneOfOne: true }]).url, /Tier5/, "the 1of1 flag alone must select the top video");
  assert.match(pick([{ rarity: "Legendary" }]).url, /Tier4/);
  assert.match(pick([{ rarity: "Common" }, { rarity: "Epic" }]).url, /Tier3/, "best rarity in a bundle wins");
  assert.match(pick([{ rarity: "Rare" }]).url, /Tier2/);
  assert.match(pick([{ rarity: "Common" }]).url, /Tier1/);
});

test("unreadable rarities and legacy tier ids still resolve to a video", () => {
  assert.match(pick([{ rarity: "???" }]).url, /Tier1/, "unknown rarity takes the fallback video");
  const legacy = new RevealVideo(null)._src("blind_single");
  assert.match(legacy.url, /Tier1/);
  const garbage = new RevealVideo(null)._src("no_such_tier");
  assert.match(garbage.url, new RegExp(CFG.tiers[CFG.fallbackTier].video.replace(".", "\\.")));
});

test("every video file the config references exists on disk", () => {
  const referenced = new Set();
  for (const r of CFG.rarityVideos) referenced.add(r.video);
  if (CFG.fallbackVideo) referenced.add(CFG.fallbackVideo.video);
  for (const t of Object.values(CFG.tiers)) referenced.add(t.video);
  for (const v of referenced) {
    const p = join(repo, "docs", CFG.videoBase, v);
    assert.ok(existsSync(p), `config references ${CFG.videoBase}/${v} but it is not on disk`);
  }
});
