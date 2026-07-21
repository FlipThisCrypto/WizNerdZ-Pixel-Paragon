#!/usr/bin/env python3
"""Verify named specials exist as images + placements match specials.json."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"


def main() -> int:
    specials = json.loads((DOCS / "specials.json").read_text(encoding="utf-8"))[
        "specials"
    ]
    raw = json.loads((DOCS / "special_placements.json").read_text(encoding="utf-8"))
    if "all" in raw and isinstance(raw["all"], dict):
        placements = raw["all"]
    elif "special_placements" in raw:
        placements = raw["special_placements"]
    else:
        placements = raw
    bad: list[str] = []
    for s in specials:
        sid = str(s["id"])
        if sid not in placements:
            bad.append(f"placement missing for #{s['id']}")
        for path in (
            DOCS / "images" / f"{s['id']}.png",
            DOCS / "specials" / f"{s['file']}.png",
            DOCS / "metadata" / f"{s['id']}.json",
        ):
            if not path.is_file():
                bad.append(f"missing {path.relative_to(ROOT)}")
        meta = json.loads((DOCS / "metadata" / f"{s['id']}.json").read_text(encoding="utf-8"))
        rarity = next(
            (a.get("value") for a in meta.get("attributes", []) if a.get("trait_type") == "Rarity"),
            None,
        )
        if rarity and rarity != "1 of 1":
            bad.append(f"#{s['id']} rarity={rarity} expected 1 of 1")
    print(f"specials {len(specials)} problems {len(bad)}")
    for b in bad:
        print(" ", b)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
