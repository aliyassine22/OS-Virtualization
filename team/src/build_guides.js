/**
 * Builds one guide per presenter: team/Member_<n>_<Name>.pdf
 *
 *   node team/src/build_guides.js        (needs LibreOffice `soffice` for the PDF step)
 *
 * Each guide: role and timing, slide-by-slide script, report sections to master,
 * demo responsibilities, the common core every member must know, and likely Q&A.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType,
  ShadingType, BorderStyle, LevelFormat, HeadingLevel, PageNumber, Footer,
} = require("docx");

const ROOT = path.resolve(__dirname, "..", "..");
const team = JSON.parse(fs.readFileSync(path.join(ROOT, "team", "team.json"), "utf8"));
const G = require("./guides_content");

const FONT = "Calibri";
const COLORS = ["3D4F8C", "0F7C80", "B8741A", "C8553D"];
const W = 9360; // content width (DXA) for Letter with 1" margins

const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 22, bold: o.bold, italics: o.italics, color: o.color });
const p = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [t(children)], spacing: { after: o.after ?? 100 }, ...o.extra });
const bullet = (children) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: Array.isArray(children) ? children : [t(children)] });
const h1 = (text, color) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: FONT, size: 30, bold: true, color })] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: FONT, size: 24, bold: true, color: "1F2A44" })] });

function table(rows, widths, headColor) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "C9D3DD" };
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: r.map((c, j) => new TableCell({
        width: { size: widths[j], type: WidthType.DXA },
        borders: { top: border, bottom: border, left: border, right: border },
        shading: i === 0 ? { type: ShadingType.CLEAR, fill: headColor, color: "auto" } : j === 0 ? { type: ShadingType.CLEAR, fill: "F3F6F9", color: "auto" } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: [t(c, { size: 20, bold: i === 0 || j === 0, color: i === 0 ? "FFFFFF" : "1F2A44" })] })],
      })),
    })),
  });
}

function guide(n) {
  const m = team.members[n - 1];
  const g = G.members[n];
  const col = COLORS[n - 1];
  const [, slot, topics, ppt, react] = G.timing[n - 1];
  const kids = [];

  kids.push(new Paragraph({ spacing: { after: 40 }, children: [t(`${team.title} - presenter guide`, { size: 20, color: "5F6B78" })] }));
  kids.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `Member ${n}: ${m.name}`, font: FONT, size: 44, bold: true, color: col })] }));
  kids.push(p([t(m.role, { size: 24, italics: true, color: "1F2A44" })], { after: 200 }));
  kids.push(table([["Time slot", "Your topics", "Slides"], [slot, topics, `${ppt}\n${react}`.replace("\n", " | ")]], [1700, 5160, 2500], col));
  kids.push(p([t(g.focus, { size: 22 })], { extra: { spacing: { before: 200, after: 200 } } }));

  kids.push(h1("1. Your part of the presentation", col));
  kids.push(p("Slide numbers refer to the PowerPoint deck; speaker notes with the same content are in the deck (and press N in the React deck)."));
  kids.push(table([["Slide", "What to say (talking points)"], ...g.slides], [2600, 6760], col));

  kids.push(h1("2. Report sections you must master", col));
  kids.push(p("Read these sections of report/output/IEEE_Report_Virtualization_in_OS.pdf until you can explain them without the text."));
  g.report.forEach(([s, d]) => kids.push(bullet([t(`${s}: `, { bold: true }), t(d)])));

  kids.push(h1("3. Your role in the demo", col));
  kids.push(p(g.demo));

  kids.push(h1("4. Likely questions on your part", col));
  g.qa.forEach(([q, a]) => {
    kids.push(p([t("Q: ", { bold: true, color: col }), t(q, { bold: true })], { after: 40 }));
    kids.push(p([t("A: ", { bold: true }), t(a)], { after: 140 }));
  });

  kids.push(h1("5. Common core: everyone must know this", "1F2A44"));
  kids.push(p([t(G.common.intro, { italics: true })]));
  kids.push(table([["Concept", "What you must be able to say"], ...G.common.items], [2300, 7060], "1F2A44"));
  kids.push(h2("The demo in one minute (everyone)"));
  G.common.demo.forEach((d) => kids.push(bullet(d)));
  kids.push(h2("Team timing (20 minutes)"));
  kids.push(table([["Who", "When", "Topics", "Slides (PPT | React)"], ...G.timing.map(([w, s, tp, a, b]) => [`${w} ${team.members[Number(w[1]) - 1].name}`, s, tp, `${a} | ${b}`])], [1700, 1500, 4060, 2100], "1F2A44"));

  kids.push(h1("6. Checklist", col));
  ["Rehearse your part aloud with a timer (target: your slot minus 15 s).", "Know your hand-over sentence to the next speaker.",
    "Run the demo once yourself (cd demo && python -m vdemo tour).", "Read the common core table twice; quiz a teammate.",
    "Skim the references cited in your report sections."].forEach((c) => kids.push(bullet(c)));

  return new Document({
    creator: m.name, title: `Member ${n} guide - ${team.title}`,
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 30, bold: true }, paragraph: { spacing: { before: 300, after: 120 }, keepNext: true, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 1 } },
      ],
    },
    numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t(`Member ${n} - ${m.name}   |   page `, { size: 18, color: "5F6B78" }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: "5F6B78" })] })] }) },
      children: kids,
    }],
  });
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "guides-"));
  for (let n = 1; n <= 4; n++) {
    const name = `Member_${n}_Guide`;
    const docx = path.join(tmp, `${name}.docx`);
    fs.writeFileSync(docx, await Packer.toBuffer(guide(n)));
    try {
      execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", path.join(ROOT, "team"), docx], { stdio: "ignore" });
      console.log("wrote", path.join("team", `${name}.pdf`));
    } catch (e) {
      fs.copyFileSync(docx, path.join(ROOT, "team", `${name}.docx`));
      console.log("soffice not found; wrote DOCX instead:", `${name}.docx`);
    }
  }
})();
