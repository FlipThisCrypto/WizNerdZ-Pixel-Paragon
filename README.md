# WizNerdZ Pixel Paragon

**8,888** generative pixel wizards on the **Chia** blockchain by [Fiend Studios](https://x.com/FiendStudios).

| | |
|--|--|
| **Site** | https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/ |
| **Twitter** | https://x.com/FiendStudios |
| **Repo** | https://github.com/FlipThisCrypto/WizNerdZ-Pixel-Paragon |
| **Mint / royalty wallet** | `xch1qsclhhahfzs85xeemjye65yck2u6g9dpps0jtkwgjemzzndlu63qjej0te` |

## What’s live now

1. **Community PFP nominations** (the current One Thing) — form on the landing page opens a GitHub Issue. Deadline: **midnight July 31, 2026 (US Eastern)**. Countdown is on the site.
2. **Full 8,888 CHIP-0007 metadata + art** on GitHub Pages with **absolute image URLs**.
3. **Sage WalletConnect** connect UI (mint stays disarmed until community 1:1s freeze and offers publish).
4. **Economics** documented: mint **40% / 40% / 20%** (developer / wizards / Bepe.Love); royalties **10%** with the same split.

## Collection

| | |
|--|--|
| Supply | 8,888 |
| Generative | 8,878 |
| Named specials | 10 × **1 of 1** |
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
| `/` | Landing (countdown, nominate, mint WC, economics) |
| `/images/{id}.png` | Token art |
| `/metadata/{id}.json` | CHIP-0007 (absolute `image` URLs) |
| `/collection.json` | Collection header + media URI templates |
| `/rarity.csv` | Trait frequencies |
| `/specials/` | Named specials showcase |
| `/dashboard.html` | Ops board |
| `/MINT.md` | Mint economics & checklist |
| `/404.html` | Branded not-found page |

Example:

- Art: `https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/images/42.png`
- Meta: `https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/metadata/42.json`

## Nominations

1. Open the [landing page](https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/#nominate).
2. Submit the form → prefilled GitHub issue → click **Create**.
3. Track issues titled `[PFP Nomination] …`.

After the deadline, Fiend Studios locks the list, produces remaining 1:1 art, freezes the set, then arms mint.

## Design notes

- Class-matched shirt + wizard hat (generative)
- Trait weights via filename `#weight` plus staff / spell / familiar extras
- Named specials are unique (1 of 1)
- Metadata includes Twitter + website only (no icon/banner — MintGarden UI)

## Repo layout

```
docs/                 ← GitHub Pages root (the live collection)
  index.html
  js/                 ← config, countdown, nominate, wallet
  images/
  metadata/
  assets/
  specials/
  collection.json
  rarity.csv
LICENSE
README.md
```

Legacy 64×64 rulepack pipeline art was removed from this repo (local backup only).

## License

See `LICENSE`.
