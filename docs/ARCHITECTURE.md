# Architecture — WizNerdZ Pixel Paragon

## Purpose

Sell 8,888 CHIP-0007 pixel wizards on Chia as **sealed boxes** whose contents
were Merkle-committed before sale, with buyer-verifiable fairness, autonomous
sale detection, and a browser reveal that only ever shows chain-confirmed
results.

## Boundaries

```
[Browser]
  index / mint / verify / rarity / sealed-boxes / token / compare / dashboard
  js: config, wallet-core (WC pairing), mint-page, reveal/* (ceremony),
      sealed-boxes, health, telemetry
        |                                  |
        | HTTPS                            | WalletConnect (user's wallet only;
        v                                  v  chia_takeOffer is the sole
[Netlify]  docs/ static + /api/*         [Sage / any Chia wallet]  required method)
  functions: mint-offer, mint-status,
    mint-stats, watch-settlements (5-min cron),
    admin-* (env-secret gated, fail closed)
  blobs: wiznerdz-offers, wiznerdz-mint (no secrets)
        |
        | public RPC (read-only; no keys, no indexer)
        v
[api.coinset.org]  coin records — settlement anchors decide SOLD
        ^
        | wallet RPC + delivery signing (the ONLY place keys exist)
[Operator machine]  mint_system/: allocation + commitment, offer creation,
                    settlement recording, delivery, status publishing

[GitHub Pages]  static mirror of docs/ — third URI on minted NFTs
[GitHub Actions]  tests (offline suite) · verify-metadata (data contracts)
                  · live-preflight (6-hourly deployed-system alarm)
```

## Trust design

- **Offers are transparent** on Chia, so the sold thing is a generic sealed
  box — byte-identical within its tier, nothing to snipe. Real WizNerdZ are
  delivered after settlement.
- **The commitment is the fairness**: contents fixed pre-sale from a 256-bit
  seed, Merkle-committed with per-box salted leaves. Rarity is public on
  purpose — knowing ranks can't help anyone pick a box.
- **A Chia offer names its settlement anchor coin** before any sale. Spent
  anchor = sold; the spend itself names the recipient. Detection therefore
  needs no wallets, keys, or third-party indexers.
- **Entitlement follows the settlement transaction's recipient**, never later
  possession of the box.
- **The browser never causes delivery** and never learns contents before the
  chain confirms delivery (statuses withhold `nfts` until FULFILLED).
- **Statuses only move forward**: neither the watcher nor the operator
  publish endpoint can downgrade a box (a downgrade would re-hide delivered
  contents); deliberate corrections require an explicit `force` flag.
- **Failure posture everywhere**: unreachable chain = delayed, never wrong;
  stale stats are labeled stale; monitors retry before alarming.

## State

| Store | Keys | Notes |
|---|---|---|
| `wiznerdz-offers` | `index`, `offer/<nftId>` | signed offer text + public anchor coin id |
| `wiznerdz-mint` | `taken`, `holds`, `status/<nftId>`, `dispensed/<claim>`, `watch/lastRun` | strong-consistency reads on the dispense path |

Authoritative purchase state is the **chain** plus the operator's delivery
ledger (chain-reconstructible); the blobs are a serving cache of published
outcomes.

## Verification layers

1. `npm test` — offline: settlement crypto against real mainnet fixtures plus
   a 2,733-value CLVM integer corpus generated from Chia's own encoder;
   dispenser selection rules AND a seeded drop-rush simulation (no false 410,
   stale-read spread, oldest-first recycling); the reveal subsystem's contract
   (state graph, narration keys, rarity→video selection, video files on
   disk); published fairness proofs refolded with node crypto; 1/1 data
   consistency; reference integrity; truth invariants.
2. `verify-metadata` CI — CHIP-0007 contracts, placements, budgets, integrity
   manifests on any data push.
3. `npm run preflight` — read-only checks against the deployed system, run
   6-hourly in Actions as the operational alarm: money-path behavior,
   watcher heartbeat, delivery lag (`pendingDeliveries` vs
   `MAX_DELIVERY_LAG_MIN`), origin agreement, and **deploy freshness**
   (witness files byte-compared repo↔origin, so a silently dead deploy
   pipeline fails loudly instead of idling behind passing checks).
4. `scripts/audit_settlements.py` — the standing trust drill: re-derives
   every sale claim from the chain with none of the watcher's code and
   cross-checks operator ledger + public site per box; `--offers` executes
   each live offer file's puzzles and proves it predicts exactly the anchor
   the ledger watches. The watcher decides what the site says; this is how
   the watcher itself is checked.

## Buyer-verifiable fairness

The Merkle commitment is checkable by the person it protects:

- At FULFILLED, the publish pipeline (`push_status_to_site.py`) writes the
  box's proof bundle to `docs/mint/proofs/<box nft id>.json` — refused if its
  contents disagree with the delivery ledger.
- `verify.html` verifies it **in the browser** (WebCrypto): recomputes the
  leaf, refolds the path, trusts nothing but the published root. The reveal
  results dialog links every opened box to its proof.
- CI (`proof-integrity` tests) refolds every published bundle with a third
  independent implementation, so an invalid proof cannot ship.

## Recovery posture

- **Blob-store loss is rehearsed** (2026-08-15, live): offers and statuses
  rebuild byte-identically from operator ground truth; the settlement audit
  referees before/after. Holds are transient by design. See OPS.md.
- Statuses only move forward, so no rebuild can downgrade a buyer's box.
