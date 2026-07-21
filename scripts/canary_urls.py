#!/usr/bin/env python3
"""Optional live canary — HEAD/GET public Pages URLs (network)."""
import json, sys, urllib.request
BASE = "https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon"
paths = ["/", "/health.json", "/collection.json", "/metadata/1.json", "/images/1.png", "/specials.json"]
bad = []
for path in paths:
    url = BASE + path
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=20) as r:
            code = r.status
            if code != 200:
                bad.append(f"{path} HTTP {code}")
            else:
                print("ok", path, r.headers.get("Content-Type", ""))
    except Exception as e:
        bad.append(f"{path} {e}")
print("canary problems", len(bad))
for b in bad:
    print(" ", b)
sys.exit(1 if bad else 0)
