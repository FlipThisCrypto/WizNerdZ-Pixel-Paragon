/**
 * Published fairness proofs must verify — as a repo invariant.
 *
 * The buyer-facing checker (verify.html) refolds proofs in the browser at
 * read time. This test enforces the same property at publish time: every
 * bundle in docs/mint/proofs/ must fold to the published Merkle root, so a
 * pipeline bug, a root rotation without re-publishing, or a bad merge can
 * never ship a proof that fails in a buyer's browser.
 *
 * Independent implementation on purpose: node crypto here, WebCrypto in the
 * browser, hashlib in the operator tooling. Three codebases agreeing on the
 * same bytes is the point.
 *
 * Mirrors mint_system/commitment.py:
 *   leaf = sha256(0x00 || canonical_json({box_id, contents, salt}))
 *   node = sha256(0x01 || left || right); odd nodes promoted unchanged
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const proofsDir = join(repo, "docs", "mint", "proofs");
const commitment = JSON.parse(readFileSync(join(repo, "docs", "mint", "commitment.json"), "utf8"));

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
// sorted keys, no whitespace — byte-identical to python's canonicalize()
const canonical = (obj) =>
  Buffer.from("{" + Object.keys(obj).sort()
    .map((k) => JSON.stringify(k) + ":" + JSON.stringify(obj[k])).join(",") + "}", "utf8");

const foldProof = (leafHex, proof) => {
  let cur = leafHex;
  for (const step of proof) {
    const sib = Buffer.from(step.hash, "hex");
    const curB = Buffer.from(cur, "hex");
    if (step.side === "right") cur = sha256(Buffer.concat([Buffer.from([1]), curB, sib]));
    else if (step.side === "left") cur = sha256(Buffer.concat([Buffer.from([1]), sib, curB]));
    else throw new Error(`bad side ${step.side}`);
  }
  return cur;
};

const bundles = existsSync(proofsDir)
  ? readdirSync(proofsDir).filter((f) => f.endsWith(".json"))
  : [];

test("the published commitment header hashes to the published commitment_sha256", () => {
  assert.match(commitment.merkle_root, /^[0-9a-f]{64}$/);
  assert.equal(sha256(canonical(commitment.commitment_header)), commitment.commitment_sha256,
    "commitment.json's header does not hash to its own commitment_sha256");
});

test("every published proof bundle folds to the published root", () => {
  assert.ok(bundles.length >= 1, "no proof bundles found - at least the two launch boxes should be published");
  for (const f of bundles) {
    const b = JSON.parse(readFileSync(join(proofsDir, f), "utf8"));
    const leaf = sha256(Buffer.concat([Buffer.from([0]),
      canonical({ box_id: b.box_id, contents: b.contents.map(Number), salt: b.salt })]));
    assert.equal(leaf, b.leaf, `${f}: recomputed leaf differs from the bundle's`);
    assert.equal(foldProof(leaf, b.proof), commitment.merkle_root,
      `${f}: proof does not fold to the published root`);
  }
});

test("every proof file is named by the box NFT id it proves", () => {
  for (const f of bundles) {
    const b = JSON.parse(readFileSync(join(proofsDir, f), "utf8"));
    assert.equal(basename(f, ".json"), b.box_nft_id,
      `${f}: filename does not match embedded box_nft_id - the checker fetches by filename`);
    assert.match(b.box_nft_id, /^nft1[a-z0-9]{50,70}$/);
  }
});
