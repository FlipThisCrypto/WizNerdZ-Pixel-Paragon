// Site-wide reference integrity: every local href/src in every page must
// resolve to a real file in docs/.
//
//   npm test
//
// Exists because a corrupted rename shipped a specials-gallery 404 to the
// deployed landing page undetected (specials/Ashen.png). Broken references
// are invisible in review - the HTML looks fine - so they get a test instead
// of vigilance.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";

const DOCS = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");

const htmlFiles = readdirSync(DOCS).filter((f) => f.endsWith(".html"));

// external schemes, protocol-relative, anchors, and template/dynamic values
const SKIP = /^(https?:|mailto:|ipfs:|data:|#|javascript:|\{|\$)/i;

function refsOf(html) {
  // script bodies are CODE, not markup - src="images/' + id + '" template
  // fragments in there are runtime-built and not checkable statically
  const markup = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const out = [];
  // href/src/poster in attributes; content= only for og/twitter images is
  // absolute (skipped by SKIP); srcset intentionally out of scope (unused)
  const re = /\b(?:href|src|poster)\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(markup))) out.push(m[1]);
  return out;
}

function resolves(ref) {
  const clean = ref.split("#")[0].split("?")[0];
  if (!clean) return true; // pure anchor/query - same document
  const p = normalize(join(DOCS, clean));
  if (!p.startsWith(normalize(DOCS))) return false; // escaped docs/ - broken by definition
  if (!existsSync(p)) return false;
  // a directory only resolves if it has an index.html (static hosts 404 otherwise)
  return statSync(p).isFile() || existsSync(join(p, "index.html"));
}

test("every local reference in every page resolves to a real file", () => {
  const broken = [];
  for (const f of htmlFiles) {
    const html = readFileSync(join(DOCS, f), "utf8");
    for (const ref of refsOf(html)) {
      if (SKIP.test(ref)) continue;
      if (!resolves(ref)) broken.push(`${f} -> ${ref}`);
    }
  }
  assert.deepEqual(broken, [], `broken references:\n  ${broken.join("\n  ")}`);
});

test("assets referenced by specials.json and ones/catalog.json exist", () => {
  const broken = [];
  const sp = JSON.parse(readFileSync(join(DOCS, "specials.json"), "utf8"));
  for (const s of sp.specials || []) {
    if (!existsSync(join(DOCS, "specials", `${s.file}.png`))) broken.push(`specials/${s.file}.png`);
  }
  for (const c of sp.community_1of1 || []) {
    if (c.file && !existsSync(join(DOCS, "specials", c.file))) broken.push(`specials/${c.file}`);
  }
  const cat = JSON.parse(readFileSync(join(DOCS, "ones", "catalog.json"), "utf8"));
  for (const e of [...(cat.named_specials || []), ...(cat.community_1of1 || [])]) {
    if (e.ones_file && !existsSync(join(DOCS, e.ones_file))) broken.push(e.ones_file);
  }
  assert.deepEqual(broken, [], `missing assets:\n  ${broken.join("\n  ")}`);
});
