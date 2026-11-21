# Presentations

The two decks have the same storyline, colours and speaker badges (M1–M4). Use whichever you prefer: the PowerPoint is the safe choice for any classroom PC, and the React deck adds live widgets.

## PowerPoint: `powerpoint/Virtualization_in_OS.pptx`

- 23 slides in 4 PowerPoint **sections**, one per member, with **speaker notes** on every slide.
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
| N | speaker notes |
| O / Esc | overview grid |
| F | fullscreen |
| Home / End | first / last slide |

**Interactive widgets.** These are JavaScript ports of the Python demo models, so they give the same numbers.

| Slide | Widget |
|---|---|
| 10 "See it fail" | step through a guest kernel under a naive trap-and-emulate VMM; POPF/SGDT turn red |
| 15 "Instruction by instruction" | same guest under BT, PV and VT-x (toggle EPT); token animates guest ↔ VMM |
| 16 "Nested paging" | animated 2-D page walk: native 4, nested 24, 2 MiB pages 19 |
| 20 "Live migration" | sliders for RAM, bandwidth, dirty rate and working set; rounds and downtime update live |
| 23 "Demo results" | cost-model explorer: change the VM-exit cost and watch the ranking change |

**Structure:** `src/App.jsx` (deck engine), `src/deck/slides.jsx` (all slides and notes), `src/widgets/*`, `src/sim/*` (simulation ports), `src/components/blocks.jsx` (cards, reveals, `ImageSlot`).

- **Names** are read from `team/team.json`.
- **Diagrams** are imported from `assets/diagrams/`.
- **Images:** drop files into `public/images/<id>.png` and they replace the placeholders.

**Design.** The deck follows Anthropic's public *frontend-design* skill (github.com/anthropics/skills). It uses a topic-specific token plan, with the palette and type roles documented at the top of `src/styles.css`. Structure encodes information: badge = speaker, progress bar = member sections. Motion is used only for slide transitions and in response to what the user does in the widgets, and it respects `prefers-reduced-motion`.
