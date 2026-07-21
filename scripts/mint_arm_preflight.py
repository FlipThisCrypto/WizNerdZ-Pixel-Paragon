#!/usr/bin/env python3
"""Refuse mint arming if mint.enabled true without offer URLs."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
cfg = (ROOT / "docs" / "js" / "config.js").read_text(encoding="utf-8")
# Extract mint: { ... } block (non-greedy until next top-level-ish close)
m = re.search(r"mint:\s*\{(.*?)\n\s*\},", cfg, re.S)
mint_block = m.group(1) if m else ""
enabled = bool(re.search(r"enabled:\s*true", mint_block))
problems = []
if enabled:
    if re.search(r'mintgardenUrl:\s*""', mint_block) and re.search(
        r'offerUrl:\s*""', mint_block
    ):
        problems.append("mint enabled but no offer/mintgarden URL")
for rel in [
    "docs/GOVERNANCE.md",
    "docs/RELEASE_CHECKLIST.md",
    "scripts/verify_metadata.py",
]:
    if not (ROOT / rel).exists():
        problems.append("missing " + rel)
print("mint enabled", enabled, "problems", len(problems))
for p in problems:
    print(" ", p)
# Fail only if mint is armed incorrectly, or required docs missing
sys.exit(1 if problems else 0)
