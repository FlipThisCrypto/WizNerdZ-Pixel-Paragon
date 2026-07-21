#!/usr/bin/env python3
"""Ensure generative tokens carry required trait_types."""
import json, random, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
META = ROOT / "docs" / "metadata"
REQUIRED = {"Background", "Face", "Eyes", "Class", "Shirt", "Wizard Hat", "Rarity"}
specials = {42, 787, 2264, 3736, 5625, 6146, 6949, 7462, 8483, 8700}
ids = [i for i in random.Random(7).sample(range(1, 8889), 40) if i not in specials]
ids += [1, 100, 1000, 5000, 8888]
bad = []
for i in ids:
    d = json.loads((META / f"{i}.json").read_text(encoding="utf-8"))
    types = {a.get("trait_type") for a in d.get("attributes", [])}
    missing = REQUIRED - types
    if missing:
        bad.append(f"{i} missing {sorted(missing)}")
print("checked", len(ids), "problems", len(bad))
for b in bad[:15]:
    print(" ", b)
sys.exit(1 if bad else 0)
