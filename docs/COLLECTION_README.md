# WizNerdz Collection (8888)

## Contents
- `images/1.png` … `images/8888.png` — 640×640 PNG
- `metadata/1.json` … `metadata/8888.json` — CHIP-0007
- `collection.json` — collection header
- `rarity.csv` — trait frequencies
- `special_placements.json` — named special token IDs
- `generation_report.json` — run report

## Counts
- Generative: 8878
- Named specials: 10
- Total: 8888

## Named specials
- #42: Tom
- #787: Fiend
- #2264: Aster
- #3736: Art Boss
- #5625: Profet
- #6146: Blake
- #6949: Steve
- #7462: Papa
- #8483: James
- #8700: Staker

## Rules
- Class-matched Shirt == Wizard Hat for generative pieces
- Generative traits weighted by filename `#weight` (higher = more common)
- Named specials are **1 of 1** (unique supply)
- Specials use edited `*_640.png` from `special/`
- Seed: 8888

## Rarity
- Specials: `Rarity = 1 of 1`, `Supply = 1`, `data.max_supply = 1`
- Generative: trait pick uses weights; post-pass adds `Rarity` tier + rank from observed frequencies
