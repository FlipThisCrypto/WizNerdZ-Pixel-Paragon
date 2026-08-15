# WizNerdZ sealed-box allocation — how to verify it yourself

Every sealed box's contents were decided **before any box went on sale**, and the
proof is published. This page explains what we committed to, how you check your
own box, and what changed from our first commitment.

---

## The short version

- The contents of every **sellable box** were fixed and hashed into a single
  value before sales opened.
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
| Commitment | `067fb6cc7ba997447824929b325877a111b26d354d3a7b72d6f223db01e2d533` |
| Merkle root | `32d48bd3e53a2f16094e794bfa13d6aa6655e33a18815317e6da7cd1e2c988dd` |
| Sellable boxes | 4,196 |
| Treasury boxes (held) | 224 |
| Scheme | `wiznerdz-merkle-v1` |
| Seed entropy | 256 bits (CSPRNG) |

Live at [`mint/commitment.json`](./commitment.json).

---

## The treasury hold — what we kept, and what we could not touch

Before any sale we set aside **5% of the collection (444 NFTs, 224 boxes)** for
treasury, marketing and free mints. We think you should be able to see exactly
what that hold can and cannot be, because the temptation for any team is to skim
the best pieces for themselves. We built the rules so we *can't*:

- **No top-tier boxes.** Only the bottom four tiers can be held. Every Named
  Premium box stays in the public sale.
- **None of the 100 rarest.** All 71 one-of-ones and the 29 rarest generatives
  are barred from the hold — they stay where anyone can pull them.
- **Whole boxes only.** Nothing is skimmed out of a box a buyer could receive.
- **Chosen by the seed, not by hand.** The held boxes are picked
  deterministically from the secret seed.

The two rules you *can* check right now — no top-tier box and no top-100 rarest —
are provable today from the public box IDs: the exact 224 held box IDs are listed
in [`commitment.json`](./commitment.json) under `treasury_selection`.

The "not cherry-picked" claim is checkable **when we disclose the seed after the
mint** — the same disclosure that lets you verify your own box's contents. At
that point anyone runs one command and the seed must reproduce exactly these 224
box IDs; if we had hand-picked the best eligible boxes instead, it wouldn't. We
can't reveal the seed sooner because it would unseal every unsold box. So this
rule carries the same "verify at reveal" trust as everything else here — not more.

The held boxes are listed openly — they're ours, so there's nothing to seal. The
public commitment above covers the **4,196 sellable boxes only**.

---

## Verify your box

Once your box is opened, its proof is published and the checker at the top of
[the verify page](verify.html) runs entirely in your browser: enter your box's
NFT id (or open `verify.html?proof=<your box id>`). It recomputes every hash
itself and trusts nothing but the published root.

Prefer to verify offline, away from our site? The same check as a script:

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

Before any sale, we replaced the allocation commitment more than once. Replacing
a published commitment is exactly the move a dishonest operator would make, so
the full history is on the record and every prior value stays published — see the
`supersedes` array in [`commitment.json`](./commitment.json).

| When | Commitment | Status |
|---|---|---|
| 2026-08-11 | `f4b469e5…` | was live; superseded (weak seed) |
| (local only) | `1ef9be51…` | never published; superseded |
| 2026-08-12 | `c375b6e8…` | was live; superseded (treasury hold) |
| **current** | `067fb6cc…` | **live** — sellable boxes only |

**The honest version.** The first allocation used a predictable seed
(`wiznerdz-mint-prod-YYYY-MM-DD-vN`) — only a few thousand possibilities, so
anyone could recover it and regenerate every box's contents. The "sealed" mint
was readable. We caught it before any sale, generated a **256-bit random** seed,
and regenerated. Then, still before any sale, we set aside the 5% treasury hold
described above and re-published the commitment over the sellable boxes only.
Box **contents were not touched** by the treasury step — we only marked which
boxes are held. No sale had occurred at any point, which is the only thing that
makes replacing a commitment legitimate.

The superseded commitments are **not deleted**. Deleting them is what a
dishonest operator does; keeping them lets anyone audit exactly what changed and
when.

Once a box sells, the commitment is frozen permanently.

---

## After the mint

We publish the full private allocation and the seed. At that point anyone can
regenerate every salt, rebuild the entire tree, and confirm the root has matched
all along — not just for their own box, but for all 4,438.
