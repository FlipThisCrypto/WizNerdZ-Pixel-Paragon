# Round 2 (2026-08) — higher-order evolution iterations

**Epoch note.** This repository already contains commits named `round 2 iteration N`
and `round 3 iteration N` from a July 2026 improvement campaign. This document
records the **current** Round 2, which began after the 2026-08 Round 1 completed
at commit `3526166c8` ("iteration 50: sold out is not an incident").

**Authoritative commit list for THIS round:**

```
git log --oneline --grep="^round 2 iteration" 3526166c8..HEAD
```

Do not use an unscoped grep — it will mix in the July 2026 campaign's commits.

## ROUND 2 BASELINE (recorded at start, after Round 1 = 50/50)

- Offline suite: all tests passing (`npm test`); verify-metadata: 12/12 scripts;
  live preflight: 12 checks clean on schedule (6-hourly + push-scoped self-verify).
- Live mint: watcher heartbeat healthy on the 5-minute schedule; sealed-box
  dispensing on strong-consistency blobs with soft holds; boxes at test price.
- CI gates: `test.yml`, `verify-metadata.yml`, `live-preflight.yml`.
- Declared limitations carried in from Round 1 (by design, not defects):
  delivery signing stays operator-side; `mint_system/` lives outside VCS;
  alerting is GitHub-native only.

Round 2 targets maturity bottlenecks — capabilities the system lacks — rather
than visible defects, per the Round 2 protocol.

## Iteration record

### round 2 iteration 1 — the delivery seam gets a metric and an alarm — **OPEN (blocked)**
- Commits: `7edd64bdf` (+ hardening `e600ebaee`: unknown-age pending reads as
  MAX_SAFE_INTEGER, so a malformed record can never silence the alarm).
- What: `computePendingDeliveries()` in the settlement core; `mint-stats`
  exposes `pendingDeliveries {count, oldestMinutes}`; preflight fails when the
  oldest sold-undelivered box exceeds `MAX_DELIVERY_LAG_MIN` (default 240m)
  and points at the OPS.md sale runbook.
- Verified offline: unit tests green; code deployed-pending.
- **Blocker:** Netlify stopped processing builds mid-iteration (static marker
  commit `34414b4b4` proves GitHub Pages deploys while Netlify serves the old
  bundle; platform status page all-operational, so site-specific — likely
  build-minutes exhaustion). Live money path unaffected (old bundle serves).
  Only the operator's Netlify dashboard can clear this. A monitor polls
  mint-stats every 180s and raises the moment `pendingDeliveries` appears.
  Per protocol this iteration stays open and UNCOUNTED until live-verified.

### round 2 iteration 2 — the waiting buyer gets a time anchor — APPROVED
- Commit: `7788fad30`.
- What: a pending box's status now says how long ago it sold ("sold 12 minutes
  ago" / "sold 3 hours ago") and sets expectations: deliveries are completed by
  the operator, typically land within hours, and the purchase cannot be lost.
- Verified: in-browser on both pending branches; offline suite green.

### round 2 iteration 3 — CLVM encoding proven against Chia's own encoder — APPROVED
- Commit: `782ffda83`.
- What: 2,733 ground-truth fixtures generated from
  `chia.types.blockchain_format.program.Program.to(int).atom`
  (`scripts/gen_clvm_fixtures.py` → `tests/fixtures/clvm_int_fixtures.json`),
  covering every byte-length transition, sign-padding edge, real tier prices,
  and a deterministic u64 spread. The watcher's `clvmIntBytes` — an input to
  every coin-id it computes — now has corpus-wide parity with the reference
  implementation, not just spot checks. 20/20 tests.

### round 2 iteration 4 — the reveal narrates itself to screen readers — APPROVED
- Commit: `498ce07d5`.
- What: each reveal state transition speaks one line through the overlay's
  existing `aria-live="polite"` terminal — circle forming, portal opening,
  vault materialising, WizNerdZ emerging, results shown — and a legendary
  interrupt announces "A one-of-one is emerging!". Driven by the state
  machine's existing `onChange`; one announcement per phase (repeat states
  guarded); skip, error, and reduced-motion paths all still announce results.
- Verified: in-browser state walk — every phase produced its distinct line,
  the repeated state produced none, skip-to-results announced correctly and
  the overlay tore down clean. Offline suite 20/20.
- Challenged: the pre-existing "> ARCANE CHANNEL ESTABLISHED" terminal line
  still fires between phases — different content, real phase, announced
  politely; not spam. Narration lines are plain English against the arcane
  styling of the older terminal lines — acceptable, revisit only if the voice
  jars in play-testing.

### round 2 iteration 5 — the reveal subsystem enters the tested world — APPROVED
- Commit: `7e2e9b631`.
- What: `tests/reveal-contract.test.mjs` executes the real browser sources
  (state machine, config, video selection) under `node --test` via a stubbed
  `window` and pins: the happy path including the legendary loop, every
  no-video fallback edge, error reachable from every non-terminal state and
  error→results, illegal/unknown transitions throw, `forceTo` (the skip path)
  fires `onChange` from anywhere, narration keys name real machine states,
  rarity→video selection never oversells the pull, and every referenced video
  file exists on disk. Wired into `npm test`, so `test.yml` runs it per push.
- Verified: 9/9 locally, 29/29 full suite, green on the GitHub runner.
- Challenged by mutation: a narration-key typo and a config reference to a
  missing video file each fail the suite; restored sources pass.

### round 2 iteration 6 — a standing settlement audit — APPROVED
- Commit: `1b0e655de`.
- What: `scripts/audit_settlements.py` re-derives every sale claim from the
  chain (Coinset RPC, none of the watcher's code) and cross-checks operator
  ledger + live site per box: SOLD+ anchors spent at the exact recorded
  height with the ephemeral settlement-coin signature; pre-sale anchors not
  yet on chain (if one exists, the watcher missed a sale); site state agrees;
  contents withheld below FULFILLED and matching the committed count at
  FULFILLED. Read-only against all three sources; stdlib only. OPS.md drill.
- Verified live: 4/4 real boxes clean. Mutation-checked on a scratch ledger
  copy: fabricated sale, off-by-one height, and silently reverted sale each
  fail with the exact finding.
- Learned during build: the anchor is ephemeral (created and spent inside the
  settlement transaction) — "known pre-sale" means derivable, not existing.
  The audit's first draft flagged healthy pre-sale offers; the two real
  settlements (created == spent height) confirmed the corrected semantics.

### round 2 iteration 7 — the offer file itself proves the anchor — APPROVED
- Commit: `73668ceff`.
- What: `audit_settlements.py --offers` closes the wrong-anchor blind spot
  (a wrong pre-sale anchor reads as healthy while the watcher polls a coin
  the sale will never create). Each `.offer` file is parsed with Chia's
  library, the maker's NFT spend is EXECUTED (`Program.run`, not the
  operator's derivation code), the created odd-amount child is the predicted
  settlement coin, and the singleton launcher joins it to its ledger row.
  Mismatch or an offer with no ledger row fails the audit.
- Verified live: 4/4 offers match, including both FULFILLED boxes — the full
  loop offer file → puzzle-executed prediction → ledger anchor →
  chain-proven settlement. Mutation-checked: a corrupted ledger anchor fails
  with the exact finding. Suite 29/29.
- Challenged: parity uses Chia's parser (unavoidable — it defines the
  format) but not the operator's `offered_nft_coin()`; the execution path
  (raw conditions → child coin) is genuinely independent of the code under
  audit. `--offers` requires the operator environment; the chain/site checks
  stay stdlib-only and CI-runnable.

### round 2 iteration 8 — the fairness commitment becomes buyer-checkable — APPROVED
- Commit: `ded04f8eb`.
- What: verify.html gained an in-browser Merkle proof checker (WebCrypto):
  recomputes the leaf from box_id+contents+salt, refolds the path, compares
  only against the published root (the bundle's embedded root is ignored).
  Deep link `verify.html?proof=<box nft id>`; pasted-JSON fallback. Proof
  bundles for both FULFILLED boxes published at `docs/mint/proofs/` (their
  contents are already public; salted leaves reveal nothing about others).
  The reveal results dialog links each opened box to its proof.
- Verified in-browser: both proofs verify with leaf recomputation
  byte-matching `commitment.py`; tampered contents FAIL loudly; an unopened
  box gets an honest "no proof until FULFILLED" note; the results link
  renders and the dialog closes clean. Suite 29/29.
- Challenged: proofs are generated by `build_box_proof` (operator code), but
  the verifier trusts none of it — it recomputes everything from the bundle's
  claims against the pre-sale root, which is exactly the trust model a buyer
  needs. Publishing proofs stays manual until the fulfillment pipeline grows
  a publish step (deferred: Netlify-blocked paths untouched).

### round 2 iteration 9 — store loss is a rehearsed recovery — APPROVED
- Commit: `817fca4ca`.
- What: rehearsed, against the live site, total loss of the blob store:
  `push_offers_to_site --replace` + `push_status_to_site` rebuilt offers and
  statuses from operator ground truth. OPS.md carries the now-rehearsed
  procedure. COMMITMENT.md points buyers browser-first (iteration 8's
  checker), CLI as the offline path.
- Verified live: per-tier stats and all 4 per-box statuses byte-identical to
  the pre-drill snapshot (updatedAt excluded); settlement audit green before
  and after; the watcher's next scheduled sweep ran on the rebuilt store
  (OK, watched 2, errors 0). Suite 29/29.
- Challenged: the drill rewrote live state — safe because writes are
  idempotent same-data, prices are test-level, the ladder is forward-only
  (no downgrade possible), and the audit refereed both sides. Holds were not
  exercised (transient by design, 3-minute TTL).

### round 2 iteration 10 — fulfillment publishes fairness proofs automatically — APPROVED
- Commit: `1b656748b` (operator-side change in `mint_system/push_status_to_site.py`,
  outside VCS; repo carries the runbook update and the restored proof).
- What: the publish step now writes every FULFILLED box's proof bundle into
  `docs/mint/proofs/` — idempotent, and it REFUSES a bundle whose contents
  disagree with the delivery ledger (allocation/delivery divergence must
  never be papered over by a proof).
- Verified: deleted a published proof → pipeline restored it
  content-identical; second run reports nothing to do; refusal guard fires
  on a fabricated mismatch; in-browser checker verifies the restored proof.
  Suite 29/29.
- Challenged: the commit-and-push of new proofs is still a human action (the
  script lists exactly what to commit). Acceptable: repo pushes are already
  the runbook's final step, and auto-pushing from a publish script would
  hand it repo write authority it should not hold.

### round 2 iteration 11 — CI refuses to ship an invalid fairness proof — APPROVED
- Commit: `9aa3e481f`.
- What: `tests/proof-integrity.test.mjs` refolds every bundle in
  `docs/mint/proofs/` with an independent node-crypto implementation (the
  third codebase after browser WebCrypto and operator hashlib): leaf
  recompute matches, path folds to the published root, filenames match the
  embedded box NFT id, and the commitment header hashes to the published
  `commitment_sha256`. Wired into `npm test` → runs on every push.
- Verified: 3/3 new tests; full suite 32/32; mutation-checked (tampered
  contents and tampered root each fail; restored passes).
- Challenged: the test cannot check proofs against the delivery ledger (CI
  has no operator data) — that seam is covered by iteration 10's refusal
  guard at generation time. Three independent implementations agreeing on
  the same bytes is the defense in depth.

### round 2 iteration 12 — a dead deploy pipeline rings the alarm — APPROVED
- Commit: `d9c761592`.
- What: preflight's new deploy-freshness check byte-compares witness files
  (`js/mint-page.js`, `mint/commitment.json`) between the repo and both live
  origins (newline-normalized, one settle-retry for normal deploy lag). A
  persistent mismatch fails with a pointer to OPS.md's new "Stale deploy"
  incident entry.
- Verified live: correctly FAILS on Netlify's stale mint-page.js (true
  positive on the ongoing incident), correctly passes Netlify's unchanged
  commitment.json (no false positive), passes both Pages witnesses. Offline
  suite 32/32.
- Challenged: this deliberately turns the 6-hourly live-preflight red until
  the Netlify dashboard is fixed. That is not crying wolf — it is a real,
  ongoing incident finally reaching the operator through the only channel
  that pages them. The settle-retry (90s default) absorbs the race where the
  path-triggered CI run beats its own deploy.

### round 2 iteration 13 — the mint page speaks its status — APPROVED
- Commit: `4314ca7bb`.
- What: the purchase path's dynamic surfaces became live regions — the
  notice container (role=status; summon failures switch to role=alert), the
  wallet state line, and a visually hidden availability status that
  announces lost/restored transitions only (never periodic counts). Plus a
  `main` landmark, skip link, and labelled nav.
- Verified in-browser: roles present; staleness announced exactly once
  across repeated failed polls, recovery exactly once across repeated
  healthy polls; annotations clear on recovery. Suite 32/32.
- Challenged: the role=alert switch is exercised only by a real summon
  failure (module-scoped path, code-reviewed rather than driven); accepted —
  the attribute switch is one guarded line and the default path is tested.
  Announcement DISCIPLINE (transitions only) was the hard part and is
  proven.
