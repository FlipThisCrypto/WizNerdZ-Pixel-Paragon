#!/usr/bin/env python3
"""Build full images/ SHA-256 manifest (ops / DR). Writes docs/integrity-images-full.json"""
import hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
img = ROOT / "docs" / "images"
out = []
for i in range(1, 8889):
    p = img / f"{i}.png"
    if not p.is_file():
        raise SystemExit(f"missing {p}")
    b = p.read_bytes()
    out.append({"id": i, "sha256": hashlib.sha256(b).hexdigest(), "bytes": len(b)})
    if i % 1000 == 0:
        print("hashed", i)
path = ROOT / "docs" / "integrity-images-full.json"
path.write_text(json.dumps({"algorithm": "sha256", "count": len(out), "images": out}), encoding="utf-8")
print("wrote", path, "entries", len(out))
