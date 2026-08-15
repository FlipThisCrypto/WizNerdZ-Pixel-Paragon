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
- **Statuses only move forward**; the watcher cannot downgrade what the
  operator advanced.
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

1. `npm test` — offline: settlement crypto against real mainnet fixtures,
   dispenser selection rules, 1/1 data consistency, reference integrity,
   SW precache.
2. `verify-metadata` CI — CHIP-0007 contracts, placements, budgets, integrity
   manifests on any data push.
3. `npm run preflight` — twelve read-only checks against the deployed system;
   runs 6-hourly in Actions as the operational alarm.
