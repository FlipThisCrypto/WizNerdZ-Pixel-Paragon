"""
Build the new 64x64 trait library from legacy sources + procedural generators.

Inputs (legacy, read-only):
    G:/WizNerdz/old1/                  ← canonical 32x32 source masters
    G:/WizNerdz/_rulepack_extracted/   ← rule pack JSONs

Outputs:
    WizNerdZ_Pixel_Paragon/traits/
        01_background/    (procedural — solid color tiles per palette variant)
        02_body/          (legacy shirt art, 2x upscale, recolored to robe families)
        03_head/          (legacy face silhouette, recolored to bepe color families)
        04_eyes/          (legacy eye art, 2x upscale, normal style only)
        05_mouth/         (legacy mouth, 2x upscale)
        06_facial_hair/   (legacy beards, 2x upscale, mapped to rule pack styles)
        07_face_accessory/(legacy glasses, 2x upscale, recolored)
        08_headwear/      (legacy wizard hat, 2x upscale, recolored)
        09_hand_item/     (procedural — wand, staff, orb, potion, spellbook silhouettes)
        10_magic_overlay/ (procedural — sparkles, auras, runes, flames, glitch)
        _logo/            (legacy logo)
        _legacy_sources/  (preserved 32x32 originals for reference)
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw

import wiznerdz as wn

LEGACY_ROOT = Path("G:/WizNerdz/_archive/legacy_old1")
LEGACY_PROJECT = Path("G:/WizNerdz/_archive/legacy_WizNerdZ_Project")  # has the logo


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def upscale_master(src: Path) -> Image.Image:
    img = Image.open(src).convert("RGBA")
    if img.size != (64, 64):
        img = img.resize((64, 64), Image.NEAREST)
    # Legacy 32x32 masters were drawn slightly off-axis; recenter so every
    # body-on-axis layer (head, body, beard, glasses, hat) shares x=32 as midline.
    img = wn.center_horizontally(img)
    return img


def save(img: Image.Image, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)


# ---------------------------------------------------------------------------
# 01_background — procedural solid fills per rule-pack variant
# ---------------------------------------------------------------------------


def build_backgrounds() -> int:
    out_dir = wn.TRAITS_DIR / "01_background"
    out_dir.mkdir(parents=True, exist_ok=True)
    n = 0
    for family, fdata in wn.PALETTE["color_families"].items():
        for v in fdata["variants"]:
            tile = wn.background_fill(family, v["name"])
            save(tile, out_dir / f"{family}__{v['name']}.png")
            n += 1
    # Special interrupt single-color tiles (skip MULTI markers — those are handled by overlays)
    for sp in wn.PALETTE["special_interrupt_colors"]:
        if sp["hex"] == "MULTI":
            continue
        tile = Image.new("RGBA", wn.WORKING_SIZE, wn.hex_to_rgba(sp["hex"]))
        save(tile, out_dir / f"special__{sp['name']}.png")
        n += 1
    return n


# ---------------------------------------------------------------------------
# 02_body — legacy shirt art, mapped to robe color families per rule pack
# ---------------------------------------------------------------------------

# Each rule-pack body trait is a robe color family. We pick a representative
# legacy shirt design for each and recolor it into a 3-shade ramp.
BODY_PALETTES = {
    "purple_robe":      ["#C4B5FD", "#7E22CE", "#2E1065"],   # highlight, mid, shadow
    "blue_robe":        ["#7DD3FC", "#2563EB", "#172554"],
    "green_robe":       ["#A3E635", "#22C55E", "#166534"],
    "orange_robe":      ["#FDBA74", "#FF6A00", "#C2410C"],
    "black_robe":       ["#374151", "#111827", "#020617"],
    "white_robe":       ["#FFFFFF", "#E5E7EB", "#94A3B8"],
    "gold_trim_robe":   ["#FFD700", "#F59E0B", "#7C2D12"],
}

BODY_SOURCE_SHIRT = "Arcane Mage.png"  # representative master


def _trim_robe_shoulders(img: Image.Image, head_x_start: int = 18, head_x_end: int = 46, neck_y: int = 44) -> Image.Image:
    """
    The legacy robe silhouette is wider than the head. Above the neckline,
    clip pixels that fall outside the head footprint so robe shoulders don't
    poke out beside the head. Below neck_y the robe is unchanged.
    """
    out = img.copy()
    px = out.load()
    w, h = out.size
    for y in range(0, neck_y):
        for x in range(0, w):
            if x < head_x_start or x >= head_x_end:
                px[x, y] = (0, 0, 0, 0)
    return out


def build_bodies() -> int:
    src = LEGACY_ROOT / "shirt" / BODY_SOURCE_SHIRT
    base = upscale_master(src)
    base = _trim_robe_shoulders(base)
    out_dir = wn.TRAITS_DIR / "02_body"
    n = 0
    for trait_name, ramp in BODY_PALETTES.items():
        recolored = wn.recolor_by_brightness(base, ramp)
        save(recolored, out_dir / f"{trait_name}.png")
        n += 1
    return n


# ---------------------------------------------------------------------------
# 03_head — bepe head silhouette recolored across the 8 head color families
# ---------------------------------------------------------------------------

HEAD_PALETTES = {
    "orange_bepe":  ["#FDBA74", "#FF6A00", "#C2410C"],
    "green_bepe":   ["#A3E635", "#22C55E", "#166534"],
    "blue_bepe":    ["#7DD3FC", "#2563EB", "#172554"],
    "purple_bepe":  ["#C4B5FD", "#7E22CE", "#2E1065"],
    "tan_bepe":     ["#F2E9D8", "#E4A672", "#8F563B"],
    "zombie_bepe":  ["#C5DCC9", "#5E7060", "#2E3A2F"],
    "shadow_bepe":  ["#374151", "#1F2937", "#050505"],
    "gold_bepe":    ["#FFE066", "#FFD700", "#7C2D12"],
}


def build_heads() -> int:
    """
    Use Bark Skin (single-color silhouette) as the head shape master.
    To get a 3-shade ramp, we synthesize highlight + shadow regions
    by quartering the silhouette.
    """
    src = LEGACY_ROOT / "face" / "Bark Skin.png"
    base = upscale_master(src)

    out_dir = wn.TRAITS_DIR / "03_head"
    n = 0
    for trait_name, ramp in HEAD_PALETTES.items():
        # Build a 3-tone version: original silhouette is one color.
        # Synthesize tones by region: top 1/3 highlight, middle mid, bottom 1/3 shadow.
        toned = base.copy()
        px = toned.load()
        w, h = toned.size
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                if y < h // 3:
                    px[x, y] = (*wn.hex_to_rgb(ramp[0]), 255)
                elif y < 2 * h // 3:
                    px[x, y] = (*wn.hex_to_rgb(ramp[1]), 255)
                else:
                    px[x, y] = (*wn.hex_to_rgb(ramp[2]), 255)
        save(toned, out_dir / f"{trait_name}.png")
        n += 1
    return n


# ---------------------------------------------------------------------------
# 04_eyes — pixel-art eye styles per rule pack
# ---------------------------------------------------------------------------


def _make_eye_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = wn.new_canvas()
    return img, ImageDraw.Draw(img)


def eye_normal() -> Image.Image:
    img, d = _make_eye_canvas()
    # Two eyes, white sclera + black pupil — placed where a 64x64 face would have eyes
    for cx in (24, 40):
        d.rectangle((cx - 3, 28, cx + 3, 32), fill=(255, 255, 255, 255))
        d.rectangle((cx - 1, 29, cx + 1, 31), fill=(0, 0, 0, 255))
    return img


def eye_tired() -> Image.Image:
    img, d = _make_eye_canvas()
    for cx in (24, 40):
        d.rectangle((cx - 3, 30, cx + 3, 32), fill=(255, 255, 255, 255))
        d.rectangle((cx - 1, 30, cx + 1, 31), fill=(0, 0, 0, 255))
        # heavy lid
        d.line((cx - 3, 29, cx + 3, 29), fill=(0, 0, 0, 255))
    return img


def eye_bloodshot() -> Image.Image:
    img, d = _make_eye_canvas()
    for cx in (24, 40):
        d.rectangle((cx - 3, 28, cx + 3, 32), fill=(255, 200, 200, 255))
        d.rectangle((cx - 1, 29, cx + 1, 31), fill=(180, 0, 0, 255))
    return img


def eye_cross_eyed() -> Image.Image:
    img, d = _make_eye_canvas()
    for cx in (24, 40):
        d.rectangle((cx - 3, 28, cx + 3, 32), fill=(255, 255, 255, 255))
    # pupils crossed inward
    d.rectangle((26, 29, 27, 31), fill=(0, 0, 0, 255))
    d.rectangle((37, 29, 38, 31), fill=(0, 0, 0, 255))
    return img


def eye_one_bigger() -> Image.Image:
    img, d = _make_eye_canvas()
    # Left small eye
    d.rectangle((22, 29, 26, 31), fill=(255, 255, 255, 255))
    d.rectangle((23, 30, 24, 30), fill=(0, 0, 0, 255))
    # Right huge eye
    d.rectangle((36, 26, 44, 34), fill=(255, 255, 255, 255))
    d.rectangle((39, 29, 41, 31), fill=(0, 0, 0, 255))
    return img


def eye_heart_eyes() -> Image.Image:
    img, d = _make_eye_canvas()
    pink = wn.hex_to_rgba("#FF4FD8")
    for cx in (24, 40):
        # tiny pixel hearts
        d.point([(cx - 2, 28), (cx + 2, 28)], fill=pink)
        d.line((cx - 3, 29, cx + 3, 29), fill=pink)
        d.line((cx - 2, 30, cx + 2, 30), fill=pink)
        d.line((cx - 1, 31, cx + 1, 31), fill=pink)
        d.point((cx, 32), fill=pink)
    return img


def eye_glowing_green() -> Image.Image:
    img, d = _make_eye_canvas()
    glow = wn.hex_to_rgba("#39FF14")
    for cx in (24, 40):
        d.rectangle((cx - 3, 28, cx + 3, 32), fill=glow)
        d.rectangle((cx - 1, 29, cx + 1, 31), fill=(255, 255, 255, 255))
    return img


def eye_glowing_orange() -> Image.Image:
    img, d = _make_eye_canvas()
    glow = wn.hex_to_rgba("#FF6A00")
    for cx in (24, 40):
        d.rectangle((cx - 3, 28, cx + 3, 32), fill=glow)
        d.rectangle((cx - 1, 29, cx + 1, 31), fill=(255, 255, 200, 255))
    return img


def eye_laser_blue() -> Image.Image:
    img, d = _make_eye_canvas()
    laser = wn.hex_to_rgba("#2563EB")
    for cx in (24, 40):
        d.rectangle((cx - 3, 28, cx + 3, 32), fill=(255, 255, 255, 255))
        d.rectangle((cx - 1, 29, cx + 1, 31), fill=laser)
        # laser beam shooting forward
        d.line((cx, 30, cx, 63), fill=wn.hex_to_rgba("#7DD3FC", 200))
    return img


EYE_RENDERERS = {
    "normal": eye_normal,
    "tired": eye_tired,
    "bloodshot": eye_bloodshot,
    "cross_eyed": eye_cross_eyed,
    "one_bigger": eye_one_bigger,
    "heart_eyes": eye_heart_eyes,
    "glowing_green": eye_glowing_green,
    "glowing_orange": eye_glowing_orange,
    "laser_blue": eye_laser_blue,
}


def build_eyes() -> int:
    out_dir = wn.TRAITS_DIR / "04_eyes"
    for name, fn in EYE_RENDERERS.items():
        save(fn(), out_dir / f"{name}.png")
    return len(EYE_RENDERERS)


# ---------------------------------------------------------------------------
# 05_mouth — pixel-art mouth styles per rule pack
# ---------------------------------------------------------------------------


def _mouth_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = wn.new_canvas()
    return img, ImageDraw.Draw(img)


BLACK = (0, 0, 0, 255)


def mouth_grin() -> Image.Image:
    img, d = _mouth_canvas()
    for x in range(28, 37):
        d.point((x, 42), fill=BLACK)
    d.point((27, 41), fill=BLACK)
    d.point((37, 41), fill=BLACK)
    return img


def mouth_smirk() -> Image.Image:
    img, d = _mouth_canvas()
    for x in range(28, 35):
        d.point((x, 42), fill=BLACK)
    d.point((35, 41), fill=BLACK)
    d.point((36, 40), fill=BLACK)
    return img


def mouth_small_frown() -> Image.Image:
    img, d = _mouth_canvas()
    for x in range(29, 36):
        d.point((x, 42), fill=BLACK)
    d.point((28, 43), fill=BLACK)
    d.point((36, 43), fill=BLACK)
    return img


def mouth_big_goofy_grin() -> Image.Image:
    img, d = _mouth_canvas()
    d.rectangle((26, 41, 38, 45), outline=BLACK)
    for x in range(27, 38):
        d.point((x, 42), fill=(255, 255, 255, 255))
    return img


def mouth_angry_curve() -> Image.Image:
    img, d = _mouth_canvas()
    for x in range(28, 37):
        d.point((x, 43), fill=BLACK)
    d.point((27, 42), fill=BLACK)
    d.point((37, 42), fill=BLACK)
    return img


def mouth_tongue_out() -> Image.Image:
    img, d = _mouth_canvas()
    d.rectangle((28, 41, 36, 43), outline=BLACK)
    d.rectangle((30, 43, 33, 47), fill=wn.hex_to_rgba("#FF4FD8"))
    return img


def mouth_slight_open_uhhh() -> Image.Image:
    img, d = _mouth_canvas()
    d.rectangle((30, 41, 34, 44), outline=BLACK)
    d.rectangle((31, 42, 33, 43), fill=wn.hex_to_rgba("#2A1810"))
    return img


def mouth_teeth_grit() -> Image.Image:
    img, d = _mouth_canvas()
    d.rectangle((27, 41, 37, 44), fill=(255, 255, 255, 255))
    d.rectangle((27, 41, 37, 44), outline=BLACK)
    for x in range(29, 37, 2):
        d.line((x, 41, x, 44), fill=BLACK)
    return img


def mouth_cigarette_hang() -> Image.Image:
    img, d = _mouth_canvas()
    for x in range(28, 35):
        d.point((x, 42), fill=BLACK)
    # cigarette body
    d.rectangle((35, 42, 44, 43), fill=(245, 245, 220, 255))
    d.rectangle((44, 42, 46, 43), fill=wn.hex_to_rgba("#FF3D00"))
    # smoke wisp
    d.point([(46, 40), (47, 38), (48, 36)], fill=(200, 200, 200, 200))
    return img


def mouth_gold_tooth_grin() -> Image.Image:
    img, d = _mouth_canvas()
    d.rectangle((26, 41, 38, 45), outline=BLACK)
    for x in range(27, 38):
        d.point((x, 42), fill=(255, 255, 255, 255))
    d.rectangle((30, 42, 31, 44), fill=wn.hex_to_rgba("#FFD700"))
    return img


MOUTH_RENDERERS = {
    "grin": mouth_grin,
    "smirk": mouth_smirk,
    "small_frown": mouth_small_frown,
    "big_goofy_grin": mouth_big_goofy_grin,
    "angry_curve": mouth_angry_curve,
    "tongue_out": mouth_tongue_out,
    "slight_open_uhhh": mouth_slight_open_uhhh,
    "teeth_grit": mouth_teeth_grit,
    "cigarette_hang": mouth_cigarette_hang,
    "gold_tooth_grin": mouth_gold_tooth_grin,
}


def build_mouths() -> int:
    out_dir = wn.TRAITS_DIR / "05_mouth"
    for name, fn in MOUTH_RENDERERS.items():
        save(fn(), out_dir / f"{name}.png")
    return len(MOUTH_RENDERERS)


# ---------------------------------------------------------------------------
# 06_facial_hair — map legacy beards onto rule-pack styles
# ---------------------------------------------------------------------------

# Map rule-pack style → legacy file (one representative shape per style)
FACIAL_HAIR_SOURCE = {
    "short_beard": "Goatee_Black#22.png",
    "long_wizard_beard": "Long_Pointy_White_Gray#8.png",
    "curled_mustache": "Chin_Strap_Brown#9.png",
    "braided_beard": "Long_Braid_Brown#12.png",
    # glowing/void are overlays of long wizard beard
    "glowing_beard": "Long_Pointy_White_Gray#8.png",
    "void_beard": "Long_Pointy_Black#22.png",
}

# Three-shade ramps for each style
FACIAL_HAIR_PALETTES = {
    "short_beard": ["#5D2C28", "#3E1C1A", "#1F0E0D"],
    "long_wizard_beard": ["#F8FAFC", "#D1D9E6", "#94A3B8"],
    "curled_mustache": ["#8D624C", "#664433", "#442211"],
    "braided_beard": ["#8D624C", "#5D2C28", "#3E1C1A"],
    "glowing_beard": ["#39FF14", "#22C55E", "#166534"],
    "void_beard": ["#7E22CE", "#2E1065", "#050505"],
}


def build_facial_hair() -> int:
    out_dir = wn.TRAITS_DIR / "06_facial_hair"
    n = 0
    # rule pack also has "none" — emit empty PNG
    save(wn.new_canvas(), out_dir / "none.png")
    n += 1
    for style, src_name in FACIAL_HAIR_SOURCE.items():
        src = LEGACY_ROOT / "facial hair" / src_name
        if not src.exists():
            print(f"   ! facial hair source missing: {src_name}")
            continue
        base = upscale_master(src)
        recolored = wn.recolor_by_brightness(base, FACIAL_HAIR_PALETTES[style])
        save(recolored, out_dir / f"{style}.png")
        n += 1
    return n


# ---------------------------------------------------------------------------
# 07_face_accessory — legacy glasses recolored to rule-pack styles
# ---------------------------------------------------------------------------

FACE_ACCESSORY_SOURCE = {
    "yellow_glasses": "Astral Focus.png",
    "sunglasses": "Abyssal Shades.png",
    "round_wizard_specs": "Mystic Gaze.png",
    "vr_visor": "Tempest Visors.png",
    "monocle": "Oracle Orbs.png",
    "cracked_lens": "Glamour Glass.png",
}

FACE_ACCESSORY_PALETTES = {
    "yellow_glasses": ["#FFFF00", "#CCAA00"],
    "sunglasses": ["#1F2937", "#050505"],
    "round_wizard_specs": ["#7DD3FC", "#1D4ED8"],
    "vr_visor": ["#39FF14", "#166534"],
    "monocle": ["#FFD700", "#7C2D12"],
    "cracked_lens": ["#F8FAFC", "#374151"],
}


def build_face_accessories() -> int:
    out_dir = wn.TRAITS_DIR / "07_face_accessory"
    n = 0
    save(wn.new_canvas(), out_dir / "none.png")
    n += 1
    for style, src_name in FACE_ACCESSORY_SOURCE.items():
        src = LEGACY_ROOT / "glasses" / src_name
        if not src.exists():
            print(f"   ! glasses source missing: {src_name}")
            continue
        base = upscale_master(src)
        recolored = wn.recolor_by_brightness(
            base, FACE_ACCESSORY_PALETTES[style], transparent_top=True
        )
        save(recolored, out_dir / f"{style}.png")
        n += 1
    return n


# ---------------------------------------------------------------------------
# 08_headwear — legacy wizard hats recolored, plus halo/crown procedural
# ---------------------------------------------------------------------------

HEADWEAR_SOURCE = {
    "classic_wizard_hat": "Arcane Mage.png",
    "bent_wizard_hat": "Chaos Weaver.png",
    "orange_paragon_hat": "Pyromancer.png",
    # `hood` is drawn procedurally below — no legacy source
}

HEADWEAR_PALETTES = {
    "classic_wizard_hat": ["#C4B5FD", "#7E22CE", "#2E1065"],
    "bent_wizard_hat": ["#A3E635", "#22C55E", "#166534"],
    "orange_paragon_hat": ["#FFD700", "#FF6A00", "#C2410C"],
}


def _draw_hood() -> Image.Image:
    """A pixel-art cowl: drapes over the head and onto the shoulders."""
    img = wn.new_canvas()
    d = ImageDraw.Draw(img)
    fabric = wn.hex_to_rgba("#1F2937")
    shadow = wn.hex_to_rgba("#0B1220")
    hi = wn.hex_to_rgba("#374151")
    # Crown of hood (above head): rounded peak from y=14 down to head top
    for y, half in zip(range(14, 26), [4, 6, 8, 10, 12, 13, 14, 15, 16, 17, 18, 19]):
        d.rectangle((32 - half, y, 32 + half - 1, y), fill=fabric)
    # Side drape down past the head onto shoulders
    for y in range(26, 50):
        d.rectangle((11, y, 18, y), fill=fabric)   # left drape
        d.rectangle((45, y, 52, y), fill=fabric)   # right drape
    # Shoulder cowl
    for y in range(46, 52):
        d.rectangle((11, y, 52, y), fill=fabric)
    # Highlight stripe
    for y in range(15, 26):
        d.point((32 - (y - 13), y), fill=hi)
    # Inner shadow at hood opening (frames the face)
    for y in range(24, 44):
        d.point((19, y), fill=shadow)
        d.point((44, y), fill=shadow)
    return img


def _draw_tiny_crown() -> Image.Image:
    img = wn.new_canvas()
    d = ImageDraw.Draw(img)
    gold = wn.hex_to_rgba("#FFD700")
    # crown band
    d.rectangle((20, 14, 44, 17), fill=gold)
    # spikes
    for x in (22, 28, 32, 36, 42):
        d.rectangle((x - 1, 10, x + 1, 14), fill=gold)
    # gems
    d.point((28, 16), fill=wn.hex_to_rgba("#FF3D00"))
    d.point((32, 16), fill=wn.hex_to_rgba("#39FF14"))
    d.point((36, 16), fill=wn.hex_to_rgba("#2563EB"))
    return img


def _draw_halo() -> Image.Image:
    img = wn.new_canvas()
    d = ImageDraw.Draw(img)
    gold = wn.hex_to_rgba("#FFD700")
    d.ellipse((18, 6, 46, 12), outline=gold)
    d.ellipse((19, 7, 45, 11), outline=wn.hex_to_rgba("#F8FAFC", 220))
    return img


def build_headwear() -> int:
    out_dir = wn.TRAITS_DIR / "08_headwear"
    n = 0
    save(wn.new_canvas(), out_dir / "none.png")
    n += 1
    for style, src_name in HEADWEAR_SOURCE.items():
        src = LEGACY_ROOT / "wizard hat" / src_name
        if not src.exists():
            print(f"   ! hat source missing: {src_name}")
            continue
        base = upscale_master(src)
        recolored = wn.recolor_by_brightness(base, HEADWEAR_PALETTES[style])
        save(recolored, out_dir / f"{style}.png")
        n += 1
    save(_draw_tiny_crown(), out_dir / "tiny_crown.png")
    save(_draw_halo(), out_dir / "halo.png")
    save(_draw_hood(), out_dir / "hood.png")
    n += 3
    return n


# ---------------------------------------------------------------------------
# 09_hand_item — procedural pixel-art items
# ---------------------------------------------------------------------------


def hand_none() -> Image.Image:
    return wn.new_canvas()


def hand_wand() -> Image.Image:
    img = wn.new_canvas()
    d = ImageDraw.Draw(img)
    wood = wn.hex_to_rgba("#8D624C")
    tip = wn.hex_to_rgba("#F8FAFC")
    glow = wn.hex_to_rgba("#9333EA")
    # diagonal wand
    for i in range(10):
        d.point((48 - i, 50 + i), fill=wood)
    d.point((38, 60), fill=tip)
    d.point([(37, 60), (39, 60), (38, 59), (38, 61)], fill=glow)
    return img


def hand_spell_book() -> Image.Image:
    img = wn.new_canvas()
    d = ImageDraw.Draw(img)
    cover = wn.hex_to_rgba("#7E22CE")
    pages = wn.hex_to_rgba("#F8FAFC")
    binding = wn.hex_to_rgba("#FFD700")
    d.rectangle((42, 48, 56, 60), fill=cover)
    d.rectangle((43, 49, 55, 59), fill=pages)
    d.line((49, 48, 49, 60), fill=binding)
    return img


def hand_potion() -> Image.Image:
    img = wn.new_canvas()
    d = ImageDraw.Draw(img)
    glass = wn.hex_to_rgba("#7DD3FC")
    cork = wn.hex_to_rgba("#8D624C")
    liquid = wn.hex_to_rgba("#39FF14")
    # bottle
    d.rectangle((46, 52, 52, 60), fill=glass)
    d.rectangle((47, 54, 51, 59), fill=liquid)
    d.rectangle((47, 50, 51, 52), fill=glass)
    d.rectangle((48, 48, 50, 50), fill=cork)
    return img


def hand_orb() -> Image.Image:
    img = wn.new_canvas()
    d = ImageDraw.Draw(img)
    inner = wn.hex_to_rgba("#7DD3FC")
    outer = wn.hex_to_rgba("#2563EB")
    glow = wn.hex_to_rgba("#F8FAFC", 200)
    d.ellipse((42, 46, 56, 60), fill=outer)
    d.ellipse((44, 48, 54, 58), fill=inner)
    d.point([(46, 50), (47, 50), (46, 51)], fill=glow)
    return img


def hand_marmot_familiar() -> Image.Image:
    img = wn.new_canvas()
    d = ImageDraw.Draw(img)
    fur = wn.hex_to_rgba("#8D624C")
    belly = wn.hex_to_rgba("#F2E9D8")
    eye = (0, 0, 0, 255)
    # body
    d.rectangle((44, 52, 56, 60), fill=fur)
    d.rectangle((46, 56, 54, 60), fill=belly)
    # head
    d.rectangle((46, 48, 54, 53), fill=fur)
    # ears
    d.point([(46, 47), (53, 47)], fill=fur)
    # eyes
    d.point([(48, 50), (52, 50)], fill=eye)
    return img


def hand_orange_staff() -> Image.Image:
    img = wn.new_canvas()
    d = ImageDraw.Draw(img)
    wood = wn.hex_to_rgba("#C2410C")
    crystal = wn.hex_to_rgba("#FF6A00")
    glow = wn.hex_to_rgba("#FFD700")
    for y in range(30, 62):
        d.point((48, y), fill=wood)
    # crystal head
    d.rectangle((45, 26, 51, 31), fill=crystal)
    d.point([(44, 27), (44, 28), (52, 27), (52, 28), (48, 25)], fill=glow)
    return img


HAND_RENDERERS = {
    "none": hand_none,
    "wand": hand_wand,
    "spell_book": hand_spell_book,
    "potion": hand_potion,
    "orb": hand_orb,
    "marmot_familiar": hand_marmot_familiar,
    "orange_staff": hand_orange_staff,
}


def build_hand_items() -> int:
    out_dir = wn.TRAITS_DIR / "09_hand_item"
    for name, fn in HAND_RENDERERS.items():
        save(fn(), out_dir / f"{name}.png")
    return len(HAND_RENDERERS)


# ---------------------------------------------------------------------------
# 10_magic_overlay — procedural overlays (shipped from wiznerdz module)
# ---------------------------------------------------------------------------


def build_overlays() -> int:
    out_dir = wn.TRAITS_DIR / "10_magic_overlay"
    for name, fn in wn.MAGIC_OVERLAY_RENDERERS.items():
        save(fn(), out_dir / f"{name}.png")
    return len(wn.MAGIC_OVERLAY_RENDERERS)


# ---------------------------------------------------------------------------
# Background effects (separate file set, used by generator)
# ---------------------------------------------------------------------------


def build_bg_effects() -> int:
    out_dir = wn.TRAITS_DIR / "01b_background_effect"
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, fn in wn.BG_EFFECT_RENDERERS.items():
        save(fn(), out_dir / f"{name}.png")
    return len(wn.BG_EFFECT_RENDERERS)


# ---------------------------------------------------------------------------
# Logo + legacy preservation
# ---------------------------------------------------------------------------


def copy_logo() -> int:
    src = LEGACY_PROJECT / "logo" / "logo.png"
    if not src.exists():
        return 0
    img = upscale_master(src)
    save(img, wn.TRAITS_DIR / "_logo" / "logo.png")
    return 1


def preserve_legacy_sources() -> int:
    """Mirror the clean 32x32 source masters under traits/_legacy_sources/ for reference."""
    dst_root = wn.TRAITS_DIR / "_legacy_sources"
    n = 0
    for cat in ["Background", "eyes", "face", "facial hair", "glasses", "mouth", "shirt", "wizard hat"]:
        src_dir = LEGACY_ROOT / cat
        if not src_dir.exists():
            continue
        dst_dir = dst_root / cat
        dst_dir.mkdir(parents=True, exist_ok=True)
        for f in src_dir.glob("*.png"):
            shutil.copy2(f, dst_dir / f.name)
            n += 1
    return n


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    print("Building 64x64 trait library from rule pack + legacy sources...")
    print(f"  01_background          : {build_backgrounds()} variants")
    print(f"  01b_background_effect  : {build_bg_effects()} variants")
    print(f"  02_body                : {build_bodies()} variants")
    print(f"  03_head                : {build_heads()} variants")
    print(f"  04_eyes                : {build_eyes()} variants")
    print(f"  05_mouth               : {build_mouths()} variants")
    print(f"  06_facial_hair         : {build_facial_hair()} variants")
    print(f"  07_face_accessory      : {build_face_accessories()} variants")
    print(f"  08_headwear            : {build_headwear()} variants")
    print(f"  09_hand_item           : {build_hand_items()} variants")
    print(f"  10_magic_overlay       : {build_overlays()} variants")
    print(f"  _logo                  : {copy_logo()} files")
    print(f"  _legacy_sources mirror : {preserve_legacy_sources()} files copied")
    print("Done.")


if __name__ == "__main__":
    main()
