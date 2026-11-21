# Images to generate

The decks use **four** generated images. Everything else is a code-drawn diagram (`assets/build_diagrams.js`).

| ID | Slide | Size to generate | Status |
|---|---|---|---|
| `hero` | 1 Title (dark) | 1450 × 2050 px (≈ 5:7) | delivered |
| `datacenter` | 3 What is virtualization? | 1700 × 1845 px (≈ 12:13) | delivered |
| `consolidation` | 4 Why it matters (white slide) | 1480 × 1360 px (≈ 12:11) | delivered |
| `future` | 24 Conclusion (dark) | 1450 × 2050 px (≈ 5:7) | delivered |

## `consolidation`: plain-English description
- **Left half:** five or six identical dark-grey servers stacked loosely, each nearly empty. Each one shows only a tiny sliver of activity: a short, dim teal bar on its front, to suggest it's mostly idle.
- **Centre:** a soft orange arrow pointing right.
- **Right half:** one single server, the same style but glowing confidently. Above it float four small glass panels (the virtual machines) in dark blue, teal and orange, like the title image, joined to the server by thin light-blue lines.
- **Background:** very light grey-white, almost white, so it blends into the white slide. Clean 3D-illustration style, soft shadows, plenty of empty margin around the edges. No text, logos or people.
- **Idea:** many idle machines become one busy machine running many VMs.

## `future`: plain-English description
- A single glass VM panel, like those in the title image and glowing teal, standing upright inside a translucent shield shaped like a padlock. A soft orange glow comes from the keyhole.
- Faint light-blue circuit lines spread out from the base, fading into the background. A few tiny floating particles add depth.
- **Background:** plain dark navy that matches the slide (`#1F2A44`), getting very slightly lighter behind the shield, so the edges disappear into the slide. No text, logos or people.
- **Idea:** the future, virtual machines protected even from the hypervisor (confidential computing).

## How to drop them in

1. Save each file as **`assets/images/<id>.png`** (`.jpg` / `.webp` also work): `assets/images/hero.png` and `assets/images/datacenter.png`.
2. **PowerPoint:** run `npm run build:deck`. The builder replaces each dashed placeholder with the image, cropped to fill the slot exactly.
3. **React deck:** nothing to do; `npm run dev` / `npm run build` picks the file up. Once loaded, the image drifts slowly (a Ken Burns effect), so keep the main subject inside the safe area described below.

## Shared visual language (applies to both images)

| Token | Hex | Meaning in the deck |
|---|---|---|
| Navy (ink) | `#1F2A44` | dark slide background, text |
| Teal | `#0F7C80` | the hypervisor / VMM |
| Indigo | `#3D4F8C` | guest operating systems |
| Amber | `#E59A2B` | traps / VM exits (the accent: use it sparingly) |
| Ice blue | `#CADCFC` | soft highlights on dark |
| Surface grey | `#F3F6F9` | cards on light slides |

**Common rules:**
- Clean, modern and technical, with calm lighting.
- **No text, letters, numbers, logos, brand names, watermarks or people.**
- Keep the edges low in detail: both slots have rounded corners, and the React deck crops up to about 4% and zooms by 8%.

---

## 1. `hero` (title slide, right side)

| | |
|---|---|
| **Slot** | PowerPoint 2.9 × 4.1 in · React 410 px wide · **aspect 0.707 (portrait, ≈ 5:7)** |
| **Generate at** | **1450 × 2050 px** (exact). If your tool only has presets, use **2:3** (e.g. 1024 × 1536): about 3% is cropped top and bottom. |
| **Sits on** | Dark navy slide `#1F2A44`, to the right of white title text. The React deck adds faint drifting outlined rectangles and a subtle grid behind it. |
| **Safe area** | Keep the subject inside the central 80% width × 84% height. The top and bottom 8% should be plain background. |

**What it must show:** one physical server becoming several isolated virtual machines. This is the core idea of the talk, and the colours encode the same roles as the diagrams.

- **Lower third:** a single sleek 1U/2U rack server in isometric three-quarter view. It is dark graphite, with a thin teal light strip along its front edge (the hypervisor).
- **Rising above it:** four translucent, frosted-glass rounded rectangles (the virtual machines), floating and stacked vertically with even gaps and slightly offset in depth:
  - each panel has a softly glowing outline: two indigo `#3D4F8C`, one teal `#0F7C80`, one amber `#E59A2B` (the amber one is the smallest);
  - inside each panel, a few very faint abstract horizontal bars suggest an OS window, but nothing legible.
- **Thin luminous threads** (ice blue `#CADCFC`) run from the server up into each panel, showing shared hardware.
- **Background:** a seamless navy gradient from `#1F2A44` at the edges to a slightly lighter `#26345A` behind the subject, so the image melts into the slide with no visible border. Add a soft, faint glow behind the panels.
- **Lighting and style:** light from the top left with soft volumetric haze, in a minimal 3D render / isometric illustration style. The surfaces are matte, with a subtle glass refraction on the panels.

**Ready-to-paste prompt:**
> Minimal isometric 3D illustration, portrait 5:7. A single sleek dark graphite rack server in the lower third, three-quarter view, thin teal (#0F7C80) light strip on its front edge. Rising above it, four floating translucent frosted-glass rounded rectangles stacked vertically with even spacing, like virtual machine windows; each has a softly glowing outline, two indigo (#3D4F8C), one teal (#0F7C80), one small amber (#E59A2B); faint abstract horizontal bars inside, nothing legible. Thin luminous ice-blue (#CADCFC) threads connect the server to each panel. Seamless deep navy background (#1F2A44) with a slightly lighter centre (#26345A), soft volumetric haze, light from top left, calm, clean, high-end tech aesthetic, generous empty margins, centered composition.

**Negative prompt:** text, letters, numbers, logo, brand, watermark, people, hands, cables clutter, neon cyberpunk, purple, pink, rainbow, busy background, hard border, frame, vignette, photo of a real data center, lens flare.

**Midjourney suffix:** `--ar 5:7 --style raw --stylize 150 --no text,logo,people`

**Check before use:**
- [ ] The background edges are within roughly ±5 RGB of `#1F2A44` (no visible seam on the slide).
- [ ] Exactly one server and four panels, with the amber panel the smallest.
- [ ] Nothing important sits in the top or bottom 8%.

---

## 2. `datacenter` ("What is virtualization?", slide 3, right side)

| | |
|---|---|
| **Slot** | PowerPoint 3.4 × 3.69 in · React 440 px wide · **aspect 0.921 (almost square, slightly tall)** |
| **Generate at** | **1700 × 1845 px** (exact). If your tool only has presets, use **1:1** (e.g. 1536 × 1536): about 4% is cropped left and right. |
| **Sits on** | A white slide, to the right of three light-grey cards (`#F3F6F9`) with indigo, teal and amber headings. |
| **Safe area** | Central 84% width × 84% height. |

**What it must show:** the physical reality that virtualization consolidates, a modern data-center aisle. It must harmonise with the white slide, so the grade is bright and cool, not dark or neon.

- **Composition:** a one-point-perspective view straight down a data-center cold aisle. The vanishing point is centred horizontally, slightly above centre (about 45% from the top).
- **Racks:** tall black server racks line both sides with perforated doors.
  - Most status LEDs are soft teal `#0F7C80` or white.
  - A few small amber `#E59A2B` LEDs (3–6 in total, scattered) are the only warm accent.
- **Above:** overhead cable trays and soft linear ceiling lights.
- **Floor:** light-grey raised floor tiles with a gentle reflection.
- **Grade:** bright, airy and desaturated cool neutrals; highlights near white, shadows charcoal (not pure black). The overall impression is clean and professional, never cyberpunk.
- **Focus:** sharp mid-aisle with a mild depth of field toward the far end, eye-level camera, 24–28 mm lens look.

**Ready-to-paste prompt:**
> Photorealistic interior photo of a modern data center cold aisle, one-point perspective looking straight down the aisle, vanishing point centered slightly above middle. Tall black server racks with perforated doors on both sides, mostly soft teal (#0F7C80) and white status LEDs with a few tiny amber (#E59A2B) lights, overhead cable trays, linear ceiling lights, light grey raised floor with gentle reflections. Bright, airy, cool neutral color grade, near-white highlights, charcoal shadows, clean and professional, eye-level camera, 24mm lens, sharp mid-aisle, mild depth of field at the far end, near-square framing.

**Negative prompt:** text, labels, readable screens, logos, brand names, watermark, people, neon cyberpunk, purple, magenta, heavy blue tint, dark moody, fog, clutter, cables on floor, fisheye distortion, vignette.

**Midjourney suffix:** `--ar 12:13 --style raw --stylize 100 --no text,logo,people`

**Check before use:**
- [ ] No readable text or logos anywhere (zoom in on the rack doors).
- [ ] Amber appears only as a few small lights.
- [ ] Overall brightness is high enough that the image does not look like a dark hole on the white slide.
