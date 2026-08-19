# LAUNCH REPORT — WizNerdZ Pixel Paragon

**Date:** 2026-08-19 (UTC) · **Audited revision:** `main` @ `7b3917b68` + this commit
**Recommendation: CONDITIONAL GO** — the mint lifecycle is proven end-to-end on mainnet;
one operational action (publish the pending Netlify deploy) and one inventory decision
(load the full drop) stand between the test mint and the real one.

**Overall readiness: ~92%.**

---

## Verified working (evidence, not vibes)

| System | Status | Evidence |
|---|---|---|
| Offline test suite | ✅ 39/39 | `npm test` — settlement crypto vs mainnet fixtures, 2,733-value CLVM corpus, dispenser drop-rush simulation, reveal contract, proof refolding, link/truth invariants |
| Operator test suite | ✅ 42 pass | `mint_system/tests` (19 skips — see "Known false alarm" below) |
| Sealed-box dispenser | ✅ | Live `/api/mint-offer` dispenses signed offers; strong-consistency reads + soft holds; drop-rush simulation (200 scenarios × 200 requests) proves no false 410, no double-dispense on ample pool |
| Settlement detection | ✅ live-proven | Watcher cron runs every 5 min, heartbeat fresh; 2 real mainnet sales detected at heights 9148851 / 9149752 |
| Settlement audit (trust drill) | ✅ exit 0 | `scripts/audit_settlements.py --offers` — chain, operator ledger, and public site agree on all 4 boxes; every live offer file's predicted anchor matches the ledger |
| Delivery-once | ✅ structural | SQLite `PRIMARY KEY (box_launcher_id)` + `UNIQUE (allocation_box_id)` in the delivery ledger — double delivery is a constraint violation, not a code path |
| Recipient resolution | ✅ | `settlement_recipient.py` reads the recipient out of the settlement spend itself; lineage tool distinguishes settlement recipient from later owner |
| Buyer recovery | ✅ | `mint.html?box=<id>` + open-box bar + localStorage auto-resume; box id alone recovers the reveal from any browser |
| Reveal gating | ✅ | `nfts` withheld below FULFILLED (verified live on an unsold box: `pending`, no contents); reveal only renders operator-published, chain-confirmed results |
| Fairness proofs | ✅ | Both FULFILLED boxes have published proof bundles; CI refolds them independently; browser verification on verify.html |
| Admin endpoints | ✅ fail closed | 401 without secret; 503 if `MINT_ADMIN_SECRET` unset (verified set on the site, Functions+Runtime scope) |
| Failure cases | ✅ | bad tier→400, bad box id→400, never-inventoried tier→410, unknown box→UNKNOWN/pending; chain unreachable→DEGRADED heartbeat, no state change |
| Full lifecycle | ✅ **2 real mainnet sales** | dispense → wallet approve → settlement detect → operator delivery → FULFILLED with contents + delivery heights → reveal |

## Fixed in this session

1. **Forward-only publish enforcement** — `admin-publish-status` could previously downgrade
   a buyer's box (e.g. FULFILLED→SOLD from a stale ledger push, re-hiding delivered
   contents). It now refuses downgrades unless the operator sends an explicit `force`
   flag. New pure helper + 1 new test (suite 39/39).
2. **Dead scaffolding removed** — `/api/health` claimed "stage 0-scaffold, no mint
   endpoints exist yet" on a live production mint API. Nothing referenced it; deleted.
3. **Root cause of the failing `live-preflight`** diagnosed (below) and a
   zero-build-minute recovery path verified.

## The one real blocker: Netlify is serving a stale deploy

Every deploy since **2026-08-15** errored: *"Skipped due to account credit usage
exceeded."* Netlify still serves the last good bundle — **round-1 iteration 36
(`c9d48c56f`)** — so none of the 17 round-2 improvements (dispenser hardening,
sold-out truthfulness, a11y, fairness-proof publishing, `pendingDeliveries` alarm
feed) are live, and the two published proof JSONs 404 on Netlify (they serve fine
from GitHub Pages, which is current). `live-preflight` has been correctly alarming
on exactly this every 6 hours.

**Verified workaround (uses zero build credits):** a Netlify CLI deploy uploads
prebuilt files directly — this site has no build step (`command = ""`), so nothing
is lost. A **draft deploy of current main (including this session's fixes) already
succeeded and was verified** — byte-identical `mint-page.js`, functions healthy,
FULFILLED box serves contents, fairness proofs serve 200:
`https://6a8520b5e62fc74cb751ab94--wiznerdz-pixel-paragon.netlify.app`

**Exact human action required (either one):**
- In the Netlify dashboard → wiznerdz-pixel-paragon → Deploys → select the draft
  deploy (message: "draft deploy of main @f5e1f3642 (launch audit changes) -
  publish this one") → **Publish deploy**; or
- From the repo root, run (was blocked for the agent by the permission layer):
  ```
  netlify deploy --prod --no-build --dir docs --functions netlify/functions
  ```
  (CLI is installed and authenticated; the site is linked.)

Then: `npm run preflight` should go fully green, and the 6-hourly alarm clears.
Longer term: pushes to main will keep "erroring" harmlessly until the Netlify
credit cycle resets — CLI deploys are the deploy path until then.

## Remaining launch steps (inventory decision, not code)

The system currently runs the **test inventory**: blind_single tier only, 4 boxes
total (2 sold + opened, 2 still offered) at the test price of **0.0000001 XCH**.
The full drop (4,196 sellable boxes across 5 tiers at real prices) requires,
operator-side (`mint_system/`): mint the sealed-box NFTs per tier, create offers at
final prices, `push_offers_to_site.py`, and re-run the settlement audit. The
commitment for all 8,888 (Merkle root published 2026-08-11, treasury 224 reserved)
is already public and does not change.

## Unverified assumptions / risks

- **WalletConnect/Sage** — config is correct (minimal `chia_takeOffer`-only required
  namespace, valid project id) and two real sales prove the path worked in the recent
  past, but no fresh wallet pairing was exercised in this session.
- **Drop-scale load** — concurrency is simulation-proven (200-buyer rush), not
  load-tested against live Netlify Blobs rate limits.
- **Netlify credits** — the account remains exhausted; scheduled functions and
  serving continue to work, but watch for Netlify throttling function invocations
  on an over-limit account. Confirm the credit state before drop day.
- **Operator machine path** — the live `mint_system/` sits under
  `G:\WizNerdz\_archive\legacy_old1\working directory\` despite the "_archive" name;
  ledgers are current (last delivery 2026-08-15). Consider relocating before it is
  mistaken for an actual archive and cleaned up.

## Known false alarm (documented, deliberately not "fixed")

19 `mint_system` tests skip because the freeze-audit gate pins
`rarity_ranking.csv` to mtime date 2026-08-11 and the file changed 2026-08-14.
The diff is **names-only** (two community 1-of-1 reassignments: #5074→Ashen,
#7034→Amiri); every rank/tier column is byte-identical to the frozen dataset, so
the allocation the commitment was built from is unaffected. Backdating the mtime
would falsify the audit trail; if desired, update
`mint_system/config.json → rarity_dataset.required_mtime_date` to `2026-08-14`
with a note, which re-arms those 19 tests honestly.

## Environment / endpoints reference

| Item | Value |
|---|---|
| Required env (Netlify site) | `MINT_ADMIN_SECRET` — set ✅ (Functions+Runtime) |
| Mint page | https://wiznerdz-pixel-paragon.netlify.app/mint.html |
| API | `/api/mint-offer` · `/api/mint-status` · `/api/mint-stats` · admin: `admin-load-offers`, `admin-publish-status`, `admin-run-watcher` |
| Watcher | `watch-settlements`, cron `*/5 * * * *`, heartbeat in `/api/mint-stats` |
| Pages mirror | https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/ (current ✅) |
| Chain reads | api.coinset.org (public, no keys) |
| State snapshot (2026-08-19) | dispensable 2 · sold 2 · opened 2 · pendingDeliveries 0 · watcher OK |

## GO / NO-GO

**CONDITIONAL GO.** The architecture's core promise — *a real buyer connects a
wallet, approves a sealed-box offer, settlement is detected from chain, the
committed WizNerdZ is delivered to the settlement recipient exactly once, the buyer
can recover after closing the page, and the reveal opens only from verified
delivery state* — **has been demonstrated twice on mainnet and audited from raw
chain data.** Conditions before the real drop:

1. Publish the pending Netlify deploy (one click / one command — above).
2. `npm run preflight` fully green after it.
3. Load the real inventory and prices operator-side; re-run
   `audit_settlements.py --offers`.
4. Confirm Netlify credit status for drop-day traffic.
