#!/usr/bin/env python3
"""DNA uniqueness scan — generative tokens only (named specials may omit dna)."""
import json
import sys
from pathlib import Path

META = Path(__file__).resolve().parents[1] / "docs" / "metadata"
SPECIALS = {42, 787, 2264, 3736, 5625, 6146, 6949, 7462, 8483, 8700}
seen = {}
bad = []
for i in range(1, 2001):
    if i in SPECIALS:
        continue
    d = json.loads((META / f"{i}.json").read_text(encoding="utf-8"))
    dna = (d.get("data") or {}).get("dna")
    if not dna:
        bad.append(f"{i} missing dna")
        continue
    if dna in seen:
        bad.append(f"dup dna {seen[dna]} and {i}")
    else:
        seen[dna] = i
print("scanned generative dna unique", len(seen), "problems", len(bad))
for b in bad[:20]:
    print(" ", b)
sys.exit(1 if bad else 0)
