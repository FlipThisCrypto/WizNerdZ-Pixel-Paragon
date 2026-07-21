#!/usr/bin/env python3
"""Verify CHIP-0007 metadata integrity for WizNerdZ Pages docs/."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
META = ROOT / "docs" / "metadata"
IMAGES = ROOT / "docs" / "images"
BASE = "https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon"
TOTAL = 8888


def main() -> int:
    bad: list[str] = []
    if not META.is_dir():
        print("FAIL: missing", META)
        return 1
    for i in range(1, TOTAL + 1):
        p = META / f"{i}.json"
        if not p.is_file():
            bad.append(f"missing meta {i}")
            continue
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            bad.append(f"json {i}: {e}")
            continue
        expect = f"{BASE}/images/{i}.png"
        if d.get("series_number") != i:
            bad.append(f"series_number {i}={d.get('series_number')}")
        if d.get("image") != expect:
            bad.append(f"image root {i}")
        if d.get("data", {}).get("image") != expect:
            bad.append(f"data.image {i}")
        if d.get("format") != "CHIP-0007":
            bad.append(f"format {i}")
        if not (IMAGES / f"{i}.png").is_file():
            bad.append(f"missing png {i}")
    print(f"checked {TOTAL} tokens")
    print(f"problems {len(bad)}")
    for line in bad[:30]:
        print(" ", line)
    if len(bad) > 30:
        print(f"  ... +{len(bad) - 30} more")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
