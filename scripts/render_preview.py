"""
Render a single named WizNerdZ for design QA.

Usage:
    python render_preview.py                   # default showcase nerd
    python render_preview.py --bg orange:molten_orange --body orange_robe \
        --head orange_bepe --eyes laser_blue --mouth gold_tooth_grin \
        --beard long_wizard_beard --acc round_wizard_specs \
        --hat orange_paragon_hat --hand orange_staff --overlay orange_paragon_flames
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

import wiznerdz as wn

LAYER_ORDER = [
    ("01_background",        "bg"),
    ("01b_background_effect","bgfx"),
    ("02_body",              "body"),
    ("03_head",              "head"),
    ("06_facial_hair",       "beard"),
    ("05_mouth",             "mouth"),
    ("04_eyes",              "eyes"),
    ("07_face_accessory",    "acc"),
    ("08_headwear",          "hat"),
    ("09_hand_item",         "hand"),
    ("10_magic_overlay",     "overlay"),
]


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    # Defaults form the "Tang Paragon" + "$LOVE Wizard" mash-up — heaviest synergy showcase
    ap.add_argument("--bg",      default="orange:molten_orange",  help="family:variant for 01_background")
    ap.add_argument("--bgfx",    default="orange_flame_aura")
    ap.add_argument("--body",    default="orange_robe")
    ap.add_argument("--head",    default="orange_bepe")
    ap.add_argument("--eyes",    default="heart_eyes")
    ap.add_argument("--mouth",   default="gold_tooth_grin")
    ap.add_argument("--beard",   default="long_wizard_beard")
    ap.add_argument("--acc",     default="round_wizard_specs")
    ap.add_argument("--hat",     default="orange_paragon_hat")
    ap.add_argument("--hand",    default="orange_staff")
    ap.add_argument("--overlay", default="orange_paragon_flames")
    ap.add_argument("--out",     default=None, help="output png (default: output/preview/preview.png)")
    ap.add_argument("--size",    type=int, default=1024, help="export size (square)")
    return ap.parse_args()


def main() -> None:
    args = parse_args()
    bg_family, bg_variant = args.bg.split(":", 1)

    layer_specs = {
        "01_background":         f"{bg_family}__{bg_variant}",
        "01b_background_effect": args.bgfx,
        "02_body":               args.body,
        "03_head":               args.head,
        "04_eyes":               args.eyes,
        "05_mouth":              args.mouth,
        "06_facial_hair":        args.beard,
        "07_face_accessory":     args.acc,
        "08_headwear":           args.hat,
        "09_hand_item":          args.hand,
        "10_magic_overlay":      args.overlay,
    }

    layers = []
    print("Stacking layers:")
    for cat, _ in LAYER_ORDER:
        name = layer_specs[cat]
        path = wn.find_variant(cat, name)
        if path is None:
            print(f"   ! missing {cat}/{name}.png — skipping")
            continue
        print(f"   + {cat}/{name}")
        layers.append(Image.open(path).convert("RGBA"))

    base = wn.stack(layers)
    out_path = Path(args.out) if args.out else (wn.OUTPUT_DIR / "preview" / "preview.png")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    final = wn.upscale_nearest(base, (args.size, args.size))
    final.save(out_path)
    print(f"Wrote {out_path} ({args.size}x{args.size})")


if __name__ == "__main__":
    main()
