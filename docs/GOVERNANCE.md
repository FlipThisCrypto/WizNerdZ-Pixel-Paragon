# Governance — collection freeze & mint arming

## Nomination window

- Closes: midnight July 31, 2026 US Eastern (`2026-08-01T04:00:00.000Z`)
- Source of truth: GitHub Issues `[PFP Nomination]`
- Site board is a mirror, not the ledger

## Freeze criteria (all required)

1. Nomination deadline passed  
2. 1:1 art produced and assigned IDs  
3. `verify_metadata.py` + `verify_specials.py` + integrity checks green  
4. Cold backup of `collection_8888` confirmed offline  
5. MintGarden/offers ready; royalty 10% + splits configured  

## Arm mint

Only then set `docs/js/config.js` → `mint.enabled = true` and publish offer URL.

## Change control

- No force-push to `main`  
- Prefer revert commits  
- Public xch + WC projectId only in repo  
