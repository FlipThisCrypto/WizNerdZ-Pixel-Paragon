#!/usr/bin/env python3
import json, sys
from pathlib import Path
META = Path(__file__).resolve().parents[1] / "docs" / "metadata"
missing = [i for i in range(1, 8889) if not (META / f"{i}.json").is_file()]
bad_sn = []
for i in (1, 42, 1000, 4444, 8888):
    d = json.loads((META / f"{i}.json").read_text(encoding="utf-8"))
    if d.get("series_number") != i or d.get("series_total") != 8888:
        bad_sn.append(i)
print("missing files", len(missing), "bad series fields", bad_sn)
sys.exit(1 if missing or bad_sn else 0)
