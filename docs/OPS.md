# WizNerdZ Pixel Paragon — Operations runbook

## Service map

| Surface | URL |
|---------|-----|
| Site | https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/ |
| Operator | …/operator.html |
| Health | …/health.json |
| Nominations | Landing form → GitHub Issues + live board |
| Art / meta | …/images/{id}.png · …/metadata/{id}.json |
| Repo | https://github.com/FlipThisCrypto/WizNerdZ-Pixel-Paragon |

## Daily ops (nomination window)

1. Open [PFP issues](https://github.com/FlipThisCrypto/WizNerdZ-Pixel-Paragon/issues?q=is%3Aissue+PFP+Nomination).
2. Confirm live board on site matches (Refresh from GitHub).
3. Spot-check `health.json` and landing ops probe (all green).
4. Do not arm mint until post-deadline 1:1 art is frozen.

## Incident: broken images

1. `python scripts/verify_metadata.py`
2. Confirm Pages deploy finished (Actions / Pages settings).
3. Hard-refresh CDN path; absolute URLs must still point at Pages.

## Incident: WalletConnect cannot connect

1. Confirm `docs/js/config.js` projectId is 32 hex chars.
2. Confirm Reown cloud project allows GitHub Pages origin.
3. Try Sage “paste URI” path if QR fails.
4. Mint remains disarmed until offers live — connect-only is expected.

## Incident: GitHub nominations board empty

1. Rate limit (403/429) → board uses 5m browser cache.
2. Verify issue titles contain `[PFP Nomination]`.
3. Fallback: open GitHub issues list manually.

## Deploy

```bash
# from github_pages_repo
git push origin main
# GitHub Pages serves docs/
python scripts/verify_metadata.py
python scripts/verify_specials.py
```

## Rollback

```bash
git revert <bad-commit>
git push origin main
```

Never force-push `main` for production recovery.

## Secrets policy

No private keys in repo. Only public xch + public WC projectId.

## Chaos drills

1. Open `/?chaos=1&chaosMode=board`
2. `/?chaos=1&chaosMode=health`
3. Disable: localStorage.removeItem('wiznerdz_chaos')
