// Claims this project must never make again, enforced over the whole text
// corpus (HTML, Markdown, JS, JSON in docs/).
//
//   npm test
//
// Exists because the "rarity rankings are not published (fair mint)" claim -
// eliminated from the site in iterations 7 and 11 - survived TWO site-wide
// sweeps by hiding in MINT.md: the sweeps grepped .html and .js, never .md.
// Falsehoods regenerate wherever vigilance has a blind spot, so the
// invariants live in the suite instead.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const DOCS = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");

// Every human-readable text file in docs/, excluding bulk generated data
// (metadata/, per-token files) where these phrases cannot occur as claims.
function corpus() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (["metadata", "images", "specials", "ones", "reveal", "assets"].includes(name)) continue;
        walk(p);
      } else if (/\.(html|md|js|json|txt)$/.test(name)) {
        out.push(p);
      }
    }
  };
  walk(DOCS);
  return out;
}

// [regex, why it must never appear]
const FORBIDDEN = [
  [/rarity[^.\n]{0,60}(not\s+(public|published)|withheld)/i,
   "the false-secrecy claim: rankings are public on purpose (iterations 7/11/47)"],
  [/\b70\s+one[- ]of[- ]ones?\b/i,
   "the stale 1/1 count: there are 71 (10 named + 61 community)"],
  [/\b60\s+(Chia\s+)?community\b/i,
   "the stale community count: there are 61"],
  [/mint\s+remains\s+disarmed/i,
   "the pre-arming claim: the sealed-box mint is live"],
  [/no\s+icon\/banner\s+in\s+(JSON|on-chain)/i,
   "icon and banner exist on both collections, IPFS-pinned"],
  [/8,?818\s+generative/i,
   "the wrong generative count: it is 8,817"],
];

// Legitimate exceptions: files that DESCRIBE the forbidden claims (history,
// this test's own documentation class) rather than making them.
const EXEMPT = /(nominate|CHANGELOG|ITERATIONS)/i;

test("no page or doc makes a claim the project has retired", () => {
  const violations = [];
  for (const p of corpus()) {
    const rel = relative(DOCS, p);
    if (EXEMPT.test(rel)) continue;
    const text = readFileSync(p, "utf8");
    for (const [re, why] of FORBIDDEN) {
      const m = text.match(re);
      if (m) violations.push(`${rel}: "${m[0].slice(0, 60)}" — ${why}`);
    }
  }
  assert.deepEqual(violations, [], `retired claims found:\n  ${violations.join("\n  ")}`);
});
