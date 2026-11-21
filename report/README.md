# IEEE report

**Output:** `output/IEEE_Report_Virtualization_in_OS.pdf` and `.docx`. It is 5 pages long, in IEEE conference format: US Letter, two columns, Times 10 pt, Roman-numeral small-caps headings and IEEE-style references.

| File | Purpose |
|---|---|
| `src/content.js` | **All text**: abstract, sections, tables, figure captions, 20 references. Edit here. |
| `src/build_report.js` | Layout engine: IEEE margins, two columns, full-width figures (IEEE `figure*`) via continuous section breaks |
| `src/make_demo_figure.py` | Regenerates Fig. 4 from the demo simulator |
| `build.sh` | One-shot rebuild: figure → DOCX → PDF (LibreOffice) |

```bash
bash report/build.sh      # from the repository root
```

**Structure:**

- I. Introduction
- II. Background: history, hypervisor types, Popek–Goldberg, the x86 problem
- III. Types of virtualization: full, para-, hardware-assisted, comparison
- IV. Memory and I/O virtualization
- V. Applications, including live migration
- VI. Demonstration
- VII. Conclusion and perspectives
- References

The PDF was rendered with LibreOffice. Word reflows text slightly differently, so check the page count after editing in Word, especially the positions of the full-width figures.
