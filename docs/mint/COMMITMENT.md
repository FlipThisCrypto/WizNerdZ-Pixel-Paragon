# WizNerdZ sealed-box allocation — how to verify it yourself

Every sealed box's contents were decided **before any box went on sale**, and the
proof is published. This page explains what we committed to, how you check your
own box, and what changed from our first commitment.

---

## The short version

- The contents of all **4,438 boxes** were fixed and hashed into a single value
  before sales opened.
- That value — the **Merkle root** — is public.
- When you open a box, you receive a **proof** for *your* box.
- You can verify that proof yourself, offline, with no trust in us.
- The proof reveals **your** box only. It tells you nothing about anyone else's.

If the proof verifies, we could not have changed what was in your box after you
paid. That is the entire point.

---

## Published values

| Field | Value |
|---|---|
| Commitment | `c375b6e83d4cee9ba2987875390a2c4d4c5f9ca7f9c49b4afe2e5c1aaca7f390` |
| Merkle root | `278a44d106c26df2db8085fb0a6ff99f3732cca25b2818913a4366b7a7229ea6` |
| Boxes committed | 4,420 |
| Scheme | `wiznerdz-merkle-v1` |
| Seed entropy | 256 bits (CSPRNG) |

Live at [`mint/commitment.json`](./commitment.json).

---

## Verify your box

You will receive a proof file when your box is opened. Then:

```bash
python mint_system/verify_box_proof_cli.py --proof your_box_proof.json
```

A passing run prints your NFT list and:

```
VERIFIED — these NFTs were committed to this box before any sale.
```

The verifier does not trust the proof file. It recomputes your leaf hash from
`{box_id, contents, salt}`, folds it up the sibling path, and requires the result
to equal the **published** root. Change any token id and it fails.

### Doing it by hand

```
leaf  = sha256( 0x00 || canonical_json({box_id, contents, salt}) )
node  = sha256( 0x01 || left_hash || right_hash )
```

Fold `leaf` with each sibling in `proof` (`side` says whether the sibling goes
left or right), and compare to `merkle_root`. `canonical_json` is
`json.dumps(obj, sort_keys=True, separators=(',',':'))` encoded UTF-8.

The commitment itself is `sha256(canonical_json(commitment_header))`, where the
header binds the root, the box count, the reserve list, and a hash of the
allocation seed.

---

## Why each piece is there

**Why a Merkle tree rather than one hash?**
Our first commitment was a single SHA-256 over the entire allocation. It was
sound, but proving *one* buyer's box meant publishing *everyone's* contents.
A Merkle tree proves one box while every other box stays sealed.

**Why is there a `salt` in my proof?**
Without it, the scheme would leak. A Blind Single box holds one token id out of
8,888, and every box id is public — so an unsalted leaf hash could be
brute-forced in milliseconds, and anyone holding a proof could read their
neighbours' allocations off the sibling hashes. Each box gets its own secret
salt derived from the allocation seed, which makes sibling leaves unopenable.
Your salt is yours; it reveals nothing about any other box.

**Why is the seed only committed, not published?**
The seed regenerates the allocation and every salt, so it stays secret until the
mint closes. The header contains `sha256(seed)`, pinning it now so it can be
disclosed afterwards for full public reconstruction.

This only works if the seed is **cryptographically random**. `sha256(seed)` is
published, so a guessable seed is recovered by enumeration in milliseconds — and
with it, every box. The seed is 256 bits from a CSPRNG, and the tooling refuses
to publish a commitment over a seed that is not.

**Why is the box count in the commitment?**
So the tree's shape cannot be reinterpreted after the fact. Odd nodes are
promoted, never duplicated — duplication (the CVE-2012-2459 pattern) would let
two different allocations share one root.

---

## What changed, and why you can check we did not cheat

Before any sale, we replaced the allocation commitment **twice**. Replacing a
published commitment is exactly the move a dishonest operator would make, so the
full history is on the record and every prior value stays published — see the
`supersedes` array in [`commitment.json`](./commitment.json).

| When | Commitment | Status |
|---|---|---|
| 2026-08-11 | `f4b469e5…` | was live; superseded |
| (local only) | `1ef9be51…` | never published; superseded |
| **current** | `c375b6e8…` | **live** |

**Why twice — the honest version:** the first allocation used a predictable
seed (`wiznerdz-mint-prod-YYYY-MM-DD-vN`). That is only a few thousand
possibilities, so anyone could recover it and, from it, regenerate every box's
contents — the "sealed" mint was readable. We found this before any sale,
generated a **256-bit random** seed, regenerated the allocation, and
republished. Box contents changed as a result. No sale had occurred at any point
during these replacements, which is the only thing that makes replacing a
commitment legitimate.

The superseded commitments are **not deleted**. Deleting them is what a
dishonest operator does; keeping them lets anyone audit exactly what changed and
when.

Once a box sells, the commitment is frozen permanently.

---

## After the mint

We publish the full private allocation and the seed. At that point anyone can
regenerate every salt, rebuild the entire tree, and confirm the root has matched
all along — not just for their own box, but for all 4,438.
