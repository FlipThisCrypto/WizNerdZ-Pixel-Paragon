# WizNerdZ Pixel Paragon — Operations runbook

**First move in ANY incident:** `npm run preflight` (from the repo root).
Twelve read-only checks against the live system; the failures name what to fix.
It also runs every 6 hours via Actions — a failed `live-preflight` workflow is
your page.

## Service map

| Surface | Where |
|---------|-------|
| Mint (the store) | https://wiznerdz-pixel-paragon.netlify.app/mint.html |
| Site mirror | https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/ |
| Mint API | `…netlify.app/api/*` — Netlify Functions in `netlify/functions/` |
| Settlement watcher | `watch-settlements`, 5-min Netlify cron; heartbeat in `/api/mint-stats` → `watcher` |
| State | Netlify Blobs, site-scoped (`wiznerdz-offers`, `wiznerdz-mint`) — no secrets stored |
| Operator console | …/operator.html (live counts + heartbeat with staleness alarm) |
| Chain reads | api.coinset.org public RPC — no keys, no indexer in the correctness path |
| Delivery tooling | `mint_system/` on the operator machine (outside this repo, holds wallet access) |

## Daily glance

1. operator.html → the **Mint API** row: green means counts are live and the
   watcher heartbeat is fresh (< 15 min). Red tells you which of the two broke.
2. That's it. Everything else pages you via the `live-preflight` workflow.

## When a box sells (the sale runbook)

Detection is automatic: within ~5 minutes the watcher marks the box SOLD and
retires its offer. Delivery is deliberately operator-side:

```bash
cd mint_system
# 1. record the settlement + resolve WHO IS OWED (from the settlement spend)
python settlement_watcher.py --apply
# 2. reserve the committed allocation and deliver it
#    (reserve_delivery picks the pre-committed box; deliver mints to the recipient)
python chia_fulfillment.py deliver --token <id> --to <settlement_recipient> --fee 0 --confirm
# 3. chain-verify and publish so the buyer's reveal opens
python push_status_to_site.py     # needs MINT_ADMIN_SECRET in the shell
# it also writes the box's fairness proof into docs/mint/proofs/ -
# commit and push what it lists, or the buyer's "check your box's
# proof" link reports the proof as unpublished
```

Entitlement follows the **settlement transaction's recipient** — never later
possession. The buyer's reveal opens automatically once the status is
FULFILLED; they can also open it any time at `mint.html?box=<boxNftId>`.

## Incidents

### Watcher heartbeat stale (> 15 min)
1. `npm run preflight` — confirms it and checks everything else.
2. Trigger a manual sweep: `POST /api/admin-run-watcher` with `x-admin-secret`.
   If that works, the cron is broken (Netlify → Functions → scheduled) — sales
   are still detectable manually while you investigate.
3. If the manual run is DEGRADED: coinset is unreachable. Detection delays;
   it never corrupts. Retry later — statuses only move forward.

### Dispenser down / buyers can't get offers
1. `curl "$SITE/api/mint-offer?tier=blind_single"` — 410 with inventory
   expected means genuinely sold out; check `/api/mint-stats` dispensable.
2. `offer_missing` or 5xx: check Netlify function logs; the offers blob may
   need re-pushing (`python push_offers_to_site.py --replace`, operator-side).

### Origins disagree (preflight split-brain failure)
Pages deploys lag Netlify by a few minutes after a push — re-run preflight
before concluding. A persistent mismatch means one origin failed to deploy:
check the `pages-build-deployment` workflow and the Netlify deploy log.

### Buyer says "I paid and got nothing"
1. Get their **box NFT id** (the sealed-box item in their wallet — not the
   WizNerd; the mint page's open-box bar explains this to them too).
2. `curl "$SITE/api/mint-status?box=<id>"` — the state tells the story:
   `SOLD/DELIVERY_RESERVED/BROADCAST` = delivery in progress (finish the sale
   runbook); `FULFILLED` = done, send them `mint.html?box=<id>`;
   `UNKNOWN` = that id never sold a box (probably the WizNerd's id).

### Stale deploy (origin serves old code while pushes "succeed")
Preflight's deploy-freshness check byte-compares witness files against the
repo. If it names an origin STALE:
1. **Netlify:** open the Netlify dashboard → Deploys. Look for stopped/queued
   builds, a paused site, or exhausted build minutes (observed live
   2026-08-13: builds silently stopped; functions kept serving the old
   bundle and every behavioral check kept passing for days).
2. **Pages:** check the `pages-build-deployment` workflow run for the last
   push.
3. Until fixed, the live site runs the last good bundle — the money path
   usually keeps working, but nothing pushed since the stall is live. Do not
   ship drop-critical changes onto a stalled origin.

### Broken images
1. `python scripts/verify_metadata.py` (also runs in CI on any metadata push).
2. Metadata images point at the **IPFS gateway** (hash-committed) — the Pages
   URL is the third URI on minted NFTs. Confirm both deploys finished.

### WalletConnect cannot connect
1. `docs/js/config.js` projectId must be 32 hex chars; Reown project must
   allow both origins.
2. Sage desktop: copy pairing link → Settings → WalletConnect → paste. Links
   expire in ~5 min — generate a fresh one.
3. Only `chia_takeOffer` is REQUIRED in the WC namespace. Never add required
   methods: wallets missing one refuse the whole session.

## Deploy & rollback

```bash
git push origin main        # deploys Netlify + Pages; CI gates: tests,
                            # verify-metadata, live-preflight (on its paths)
npm run preflight           # after deploy settles
```

Rollback is `git revert <bad-commit> && git push`. Never force-push `main`.
Functions read env at deploy time — changing `MINT_ADMIN_SECRET` requires a
redeploy to take effect.

## Secrets policy

No private keys anywhere in this repo or its deployed layer. `MINT_ADMIN_SECRET`
lives only in Netlify env + the operator's shell. Delivery signing happens only
in `mint_system/` on the operator machine.

## Disaster recovery: the blob store is expendable (rehearsed 2026-08-15)

All live mint state (offers, statuses, holds) lives in Netlify Blobs. If the
store is lost, corrupted, or the site is recreated, rebuild everything from
operator ground truth — this exact sequence has been run against the live
site and produced byte-identical state (verified by snapshot diff and a green
settlement audit before and after):

```bash
cd mint_system
export MINT_ADMIN_SECRET="$(cat production/mint_admin_secret.txt)"
python push_offers_to_site.py --replace   # rebuilds the offers store
python push_status_to_site.py             # rewrites every box status
python ../github_pages_repo/scripts/audit_settlements.py production/delivery_ledger.db --offers production/offers
```

Holds are transient (3-minute TTL) and need no recovery. The watcher's next
scheduled sweep operates on the rebuilt store unchanged. Statuses only move
forward, so a rebuild can never downgrade a buyer's box.

## Settlement audit (trust drill)

The watcher decides what the site says, so nothing it writes can vouch for it.
Re-derive every sale claim from the chain itself and cross-check ledger + site:

```bash
python scripts/audit_settlements.py ../mint_system/production/delivery_ledger.db --offers ../mint_system/production/offers
```

(`--offers` needs the `chia` package and proves each live offer file predicts
exactly the anchor the ledger watches - without it a wrong anchor id reads as
a healthy unsold offer while the watcher polls a coin that will never exist.)

Exit 0 = chain, operator ledger, and public site all agree on every box, and
contents stay withheld below FULFILLED. Run it after every sale lands, after
any watcher change, and before any drop. It reads all three sources and
writes none. Catches: fabricated sales, wrong settlement heights, sales the
watcher missed, site/ledger divergence, and early contents leaks.

## Chaos drills

1. `/?chaos=1&chaosMode=board` · `/?chaos=1&chaosMode=health` (index only,
   opt-in, loud banner; never loads on the mint page)
2. Disable: `localStorage.removeItem('wiznerdz_chaos')`
