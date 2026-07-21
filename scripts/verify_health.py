#!/usr/bin/env python3
import json, sys
from pathlib import Path
p = Path(__file__).resolve().parents[1] / "docs" / "health.json"
d = json.loads(p.read_text(encoding="utf-8"))
bad = []
if d.get("status") != "ok":
    bad.append("status")
if d.get("collection", {}).get("series_total") != 8888:
    bad.append("series_total")
for k in ("home", "token", "collection"):
    if k not in d.get("endpoints", {}):
        bad.append("endpoint " + k)
print("health problems", len(bad), bad)
sys.exit(1 if bad else 0)
