# Governance — what is frozen, what may change, and how

## Immutable (may never change)

- **The allocation**: every box's contents, fixed pre-sale and
  Merkle-committed (`mint/commitment.json`). Changing any box's contents
  after commitment is detectable by any buyer holding a proof — treat the
  published root as unbreakable.
- **Minted metadata**: CHIP-0007 hashes bind minted NFTs (boxes and
  WizNerdZ) to exact bytes forever. `docs/boxes/` v1 files are frozen because
  minted boxes hash-commit to them; changes go to a new versioned directory.
- **The nomination outcome**: closed July 31, 2026; all 71 one-of-ones final.

## Changeable, with rules

| Change | Rule |
|---|---|
| Commitment supersession | Only pre-sale for affected boxes, published with the old root in the `supersedes` chain, publicly disclosed (as with the seed rotation) |
| Inventory / prices | Operator loads offers via admin endpoints (env-secret gated); anchors registered in the delivery ledger BEFORE offers go live |
| Site & functions | PR-sized commits to `main`; three CI gates (tests, verify-metadata, live-preflight) must be green |
| `MINT_ADMIN_SECRET` | Rotate in Netlify env + operator shell together; requires redeploy to take effect |

## Standing rules

- Entitlement follows the settlement transaction's recipient — never later
  possession. Stated publicly; not changeable per-incident.
- Contents are never published before delivery is chain-confirmed.
- No force-push to `main`; recover by revert.
- No private keys in this repo or its deployed layer, ever. Delivery signing
  lives only on the operator machine (`mint_system/`).
- Public data stays public: rarity rankings, the commitment, and statuses are
  published on purpose — secrecy is not a fairness mechanism here.
