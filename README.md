# WizNerdZ Pixel Paragon

**8,888** generative pixel wizards on the **Chia** blockchain by [Fiend Studios](https://x.com/FiendStudios).

- **Site:** https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/
- **Twitter:** https://x.com/FiendStudios
- **Repo:** https://github.com/FlipThisCrypto/WizNerdZ-Pixel-Paragon

## Collection

| | |
|--|--|
| Supply | 8,888 |
| Generative | 8,878 |
| Named specials | 10 × **1 of 1** |
| Image size | 640×640 PNG |
| Metadata | CHIP-0007 |

### Paths (GitHub Pages)

| Path | Content |
|------|---------|
| `/` | Landing page |
| `/images/{id}.png` | Token art |
| `/metadata/{id}.json` | Token metadata (CHIP-0007; absolute `image` URLs) |
| `/collection.json` | Collection header + media URI templates |
| `/rarity.csv` | Trait frequencies |
| `/specials/` | Named specials showcase |

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

## Design notes

- Class-matched shirt + wizard hat (generative)
- Trait weights via filename `#weight` plus staff / spell / familiar extras
- Named specials are unique (1 of 1)
- Metadata includes Twitter + website only (no icon/banner — MintGarden)

## Repo layout

```
docs/                 ← GitHub Pages root (the live collection)
  index.html
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
