# Architecture — WizNerdZ Pixel Paragon

## Purpose

Static, mint-oriented presentation of an 8,888 CHIP-0007 collection on Chia, with a community PFP nomination campaign and Sage WalletConnect path for future mint offers.

## Boundaries

```
[Browser]
  index / token / rarity / compare / dashboard
  js: config, nominate, board, wallet, health, telemetry, countdown
        |
        | HTTPS (public)
        v
[GitHub Pages]  docs/  images + metadata + static site
        |
        | public API (optional)
        v
[GitHub Issues]  nomination inbox
        |
        | WalletConnect (user wallet only)
        v
[Sage / Chia wallet]  takeOffer when mint armed
```

**No app server. No private keys. No custodial mint.**

## Modules

| Module | Responsibility |
|--------|----------------|
| `js/config.js` | Public runtime config (frozen top-level) |
| `js/nominate.js` | Form validation → GitHub issue + localStorage |
| `js/nominations-board.js` | Issues search API → live board + cache |
| `js/wallet.js` | WalletConnect session / takeOffer |
| `js/countdown.js` | Eastern deadline + form lock event |
| `js/health-probe.js` | Asset health checks |
| `js/telemetry.js` | Local ring buffer diagnostics |
| `sw.js` | Offline shell cache |
| `scripts/verify_*.py` | Data integrity gates |
| `css/tokens.css` | Design system tokens |

## Extension points

1. **New specials** — `specials.json` + placement + metadata/image + verify_specials.
2. **Arm mint** — `config.mint.enabled` + offer/MintGarden URL only after freeze.
3. **Extra pages** — same tokens.css, no backend required.

## Trust model

| Data | Trust |
|------|-------|
| Art / metadata | Publisher-signed by git history |
| Nominations | GitHub user identity |
| Wallet actions | User-approved only |
| Telemetry | Local device only |

## Failure modes

- GitHub API rate limit → board cache
- WC CDN fail → connect errors surfaced; mint still disarmed
- Offline → SW serves shell; images may fail until online

## Round 3 additions

- Integrity manifests + DR/canary/perf scripts
- Chaos drills, feature flags, funnel metrics
- SLOs, incidents, governance freeze
- Lite mode, tab sync, config validation
