# Presentations

The two decks have the same storyline and colours. They contain no presenter tags or speaker notes, so they can be submitted directly; who says what is in `team/Member_N_Guide.pdf`. Use whichever you prefer: the PowerPoint is the safe choice for any classroom PC, and the React deck adds live widgets.

## PowerPoint: `powerpoint/Virtualization_in_OS.pptx`

- 25 slides, identical in order and wording to the React deck, in 4 topical PowerPoint **sections** (Introduction, CPU virtualization, Para-/hardware-assisted, Comparison & demo).
- Built by `powerpoint/build_deck.js` (pptxgenjs) from the shared theme and diagrams. Rebuild with `npm run build:deck` from the repository root.
- `Virtualization_in_OS.pdf` is a PDF fallback.
- Image placeholders are dashed shapes named `IMG_PLACEHOLDER_<id>`; see `assets/placeholders/IMAGE_PROMPTS.md`.

## React deck: `react-slides/`

```bash
cd presentation/react-slides
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (serve with `npm run preview` or any static host)
```

| Key | Action |
|---|---|
| → / Space / PageDown | next step, then next slide |
| ← / PageUp | back |
| O / Esc | overview grid |
| F | fullscreen |
| Home / End | first / last slide |

**Interactive widgets.** These are JavaScript ports of the Python demo models, so they give the same numbers.

| Slide | Widget |
|---|---|
| 10 "See it fail" | (PowerPoint: static outcome table) step through a guest kernel under a naive trap-and-emulate VMM; POPF/SGDT turn red |
| 15 "Instruction by instruction" | (PowerPoint: static comparison table) same guest under BT, PV and VT-x (toggle EPT); token animates guest ↔ VMM |
| 16 "Nested paging" | animated 2-D page walk: native 4, nested 24, 2 MiB pages 19 |
| 20 "Applications and live migration" | sliders for RAM, bandwidth, dirty rate and working set; rounds and downtime update live |
| 23 "Demo results" | cost-model explorer: change the VM-exit cost and watch the ranking change |

**Structure:** `src/App.jsx` (deck engine), `src/deck/slides.jsx` (all slides and notes), `src/widgets/*`, `src/sim/*` (simulation ports), `src/components/blocks.jsx` (cards, reveals, `ImageSlot`).

- **Names** are read from `team/team.json`.
- **Diagrams** are imported from `assets/diagrams/`.
- **Images:** drop files into `public/images/<id>.png` and they replace the placeholders.

**Design.** The deck follows Anthropic's public *frontend-design* skill (github.com/anthropics/skills). It uses a topic-specific token plan, with the palette and type roles documented at the top of `src/styles.css`. A thin progress bar shows position in the talk. Motion is used only for slide transitions and in response to what the user does in the widgets, and it respects `prefers-reduced-motion`.
