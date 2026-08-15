# Service Level Objectives — WizNerdZ

Best-effort targets for a serverless mint; measured by the tools named, not
by hope. `npm run preflight` exercises most of these in one command.

| SLO | Target | Measurement |
|-----|--------|-------------|
| Site availability (both origins) | 99.5% monthly | HTTP 200 on `/` — preflight + 6-hourly `live-preflight` workflow |
| Settlement detection freshness | watcher heartbeat ≤ 15 min | `/api/mint-stats` → `watcher.at`; preflight fails on staleness |
| Dispenser availability | dispensable > 0 while inventory exists | preflight treats zero inventory as failure |
| Content withholding | 100% — no contents before FULFILLED | preflight leak-scan + status check on a real dispensed box |
| Origin agreement | Merkle roots identical on both origins | preflight split-brain check |
| Metadata correctness | 100% | `verify_metadata.py` = 0 problems (CI on any data push) |
| Delivery latency | operator-dependent; hours not days | sale runbook in OPS.md; sold-vs-opened gap on operator.html |
| Wallet pairing success | best effort | pairing has QR + copy paths; only `chia_takeOffer` required |

## Error budget

- `verify-metadata` CI red: **freeze deploys** until green.
- `live-preflight` red twice consecutively: treat as an incident (INCIDENTS.md),
  not a blip — single failures already retry internally.
- Watcher heartbeat stale: sales are undetected; run the manual sweep and fix
  the cron before anything else.

## Non-goals

Sub-second CDN latency guarantees; automated delivery (signing stays
operator-side by design).
