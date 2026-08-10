# WizNerdZ 1-of-1 Art Guide

**Purpose:** Single source of truth for named specials and community PFP → wizard 1:1s.  
**Publisher:** Fiend Studios  
**Collection:** WizNerdZ Pixel Paragon (CHIP-0007, Chia)

Use this guide whenever building a 1:1 from a list of users (X handles, Discord, etc.). Do not invent a new style per person; translate each person **into** this system.

---

## 1. What a 1-of-1 is

| Type | Rule |
|------|------|
| **Named special** | Hand-authored `special/Name_640.png` + metadata; token ID fixed (e.g. Tom #42, Fiend #787) |
| **Community PFP 1:1** | Nominee’s public identity (PFP / vibe) remade as a **WizNerdZ wizard**; supply **1 of 1** |

**Goal:** Someone should recognize “that’s *them* as a WizNerd,” not “a random generative mint.”

**Non-goals:** Photoreal portraits, anime redraws, non-pixel styles, new species outside the wizard silhouette, dark muddy full-bleed backgrounds.

---

## 2. Hard technical specs (always)

| Spec | Value |
|------|--------|
| Final canvas | **640×640** PNG |
| Pixel language | **Nearest-neighbor** scale from 32×32 trait language (crisp blocks, no soft blur) |
| Character outline | **1px pure black** (`#000000`) outer rim on the silhouette |
| Background | **Light** pastel / soft solid (black trim must pop) |
| Class match | **Shirt + Wizard Hat same class** whenever using class layers |
| Logo | **2× brand stamp, top-right**; clear of hat peak and familiar |
| Staff (if any) | Right side; ~**5–10px** from canvas right edge; not covering face/logo |
| Familiar (if any) | Must not collide with logo (logo stays top-right) |
| Metadata | CHIP-0007; `Special` / named flags as used by pipeline; **Rarity = 1 of 1**, `max_supply = 1` |
| Deliverable names | `special/{Name}_640.png` (+ optional preview); assign free token ID on freeze |

---

## 3. Visual language (must feel like the collection)

### Always

1. **Light background** — soft blue, cream, mint, lavender, pale gold, etc. Avoid near-black or heavy vignette.
2. **1px black outer outline** on the wizard silhouette (clean POP).
3. **Wizard silhouette** — hat + robe/shirt language of WizNerdZ classes.
4. **Readable face** — eyes, mouth, optional facial hair/glasses from the trait system.
5. **Class-matched robe + hat** (same class name / set).
6. **2× logo, top-right**, with breathing room.
7. **Pixel-perfect alignment** — no half-pixel soft edges; no photo filters.

### Prefer (trait system first)

Build from official layers when possible:

- Background → Face → Eyes → Mouth → Shirt + Hat (matched) → Facial hair → Glasses → optional Staff / Spell / Familiar  
- Weights / rarity extras stay **supporting**, not the identity of the piece.

### Avoid

| Avoid | Why |
|-------|-----|
| Thick black interior shirt fills | Muddy; use primary cloth color + silhouette mask approach |
| Dark / low-contrast BGs | Kills black outline POP |
| Staff over face or logo | Composition rule already fixed for generative set |
| Ultra-busy spell + familiar + staff all at once | Identity gets lost |
| Photoreal or non-pixel | Breaks collection coherence |
| Off-brand logo placement | Top-right 2× only |

---

## 4. Translating a user PFP → WizNerdZ

For each nominee, extract **3–5 identity anchors**, then map:

| From their PFP / brand | Into WizNerdZ |
|------------------------|---------------|
| Dominant colors | Robe primary, hat trim, BG tint |
| Hair / beard / silhouette | Facial hair style + length; hat scale |
| Eyewear / mask / visor | Glasses trait family (or custom lens if needed) |
| Animal / mascot / symbol | Familiar or hat/robe accent (not a full new species) |
| Mood (cute / dark / corporate / degen) | Class vibe (e.g. Cleric, Void, Alchemist, Storm…) |
| Iconic prop | Staff / small accent only if it still reads as WizNerdZ |

**Recognition test:** At 640 and at thumbnail (~120px), a community member should still guess who it is.

**Fidelity rule:** Capture essence, not every pixel of their avatar. The result must still read as **this collection’s wizard**.

---

## 5. Class / vibe quick map (guidance, not law)

Use when the nominee doesn’t force a class:

| Vibe | Lean toward |
|------|-------------|
| Nature / chill | Druid, Spirit Guide, Earth Shaman |
| Tech / chain / builder | Arcane Mage, Rune Keeper, Chronomancer |
| Dark / meme villain | Void Walker, Necromancer, Warlock Fel |
| Light / wholesome | Cleric Light, High Sorcerer |
| Fire / hype | Pyromancer, Chaos Weaver |
| Water / deep | Deep Sea, Cryomancer |
| Gold / wealth / FOMO | High Sorcerer + gold-leaning BG/trim |
| Community / brand mark | Match brand colors on robe/hat; keep wizard structure |

---

## 6. File & pipeline checklist (per 1:1)

- [ ] Source refs saved (PFP URL / screenshot)  
- [ ] `special/{SafeName}_640.png` at 640×640  
- [ ] Light BG + 1px black outline verified  
- [ ] Shirt/hat class-matched (or intentional custom with same silhouette discipline)  
- [ ] Logo 2× top-right, no collision  
- [ ] Staff/familiar clear of face and logo  
- [ ] Looks like **them as a WizNerd** at thumbnail size  
- [ ] Token ID reserved (free generative slot or planned special ID)  
- [ ] CHIP-0007 JSON: name, Special/Named, Rarity **1 of 1**, absolute image URL when published  
- [ ] GitHub nomination issue linked in notes (if from community list)  

### Naming

- Handle `@Foo_Bar` → folder/file safe name e.g. `Foo_Bar` or display name agreed with Fiend Studios  
- Prefer readable names in metadata (`WizNerdz #ID` + attribute for community name if used)

---

## 7. How to feed a list (for the AI / artist)

When requesting a batch, provide for each person:

```text
Handle: @example
Platform: X/Twitter
PFP URL: https://...
Notes: (optional class vibe, must-include colors, must-avoid)
Issue: (optional GitHub issue #)
```

Or a simple list of handles if PFPs are public on X — artist/AI will pull public avatar when possible.

**Batch order:** Process in list order unless priority IDs are specified.

**Output per person:** `Name_640.png` + short note of class + identity anchors used.

---

## 8. Quality bar (Fiend Studios)

Ship only if all are true:

1. It works at **640** and as a **tiny thumbnail**.  
2. It is clearly a **WizNerdZ** pixel wizard.  
3. It is clearly **that community member / brand**.  
4. Light BG + black rim + logo rules hold.  
5. You would be proud to attach **Fiend Studios** to it.

Finished ≠ perfect. Finished = **recognizable, on-brand, collection-coherent**.

---

## 9. Related project facts

- Generative supply baseline: 8,878 + named specials; community 1:1s freeze **after** nomination window.  
- Nominations: GitHub Issues `[PFP Nomination]` / label `pfp-nomination`.  
- Deadline (campaign): midnight **July 31, 2026** US Eastern.  
- Live site: https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/  

---

*Guide version: 1.0 — aligned with WizNerdZ Pixel Paragon generative + special rules (Fiend Studios).*
