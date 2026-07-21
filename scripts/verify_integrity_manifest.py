#!/usr/bin/env python3
import hashlib, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
man = json.loads((ROOT / "docs" / "integrity-manifest.json").read_text(encoding="utf-8"))
bad = []
for group in ("specials", "samples"):
    for row in man.get(group, []):
        p = ROOT / "docs" / row["path"]
        if not p.is_file():
            bad.append("missing " + row["path"])
            continue
        h = hashlib.sha256(p.read_bytes()).hexdigest()
        if h != row["sha256"]:
            bad.append("hash mismatch " + row["path"])
        if p.stat().st_size != row.get("bytes"):
            bad.append("size mismatch " + row["path"])
print("integrity problems", len(bad))
for b in bad[:20]:
    print(" ", b)
sys.exit(1 if bad else 0)
