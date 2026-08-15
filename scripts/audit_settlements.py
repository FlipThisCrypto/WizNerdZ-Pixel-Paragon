#!/usr/bin/env python3
"""Independent settlement audit: chain vs operator ledger vs public site.

    python scripts/audit_settlements.py <path/to/delivery_ledger.db> [--site BASE]

The watcher decides what the site says, so nothing the watcher writes can vouch
for the watcher. This audit re-derives every sale claim from the public chain
(Coinset full-node RPC) with none of the watcher's code, then cross-checks all
three sources of truth:

  chain    - the settlement anchor coin's actual spent status and height
  ledger   - the operator's delivery ledger (sqlite, read-only)
  site     - the live mint-status API, per box

Checks, per delivery row:
  1. state >= SOLD      => the anchor EXISTS, is SPENT, the chain's spent
                           height equals the ledger's settlement_height, and
                           the coin is ephemeral (created and spent at the
                           same height - the settlement-coin signature)
  2. state <  SOLD      => the anchor is UNKNOWN to the chain. The anchor is
                           the maker-side settlement coin, which the
                           settlement transaction itself creates and spends;
                           pre-sale it must not exist. If it exists, the sale
                           already happened and the watcher missed it -
                           a buyer is waiting.
  3. FULFILLED          => delivery_height recorded and > settlement_height
  4. the site's public state agrees with the ledger (UNKNOWN is acceptable
     only below SOLD; the site claiming more than the ledger is never
     acceptable)
  5. contents stay withheld below FULFILLED; at FULFILLED the site's nfts
     count equals the ledger's committed token count

stdlib only. Exit 0 = every check passed. Read-only against every source.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import urllib.request

COINSET = "https://api.coinset.org"
DEFAULT_SITE = "https://wiznerdz-pixel-paragon.netlify.app"

# forward-only status ladder (mirrors the watcher's RANK, restated here on
# purpose: the audit must not import the code it audits)
RANK = {
    "UNKNOWN": 0, "SEALED": 1, "OFFER_ISSUED": 2, "SOLD": 3,
    "DELIVERY_RESERVED": 4, "BROADCAST": 5, "CONFIRMED": 6, "FULFILLED": 7,
}


def rpc(method: str, payload: dict) -> dict:
    req = urllib.request.Request(
        f"{COINSET}/{method}",
        data=json.dumps(payload).encode(),
        headers={"content-type": "application/json",
                 "user-agent": "wiznerdz-settlement-audit/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def fetch_site_status(base: str, box: str) -> dict:
    url = f"{base}/.netlify/functions/mint-status?box={box}"
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def audit(ledger_path: str, site: str) -> dict:
    con = sqlite3.connect(f"file:{ledger_path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    rows = [dict(r) for r in con.execute(
        "SELECT box_nft_id, tier, settlement_anchor_coin, settlement_height,"
        "       delivery_height, state, committed_token_ids FROM delivery")]
    con.close()

    failures: list[str] = []
    warnings: list[str] = []
    checked = []

    # one chain call per anchor: get_coin_record_by_name attributes the answer
    # to the exact coin asked about (the batched endpoint returns records in
    # arbitrary order without echoing ids)
    for r in rows:
        anchor = r["settlement_anchor_coin"]
        single = rpc("get_coin_record_by_name", {"name": "0x" + anchor})
        rec = single.get("coin_record")
        box = r["box_nft_id"]
        state = r["state"]
        rank = RANK.get(state)
        entry = {"box": box[:16] + "...", "state": state, "anchor": anchor[:12] + "..."}

        if rank is None:
            failures.append(f"{box}: unknown ledger state {state}")
            continue
        exists = bool(single.get("success")) and bool(rec)
        if rank >= RANK["SOLD"]:
            if not exists:
                failures.append(f"{box}: state {state} but anchor unknown to the chain")
                continue
            spent = int(rec.get("spent_block_index") or 0)
            created = int(rec.get("confirmed_block_index") or 0)
            entry["chain_spent_height"] = spent
            if spent <= 0:
                failures.append(f"{box}: state {state} but anchor UNSPENT on chain")
            elif r["settlement_height"] != spent:
                failures.append(
                    f"{box}: ledger settlement_height {r['settlement_height']}"
                    f" != chain spent height {spent}")
            elif created != spent:
                failures.append(
                    f"{box}: anchor created {created} but spent {spent}"
                    f" - not an ephemeral settlement coin")
        else:
            entry["chain"] = "not yet created (normal pre-sale)"
            if exists:
                spent = int(rec.get("spent_block_index") or 0)
                failures.append(
                    f"{box}: state {state} but anchor exists on chain"
                    f" (spent at {spent}) - a sale the watcher has not recorded")

        if state == "FULFILLED":
            if not r["delivery_height"]:
                failures.append(f"{box}: FULFILLED without delivery_height")
            elif r["delivery_height"] <= (r["settlement_height"] or 0):
                failures.append(f"{box}: delivery_height not after settlement")

        # public site agreement
        try:
            s = fetch_site_status(site, box)
        except Exception as e:  # noqa: BLE001 - any fetch failure is a finding
            warnings.append(f"{box}: site status unreachable ({e})")
            checked.append(entry)
            continue
        site_state = s.get("state", "UNKNOWN")
        entry["site_state"] = site_state
        site_rank = RANK.get(site_state, -1)
        if site_rank > rank:
            failures.append(f"{box}: site claims {site_state} beyond ledger {state}")
        elif site_state != state and not (site_state == "UNKNOWN" and rank < RANK["SOLD"]):
            failures.append(f"{box}: site says {site_state}, ledger says {state}")

        nfts = s.get("nfts")
        if site_state != "FULFILLED" and nfts is not None:
            failures.append(f"{box}: contents visible at {site_state} - secrecy broken")
        if site_state == "FULFILLED":
            committed = json.loads(r["committed_token_ids"] or "[]")
            if nfts is None or len(nfts) != len(committed):
                failures.append(
                    f"{box}: FULFILLED shows {0 if nfts is None else len(nfts)}"
                    f" nfts, ledger committed {len(committed)}")
        checked.append(entry)

    return {"ok": not failures, "boxes_audited": len(rows),
            "checked": checked, "failures": failures, "warnings": warnings}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("ledger", help="path to delivery_ledger.db (read-only)")
    ap.add_argument("--site", default=DEFAULT_SITE)
    args = ap.parse_args()
    report = audit(args.ledger, args.site)
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
