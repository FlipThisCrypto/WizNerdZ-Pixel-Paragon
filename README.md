# WizNerdZ Pixel Paragon

**8,888** generative pixel wizards on the **Chia** blockchain by [Fiend Studios](https://x.com/FiendStudios).

🌐 **Site:** https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/  
🐦 **Twitter:** https://x.com/FiendStudios

## Collection

| | |
|--|--|
| Supply | 8,888 |
| Generative | 8,878 |
| Named specials | 10 × **1 of 1** |
| Image size | 640×640 PNG |
| Metadata | CHIP-0007 |

### Live paths (GitHub Pages)

- Landing: `/`
- Images: `/images/{id}.png`
- Metadata: `/metadata/{id}.json`
- Collection: `/collection.json`
- Rarity sheet: `/rarity.csv`

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

## Design rules (this drop)

- Class-matched **Shirt** + **Wizard Hat**
- Trait rarity via filename `#weight` (higher = more common)
- Named specials are unique (`Rarity: 1 of 1`)
- Collection links in metadata: Twitter + website only (no icon/banner — MintGarden handles those)

## Repo layout

```
docs/                 ← GitHub Pages root
  index.html
  images/
  metadata/
  assets/
  specials/
  collection.json
  rarity.csv
rulepack/             ← prior 64×64 pipeline notes (legacy)
scripts/
traits/
```

## License

See `LICENSE`.
