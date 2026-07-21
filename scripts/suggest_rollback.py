#!/usr/bin/env python3
"""Print safe rollback commands for the last N commits (no execution)."""
import subprocess, sys
n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
log = subprocess.check_output(
    ["git", "log", f"-{n}", "--format=%h %s"], text=True
)
print("Recent commits:\n" + log)
print("Safe rollback (creates reverse commits):")
for line in log.strip().splitlines():
    h = line.split()[0]
    print(f"  git revert {h} --no-edit")
print("Then: git push origin main")
print("Never: git push --force")
