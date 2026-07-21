# Service Level Objectives — WizNerdZ Pages

Static site SLOs (best-effort; measure via health probe + integrity scripts).

| SLO | Target | Measurement |
|-----|--------|-------------|
| Pages availability | 99.5% monthly | HTTP 200 on `/` and `/health.json` |
| Metadata correctness | 100% | `verify_metadata.py` = 0 problems |
| Specials integrity | 100% | `verify_specials.py` + integrity manifest |
| Nomination form usable | During open window | Deadline not passed + form enabled |
| Board freshness | ≤ 10 min when API healthy | Cache TTL 5m + manual refresh |
| Wallet connect success | Best effort | Telemetry local `wallet_event` |

## Error budget

If metadata verify fails: **freeze deploys** until green.
If health probe < 100% on critical assets: investigate before arming mint.

## Non-goals

Sub-second global CDN latency guarantees (depends on GitHub Pages).
