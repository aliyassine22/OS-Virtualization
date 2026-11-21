# Virtualization in Operating Systems
### Full, Para-, and Hardware-Assisted Virtualization

Course project deliverables for **Topic 2: Virtualization in Operating Systems**. The project has four parts:

- an IEEE-format report (DOCX + PDF)
- a 20-minute PowerPoint deck
- an interactive React deck
- a runnable demo
- a guide PDF for each of the four presenters (kept separate: the decks themselves carry no presenter tags or notes, so they can be submitted as is)

| Deliverable | Where | Open / run |
|---|---|---|
| **IEEE report** (5 pages) | [`report/output/`](report/output) | `IEEE_Report_Virtualization_in_OS.pdf` / `.docx` |
| **PowerPoint deck** (25 slides, same order as the React deck) | [`presentation/powerpoint/`](presentation/powerpoint) | `Virtualization_in_OS.pptx` (PDF copy alongside) |
| **React deck** (interactive) | [`presentation/react-slides/`](presentation/react-slides) | `npm install && npm run dev` |
| **Demo code** | [`demo/`](demo) | `cd demo && python -m vdemo tour` |
| **Member guides** (4 PDFs) | [`team/`](team) | `Member_1_Guide.pdf` … `Member_4_Guide.pdf` |
| **Work division** | [`team/WORK_DIVISION.md`](team/WORK_DIVISION.md) | who presents what, and when |

## Repository layout

```
.
├── report/                 IEEE paper
│   ├── src/                content.js (the text), build_report.js, make_demo_figure.py
│   └── output/             IEEE_Report_Virtualization_in_OS.{docx,pdf}
├── presentation/
│   ├── powerpoint/         build_deck.js -> Virtualization_in_OS.pptx (+ .pdf)
│   └── react-slides/       Vite + React + framer-motion deck with live widgets
├── demo/                   vdemo: simulator + real /dev/kvm VMM (Python, stdlib only)
│   ├── vdemo/              isa, cpu_virt, memory_virt, live_migration, kvm_hello, host_check
│   └── tests/              unit tests
├── team/                   team.json (names), WORK_DIVISION.md, Member_N_Guide.pdf
│   └── src/                guide content + builder
└── assets/
    ├── build_diagrams.js   generates every technical diagram (SVG + PNG)
    ├── diagrams/           shared by the report, the PPT and the React deck
    ├── figures/            demo result charts
    └── placeholders/       IMAGE_PROMPTS.md: images still to be generated
```

## Quick start

```bash
# 1. Demo (Python 3.9+, no dependencies)
cd demo && python -m vdemo tour          # guided, press Enter between steps
python -m vdemo kvm                      # real VM via /dev/kvm (Linux + VT-x/AMD-V)

# 2. React deck
cd presentation/react-slides && npm install && npm run dev   # http://localhost:5173

# 3. Rebuild the report, guides, PPT and diagrams (needs Node 18+, LibreOffice for PDFs)
npm install
npm run build:all            # diagrams -> report DOCX -> guides PDF -> PPTX
bash report/build.sh         # report DOCX + PDF
```

## Personalising

All names come from **`team/team.json`**: members, course, university and date. Edit it once, then run `npm run build:all` and `bash report/build.sh`. The report, member guides, PowerPoint and React deck all update.

The images still to be generated are listed in [`assets/placeholders/IMAGE_PROMPTS.md`](assets/placeholders/IMAGE_PROMPTS.md), with a prompt for each. The technical diagrams are already finished and drawn from code, so do not replace them with generated images.

## Topic coverage

| Requirement from the brief | Report | Slides | Demo |
|---|---|---|---|
| Definition, VMs, hypervisor/VMM, isolation | I, II-B | 3, 6 | step 1 |
| Benefits: utilization, cost, scalability, cloud, data centers, dev/test | I, V | 4, 20 | — |
| Disaster recovery / live migration without downtime | V | 20 | step 5 |
| Popek–Goldberg, trap-and-emulate, x86 problem | II-C, II-D | 7–10 | step 2 |
| **Full virtualization** (binary translation, shadow page tables) | III-A | 11–12 | step 3 |
| **Para-virtualization** (hypercalls, Xen, virtio) | III-B | 13, 15 | step 3 |
| **Hardware-assisted** (Intel VT-x, AMD-V, VMCS, EPT/NPT) | III-C, IV | 14–16 | steps 3, 4, 6 |
| Memory and I/O virtualization | IV | 12, 16, 17 | step 4 |
| Comparison and synthesis, perspectives | III-D, VII | 18–19, 24 | — |
