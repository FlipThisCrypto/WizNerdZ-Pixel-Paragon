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
