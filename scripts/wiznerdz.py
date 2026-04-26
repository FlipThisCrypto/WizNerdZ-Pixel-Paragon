"""
WizNerdz Pixel Paragon — shared library.

Loads the rule pack (palette / weights / rules / generator_logic) and provides
helpers for recoloring 64x64 silhouettes, drawing simple procedural traits,
and applying the final 1px outline + nearest-neighbor upscale.
"""

from __future__ import annotations

import json
import os
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter

# ---------------------------------------------------------------------------
# Paths & rule pack loading
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RULEPACK_DIR = PROJECT_ROOT / "rulepack"
TRAITS_DIR = PROJECT_ROOT / "traits"
OUTPUT_DIR = PROJECT_ROOT / "output"

WORKING_SIZE = (64, 64)
THUMBNAIL_SIZE = (512, 512)
FINAL_SIZE = (4096, 4096)
OUTLINE_RGBA = (21, 21, 21, 255)  # #151515


def _load_json(name: str) -> dict:
    return json.loads((RULEPACK_DIR / name).read_text(encoding="utf-8"))


PALETTE = _load_json("palette.json")
WEIGHTS = _load_json("weights.json")
RULES = _load_json("rules.json")


# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------


def hex_to_rgb(hex_code: str) -> tuple[int, int, int]:
    h = hex_code.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def hex_to_rgba(hex_code: str, alpha: int = 255) -> tuple[int, int, int, int]:
    r, g, b = hex_to_rgb(hex_code)
    return (r, g, b, alpha)


def family_variant_hex(family: str, variant_name: str) -> str:
    for v in PALETTE["color_families"][family]["variants"]:
        if v["name"] == variant_name:
            return v["hex"]
    raise KeyError(f"Unknown variant '{variant_name}' in family '{family}'")


def all_variants(family: str) -> list[dict]:
    return PALETTE["color_families"][family]["variants"]


# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------


def new_canvas(size: tuple[int, int] = WORKING_SIZE) -> Image.Image:
    return Image.new("RGBA", size, (0, 0, 0, 0))


def upscale_nearest(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    return img.resize(size, Image.NEAREST)


def add_outline(img: Image.Image, color: tuple[int, int, int, int] = OUTLINE_RGBA) -> Image.Image:
    """1-pixel outline behind any non-transparent pixel cluster."""
    alpha = img.split()[-1]
    outline_mask = alpha.filter(ImageFilter.MaxFilter(3))
    outline = Image.new("RGBA", img.size, color)
    outline.putalpha(outline_mask)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(outline, (0, 0))
    out.paste(img, (0, 0), mask=img)
    return out


def recolor_by_brightness(
    img: Image.Image,
    palette_hex: list[str],
    transparent_top: bool = False,
    top_alpha: int = 140,
) -> Image.Image:
    """
    Map source colors → palette by brightness rank.
    Brightest source pixel → palette[0], next → palette[1], etc.
    Useful for turning a 1- or few-color silhouette into a themed variant.
    """
    img = img.convert("RGBA")
    counts = img.getcolors(maxcolors=1_000_000) or []
    valid = [rgba for _, rgba in counts if rgba[3] > 0]
    if not valid:
        return img

    valid.sort(key=lambda c: sum(c[:3]), reverse=True)  # bright → dark
    target = [hex_to_rgb(h) for h in palette_hex]
    color_map: dict[tuple[int, int, int, int], tuple[int, int, int, int]] = {}
    for i, src in enumerate(valid):
        idx = min(i, len(target) - 1)
        rgb = target[idx]
        if transparent_top and i == 0:
            color_map[src] = (*rgb, top_alpha)
        else:
            color_map[src] = (*rgb, 255)

    pixels = []
    for px in img.getdata():
        if px[3] == 0:
            pixels.append((0, 0, 0, 0))
        elif px in color_map:
            pixels.append(color_map[px])
        else:
            pixels.append(px)
    out = Image.new("RGBA", img.size)
    out.putdata(pixels)
    return out


def center_horizontally(img: Image.Image, canvas_w: int = 64) -> Image.Image:
    """
    Shift the non-transparent pixels so their bbox is horizontally centered.
    Vertical position is preserved. Pixels that would fall off-canvas are clipped.
    Use this on legacy art that was drawn slightly off-axis.
    """
    bbox = img.split()[-1].getbbox()
    if bbox is None:
        return img
    x0, _, x1, _ = bbox
    current_center = (x0 + x1 - 1) / 2
    target_center = (canvas_w - 1) / 2
    dx = round(target_center - current_center)
    if dx == 0:
        return img
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (dx, 0), mask=img)
    return out


def stack(layers: Iterable[Image.Image | None], size: tuple[int, int] = WORKING_SIZE) -> Image.Image:
    """Composite layers in order on a transparent canvas."""
    base = new_canvas(size)
    for layer in layers:
        if layer is None:
            continue
        if layer.size != size:
            layer = upscale_nearest(layer, size)
        base.alpha_composite(layer)
    return base


# ---------------------------------------------------------------------------
# Procedural background fills (rule pack palette)
# ---------------------------------------------------------------------------


def background_fill(family: str, variant_name: str) -> Image.Image:
    """Solid 64x64 fill using the rule pack hex value."""
    hex_code = family_variant_hex(family, variant_name)
    return Image.new("RGBA", WORKING_SIZE, hex_to_rgba(hex_code))


# ---------------------------------------------------------------------------
# Procedural magic overlays
# ---------------------------------------------------------------------------


def overlay_none() -> Image.Image:
    return new_canvas()


def overlay_arcane_sparkles(seed: int = 0) -> Image.Image:
    img = new_canvas()
    d = ImageDraw.Draw(img)
    rng = random.Random(seed or 1)
    for _ in range(14):
        x, y = rng.randrange(64), rng.randrange(64)
        d.point((x, y), fill=hex_to_rgba("#F8FAFC", 230))
    for _ in range(5):
        x, y = rng.randrange(2, 62), rng.randrange(2, 62)
        d.point([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=hex_to_rgba("#FFD700", 255))
    return img


def overlay_aura(rgba: tuple[int, int, int, int]) -> Image.Image:
    """Soft full-canvas aura tint — used as base for color-themed auras."""
    img = new_canvas()
    d = ImageDraw.Draw(img)
    cx, cy = 32, 36
    for r, alpha in [(28, 30), (22, 60), (16, 110)]:
        col = (rgba[0], rgba[1], rgba[2], alpha)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col)
    return img


def overlay_green_toxic_aura() -> Image.Image:
    return overlay_aura(hex_to_rgba("#39FF14"))


def overlay_blue_frost_aura() -> Image.Image:
    return overlay_aura(hex_to_rgba("#7DD3FC"))


def overlay_purple_rune_circle() -> Image.Image:
    img = new_canvas()
    d = ImageDraw.Draw(img)
    d.ellipse((10, 14, 54, 58), outline=hex_to_rgba("#9333EA", 220))
    d.ellipse((14, 18, 50, 54), outline=hex_to_rgba("#C4B5FD", 180))
    for ang in range(0, 360, 45):
        import math
        x = 32 + int(20 * math.cos(math.radians(ang)))
        y = 36 + int(20 * math.sin(math.radians(ang)))
        d.point((x, y), fill=hex_to_rgba("#FFD700", 255))
    return img


def overlay_love_pink_aura() -> Image.Image:
    return overlay_aura(hex_to_rgba("#FF4FD8"))


def overlay_orange_paragon_flames() -> Image.Image:
    img = new_canvas()
    d = ImageDraw.Draw(img)
    rng = random.Random(7)
    flame_colors = ["#FF3D00", "#FF6A00", "#F59E0B", "#FFD700"]
    for col in flame_colors:
        for _ in range(18):
            x = rng.randrange(8, 56)
            y = rng.randrange(40, 62)
            d.point((x, y), fill=hex_to_rgba(col, 240))
    for x in range(0, 64, 4):
        d.point((x, 63), fill=hex_to_rgba("#FF3D00", 255))
        d.point((x, 62), fill=hex_to_rgba("#FF6A00", 255))
    return img


def overlay_rainbow_glitch() -> Image.Image:
    img = new_canvas()
    d = ImageDraw.Draw(img)
    rng = random.Random(13)
    bands = ["#FF3D00", "#F59E0B", "#39FF14", "#06B6D4", "#2563EB", "#9333EA", "#FF4FD8"]
    for _ in range(10):
        y = rng.randrange(0, 64)
        col = bands[rng.randrange(len(bands))]
        d.line((0, y, 63, y), fill=hex_to_rgba(col, 180))
    return img


MAGIC_OVERLAY_RENDERERS = {
    "none": overlay_none,
    "arcane_sparkles": overlay_arcane_sparkles,
    "green_toxic_aura": overlay_green_toxic_aura,
    "blue_frost_aura": overlay_blue_frost_aura,
    "purple_rune_circle": overlay_purple_rune_circle,
    "love_pink_aura": overlay_love_pink_aura,
    "orange_paragon_flames": overlay_orange_paragon_flames,
    "rainbow_glitch": overlay_rainbow_glitch,
}


# ---------------------------------------------------------------------------
# Procedural background effects
# ---------------------------------------------------------------------------


def bg_effect_none() -> Image.Image:
    return new_canvas()


def bg_effect_soft_particles() -> Image.Image:
    img = new_canvas()
    d = ImageDraw.Draw(img)
    rng = random.Random(101)
    for _ in range(40):
        d.point((rng.randrange(64), rng.randrange(64)), fill=hex_to_rgba("#F8FAFC", 90))
    return img


def bg_effect_pixel_stars() -> Image.Image:
    img = new_canvas()
    d = ImageDraw.Draw(img)
    rng = random.Random(202)
    for _ in range(18):
        x, y = rng.randrange(64), rng.randrange(64)
        d.point((x, y), fill=hex_to_rgba("#FFFFFF", 255))
    return img


def bg_effect_energy_field() -> Image.Image:
    img = new_canvas()
    d = ImageDraw.Draw(img)
    for x in range(0, 64, 6):
        d.line((x, 0, x, 63), fill=hex_to_rgba("#06B6D4", 60))
    for y in range(0, 64, 6):
        d.line((0, y, 63, y), fill=hex_to_rgba("#06B6D4", 60))
    return img


def bg_effect_magic_runes() -> Image.Image:
    img = new_canvas()
    d = ImageDraw.Draw(img)
    rng = random.Random(303)
    for _ in range(8):
        x = rng.randrange(4, 60)
        y = rng.randrange(4, 60)
        d.rectangle((x, y, x + 1, y + 1), outline=hex_to_rgba("#FFD700", 200))
    return img


def bg_effect_glitch_noise() -> Image.Image:
    img = new_canvas()
    d = ImageDraw.Draw(img)
    rng = random.Random(404)
    for _ in range(60):
        x, y = rng.randrange(64), rng.randrange(64)
        col = ["#FF3D00", "#39FF14", "#06B6D4", "#9333EA"][rng.randrange(4)]
        d.point((x, y), fill=hex_to_rgba(col, 140))
    return img


def bg_effect_love_aura() -> Image.Image:
    return overlay_aura(hex_to_rgba("#FF4FD8"))


def bg_effect_orange_flame_aura() -> Image.Image:
    return overlay_aura(hex_to_rgba("#FF6A00"))


BG_EFFECT_RENDERERS = {
    "none": bg_effect_none,
    "soft_particles": bg_effect_soft_particles,
    "pixel_stars": bg_effect_pixel_stars,
    "energy_field": bg_effect_energy_field,
    "magic_runes": bg_effect_magic_runes,
    "glitch_noise": bg_effect_glitch_noise,
    "love_aura": bg_effect_love_aura,
    "orange_flame_aura": bg_effect_orange_flame_aura,
}


# ---------------------------------------------------------------------------
# Trait file discovery
# ---------------------------------------------------------------------------


@dataclass
class TraitVariant:
    category: str
    name: str
    path: Path

    def load(self) -> Image.Image:
        return Image.open(self.path).convert("RGBA")


def list_variants(category_dir: str) -> list[TraitVariant]:
    base = TRAITS_DIR / category_dir
    if not base.exists():
        return []
    return [
        TraitVariant(category=category_dir, name=p.stem, path=p)
        for p in sorted(base.glob("*.png"))
    ]


def find_variant(category_dir: str, name: str) -> Path | None:
    p = TRAITS_DIR / category_dir / f"{name}.png"
    return p if p.exists() else None


# ---------------------------------------------------------------------------
# Weighted picker
# ---------------------------------------------------------------------------


def weighted_pick(rng: random.Random, options: list[dict], key: str = "trait") -> str:
    weights = [o["weight"] for o in options]
    total = sum(weights)
    roll = rng.uniform(0, total)
    acc = 0
    for o, w in zip(options, weights):
        acc += w
        if roll <= acc:
            return o[key]
    return options[-1][key]


def weighted_pick_variant(rng: random.Random, variants: list[dict]) -> dict:
    weights = [v["weight"] for v in variants]
    total = sum(weights)
    roll = rng.uniform(0, total)
    acc = 0
    for v, w in zip(variants, weights):
        acc += w
        if roll <= acc:
            return v
    return variants[-1]
