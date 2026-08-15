# Changelog — the 50-iteration improvement round

One sequential improvement per iteration: assessed against the live system,
implemented completely, verified (usually against the deployed site), and
pushed before the next was selected. The commit history is the authoritative
record; this distills it by theme. Range: `b0ed87200` (iteration 1) onward.

## Money-path autonomy & integrity

- **Autonomous settlement detection** (1): every offer carries its public
  settlement-anchor coin id; a 5-minute scheduled function detects spends on a
  public full node, marks boxes SOLD, and retires dead offers — no keys, no
  indexer, no operator presence. Coin-id crypto verified against real mainnet
  coins.
- **Observable** (10): heartbeat on every sweep, exposed publicly; the cron
  was *observed* firing unattended, not assumed.
- **Race-proof dispensing** (19, 38): soft holds + strong-consistency reads so
  concurrent buyers aren't handed the same box — the first fix's live
  verification failed 1/3 and exposed the eventual-consistency default; the
  selection rules are now pure functions with offline tests.
- **Tested crypto** (13): offline regression suite for coin-id derivation,
  CLVM int edges, and the forward-only status ladder.

## Public truth

- Supply, 1/1 counts, and availability corrected everywhere they were wrong:
  hero stats (3), insights (11), the 1/1 gallery's self-contradicting badge
  (12), index's about section (25), live tier-card availability replacing
  catalog fiction (21), per-card wording (37).
- **Rarity is public on purpose** (7, 11, 47): the false "not published for
  fairness" claim replaced — everywhere it hid — with the real argument
  (sealed pre-committed boxes make ranks unsnipeable) and a working ranking
  explorer.
- **Retired claims are now a test** (48): the whole docs corpus is scanned in
  CI for every claim the project has renounced.

## Buyer experience

- The trust path renders (6, 15): the commitment guide and operator docs are
  styled pages, not raw markdown; `?doc=` is allowlisted.
- The reveal: true modal results (5), skip control with two-stage Escape (18),
  video chosen by the best rarity actually in the box — never overselling
  (the tier videos had shipped inverted), Save-Data honored (35).
- Recovery: open-any-box by id with wrong-id guidance (36), resume after
  closing mid-delivery, honest staleness labeling when the stats API dies (33).
- Sharing: shares name the actual pull and link the buyer's own replay
  (9, 43); the money pages unfurl with a real card (4).
- Purchase-flow chrome matches the page (8); wallet pairing has QR + copy (14
  in the pre-round work, hardened here).

## Front door & cohesion

- Full-bleed hero with centered canvases at every desktop width (2); the mono
  register survives Windows and labels meet the legibility floor (14);
  universal keyboard focus ring (26); mobile primary CTA matches the hero
  (29); one buy flow — the mislabeled legacy index mint path retired (30).

## Operations & CI

- Three gates: the offline suite on every push (31), the resurrected
  collection-data contracts workflow — dead behind a YAML parse error, checks
  modernized post-IPFS (40) — and `npm run preflight`: twelve read-only checks
  of the live system (34), run 6-hourly as an alarm whose failures page via
  GitHub (39; its own first failure produced the retry-before-crying-wolf
  design).
- The operator library tells current truth: runbook (44), architecture (45),
  SLOs / incident ladder / governance / health claims (46), dashboard board
  and mint direction (42), README (20), SECURITY (23), CONTRIBUTING (28).
- Hazard removal: operator console out of the deployable tree with a gitignore
  guard (22); nomination-era code fully dismantled with consumer-map
  verification (28, 32, 41).

## Defects the loop caught in its own work

Recorded because the method matters: swap shrapnel that 404'd the landing
page (16, plus cross-file consistency tests), a const-reassignment that would
have killed every reveal (caught pre-ship in 18), a half-working concurrency
fix exposed by live verification (19), and a push-before-verify slip (17)
fixed within its iteration. Fresh reassessment against the deployed system —
never trusting prior sweeps — is what surfaced them.
