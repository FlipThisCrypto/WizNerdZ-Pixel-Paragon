# Incident severity — WizNerdZ

| Sev | Definition | Response |
|-----|------------|----------|
| SEV-1 | Wrong art/metadata for live tokens; integrity fail | Freeze mint talk; run verify scripts; revert deploy |
| SEV-2 | Site down / health.json unreachable | Check Pages status; rollback last commit |
| SEV-3 | Nominations board API down | Use GitHub issues directly; cache still serves |
| SEV-4 | Cosmetic UI / single browser WC issue | Ticket / document in SECURITY or issues |

## Escalation

1. Capture `health.json` + local telemetry export  
2. Run `dr_checklist.py`, `verify_metadata_sample.py`, `verify_integrity_manifest.py`  
3. Revert via `git revert` (no force-push)  
4. Post status on @FiendStudios if public-facing SEV-1/2  

## Comms template

"WizNerdZ: investigating [symptom]. Mint remains disarmed. Nominations via GitHub issues still work: [link]."
