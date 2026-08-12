# Reveal video spec — authoring videos that hand off invisibly

The reveal plays a prerecorded video, then **cross-dissolves into a live,
browser-rendered spell circle** which the WizNerdZ then POP out of. If the
video's final frames are authored to match the live circle, viewers cannot tell
where the video ended.

This document is what you need when producing new tier videos.

---

## Current mapping

| Tier | File | Hand-off window |
|---|---|---|
| Named Premium | `reveal/Tier1.mp4` | last **1.6s** |
| Elite | `reveal/Tier2.mp4` | last **1.4s** |
| Rare | `reveal/Tier3.mp4` | last **1.4s** |
| Standard Bundle | `reveal/Tier4.mp4` | last **1.4s** |
| Blind Single | `reveal/Tier5.mp4` | last **1.2s** |

Change any of these in `js/reveal/reveal-config.js` — file name and hand-off are
per-tier, so swapping a video is a one-line edit.

---

## Technical requirements

| Property | Requirement | Why |
|---|---|---|
| Container | MP4 / H.264 + AAC (or no audio) | Broadest browser support |
| Audio | Must survive being **muted** | Autoplay policy requires `muted`; audio is never guaranteed |
| Aspect | 16:9 mastered, safe-area centred | Rendered `object-fit: cover` — edges get cropped on tall phones |
| Resolution | 1280×720 minimum | Current Tier videos are 720p |
| Length | 6–12s | Longer and buyers get impatient before seeing their NFTs |
| **File size** | **Target under 4 MB** | `Tier1.mp4` is currently **16 MB** — see below |
| Frame rate | 24 or 30 fps | Matches the pixel-art cadence |

### Tier1.mp4 is too heavy

At 16 MB it is 5× the other tiers. On a mid-range phone the reveal will stall
behind it, and the system will hit its 9-second load guard and skip the video
entirely (gracefully, but you lose the moment). Re-encode to ≤4 MB:

```bash
ffmpeg -i Tier1.mp4 -c:v libx264 -crf 26 -preset slow -vf "scale=1280:-2" -an Tier1.mp4
```

---

## The critical part: your final frames

During the last N seconds the video fades out while the live spell circle fades
in at full intensity. To make that seam invisible, **the closing shot must look
like the live circle.**

### The live circle, precisely

- **Centred** in frame, horizontally and vertically.
- **Four concentric rings**, radii at **100% / 80% / 58% / 36%** of a base radius
  equal to `min(viewportW, viewportH) × 0.28`.
- Rings **alternate colour**, outermost first:
  1. purple `#c9a2ff`
  2. green `#9dffb0`
  3. purple `#c9a2ff`
  4. green `#9dffb0`
- Rings **counter-rotate** — outer clockwise, next anticlockwise, alternating.
  Rotation is slow (roughly 8–26°/sec, faster toward the centre).
- Each ring carries **evenly spaced glyphs** (24 / 16 / 12 / 8 going inward)
  drawn in monospace, flickering in brightness.
- Glyph set mixes runes and code:
  `{ } < > 0 1 / # XCH λ Ϟ ⟁ ⟠ ✧ ∴ ⌘`
- **Dark centre** — the middle ~34% is near-black `#020308`. WizNerdZ emerge from
  here, so keep it clear of detail.
- Occasional **1px lightning arcs** in purple/green from the centre outward.

### Closing-shot checklist

1. Last ~2 seconds: settle the camera. **No pans, zooms or cuts** — the live
   circle cannot follow camera movement.
2. End on a **centred spell circle** matching the geometry above.
3. Keep the centre **dark and uncluttered**.
4. **Do not fade to black.** The dissolve handles that; a video that fades out
   causes a visible double-fade.
5. Hold the final composition for the full hand-off window (1.2–1.6s) so the
   dissolve has stable frames to blend into.
6. Background at the edges should be near-black so the crop is invisible.

### What happens if you ignore this

Nothing breaks. The dissolve still runs and reads as a deliberate cross-fade —
just not an invisible one. The seam becomes noticeable, which is the only cost.

---

## Failure behaviour (already handled)

You do not need to guard against these — the system does:

| Situation | Behaviour |
|---|---|
| File missing / 404 | Skips to the live portal, NFTs still reveal |
| Slow load (>9s) | Abandons the video, continues the summon |
| Autoplay blocked | Skips video, continues |
| Decode error | Skips video, continues |
| `prefers-reduced-motion` | No video at all — straight to the results screen |

The reveal never blocks on video. Blockchain correctness and actually showing
the buyer their NFTs always win.

---

## Adding a new tier video

1. Drop the file in `docs/reveal/`.
2. Point the tier at it in `js/reveal/reveal-config.js`:
   ```js
   elite: { video: "Tier2_v2.mp4", label: "Elite", handoff: 1.4 },
   ```
3. Preview it with the dev harness — open `mint.html?dev=1` and click the tier
   scenario. No XCH, no mint, no chain calls.
