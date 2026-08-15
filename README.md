# WizNerdZ Pixel Paragon

**8,888** generative pixel wizards on the **Chia** blockchain by [Fiend Studios](https://x.com/FiendStudios) —
sold as **sealed boxes** whose contents were fixed and Merkle-committed *before* sale.
No re-draw, no reshuffle, and you can [verify that yourself](https://wiznerdz-pixel-paragon.netlify.app/verify.html).

| | |
|--|--|
| **Mint** | https://wiznerdz-pixel-paragon.netlify.app/mint.html |
| **Site** | https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/ |
| **Verify the commitment** | https://wiznerdz-pixel-paragon.netlify.app/verify.html |
| **Rarity (public on purpose)** | https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/rarity.html |
| **Twitter** | https://x.com/FiendStudios |
| **Mint / royalty wallet** | `xch1qsclhhahfzs85xeemjye65yck2u6g9dpps0jtkwgjemzzndlu63qjej0te` |

## The collection

| | |
|--|--|
| Supply | 8,888 |
| Generative | 8,817 |
| One-of-ones | **71** — 10 named specials + 61 community |
| Sealed boxes (sellable) | 4,196 (224 of 4,420 treasury-held) |
| Image size | 640×640 PNG, CHIP-0007 metadata |
| Economics | mint 40/40/20 (developer / wizards / Bepe.Love) · 10% royalties |

**Rarity is fully public** — every rank for all 8,888, downloadable
([`rarity_ranking.csv`](docs/rarity_ranking.csv)). That costs buyers nothing here:
every sealed box within a tier is byte-identical and its contents were committed
before sale, so knowing the ranks cannot help anyone snipe, pick, or re-roll.
Fairness comes from the commitment, not from secrecy.

## How the mint works

Chia offers are transparent — a taker's wallet shows both sides before signing.
Offering real WizNerdZ would let bots refuse-and-redraw until offered a rare.
So the thing a buyer takes is a **generic sealed box** (byte-identical within
its tier, nothing to select on), and the real WizNerdZ are delivered after
settlement:

1. **Commit** — every box's contents are assigned from a 256-bit CSPRNG seed and
   Merkle-committed (per-box salted leaves) before any box is offered.
   Published in [`docs/mint/commitment.json`](docs/mint/commitment.json).
2. **Dispense** — `/api/mint-offer` hands out a signed offer for a sealed box
   (soft holds + strong-consistency reads prevent two buyers being handed the
   same box).
3. **Buy** — the buyer approves the offer in any Chia wallet
   (`chia_takeOffer` is the one method every wallet implements).
4. **Detect** — a Chia offer names the exact coin whose spend *is* its
   settlement (the *anchor*). A scheduled watcher (`watch-settlements`, every
   5 minutes, heartbeat exposed via `/api/mint-stats`) checks all anchors
   against a public full node, marks sold boxes, and retires their offers.
   No wallets, no keys, no third-party indexer in the correctness path.
5. **Deliver** — the operator resolves the settlement *recipient* from the
   settlement spend itself (entitlement follows the settlement transaction,
   never later possession), mints the committed WizNerdZ directly to them, and
   publishes the outcome. The browser never causes delivery — a closed tab
   cannot cost a buyer their mint.
6. **Reveal** — the site plays the reveal (video chosen by the best rarity
   actually in the box) from operator-published, chain-verified results only.
   Contents are withheld until delivery is confirmed on chain.

Delivery signing stays operator-side by design; the serverless layer holds no
key material of any kind.

## What runs where

| Piece | Where |
|---|---|
| Static site + all 8,888 art/metadata | GitHub Pages (`docs/`) and Netlify (same tree) |
| Mint API (`/api/*`) | Netlify Functions (`netlify/functions/`) |
| Offer/status state | Netlify Blobs (site-scoped stores) |
| Settlement detection | `watch-settlements` scheduled function (5-min cron) |
| Chain reads | `api.coinset.org` public full-node RPC |
| Allocation, offers, delivery | Operator-side tooling (not in this repo) |

## Tests

```
npm test
```

Offline, no dependencies: settlement coin-id crypto against real mainnet
fixtures, CLVM int edge cases, watcher state-ladder ordering, 1-of-1 data
consistency across files, and site-wide reference integrity (every local
href/src must resolve to a real file).

## History

The project went through a 50-iteration sequential improvement round — one
assessed, verified, pushed improvement at a time. [CHANGELOG.md](CHANGELOG.md)
distills it; the commit history is the full record.

## Repo layout

```
docs/                    ← the site (Pages root + Netlify publish dir)
  index.html             ← landing (hero, galleries, wallet connect)
  mint.html              ← the mint: dispense → approve → reveal
  verify.html            ← rendered commitment + allowlisted doc viewer
  rarity.html            ← public ranking explorer
  images/ metadata/      ← all 8,888 art + CHIP-0007 files
  boxes/                 ← sealed-box metadata (v1 frozen: hash-committed
                            by minted boxes; v2 = branded, current)
  mint/                  ← commitment.json, COMMITMENT.md, sealed_boxes.json
netlify/functions/       ← mint-offer, mint-status, mint-stats,
                            watch-settlements (+ admin endpoints; shared core
                            in lib/settlement.mjs)
tests/                   ← data-consistency, link-integrity
netlify.toml             ← publish dir, /api/* redirects, cache headers
```

### Named specials

| Token | Name | | Token | Name |
|------:|------|-|------:|------|
| 42 | Tom | | 6146 | Blake |
| 787 | Fiend | | 6949 | Steve |
| 2264 | Aster | | 7462 | Papa |
| 3736 | Art Boss | | 8483 | James |
| 5625 | Profet | | 8700 | Staker |

Community 1/1s (61) are dedicated generative wizards — see the
[gallery](https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/community-1of1.html).
