# External runtime dependencies (browser)

| Source | Used for | Risk | Mitigation |
|--------|----------|------|------------|
| `esm.sh/@walletconnect/sign-client@2.17.3` | WalletConnect | Supply chain / availability | Pin version; mint remains optional |
| `esm.sh/qrcode@1.5.4` | Local QR | Same | Pin version; URI copy fallback |
| `api.github.com` | Nominations board | Rate limit / outage | 5m cache + GitHub issues link |
| `relay.walletconnect.com` | WC relay | Outage | User retries; no funds at risk without sign |

## Policy

- No unpinned `latest` CDN imports  
- Prefer local generation over third-party QR image APIs  
- Never load remote scripts that require secrets  
