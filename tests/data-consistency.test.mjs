// Cross-file consistency for the 1-of-1 data the site renders.
//
//   npm test
//
// Exists because a bulk rename once corrupted specials.json: the NAMED special
// #787 "Fiend" was blindly renamed to "Ashen" (the COMMUNITY 1/1 at #5074),
// which 404'd the landing page's specials gallery. Named and community
// identities live in several JSON files that must agree; this test makes the
// agreement enforceable instead of hoped-for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DOCS = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");
const load = (p) => JSON.parse(readFileSync(join(DOCS, p), "utf8"));

test("named specials agree across specials.json and ones/catalog.json", () => {
  const specials = load("specials.json").specials;
  const catalog = load("ones/catalog.json").named_specials;
  assert.equal(specials.length, 10, "ten named specials");
  const byId = new Map(catalog.map((c) => [c.token_id, c]));
  for (const s of specials) {
    const c = byId.get(s.id);
    assert.ok(c, `catalog entry for named #${s.id}`);
    assert.equal(
      c.display_name, s.name,
      `#${s.id}: specials.json says "${s.name}", catalog says "${c.display_name}"`
    );
  }
});

test("every named special's art file exists", () => {
  for (const s of load("specials.json").specials) {
    const p = join(DOCS, "specials", `${s.file}.png`);
    assert.ok(existsSync(p), `specials/${s.file}.png (named #${s.id} "${s.name}")`);
  }
});

test("named and community identities never collide", () => {
  const cat = load("ones/catalog.json");
  const namedIds = new Set(cat.named_specials.map((c) => c.token_id));
  for (const c of cat.community_1of1) {
    assert.ok(!namedIds.has(c.token_id), `#${c.token_id} is in both named and community`);
  }
  // the count fields must match the arrays (a stale summary shipped once too)
  assert.equal(cat.named_count, cat.named_specials.length);
  assert.equal(cat.community_count, cat.community_1of1.length);
  assert.equal(cat.total_1of1, cat.named_specials.length + cat.community_1of1.length);
});

test("community art files referenced by specials.json exist", () => {
  for (const c of load("specials.json").community_1of1 || []) {
    if (!c.file) continue;
    const p = join(DOCS, "specials", c.file);
    assert.ok(existsSync(p), `specials/${c.file} (community #${c.id})`);
  }
});
