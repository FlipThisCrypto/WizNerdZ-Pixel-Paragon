"""
WizNerdZ Pixel Paragon — collection generator.

Implements the flow described in rulepack/generator_logic.md:
    1. Pick background family by weight.
    2. Pick background variant from the selected family.
    3. (Optional) special interrupt color tint (background only).
    4. Pick each trait category by weight.
    5. Check incompatibility rules; reroll the conflicting trait only.
    6. Build DNA from selected trait names; reject duplicates.
    7. Calculate rarity score (incl. synergy bonuses).
    8. Composite & export PNG (4096x4096 nearest neighbor) + thumbnail (512x512) + metadata JSON.

Usage:
    python generate_collection.py                # generate 8 sample tokens
    python generate_collection.py --count 100    # generate 100 tokens
    python generate_collection.py --count 10000  # full collection
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

from PIL import Image

import wiznerdz as wn

# Layer compositing order (bottom → top)
LAYER_ORDER = [
    "01_background",         # solid color tile
    "01b_background_effect", # particles / runes / etc.
    "02_body",               # robe
    "03_head",               # bepe head silhouette
    "06_facial_hair",        # beard
    "05_mouth",              # mouth
    "04_eyes",               # eyes
    "07_face_accessory",     # glasses
    "08_headwear",           # wizard hat / halo / crown
    "09_hand_item",          # wand / staff / orb
    "10_magic_overlay",      # auras, sparkles, flames
]


def pick_background(rng: random.Random) -> tuple[str, str, str]:
    """Returns (family, variant_name, variant_hex)."""
    family = wn.weighted_pick(rng, wn.WEIGHTS["01_background_family"])
    variant = wn.weighted_pick_variant(rng, wn.PALETTE["color_families"][family]["variants"])
    return family, variant["name"], variant["hex"]


def pick_traits(rng: random.Random) -> dict:
    """Pick one trait per weighted category."""
    return {
        "01b_background_effect": wn.weighted_pick(rng, wn.WEIGHTS["01c_background_effect"]),
        "02_body":               wn.weighted_pick(rng, wn.WEIGHTS["02_body"]),
        "03_head":               wn.weighted_pick(rng, wn.WEIGHTS["03_head"]),
        "04_eyes":               wn.weighted_pick(rng, wn.WEIGHTS["04_eyes"]),
        "05_mouth":              wn.weighted_pick(rng, wn.WEIGHTS["05_mouth"]),
        "06_facial_hair":        wn.weighted_pick(rng, wn.WEIGHTS["06_facial_hair"]),
        "07_face_accessory":     wn.weighted_pick(rng, wn.WEIGHTS["07_face_accessory"]),
        "08_headwear":           wn.weighted_pick(rng, wn.WEIGHTS["08_headwear"]),
        "09_hand_item":          wn.weighted_pick(rng, wn.WEIGHTS["09_hand_item"]),
        "10_magic_overlay":      wn.weighted_pick(rng, wn.WEIGHTS["10_magic_overlay"]),
    }


def violates(traits: dict, rule: dict) -> str | None:
    """If traits violates the incompatibility rule, return the offending category."""
    if "if" in rule:
        for cat, val in rule["if"].items():
            if traits.get(cat) != val:
                return None
        for cat, bad_vals in rule["not_with"].items():
            if traits.get(cat) in bad_vals:
                return cat
    return None


def enforce_incompatibilities(rng: random.Random, traits: dict, max_rerolls: int = 12) -> dict:
    for _ in range(max_rerolls):
        conflict = None
        for rule in wn.RULES["incompatibilities"]:
            offender = violates(traits, rule)
            if offender:
                conflict = offender
                break
        if not conflict:
            return traits
        # Reroll just the conflicting category
        weights_key = {
            "01b_background_effect": "01c_background_effect",
        }.get(conflict, conflict)
        traits[conflict] = wn.weighted_pick(rng, wn.WEIGHTS[weights_key])
    return traits


def calculate_rarity(traits_full: dict) -> tuple[float, list[str]]:
    """
    Per generator_logic.md: trait_score = total_category_weight / trait_weight.
    Then add synergy bonuses.
    """
    score = 0.0
    weight_keys = {
        "01_background_family": "01_background_family",
        "01b_background_effect": "01c_background_effect",
        "02_body": "02_body",
        "03_head": "03_head",
        "04_eyes": "04_eyes",
        "05_mouth": "05_mouth",
        "06_facial_hair": "06_facial_hair",
        "07_face_accessory": "07_face_accessory",
        "08_headwear": "08_headwear",
        "09_hand_item": "09_hand_item",
        "10_magic_overlay": "10_magic_overlay",
    }
    for cat, val in traits_full.items():
        wkey = weight_keys.get(cat)
        if not wkey:
            continue
        opts = wn.WEIGHTS[wkey]
        total = sum(o["weight"] for o in opts)
        match = next((o for o in opts if o["trait"] == val), None)
        if match and match["weight"] > 0:
            score += total / match["weight"]

    synergies_hit = []
    for syn in wn.RULES["synergy_bonus_rules"]:
        if "requires" in syn:
            if all(traits_full.get(k) == v for k, v in syn["requires"].items()):
                score += syn["rarity_bonus"]
                synergies_hit.append(syn["name"])
        if "requires_any" in syn:
            for clause in syn["requires_any"]:
                if all(traits_full.get(k) == v for k, v in clause.items()):
                    score += syn["rarity_bonus"]
                    synergies_hit.append(syn["name"])
                    break
    return score, synergies_hit


def dna_hash(traits_full: dict) -> str:
    blob = json.dumps(traits_full, sort_keys=True).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()[:16]


def composite_token(family: str, variant_name: str, traits: dict) -> Image.Image:
    layers: list[Image.Image | None] = []
    # bg color tile
    bg_path = wn.find_variant("01_background", f"{family}__{variant_name}")
    layers.append(Image.open(bg_path).convert("RGBA") if bg_path else wn.background_fill(family, variant_name))
    # ordered layers
    for cat in LAYER_ORDER[1:]:
        name = traits.get(cat)
        if name is None:
            continue
        path = wn.find_variant(cat, name)
        if path:
            layers.append(Image.open(path).convert("RGBA"))
        else:
            layers.append(None)
    return wn.stack(layers)


def build_metadata(token_id: int, family: str, variant_name: str, traits: dict, score: float, synergies: list[str], dna: str) -> dict:
    family_hex = wn.family_variant_hex(family, variant_name)
    return {
        "name": f"WizNerdZ Pixel Paragon #{token_id:05d}",
        "description": "WizNerdZ Pixel Paragon — a 64x64 native pixel wizard nerd, exported at 4096x4096.",
        "image": f"final/{token_id:05d}.png",
        "dna": dna,
        "rarity_score": round(score, 3),
        "synergies": synergies,
        "attributes": [
            {"trait_type": "Background Family",     "value": family.title()},
            {"trait_type": "Background Variant",    "value": variant_name},
            {"trait_type": "Background Hex",        "value": family_hex},
            {"trait_type": "Background Effect",     "value": traits["01b_background_effect"]},
            {"trait_type": "Body",                  "value": traits["02_body"]},
            {"trait_type": "Head",                  "value": traits["03_head"]},
            {"trait_type": "Eyes",                  "value": traits["04_eyes"]},
            {"trait_type": "Mouth",                 "value": traits["05_mouth"]},
            {"trait_type": "Facial Hair",           "value": traits["06_facial_hair"]},
            {"trait_type": "Face Accessory",        "value": traits["07_face_accessory"]},
            {"trait_type": "Headwear",              "value": traits["08_headwear"]},
            {"trait_type": "Hand Item",             "value": traits["09_hand_item"]},
            {"trait_type": "Magic Overlay",         "value": traits["10_magic_overlay"]},
        ],
    }


def generate(count: int, seed: int, full_size: bool) -> None:
    rng = random.Random(seed)
    seen_dna: set[str] = set()
    out_thumb = wn.OUTPUT_DIR / "thumbnails"
    out_final = wn.OUTPUT_DIR / "final"
    out_meta = wn.OUTPUT_DIR / "metadata"
    for d in (out_thumb, out_final, out_meta):
        d.mkdir(parents=True, exist_ok=True)

    minted = 0
    attempts = 0
    while minted < count and attempts < count * 50:
        attempts += 1
        family, variant_name, _ = pick_background(rng)
        traits = pick_traits(rng)
        traits = enforce_incompatibilities(rng, traits)

        traits_full = {"01_background_family": family, "01b_background_variant": variant_name, **traits}
        dna = dna_hash(traits_full)
        if dna in seen_dna:
            continue
        seen_dna.add(dna)

        score, synergies = calculate_rarity(traits_full)

        token_id = minted + 1
        canvas64 = composite_token(family, variant_name, traits)
        thumb = wn.upscale_nearest(canvas64, wn.THUMBNAIL_SIZE)
        thumb.save(out_thumb / f"{token_id:05d}.png")
        if full_size:
            wn.upscale_nearest(canvas64, wn.FINAL_SIZE).save(out_final / f"{token_id:05d}.png")

        meta = build_metadata(token_id, family, variant_name, traits, score, synergies, dna)
        (out_meta / f"{token_id:05d}.json").write_text(json.dumps(meta, indent=2))

        minted += 1
        if minted % max(1, count // 20) == 0:
            print(f"  minted {minted}/{count}")

    print(f"Done. Minted {minted} tokens in {attempts} attempts. Output: {wn.OUTPUT_DIR}")


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=8, help="number of tokens to generate")
    ap.add_argument("--seed", type=int, default=42, help="rng seed")
    ap.add_argument("--full", action="store_true", help="also export 4096x4096 finals (large)")
    return ap.parse_args()


if __name__ == "__main__":
    args = parse_args()
    generate(args.count, args.seed, args.full)
