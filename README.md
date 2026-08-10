# WizNerdZ Pixel Paragon

**8,888** generative pixel wizards on the **Chia** blockchain by [Fiend Studios](https://x.com/FiendStudios).

| | |
|--|--|
| **Site** | https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/ |
| **Twitter** | https://x.com/FiendStudios |
| **Repo** | https://github.com/FlipThisCrypto/WizNerdZ-Pixel-Paragon |
| **Mint / royalty wallet** | `xch1qsclhhahfzs85xeemjye65yck2u6g9dpps0jtkwgjemzzndlu63qjej0te` |

## What’s live now

1. **Promo site** — collection art complete, **drop coming soon**.
2. **Full 8,888 CHIP-0007 metadata + art** on GitHub Pages (absolute image URLs).
3. **70 one-of-ones** showcased (10 named specials + 60 community).
4. **Sage WalletConnect** connect UI (mint disarmed until drop day).
5. **Economics**: mint **40% / 40% / 20%** (developer / wizards / Bepe.Love); royalties **10%** same split.
6. **No public rarity rankings** (fair mint — rankings not linked or indexed).

## Collection

| | |
|--|--|
| Supply | 8,888 |
| Generative | 8,818 |
| Named specials | 10 × **1 of 1** |
| Community 1/1s | 60 × **1 of 1** |
| Image size | 640×640 PNG |
| Metadata | CHIP-0007 |

### Named specials

| Token | Name |
|------:|------|
| 42 | Tom |
| 787 | Fiend |
| 2264 | Aster |
| 3736 | Art Boss |
| 5625 | Profet |
| 6146 | Blake |
| 6949 | Steve |
| 7462 | Papa |
| 8483 | James |
| 8700 | Staker |

### Paths (GitHub Pages)

| Path | Content |
|------|---------|
| `/` | Landing (promo, galleries, mint WC, economics) |
| `/images/{id}.png` | Token art |
| `/metadata/{id}.json` | CHIP-0007 (absolute `image` URLs) |
| `/collection.json` | Collection header + media URI templates |
| `/ones/` | All 70 1-of-1s browse pack |
| `/community-1of1.html` | Full 1/1 gallery |
| `/specials/` | Named specials art |
| `/token.html?id=N` | Token viewer (traits without rarity ranks) |
| `/health.json` | Health contract |
| `/MINT.md` | Mint economics & checklist |

Example:

- Art: `https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/images/42.png`
- Meta: `https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/metadata/42.json`

## Design notes

- Class-matched shirt + wizard hat (generative)
- Trait weights via filename `#weight` plus staff / spell / familiar extras
- Named + community specials are unique (1 of 1)
- Metadata includes Twitter + website only (no icon/banner — MintGarden UI)
- Public site does **not** publish rarity rank tables (by design for mint fairness)

## Repo layout

```
docs/                 ← GitHub Pages root (the live collection)
  index.html
  js/                 ← config, wallet, health, telemetry
  images/
  metadata/
  assets/
  specials/
  ones/
  collection.json
LICENSE
README.md
```
