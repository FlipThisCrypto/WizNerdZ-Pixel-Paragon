# WizNerdZ Pixel Paragon

A 10,000-piece 64x64 native pixel-art wizard nerd NFT collection, exported at 4096x4096 with nearest-neighbor scaling.

The project is **rule-pack driven**: every color, weight, incompatibility, and synergy bonus lives in `rulepack/` JSON. Code never hardcodes design decisions.

---

## Layout

```
WizNerdZ_Pixel_Paragon/
├── rulepack/                          ← single source of truth (do not edit code instead)
│   ├── palette.json                   color families, hex values, variant weights
│   ├── weights.json                   trait category weights
│   ├── rules.json                     incompatibilities + synergy bonuses
│   ├── generator_logic.md             algorithm spec
│   └── README.md                      rarity targets and design intent
│
├── traits/                            ← canonical 64x64 trait masters (1 PNG per variant)
│   ├── 01_background/                 37 solid-color tiles from palette.json
│   ├── 01b_background_effect/         8 procedural fx (particles, runes, auras…)
│   ├── 02_body/                       7 robe colors (purple/blue/green/orange/black/white/gold)
│   ├── 03_head/                       8 bepe color ramps (orange/green/blue/purple/tan/zombie/shadow/gold)
│   ├── 04_eyes/                       9 styles (normal, tired, bloodshot, heart_eyes…)
│   ├── 05_mouth/                      10 styles (grin, smirk, gold_tooth_grin, cigarette_hang…)
│   ├── 06_facial_hair/                7 styles (none + 6 beards)
│   ├── 07_face_accessory/             7 styles (none + 6 glasses)
│   ├── 08_headwear/                   7 styles (none + 4 hats + crown + halo)
│   ├── 09_hand_item/                  7 items (none, wand, spell_book, potion, orb, marmot, orange_staff)
│   ├── 10_magic_overlay/              8 overlays (sparkles, auras, runes, flames, glitch)
│   ├── _logo/                         brand stamp (not a trait)
│   └── _legacy_sources/               original 32x32 masters preserved for reference
│
├── scripts/
│   ├── wiznerdz.py                    shared library (rule pack loader, image helpers, weighted picker)
│   ├── build_traits.py                rebuild traits/ from rule pack + legacy sources
│   ├── render_preview.py              composite a single named WizNerdZ for design QA
│   └── generate_collection.py         full weighted-DNA generator with metadata
│
└── output/
    ├── preview/                       single-nerd previews
    ├── thumbnails/                    512x512 PNGs (per token)
    ├── final/                         4096x4096 PNGs (per token, only with --full)
    └── metadata/                      per-token JSON with attributes + rarity score + DNA
```

---

## Rarity model (from `rulepack/`)

Color family weights → background family roll:

| Family | Weight | Target % of 10k |
|--------|--------|-----------------|
| Orange | 3      | 4–5%   (Mythic) |
| Green  | 8      | 12–14% (Legendary) |
| Blue   | 18     | 27–30% (Rare) |
| Purple | 35     | 52–56% (Common, classic wizard tone) |

Each trait gets `trait_score = total_category_weight / trait_weight`. Synergy combos add bonuses on top:

- **Tang Paragon** — orange bg + orange paragon hat → +20
- **Toxic Wizard** — green bg + green toxic aura → +10
- **$LOVE Wizard** — heart eyes OR love pink aura → +8
- **Frost Nerd** — blue bg + blue frost aura → +7
- **Arcane Common Done Right** — purple bg + purple rune circle → +5

Incompatibilities (e.g. `cigarette_hang` excludes `tongue_out`/`slight_open_uhhh`; `vr_visor` excludes `heart_eyes`/`cross_eyed`/`one_bigger`) are auto-rerolled in the conflicting category only.

Duplicates rejected by SHA-256 of the sorted trait dict.

---

## Layer compositing order (bottom → top)

```
01_background → 01b_background_effect → 02_body → 03_head
  → 06_facial_hair → 05_mouth → 04_eyes → 07_face_accessory
  → 08_headwear → 09_hand_item → 10_magic_overlay
```

---

## How to run

```bash
cd scripts/

# (Re)build the trait library from rule pack + _legacy_sources
python build_traits.py

# Render the default Tang Paragon showcase to output/preview/preview.png
python render_preview.py

# Render any custom WizNerdZ
python render_preview.py --bg blue:midnight_blue --body blue_robe \
    --head blue_bepe --eyes laser_blue --mouth teeth_grit \
    --beard void_beard --acc sunglasses --hat hood --hand orb \
    --overlay blue_frost_aura --size 1024

# Generate 8 sample tokens (fast — thumbnails only)
python generate_collection.py --count 8 --seed 7

# Full collection with 4096x4096 finals (slow — large output)
python generate_collection.py --count 10000 --full
```

---

## Mapping from the old folder structure

The legacy art (under `../_archive/`) was 32x32 silhouettes designed for HashLips palette swap, with folder names that didn't match the rule pack. Here's how it maps to the new tree:

| Legacy folder         | New category             | Treatment |
|-----------------------|--------------------------|-----------|
| `old1/Background/`    | `01_background/`         | **Replaced** — now generated from `palette.json` (37 tiles, 4 families × 8 variants + specials) |
| `old1/face/`          | `03_head/`               | Bark Skin silhouette → 2x upscale → recolored across 8 head color families |
| `old1/eyes/`          | `04_eyes/`               | **Replaced** — 9 native pixel-art eye styles drawn at 64x64 |
| `old1/mouth/`         | `05_mouth/`              | **Replaced** — 10 native pixel-art mouth styles drawn at 64x64 |
| `old1/facial hair/`   | `06_facial_hair/`        | One representative shape per rule-pack style → 2x upscale → 3-shade ramp recolor |
| `old1/glasses/`       | `07_face_accessory/`     | One representative per rule-pack style → recolor (lens transparency on top tone) |
| `old1/wizard hat/`    | `08_headwear/`           | One representative per rule-pack style → recolor + procedural crown/halo |
| `old1/shirt/`         | `02_body/`               | One representative robe → recolored across 7 robe color families |
| (none existed)        | `09_hand_item/`          | **New** — 7 procedural pixel-art items |
| (none existed)        | `10_magic_overlay/`      | **New** — 8 procedural overlays |
| (none existed)        | `01b_background_effect/` | **New** — 8 procedural background effects |

All 159 legacy 32x32 masters are preserved verbatim under `traits/_legacy_sources/`.

The chaotic top-level dirs (`face/`, `glasses/`, `processed_layers/`, `new/`, `WizNerdZ_Project/`, etc.) have been moved to `../_archive/` (renamed, not deleted). Safe to delete once you've verified the new tree.

---

## Where the old stuff went

```
G:/WizNerdz/_archive/
├── legacy_background/        ← was G:/WizNerdz/background/ (already-processed 512x512 outputs)
├── legacy_face/              ← was G:/WizNerdz/face/ (460 files, many double-prefixed re-runs)
├── legacy_facial_hair/       ← was G:/WizNerdz/facial hair/ (840 files)
├── legacy_glasses/           ← was G:/WizNerdz/glasses/ (460 files)
├── legacy_old1/              ← canonical 32x32 source masters (the actual usable inputs)
├── legacy_new/               ← prior generation attempt
├── legacy_processed_layers/  ← prior processor output
├── legacy_WizNerdZ_Project/  ← prior project layout
├── adjust_glasses.js         ← (byte-identical duplicate of adjust_layers.js)
├── adjust_layers.js          ← shifts glasses+eyes by (-1, +1)
├── rename_files.js           ← dash-to-underscore renamer
├── wiznerd_processor.py      ← old palette-swap tool (replaced by build_traits.py)
└── _rulepack_extracted/      ← unzipped rule pack (also lives in WizNerdZ_Pixel_Paragon/rulepack/)
```

---

## Design notes

- All trait PNGs are **64x64 RGBA**. The generator never resizes them; it just composites and then upscales the final 64x64 canvas to 512 (thumbnail) or 4096 (final).
- All upscaling is **nearest-neighbor only**. No anti-aliasing. No interpolation.
- Outline color is `#151515`. To re-enable per-layer outlines, use `wn.add_outline(img)` in `build_traits.py`.
- The `01_background` tile is a flat solid color from the rule pack hex; if you want gradients or noise, draw them in `01b_background_effect/`.
- DNA is the SHA-256 of the sorted trait dict (truncated to 16 hex chars). Collisions are rejected — for 10k tokens with this many trait combos, collision probability is astronomically small.

---

## Next steps to consider

- Hand-author the `03_head` master shape with proper proportions. Currently the head is the upscaled "Bark Skin" silhouette, which works but is generic.
- Add more variant SHAPES per category (currently most categories have one shape recolored N ways). The rule pack has room for it — e.g. `08_headwear` weights list 7 styles but only 4 have unique source art.
- Wire up an output viewer (a static HTML page that loads `metadata/*.json` and `thumbnails/*.png`) for fast collection review.
