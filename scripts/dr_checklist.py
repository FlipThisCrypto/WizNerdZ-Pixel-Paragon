#!/usr/bin/env python3
"""Disaster recovery preflight — fails if critical local artifacts missing."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
checks = [
    ROOT / "docs" / "index.html",
    ROOT / "docs" / "health.json",
    ROOT / "docs" / "collection.json",
    ROOT / "docs" / "specials.json",
    ROOT / "docs" / "integrity-manifest.json",
    ROOT / "docs" / "js" / "config.js",
    ROOT / "docs" / "metadata" / "1.json",
    ROOT / "docs" / "metadata" / "8888.json",
    ROOT / "docs" / "images" / "1.png",
    ROOT / "docs" / "images" / "42.png",
    ROOT / "docs" / "OPS.md",
    ROOT / "scripts" / "verify_metadata.py",
]
bad = [str(p.relative_to(ROOT)) for p in checks if not p.exists()]
print("DR checklist missing", len(bad))
for b in bad:
    print(" ", b)
print("OK" if not bad else "FAIL")
sys.exit(1 if bad else 0)
