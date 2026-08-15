# Incident severity — WizNerdZ

| Sev | Definition | Response |
|-----|------------|----------|
| SEV-1 | Money-path integrity: wrong contents revealed early, a status downgraded, delivery to the wrong recipient, commitment mismatch between origins | Stop deliveries; run preflight; reconstruct from chain (the delivery ledger is chain-verifiable); revert the offending deploy |
| SEV-2 | Buyers blocked: dispenser down with inventory, mint page broken, watcher heartbeat stale > 30 min | OPS.md incident playbooks; manual watcher sweep keeps detection alive while the cron is fixed |
| SEV-3 | Degraded but honest: stats API down (pages label themselves stale), one origin lagging, reveal video failing to its live-portal fallback | Fix on normal cadence — the degradation paths are designed for this |
| SEV-4 | Cosmetic UI / single-browser wallet quirk | Ticket; document if it recurs |

## Escalation

1. `npm run preflight` — names the broken link in the chain.
2. Capture `/api/mint-stats` (includes the watcher heartbeat) and the failing
   workflow run URL.
3. Follow the matching playbook in OPS.md ("When a box sells" covers the
   delivery half; incident sections cover the rest).
4. Recover by `git revert` — never force-push. Functions pick up env changes
   only on redeploy.
5. Post status on @FiendStudios for public-facing SEV-1/2.

## Comms template

"WizNerdZ: investigating [symptom]. Purchases already settled on chain are
safe — contents were committed before sale and delivery follows the
settlement transaction. Updates here."

(Truthful by construction: settled purchases cannot be lost by any site-side
incident — detection can be delayed, entitlement cannot change.)
