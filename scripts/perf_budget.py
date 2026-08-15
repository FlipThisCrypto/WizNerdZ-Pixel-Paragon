#!/usr/bin/env python3
"""Static asset size budgets for landing shell (scale / cost control)."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1] / "docs"
budgets = {
    "index.html": 120_000,
    "js/config.js": 8_000,
    "js/wallet.js": 20_000,
    "js/mint-page.js": 28_000,
    "js/wallet-core.js": 8_000,
    "js/sealed-boxes.js": 10_000,
    "css/tokens.css": 5_000,
    "sw.js": 5_000,
}
bad = []
for rel, limit in budgets.items():
    p = ROOT / rel
    if not p.is_file():
        bad.append(f"missing {rel}")
        continue
    n = p.stat().st_size
    print(f"{rel}: {n} / {limit}")
    if n > limit:
        bad.append(f"{rel} {n}>{limit}")
print("budget problems", len(bad))
sys.exit(1 if bad else 0)
