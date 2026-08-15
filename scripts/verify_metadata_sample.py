#!/usr/bin/env python3
"""Fast sample contract checks across CHIP-0007 metadata."""
import json, random, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
META = ROOT / "docs" / "metadata"
BASE = "https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon"
SAMPLES = [1, 42, 787, 1000, 5000, 8888] + random.Random(42).sample(range(1, 8889), 20)
bad = []
for i in SAMPLES:
    p = META / f"{i}.json"
    d = json.loads(p.read_text(encoding="utf-8"))
    if d.get("format") != "CHIP-0007":
        bad.append(f"{i} format")
    if d.get("series_total") != 8888:
        bad.append(f"{i} series_total")
    if not isinstance(d.get("attributes"), list) or not d["attributes"]:
        bad.append(f"{i} attributes")
    GATEWAY = "https://defiant-black-skink.myfilebase.com/ipfs/"
    img = d.get("image")
    if not (isinstance(img, str) and img.startswith(GATEWAY)) or img != d.get("data", {}).get("image"):
        bad.append(f"{i} image url")
print("samples", len(SAMPLES), "problems", len(bad))
for b in bad[:20]:
    print(" ", b)
sys.exit(1 if bad else 0)
