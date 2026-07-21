# Content Security Policy notes

GitHub Pages does not allow custom response CSP headers on free static sites.

Compensating controls:
- Pinned esm.sh versions for WC/QR
- Referrer-Policy meta strict-origin-when-cross-origin
- Chaos/feature flags for kill switches
- Integrity scripts for art/metadata

Future host header template:
default-src 'self'; script-src 'self' https://esm.sh;
connect-src 'self' https://api.github.com https://*.walletconnect.com wss://*.walletconnect.com https://esm.sh;
img-src 'self' data: blob:; style-src 'self' 'unsafe-inline';
