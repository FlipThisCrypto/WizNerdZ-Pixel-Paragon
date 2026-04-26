# WizNerdZ Forge Generator Logic

## Selection flow

1. Pick background family by weight.
2. Pick background variant from the selected family.
3. Roll optional special interrupt color.
4. Pick each trait category by weight.
5. Check incompatibility rules.
6. If invalid, reroll the conflicting trait only.
7. Build DNA from selected trait names.
8. Reject duplicate DNA.
9. Calculate rarity score.
10. Export PNG at 4096x4096 using nearest-neighbor.
11. Export metadata JSON.

## Rarity score suggestion

For each selected trait:

trait_score = total_category_weight / trait_weight

Then add synergy bonuses.

Final rarity_score = sum(trait_score) + synergy_bonus

## Recommended target for 10,000

Orange family should land around 4% to 5%.
Green should land around 12% to 14%.
Blue should land around 27% to 30%.
Purple should land around 52% to 56%.

This keeps orange rare, but not so rare that people never see it.

## Metadata trait format

{
  "trait_type": "Background Family",
  "value": "Orange"
}

{
  "trait_type": "Background Variant",
  "value": "Molten Orange"
}

{
  "trait_type": "Color Family",
  "value": "Orange"
}