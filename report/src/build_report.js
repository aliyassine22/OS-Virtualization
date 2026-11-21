/**
 * Builds the IEEE-format conference paper as DOCX (then PDF via LibreOffice).
 *
 *   node report/src/build_report.js
 *   -> report/output/IEEE_Report_Virtualization_in_OS.docx
 *
 * IEEE conference layout (US Letter): margins top 0.75", bottom 1", sides 0.625";
 * two 3.5" columns with 0.25" gutter; Times New Roman 10 pt body; 24 pt title;
 * small-caps Roman-numeral section headings; 8 pt captions and references.
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, AlignmentType,
  SectionType, WidthType, BorderStyle, TabStopType, VerticalAlign,
} = require("docx");

const ROOT = path.resolve(__dirname, "..", "..");
const team = JSON.parse(fs.readFileSync(path.join(ROOT, "team", "team.json"), "utf8"));
const C = require("./content");

const FONT = "Times New Roman";
const PT = (n) => n * 2;                // docx half-points
const IN = (n) => Math.round(n * 1440); // DXA
const PAGE = {
  size: { width: IN(8.5), height: IN(11) },
  margin: { top: IN(0.75), bottom: IN(1), left: IN(0.625), right: IN(0.625), header: IN(0.3), footer: IN(0.3) },
};
const COLW = IN(3.5);

// -------------------------------------------------------------- inline markup
function runs(str, base = {}) {
  return str.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).filter(Boolean).map((t) => {
    if (t.startsWith("**")) return new TextRun({ text: t.slice(2, -2), bold: true, font: FONT, ...base });
    if (t.startsWith("*")) return new TextRun({ text: t.slice(1, -1), italics: true, font: FONT, ...base });
    return new TextRun({ text: t, font: FONT, ...base });
  });
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const LETTERS = "ABCDEFGHIJ";
let h1n = 0, h2n = 0, fign = 0, tabn = 0;

function h1(title, numbered = true) {
  h2n = 0;
  const label = numbered ? `${ROMAN[h1n++]}. ` : "";
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 160, after: 80 }, keepNext: true,
    children: [new TextRun({ text: label + title, smallCaps: true, font: FONT, size: PT(10) })],
  });
}
function h2(title) {
  return new Paragraph({
    spacing: { before: 80, after: 40 }, keepNext: true,
    children: [new TextRun({ text: `${LETTERS[h2n++]}. ${title}`, italics: true, font: FONT, size: PT(10) })],
  });
}
function para(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED, indent: { firstLine: IN(0.14) }, spacing: { after: 0, line: 240 },
    children: runs(text, { size: PT(10) }),
  });
}

function figure(name, wide, caption) {
  const dir = name.startsWith("fig_") ? path.join(ROOT, "assets", "diagrams") : path.join(ROOT, "assets", "figures");
  const file = path.join(dir, `${name}.png`);
  const buf = fs.readFileSync(file);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);   // PNG IHDR
  const targetIn = wide ? 6.7 : 3.4;
  const px = targetIn * 96;
  fign++;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 80, after: 40 }, keepNext: true,
      children: [new ImageRun({ type: "png", data: buf, transformation: { width: px, height: (px * h) / w },
        altText: { title: `Fig. ${fign}`, description: caption, name } })],
    }),
    new Paragraph({
      alignment: wide ? AlignmentType.CENTER : AlignmentType.JUSTIFIED, spacing: { after: 120 },
      children: [new TextRun({ text: `Fig. ${fign}. `, font: FONT, size: PT(8) }), ...runs(caption, { size: PT(8) })],
    }),
  ];
}

function table(title, cols, rows) {
  tabn++;
  const total = cols.reduce((a, b) => a + b, 0);
  const widths = cols.map((c) => Math.floor((c / total) * COLW));
  widths[widths.length - 1] += COLW - widths.reduce((a, b) => a + b, 0);
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const line = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
  const trs = rows.map((r, i) => new TableRow({
    tableHeader: i === 0,
    children: r.map((cell, j) => new TableCell({
      width: { size: widths[j], type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
      margins: { top: 20, bottom: 20, left: 50, right: 50 },
      borders: { top: i === 0 ? line : none, bottom: i === 0 || i === rows.length - 1 ? line : none, left: none, right: none },
      children: [new Paragraph({
        alignment: j === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
        children: [new TextRun({ text: cell, font: FONT, size: PT(7.5), bold: i === 0 || j === 0 })],
      })],
    })),
  }));
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 0 }, keepNext: true,
      children: [new TextRun({ text: `TABLE ${ROMAN[tabn - 1]}`, font: FONT, size: PT(8), smallCaps: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, keepNext: true,
      children: [new TextRun({ text: title, font: FONT, size: PT(8), smallCaps: true })] }),
    new Table({ width: { size: COLW, type: WidthType.DXA }, columnWidths: widths, rows: trs }),
    new Paragraph({ spacing: { after: 100 }, children: [] }),
  ];
}

// -------------------------------------------------------------- title block (1 column)
function titleBlock() {
  const out = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
      children: [new TextRun({ text: `${team.title}: ${team.subtitle}`, font: FONT, size: PT(24) })] }),
  ];
  const n = team.members.length;
  const w = Math.floor(IN(7.25) / n);
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  out.push(new Table({
    width: { size: w * n, type: WidthType.DXA }, columnWidths: Array(n).fill(w),
    rows: [new TableRow({
      children: team.members.map((m) => new TableCell({
        width: { size: w, type: WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new TextRun({ text: m.name, font: FONT, size: PT(11) })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: team.department, font: FONT, size: PT(9), italics: true })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: team.university, font: FONT, size: PT(9), italics: true })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: m.email, font: FONT, size: PT(9) })] }),
        ],
      })),
    })],
  }));
  return out;
}

// -------------------------------------------------------------- assemble sections
const sections = [];
let current = [];
const twoCol = { column: { count: 2, space: IN(0.25), equalWidth: true } };
const flush = (props) => { sections.push({ properties: props, children: current }); current = []; };

current.push(...titleBlock());
flush({ page: PAGE, column: { count: 1 } });

current.push(new Paragraph({
  alignment: AlignmentType.JUSTIFIED, spacing: { after: 80 },
  children: [new TextRun({ text: "Abstract", bold: true, italics: true, font: FONT, size: PT(9) }),
    new TextRun({ text: "—" + C.abstract, bold: true, font: FONT, size: PT(9) })],
}));
current.push(new Paragraph({
  alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 },
  children: [new TextRun({ text: "Index Terms", bold: true, italics: true, font: FONT, size: PT(9) }),
    new TextRun({ text: "—" + C.keywords, bold: true, font: FONT, size: PT(9) })],
}));

for (const blk of C.body) {
  if (blk.h1) current.push(h1(blk.h1));
  else if (blk.h2) current.push(h2(blk.h2));
  else if (blk.p) current.push(para(blk.p));
  else if (blk.table) current.push(...table(blk.table, blk.cols, blk.rows));
  else if (blk.fig && !blk.wide) current.push(...figure(blk.fig, false, blk.caption));
  else if (blk.fig && blk.wide) {
    // IEEE "figure*": close the two-column section, insert a one-column section, reopen two columns
    flush({ type: SectionType.CONTINUOUS, page: PAGE, ...twoCol });
    current.push(...figure(blk.fig, true, blk.caption));
    flush({ type: SectionType.CONTINUOUS, page: PAGE, column: { count: 1 } });
  }
}

current.push(h1("References", false));
C.references.forEach((r, i) => {
  current.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED, indent: { left: IN(0.3), hanging: IN(0.3) },
    tabStops: [{ type: TabStopType.LEFT, position: IN(0.3) }], spacing: { after: 20 },
    children: [new TextRun({ text: `[${i + 1}]\t`, font: FONT, size: PT(8) }), ...runs(r, { size: PT(8) })],
  }));
});
flush({ type: SectionType.CONTINUOUS, page: PAGE, ...twoCol });

const doc = new Document({
  creator: team.members.map((m) => m.name).join(", "),
  title: `${team.title}: ${team.subtitle}`,
  description: `IEEE-format report, ${team.course}`,
  styles: { default: { document: { run: { font: FONT, size: PT(10) } } } },
  sections,
});

const outDir = path.join(ROOT, "report", "output");
fs.mkdirSync(outDir, { recursive: true });
Packer.toBuffer(doc).then((buf) => {
  const f = path.join(outDir, "IEEE_Report_Virtualization_in_OS.docx");
  fs.writeFileSync(f, buf);
  console.log("wrote", f);
});
