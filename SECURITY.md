# Security Policy

## Scope

Public site and static assets for **WizNerdZ Pixel Paragon**  
https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/

This repository intentionally holds **no private keys, mnemonics, or mint hot wallets**.

## Safe by design

| Area | Practice |
|------|----------|
| Mint | User signs in **Sage** (or other Chia WC wallet); site never holds spend keys |
| WalletConnect | Public project ID only; sessions approved in-wallet |
| Nominations | GitHub Issues (user-authenticated); browser localStorage is device-local |
| Media | Public art + CHIP-0007 metadata on GitHub Pages |
| Treasury | Public receive address only in `docs/js/config.js` |

## Reporting a vulnerability

1. **Do not** open a public issue for secret exposure or exploitable mint flaws.
2. Contact Fiend Studios via [X/Twitter @FiendStudios](https://x.com/FiendStudios) with a high-level description and contact method.
3. If a public `xch` or WalletConnect project ID was misconfigured, say so without posting unrelated secrets.

## Expected response

We aim to acknowledge reports within a few business days and prioritize issues that could lose funds, break mint integrity, or leak non-public data (none should be in this repo).

## Out of scope

- Social-engineering of individual wallets
- GitHub platform issues
- Marketplace/MintGarden bugs outside our collection config
- Artistic trait disagreements
