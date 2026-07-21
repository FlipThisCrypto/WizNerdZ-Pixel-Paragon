#!/usr/bin/env python3
"""Local metadata parse load sample — measures JSON parse throughput."""
import json, time
from pathlib import Path
META = Path(__file__).resolve().parents[1] / "docs" / "metadata"
ids = list(range(1, 501))
t0 = time.perf_counter()
n = 0
for i in ids:
    json.loads((META / f"{i}.json").read_text(encoding="utf-8"))
    n += 1
dt = time.perf_counter() - t0
print(f"parsed {n} files in {dt:.3f}s ({n/dt:.1f} files/s)")
if dt > 30:
    raise SystemExit("too slow")
