# WizNerdZ Pixel Paragon — Mint & economics

**Publisher:** Fiend Studios  
**Chain:** Chia (CHIP-0007)  
**Site:** https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/

## Status

Collection art is complete (**8,888** NFTs). **Drop coming soon.**  
Nominations are closed. Public rarity rank tables are not published pre-mint (fair mint).

### One-of-ones (inventory-derived)

| Kind | Count | Source |
|------|------:|--------|
| **Named 1-of-1s** | **from `ones/named/`** (currently **10**) | Authoritative folder enumeration — not a hard-coded README constant |
| Community 1-of-1s | 60 | `ones/community/` + placements |
| **Total 1-of-1s** | **70** | named + community |

Named specials (Tom, Fiend, Aster, Art Boss, Profet, Blake, Steve, Papa, James, Staker) each power one **Named Premium** sealed box when not reserved.

---

## Sealed-box mint (allocation system)

The mint sells **sealed products**, not open cherry-picking of token IDs.

| Tier | Guarantee | Default price |
|------|-----------|--------------:|
| Named Premium | 1× named 1-of-1 from `named/` + 8 random standard | **5 XCH** |
| Elite | 1× Legendary + fillers | **2 XCH** |
| Rare | 1× Epic + fillers | **1 XCH** |
| Standard Bundle | 1× Rare + fillers | **0.5 XCH** |
| Blind Single | 1 random remaining NFT | **0.15 XCH** |

**Rarity basis:** August 10, 2026 ranking (`rarity_ranking.csv`).  
**Reserves:** only explicitly listed token IDs (default none).  
**Master equation:** Minted + Reserved = **8888**.

### Fairness: Commit → Mint → Reveal → Verify

1. Offline production allocation assigns every NFT to exactly one destination.
2. **SHA-256 commitment** of the private allocation is published (`mint/commitment.json`) **before** sales.
3. Public catalog (`mint/sealed_boxes.json`, [sealed-boxes.html](sealed-boxes.html)) lists box id / tier / price / guarantee only — **never** NFT IDs.
4. After **confirmed XCH payment**, the buyer opens the box and receives the **pre-assigned** NFTs (no re-draw).
5. After the mint, the private allocation can be disclosed and verified against the commitment.

Operator tooling lives in the working-directory `mint_system/` package (allocate, purchase service, independent audit). GitHub Pages remains non-custodial; payment confirmation must run on a backend that never marks a box sold from a frontend-only request.

See also: launch report under `mint_system/reports/LAUNCH_REPORT.md` in the working tree.

---

## Primary mint splits (predetermined)

| Recipient        | Share |
|------------------|------:|
| Developer        | **40%** |
| Wizards          | **40%** |
| Bepe.Love pool   | **20%** |

### $JUICE liquidity (developer share)

**50% of the developer portion** is used for **$JUICE liquidity**.

| | Share of primary mint |
|--|----------------------:|
| Developer total | 40% |
| → **$JUICE liquidity** | **20%** of primary (50% of dev) |
| → Development / ops | **20%** of primary (50% of dev) |
| Wizards | 40% |
| Bepe.Love pool | 20% |

Configure public `xch` addresses in `js/config.js` → `mintSplits.*.address` before arming mint.

## Royalties (secondary)

| Field | Value |
|-------|------:|
| Total royalty | **10%** |
| Developer | 40% of royalty → **4%** of sale |
| Wizards | 40% of royalty → **4%** of sale |
| Bepe.Love pool | 20% of royalty → **2%** of sale |

Apply the same addresses in MintGarden / marketplace royalty settings so secondary sales honor the split.  
**50% of the developer royalty bucket** may also support **$JUICE** liquidity where applicable.

---

## Secure mint architecture

```
[GitHub Pages]  --WalletConnect-->  [Sage / Chia wallet]
       |                                    |
       |  public offer URL / MintGarden     | user signs takeOffer
       v                                    v
   art + CHIP-0007 meta              coins + NFT ownership
```

**Rules**

1. No private keys, mnemonics, or unrestricted hot wallets in the site or repo.
2. Mint fulfillment = published **offer** or **MintGarden** collection mint (user-approved).
3. WalletConnect only requests user session + optional `chia_takeOffer` / address RPCs.
4. Free **WalletConnect Project ID** from [Reown Cloud](https://cloud.reown.com/) → `js/config.js` → `walletConnect.projectId`.
5. Set `mint.enabled = true` only when `mintgardenUrl` and/or `offerUrl` is live.

### Configured (public)

| Item | Value |
|------|--------|
| WalletConnect `projectId` | `52a9997711dde5c4f822e5b08ea8f275` |
| Mint + royalty receive wallet | `xch1qsclhhahfzs85xeemjye65yck2u6g9dpps0jtkwgjemzzndlu63qjej0te` |
| Split policy | 40% / 40% / 20% (same address for now; distribute or split addresses later) |
| $JUICE liquidity | 50% of developer portion (20% of primary mint) |
| Royalties | 10% same ratio |
| Nominations | Closed — community 1/1s in set |
| Drop | Coming soon |

### Operator checklist

- [x] WalletConnect project ID
- [x] Public mint/royalty `xch` address
- [x] Landing promo site (drop-soon, 1/1 galleries, no public rarity ranks)
- [x] $JUICE liquidity policy documented (50% of developer share)
- [ ] Confirm royalty fields on marketplace match 10% + splits
- [x] Community 1:1s locked into collection (60 community + named from `ones/named/`)
- [x] Production sealed allocation + public commitment published under `mint/`
- [x] Sealed-box UX page (`sealed-boxes.html`) — no pre-open NFT IDs
- [ ] Cold backup of `collection_8888` + traits + specials + **private** allocation
- [x] Absolute image URLs in all 8,888 metadata files (`data.image` + root `image`)
- [x] Rarity ranks embedded in metadata
- [ ] Wire live XCH payment confirmation → purchase service
- [ ] MintGarden (or offer host) collection created
- [ ] Test mint: #1, #42 Tom, #787 Fiend
- [ ] Arm `mint.enabled` + publish Pages
- [ ] Tag `v1.0.0-mint` after successful tests

---

## Community PFP nominations

| Item | Detail |
|------|--------|
| Deadline | Midnight end of **July 31, 2026** US Eastern (`America/New_York`) |
| UI | Site form → GitHub Issue + local browser copy |
| Art rule | WizNerdZ theme wizard; prefer official trait system when possible |
| After deadline | Lock list; produce 1:1 art; assign free token IDs; rebuild those slots; push |

### Issue labels

Use title prefix `[PFP Nomination]` (form does this). Optionally add label `pfp-nomination` in the repo.

---

## Related files

| Path | Role |
|------|------|
| `index.html` | Landing: countdown, mint WC, splits, nominate |
| `js/config.js` | Public config (addresses, WC, mint URLs) |
| `js/wallet.js` | Sage WalletConnect client |
| `js/countdown.js` | Eastern deadline timer |
| `js/nominate.js` | Nomination form |
| `token.html` | Token deep-link viewer |
| `rarity.html` | Interactive rarity table |
| `dashboard.html` | Ops board |
| `images/` · `metadata/` | Public collection media |
| `scripts/verify_metadata.py` | Integrity check absolute image URLs |
| `scripts/verify_specials.py` | Integrity check named 1/1 specials |

### Local verification

```bash
python scripts/verify_metadata.py
python scripts/verify_specials.py
```

---

## Evidence notes

- WalletConnect for Chia is documented by Chia Network sample dApps; Sage advertises WalletConnect support.
- Exact `chia_*` RPC param shapes can vary slightly by wallet build — verify with a testnet session before mainnet mint day.
- GitHub Pages cannot run a custodial mint server; user-wallet takeOffer / MintGarden is the secure static-site path.
