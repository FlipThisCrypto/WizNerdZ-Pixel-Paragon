// Drop-day preflight: verify the LIVE money path end to end, read-only.
//
//   npm run preflight
//
// The offline suite (npm test) guards logic; this guards DEPLOYMENT - the
// gap between "the code is right" and "the live system is actually ready to
// take money". Read-only by design: it never mutates state, never spends,
// and needs no secrets.
//
// Exit 0 = every check passed. Any failure prints exactly what an operator
// must fix before opening the doors.
const SITE = process.env.MINT_SITE || "https://wiznerdz-pixel-paragon.netlify.app";
const PAGES = "https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon";
const HEARTBEAT_MAX_MIN = 15; // 3 schedule intervals

let failures = 0;
const ok = (name, extra = "") => console.log(`  PASS ${name}${extra ? "  (" + extra + ")" : ""}`);
const fail = (name, why) => {
  failures++;
  console.error(`  FAIL ${name}: ${why}`);
};

async function jget(url) {
  const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "wz-preflight/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

console.log(`preflight against ${SITE}\n`);

// 1. stats serve, and the watcher heartbeat is fresh
try {
  const stats = await jget(`${SITE}/api/mint-stats`);
  ok("mint-stats serves", `dispensable ${stats.totals.dispensable}, sold ${stats.totals.sold}`);
  const w = stats.watcher;
  if (!w) fail("watcher heartbeat", "no heartbeat recorded at all");
  else {
    const ageMin = (Date.now() - new Date(w.at).getTime()) / 60000;
    if (w.status !== "OK") fail("watcher status", `${w.status} (errors: ${w.errors})`);
    else if (ageMin > HEARTBEAT_MAX_MIN) fail("watcher freshness", `last run ${ageMin.toFixed(0)}m ago (max ${HEARTBEAT_MAX_MIN}m) - cron may be down`);
    else ok("watcher heartbeat", `${w.status}, ${ageMin.toFixed(1)}m ago via ${w.trigger}`);
  }
  if (stats.totals.dispensable === 0) fail("inventory", "zero dispensable boxes - nothing to sell");
} catch (e) {
  fail("mint-stats", e.message);
}

// 2. the dispenser actually dispenses, and what it hands out is sound
try {
  const offer = await jget(`${SITE}/api/mint-offer?tier=blind_single`);
  if (!offer.ok) fail("dispense", JSON.stringify(offer).slice(0, 120));
  else {
    ok("dispenser dispenses", offer.boxNftId?.slice(0, 16));
    if (!/^offer1[a-z0-9]+$/.test(offer.offer || "")) fail("offer shape", "not a bech32 offer1 string");
    else ok("offer well-formed", `${offer.offer.length} chars`);
    if (!offer.sealed) fail("sealed flag", "offer response not marked sealed");
    const leak = ["contents", "token_id", "allocation", "seed", "salt"].filter((k) =>
      JSON.stringify(offer).toLowerCase().includes(`"${k}"`)
    );
    if (leak.length) fail("leak scan", `response contains ${leak.join(",")}`);
    else ok("leak scan clean");
    // status endpoint answers for the dispensed box
    const st = await jget(`${SITE}/api/mint-status?box=${offer.boxNftId}`);
    if (st.nfts !== null && st.state !== "FULFILLED") fail("content withholding", `nfts present in state ${st.state}`);
    else ok("status answers + withholds", st.state);
  }
} catch (e) {
  fail("dispense", e.message);
}

// 3. admin endpoints fail closed without the secret
try {
  const res = await fetch(`${SITE}/api/admin-run-watcher`, { method: "POST" });
  if (res.status === 401 || res.status === 503) ok("admin fails closed", `HTTP ${res.status}`);
  else fail("admin fails closed", `HTTP ${res.status} - expected 401/503`);
} catch (e) {
  fail("admin endpoint", e.message);
}

// 4. both origins serve the trust surface
for (const [name, url] of [
  ["verify page (netlify)", `${SITE}/verify.html`],
  ["commitment json (netlify)", `${SITE}/mint/commitment.json`],
  ["pages mirror index", `${PAGES}/`],
  ["pages commitment json", `${PAGES}/mint/commitment.json`],
]) {
  try {
    const res = await fetch(url, { headers: { "user-agent": "wz-preflight/1.0" } });
    if (res.ok) ok(name);
    else fail(name, `HTTP ${res.status}`);
  } catch (e) {
    fail(name, e.message);
  }
}

// 5. the two origins agree on the commitment (split-brain check)
try {
  const [a, b] = await Promise.all([
    jget(`${SITE}/mint/commitment.json`),
    jget(`${PAGES}/mint/commitment.json`),
  ]);
  if (a.merkle_root === b.merkle_root) ok("origins agree on merkle root", a.merkle_root.slice(0, 16));
  else fail("origin split-brain", `netlify ${a.merkle_root?.slice(0, 12)} != pages ${b.merkle_root?.slice(0, 12)}`);
} catch (e) {
  fail("commitment comparison", e.message);
}

console.log(failures === 0 ? "\nPREFLIGHT CLEAN - the live money path is ready" : `\nPREFLIGHT FAILED - ${failures} check(s) need attention`);
process.exit(failures === 0 ? 0 : 1);
