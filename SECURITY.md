# Security Policy

## Scope

The public site, the sealed-box **mint API** (Netlify Functions under
`netlify/functions/`), and all static assets for **WizNerdZ Pixel Paragon**:

- https://wiznerdz-pixel-paragon.netlify.app/ (site + `/api/*`)
- https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/ (static mirror)

This repository and its deployed serverless layer intentionally hold **no
private keys, mnemonics, or hot wallets of any kind**. Delivery signing is
performed operator-side, outside this repo.

## Safe by design

| Area | Practice |
|------|----------|
| Buying | The buyer signs a Chia **offer** in their own wallet (Sage or any Chia WC wallet); the site never holds or requests spend keys |
| Offers | An offer is a signed blob anyone may take — serving it exposes nothing; each carries its public settlement **anchor coin id** |
| Admin endpoints | `admin-*` functions require `MINT_ADMIN_SECRET` (env-only, never in the repo); unset ⇒ they refuse rather than default open |
| Box contents | Withheld until delivery is **chain-confirmed** (`FULFILLED`); a paid-but-undelivered box is indistinguishable from one we won't describe |
| Settlement detection | Public full-node reads only (`api.coinset.org`); an unreachable chain delays detection, never corrupts it; statuses only move forward |
| Dispensing | Strong-consistency reads + soft holds so concurrent buyers aren't handed the same box |
| State | Netlify Blobs, site-scoped; nothing secret stored (anchors, statuses, and counts are all public-by-nature) |
| WalletConnect | Public project ID only; pairing QR rendered locally — the URI never reaches a third-party image service |
| Media | Public art + CHIP-0007 metadata; minted NFTs hash-commit to exact bytes |
| Telemetry | Local-only; no analytics beacons |
| Fairness | Buyer-verifiable: every opened box's Merkle proof is published and refolds in the buyer's own browser against the pre-sale root; CI refolds every published proof independently; a standing settlement audit re-derives every sale claim from the chain with none of the watcher's code |

## What we most want to hear about

Reports that could **lose funds, break mint integrity, or leak box contents
early**, e.g.:

- A way to learn any sealed box's contents before its delivery is chain-confirmed
- A way to make the watcher mark an unsold box SOLD (or downgrade a status)
- A way to dispense or take an offer the system believes is retired
- Admin-endpoint access without the secret
- Anything that would let the operator (us) cheat the published Merkle
  commitment undetected — we consider "you could cheat and no one would know"
  a valid, serious report

## Reporting a vulnerability

1. **Do not** open a public issue for exploitable mint flaws or secret exposure.
2. Contact Fiend Studios via [X/Twitter @FiendStudios](https://x.com/FiendStudios)
   with a high-level description and a contact method.
3. If a public `xch` address or WalletConnect project ID was misconfigured,
   say so without posting unrelated secrets.

We aim to acknowledge within a few business days, prioritized by fund-loss and
mint-integrity impact.

## Out of scope

- Social-engineering of individual wallets
- GitHub / Netlify platform issues
- Marketplace/MintGarden bugs outside our collection config
- Artistic trait disagreements
- The public rarity ranking (public on purpose — sealed pre-committed boxes
  make it unusable for sniping; see the site's rarity page)

## Third-party calls

- `api.coinset.org` — public full-node RPC for settlement detection
- WalletConnect relay + `esm.sh` modules for wallet pairing
- No analytics beacons; telemetry is local-only
