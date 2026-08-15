# Contributing to WizNerdZ Pixel Paragon

## Community PFP nominations — closed

Nominations closed **midnight July 31, 2026 (US Eastern)** and the art is
locked: all **71 one-of-ones** (10 named + 61 community) are final and
showcased in the
[1-of-1 gallery](https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/community-1of1.html).
Late nominations can't be accepted — the allocation is Merkle-committed and
the collection's contents can no longer change.

## Code / site PRs

- Live site root is `docs/` — served by both GitHub Pages and Netlify; the
  mint API lives in `netlify/functions/`.
- Run `npm test` before opening a PR. The suite is offline and fast, and it
  guards the things that break silently: settlement coin-id crypto, 1-of-1
  data consistency, site-wide reference integrity, and the service-worker
  precache list.
- Public config only in `docs/js/config.js` — **never** commit private keys,
  and never place operator tooling inside `docs/` (it deploys; see
  `.gitignore`'s `docs/admin-*` guard).
- Visual language: chrome/silver substrate on near-black with blue accents,
  plus the arcane purple layer for magic/energy. Green is status-only, gold is
  1-of-1s-only, mono type for everything machine-flavored.
- Prefer small, reviewable PRs with a clear user benefit.

## Reporting bugs

- Site/mint UX: GitHub Issues with steps to reproduce.
- Anything that could lose funds, break mint integrity, or leak box contents
  early: see [SECURITY.md](SECURITY.md) — do **not** open a public issue.

## Operator tools

- `docs/operator.html` — day-to-day links + live mint/watcher status
- OPS runbook, SLOs, incidents: rendered via `docs/verify.html?doc=OPS` (etc.)
- Operator mint tooling lives outside this repo (`mint_system/`), by design.
