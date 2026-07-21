#!/usr/bin/env python3
"""Verify PNG IHDR 640x640 for critical samples (no Pillow required)."""
import struct, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1] / "docs"
samples = [ROOT / "images" / f"{i}.png" for i in (1, 42, 787, 1000, 8888)]
samples += list((ROOT / "specials").glob("*.png"))[:15]
bad = []
for p in samples:
    if not p.is_file():
        continue
    data = p.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        bad.append(f"{p.name} not png")
        continue
    # IHDR is first chunk
    length = struct.unpack(">I", data[8:12])[0]
    ctype = data[12:16]
    if ctype != b"IHDR":
        bad.append(f"{p.name} no IHDR")
        continue
    w, h = struct.unpack(">II", data[16:24])
    if (w, h) != (640, 640):
        bad.append(f"{p.name} {w}x{h}")
print("dimension problems", len(bad))
for b in bad[:20]:
    print(" ", b)
sys.exit(1 if bad else 0)
