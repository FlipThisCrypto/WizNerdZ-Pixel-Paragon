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
        # Contract since the IPFS migration: both image fields identical and
        # pointing at the Filebase gateway (the hash-committed bytes). The old
        # Pages-URL expectation predates the migration and failed all 8,888.
        GATEWAY = "https://defiant-black-skink.myfilebase.com/ipfs/"
        img = d.get("image")
        dimg = d.get("data", {}).get("image")
        if d.get("series_number") != i:
            bad.append(f"series_number {i}={d.get('series_number')}")
        if not (isinstance(img, str) and img.startswith(GATEWAY)):
            bad.append(f"image root {i}: not gateway url")
        if img != dimg:
            bad.append(f"image mismatch {i}: root != data.image")
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
