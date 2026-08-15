#!/usr/bin/env python3
"""Generate ground-truth CLVM integer-encoding fixtures from Chia's own
encoder (Program.to(int).atom), for the watcher's coin-id derivation tests.

    python scripts/gen_clvm_fixtures.py > tests/fixtures/clvm_int_fixtures.json

The corpus targets where encoding bugs live: every byte-length transition,
sign-padding edges (high-bit boundaries), the real tier prices in mojos,
and powers of two +/-1 through 2^64 - the full range coin amounts occupy.
"""
import json
import sys

from chia.types.blockchain_format.program import Program

values = set()

# byte-length + sign-pad transitions: around 2^(8k-1) and 2^(8k)
for k in range(1, 9):
    for base in (2 ** (8 * k - 1), 2 ** (8 * k)):
        for d in (-2, -1, 0, 1, 2):
            v = base + d
            if v >= 0:
                values.add(v)

# powers of two +/-1 through 2^64
for p in range(0, 65):
    for d in (-1, 0, 1):
        v = 2 ** p + d
        if v >= 0:
            values.add(v)

# the real tier prices (mojos) and their neighborhoods
MOJOS = 10 ** 12
for price in (100_000, int(0.15 * MOJOS), int(0.5 * MOJOS), 1 * MOJOS, 2 * MOJOS, 5 * MOJOS):
    for d in (-1, 0, 1):
        values.add(price + d)

# dense low range where most amounts live (every value 0..1024)
values.update(range(0, 1025))

# a deterministic spread across the full u64 space
x = 0x9E3779B97F4A7C15
for i in range(1, 1500):
    values.add((i * x) % (2 ** 64))

fixtures = [{"v": str(v), "hex": Program.to(v).atom.hex()} for v in sorted(values)]
json.dump({"source": "chia Program.to(int).atom", "count": len(fixtures), "fixtures": fixtures},
          sys.stdout, separators=(",", ":"))
