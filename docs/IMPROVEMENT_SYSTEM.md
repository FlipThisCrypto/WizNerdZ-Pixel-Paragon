# Continuous improvement system

## Cadence

| Frequency | Action |
|-----------|--------|
| Daily (nomination window) | Review GitHub PFP issues + board export |
| Weekly | Run `dr_checklist.py`, sample metadata, canary_urls |
| Pre-deploy | Full verify_metadata + specials + integrity + perf_budget |
| Pre-mint | GOVERNANCE freeze checklist |
| Post-incident | INCIDENTS severity + telemetry export |

## Evidence backlog

Capture issues with labels: `sev-1`…`sev-4`, `pfp-nomination`, `ops`.

## Do not

Disable CI gates to ship. Force-push main. Arm mint without freeze.
