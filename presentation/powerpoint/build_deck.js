/**
 * Builds the 20-minute PowerPoint deck.
 *
 *   node presentation/powerpoint/build_deck.js
 *   -> presentation/powerpoint/Virtualization_in_OS.pptx
 *
 * Structure: theme -> layouts -> topical sections -> slides.
 * Image placeholders are dashed boxes named IMG_PLACEHOLDER_<id>; see
 * assets/placeholders/IMAGE_PROMPTS.md for what to generate for each.
 */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("./lib/apply_theme.js");

const ROOT = path.resolve(__dirname, "..", "..");
const team = JSON.parse(fs.readFileSync(path.join(ROOT, "team", "team.json"), "utf8"));
const DIAG = (n) => path.join(ROOT, "assets", "diagrams", `${n}.png`);

const THEME = {
  name: "Virtualization",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1F2A44", lt1: "FFFFFF", dk2: "3D4F8C", lt2: "F3F6F9",
    accent1: "0F7C80", accent2: "E59A2B", accent3: "3D4F8C", accent4: "C8553D",
    accent5: "4A5560", accent6: "2E8B57", hlink: "0F7C80", folHlink: "3D4F8C",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = `${team.title}: ${team.subtitle}`;
pres.author = team.members.map((m) => m.name).join(", ");
pres.subject = team.course;
const C = pres.SchemeColor;
// outcome colours (text, tint) for the instruction tables
const OUTC = { bug: ["C8553D", "FBE9E5"], trap: ["9A5F10", "FDF1DF"], ok: ["2E7D4F", "E6F3EC"], tr: ["3D4F8C", "E8EBF5"], pv: ["0F7C80", "E3F2F2"] };

// ------------------------------------------------------------------ layouts
pres.defineSlideMaster({
  title: "DARK",
  background: { color: HEX.dk1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.3, w: 5.6, h: 1.6, fontSize: 36, bold: true, color: C.background1, valign: "bottom", align: "left", fontFace: THEME.headFontFace }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 3.0, w: 5.6, h: 1.0, fontSize: 18, color: "CADCFC", valign: "top", align: "left" }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: HEX.lt1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.28, w: 8.2, h: 0.7, fontSize: 28, bold: true, color: C.text1, valign: "middle", align: "left", margin: 0, fontFace: THEME.headFontFace }, text: "" } },
    { text: { text: `${team.title}  |  ${team.course}`, options: { x: 0.5, y: 5.25, w: 6, h: 0.25, fontSize: 9, color: HEX.accent5, margin: 0 } } },
  ],
  slideNumber: { x: 9.0, y: 5.22, w: 0.5, h: 0.28, fontSize: 9, color: HEX.accent5, align: "right" },
});

// ------------------------------------------------------------------ helpers
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function image(slide, name, x, y, w, maxH, alt) {
  const s = pngSize(DIAG(name));
  let h = (w * s.h) / s.w;
  if (maxH && h > maxH) { h = maxH; w = (h * s.w) / s.h; x = x + 0; }
  slide.addImage({ path: DIAG(name), x, y, w, h, altText: alt || name, objectName: name });
  return { x, y, w, h };
}
function centeredImage(slide, name, y, maxW, maxH, alt) {
  const s = pngSize(DIAG(name));
  let w = maxW, h = (w * s.h) / s.w;
  if (h > maxH) { h = maxH; w = (h * s.w) / s.h; }
  slide.addImage({ path: DIAG(name), x: (10 - w) / 2, y, w, h, altText: alt || name, objectName: name });
  return { y, h };
}
function placeholder(slide, id, x, y, w, h, desc, dark = false) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.12, objectName: `IMG_PLACEHOLDER_${id}`,
    fill: { color: dark ? "2B3A5C" : HEX.lt2 }, line: { color: dark ? "8FA3C7" : "9AA7B4", width: 1.25, dashType: "dash" },
  });
  slide.addText([
    { text: "IMAGE PLACEHOLDER", options: { bold: true, fontSize: 11, breakLine: true, color: dark ? "CADCFC" : HEX.accent5 } },
    { text: `${id}: ${desc}`, options: { fontSize: 10, color: dark ? "CADCFC" : HEX.accent5 } },
  ], { x: x + 0.15, y, w: w - 0.3, h, align: "center", valign: "middle", isTextBox: true, objectName: `IMG_PLACEHOLDER_${id}_label` });
}
function card(slide, x, y, w, h, title, body, color, o = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.08, fill: { color: o.fill || HEX.lt2 },
    shadow: { type: "outer", color: "1F2A44", opacity: 0.12, blur: 4, offset: 1.5, angle: 90 },
    objectName: `card_${title.slice(0, 18)}`,
  });
  if (o.num !== undefined) {
    slide.addShape(pres.shapes.OVAL, { x: x + 0.15, y: y + 0.17, w: 0.42, h: 0.42, fill: { color } });
    slide.addText(String(o.num), { x: x + 0.15, y: y + 0.17, w: 0.42, h: 0.42, align: "center", valign: "middle", fontSize: 13, bold: true, color: "FFFFFF", margin: 0, isTextBox: true });
  }
  const tx = o.num !== undefined ? x + 0.68 : x + 0.18;
  slide.addText(title, { x: tx, y: y + 0.12, w: w - (tx - x) - 0.12, h: 0.5, fontSize: o.titleSize || 15, bold: true, color, valign: "middle", margin: 0, isTextBox: true });
  if (body) {
    const items = Array.isArray(body) ? body : [body];
    slide.addText(items.map((t, i) => ({ text: t, options: { bullet: Array.isArray(body) && !o.noBullet ? { indent: 12 } : false, breakLine: i < items.length - 1, paraSpaceAfter: o.paraSpace ?? 3 } })),
      { x: x + 0.18, y: y + 0.66, w: w - 0.32, h: h - 0.78, fontSize: o.bodySize || 12.5, color: HEX.dk1, valign: "top", margin: 0, isTextBox: true });
  }
}
function takeaway(slide, text, y = 4.72) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y, w: 9.0, h: 0.42, rectRadius: 0.08, fill: { color: "E7F2F2" }, objectName: "takeaway" });
  slide.addText([{ text: "Key idea  ", options: { bold: true, color: HEX.accent1 } }, { text, options: { color: HEX.dk1 } }],
    { x: 0.65, y, w: 8.7, h: 0.42, fontSize: 13, valign: "middle", margin: 0, isTextBox: true });
}
function content(section, title) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  return s;
}
const SEC = [
  "Introduction and background",
  "CPU virtualization and full virtualization",
  "Para- and hardware-assisted virtualization",
  "Comparison, applications, demo and conclusion",
];

// ================================================================== Introduction and background
pres.addSection({ title: SEC[0] });
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: SEC[0] });
  s.addText(team.title, { placeholder: "title" });
  s.addText(team.subtitle, { placeholder: "body" });
  s.addText(team.members.map((m) => m.name).join("   ·   "), { x: 0.6, y: 4.15, w: 5.8, h: 0.35, fontSize: 13, color: "FFFFFF", margin: 0, isTextBox: true });
  s.addText(`${team.course}  -  ${team.university}  -  ${team.date}`, { x: 0.6, y: 4.5, w: 5.8, h: 0.3, fontSize: 11, color: "8FA3C7", margin: 0, isTextBox: true });
  placeholder(s, "hero", 6.6, 0.75, 2.9, 4.1, "Abstract illustration: one physical server splitting into several glowing, isolated virtual machines", true);
}
{
  const s = content(SEC[0], "Outline");
  const parts = [
    ["Background", ["What and why", "History", "Hypervisor types"], HEX.dk2],
    ["CPU theory", ["Popek-Goldberg", "Trap-and-emulate", "The x86 problem"], HEX.accent1],
    ["Techniques", ["Full virtualization", "Para-virtualization", "VT-x / AMD-V", "EPT / NPT", "I/O virtualization"], HEX.accent2],
    ["In practice", ["Comparison", "Applications & migration", "Live demo", "Conclusion"], HEX.accent4],
  ];
  parts.forEach(([t, items, c], i) => card(s, 0.5 + i * 2.28, 1.25, 2.12, 3.2, t, items, c, { num: i + 1, bodySize: 12.5 }));
  takeaway(s, "One problem (sensitive instructions that do not trap), three solutions, one live demo.");
}
{
  const s = content(SEC[0], "What is virtualization?");
  card(s, 0.5, 1.15, 5.3, 1.15, "Virtual machine (VM)", "An isolated environment running a complete OS, as if on dedicated hardware.", HEX.dk2, { num: 1 });
  card(s, 0.5, 2.42, 5.3, 1.15, "Hypervisor / VMM", "The layer that creates VMs and multiplexes CPU, memory and I/O among them.", HEX.accent1, { num: 2 });
  card(s, 0.5, 3.69, 5.3, 1.15, "Isolation and efficiency", "A fault or attack in one VM must not affect the others or the host.", HEX.accent2, { num: 3 });
  placeholder(s, "datacenter", 6.1, 1.15, 3.4, 3.69, "Modern data-center aisle with server racks (photo-style)");
}
{
  const s = content(SEC[0], "Why it matters");
  const items = [
    ["Consolidation", "Many under-used servers become one well-used host: less hardware, energy and space.", HEX.accent1],
    ["Isolation", "Run untrusted code, several OSs and test setups side by side, safely.", HEX.dk2],
    ["Flexibility", "VMs are files: snapshot, clone and provision in seconds; scale elastically.", HEX.accent2],
    ["Resilience", "Live-migrate running VMs between hosts with no visible downtime.", HEX.accent4],
  ];
  items.forEach(([t, d, c], i) => {
    const x = 0.5 + (i % 2) * 4.55, y = 1.2 + Math.floor(i / 2) * 1.62;
    card(s, x, y, 4.4, 1.45, t, d, c, { titleSize: 18, bodySize: 13 });
  });
  takeaway(s, "Used everywhere: cloud computing, data centers, development and test, disaster recovery.");
}
{
  const s = content(SEC[0], "60 years of virtualization");
  centeredImage(s, "fig_timeline", 1.15, 9.0, 3.4, "Timeline from IBM CP-67 to confidential VMs");
  takeaway(s, "Each era answered the same question: how do we run an OS on hardware it does not own?");
}
{
  const s = content(SEC[0], "Hypervisor types");
  centeredImage(s, "fig_hypervisor_types", 1.1, 8.6, 3.55, "Type 1 vs Type 2 hypervisor stacks");
  takeaway(s, "Type 1 sits on the hardware (servers, cloud); Type 2 sits on an OS (desktops).");
}

// ================================================================== CPU virtualization
pres.addSection({ title: SEC[1] });
{
  const s = content(SEC[1], "What must a hypervisor virtualize?");
  s.addText("Three resources to virtualize", { x: 0.5, y: 1.15, w: 3.6, h: 0.4, fontSize: 15, bold: true, color: HEX.dk1, margin: 0, isTextBox: true });
  ["CPU", "Memory", "I/O devices"].forEach((t, i) => {
    const d = ["privileged state and instructions", "address translation, page tables", "devices, interrupts, DMA"][i];
    card(s, 0.5, 1.62 + i * 1.07, 3.6, 0.95, t, d, [HEX.dk2, HEX.accent1, HEX.accent5][i], { titleSize: 16 });
  });
  s.addText("Popek & Goldberg (1974): a VMM must provide", { x: 4.3, y: 1.15, w: 5.2, h: 0.4, fontSize: 15, bold: true, color: HEX.dk1, margin: 0, isTextBox: true });
  [["Equivalence", "a program behaves exactly as on bare hardware"], ["Resource control", "the VMM is always in charge of the resources"], ["Efficiency", "most instructions run natively, without the VMM"]].forEach(([t, d], i) => {
    card(s, 4.3, 1.62 + i * 1.07, 5.2, 0.95, t, null, HEX.accent1, { num: i + 1, titleSize: 15 });
    s.addText(d, { x: 4.98, y: 1.62 + i * 1.07 + 0.55, w: 4.4, h: 0.3, fontSize: 12.5, color: HEX.dk1, valign: "top", margin: 0, isTextBox: true });
  });
}
{
  const s = content(SEC[1], "Trap-and-emulate");
  centeredImage(s, "fig_trap_emulate", 1.1, 8.8, 1.85, "Trap and emulate flow");
  card(s, 0.5, 3.1, 4.4, 1.45, "Privileged instruction", "Traps if executed outside ring 0 (CLI, HLT, MOV CR3, OUT).", HEX.accent1, { titleSize: 15 });
  card(s, 5.1, 3.1, 4.4, 1.45, "Sensitive instruction", "Reads or changes privileged machine state (interrupt flag, page tables, descriptor tables).", HEX.dk2, { titleSize: 15 });
  takeaway(s, "Virtualizable  \u21D4  every sensitive instruction is also privileged.");
}
{
  const s = content(SEC[1], "The x86 problem");
  centeredImage(s, "fig_popek_goldberg", 1.05, 8.2, 3.35, "Venn diagrams of sensitive and privileged instructions");
  takeaway(s, "POPF in ring 1 silently drops the IF bit: no trap, wrong behaviour. Three fixes follow.");
}
{
  const s = content(SEC[1], "See it fail: naive trap-and-emulate");
  const cell = (t, kind, bold) => ({ text: t, options: { color: OUTC[kind][0], fill: { color: OUTC[kind][1] }, bold: !!bold } });
  const H = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.dk1 } } });
  const code = (t) => ({ text: t, options: { fontFace: "Courier New", bold: true, color: HEX.dk1, fill: { color: HEX.lt2 } } });
  const rows = [
    [H("Guest instruction"), H("What the naive VMM sees"), H("Effect on the guest")],
    [code("sgdt [gdt_copy]"), cell("no trap (sensitive, unprivileged)", "bug", true), cell("reads the HOST's GDT base", "bug")],
    [code("cli / sti"), cell("trap \u2192 emulated", "trap"), cell("correct", "ok")],
    [code("popf  ; IF = 0"), cell("no trap (sensitive, unprivileged)", "bug", true), cell("IF stays 1: critical section runs unmasked", "bug")],
    [code("mov cr3, PTE write"), cell("trap \u2192 emulated + shadow sync", "trap"), cell("correct, but expensive", "ok")],
    [code("out 0x3f8 / hlt"), cell("trap \u2192 emulated", "trap"), cell("correct", "ok")],
  ];
  s.addTable(rows, { x: 0.5, y: 1.15, w: 6.1, colW: [2.05, 2.05, 2.0], fontSize: 11, fontFace: THEME.bodyFontFace, border: { type: "solid", pt: 0.75, color: "FFFFFF" }, valign: "middle", rowH: 0.5 });
  [["SGDT result", "0x1000", "0xffff8000 (host!)"], ["Critical work done masked", "2", "1"]].forEach(([t, n, v], i) => {
    const y = 1.15 + i * 1.6;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.85, y, w: 2.65, h: 1.45, rectRadius: 0.08, fill: { color: "FBE9E5" } });
    s.addText([{ text: t, options: { bold: true, color: HEX.dk1, fontSize: 13, breakLine: true } }, { text: `native: ${n}`, options: { color: HEX.accent5, fontSize: 12, breakLine: true } },
      { text: `VM: ${v}`, options: { color: HEX.accent4, fontSize: 15, bold: true } }], { x: 7.0, y, w: 2.4, h: 1.45, valign: "middle", margin: 0, isTextBox: true });
  });
  takeaway(s, "Equivalence violated, and the VMM never noticed: POPF and SGDT never trapped.");
}
{
  const s = content(SEC[1], "Full virtualization: binary translation");
  const steps = [["Guest kernel", "basic block\nPOPF / CLI ..."], ["Translator", "rewrite sensitive\ninstructions"], ["Translation cache", "reuse on every\nlater execution"], ["Run natively", "ring 1, near\nfull speed"]];
  steps.forEach(([t, d], i) => {
    const x = 0.5 + i * 2.33;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.2, w: 1.95, h: 1.15, rectRadius: 0.08, fill: { color: [HEX.dk2, HEX.accent1, HEX.accent1, HEX.accent5][i] } });
    s.addText([{ text: t, options: { bold: true, fontSize: 14, breakLine: true } }, { text: d.replace("\n", " "), options: { fontSize: 11.5 } }],
      { x: x + 0.08, y: 1.2, w: 1.8, h: 1.15, color: "FFFFFF", align: "center", valign: "middle", margin: 0, isTextBox: true });
    if (i < 3) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 2.0, y: 1.63, w: 0.28, h: 0.3, fill: { color: HEX.accent2 }, line: { color: HEX.accent2, width: 0 }, objectName: `arrow_${i}` });
  });
  card(s, 0.5, 2.6, 4.4, 1.95, "How it works", ["Unmodified guest OS (even Windows)", "User code: direct execution", "Kernel code: translated once, cached", "popf  \u2192  call vmm_popf (no trap)"], HEX.accent1);
  card(s, 5.1, 2.6, 4.4, 1.95, "Trade-offs", ["+  Works on any x86, no CPU support needed", "\u2212  Translation overhead", "\u2212  Very complex VMM", "\u2212  Costly page-table tracing (shadow paging)"], HEX.accent4, { noBullet: true });
}
{
  const s = content(SEC[1], "Shadow page tables");
  const y = 1.35;
  const nodes = [["GVA", "guest virtual", HEX.lt2, HEX.dk1], ["GPA", "guest 'physical'", HEX.dk2, "FFFFFF"], ["HPA", "real memory", HEX.accent5, "FFFFFF"]];
  nodes.forEach(([t, d, f, c], i) => {
    const x = 0.7 + i * 3.2;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 1.7, h: 0.85, rectRadius: 0.08, fill: { color: f }, line: { color: HEX.dk2, width: 1 } });
    s.addText([{ text: t, options: { bold: true, fontSize: 18, breakLine: true } }, { text: d, options: { fontSize: 11 } }], { x, y, w: 1.7, h: 0.85, align: "center", valign: "middle", color: c, margin: 0, isTextBox: true });
  });
  s.addText("guest page table", { x: 2.45, y: y + 0.05, w: 1.4, h: 0.3, fontSize: 11, color: HEX.dk2, align: "center", margin: 0, isTextBox: true });
  s.addShape(pres.shapes.LINE, { x: 2.45, y: y + 0.43, w: 1.4, h: 0, line: { color: HEX.dk2, width: 2, endArrowType: "triangle" } });
  s.addText("VMM's mapping", { x: 5.65, y: y + 0.05, w: 1.4, h: 0.3, fontSize: 11, color: HEX.accent5, align: "center", margin: 0, isTextBox: true });
  s.addShape(pres.shapes.LINE, { x: 5.65, y: y + 0.43, w: 1.4, h: 0, line: { color: HEX.accent5, width: 2, endArrowType: "triangle" } });
  s.addShape(pres.shapes.LINE, { x: 1.55, y: y + 1.05, w: 6.4, h: 0, line: { color: HEX.accent2, width: 2.5, dashType: "dash", endArrowType: "triangle" } });
  s.addText("Shadow page table: GVA \u2192 HPA in one step, kept in sync by the VMM (guest page tables write-protected)", { x: 0.5, y: y + 1.1, w: 9.0, h: 0.32, fontSize: 12.5, bold: true, color: HEX.accent2, align: "center", margin: 0, isTextBox: true });
  card(s, 0.5, 3.0, 4.4, 1.55, "Cheap", ["TLB miss = normal 4-step walk", "Works without any CPU support"], HEX.accent6);
  card(s, 5.1, 3.0, 4.4, 1.55, "Expensive", ["Every guest page-table write traps", "Every process switch (CR3 load) traps"], HEX.accent4);
}

// ================================================================== Para- and hardware-assisted
pres.addSection({ title: SEC[2] });
{
  const s = content(SEC[2], "Para-virtualization");
  card(s, 0.5, 1.2, 4.6, 2.35, "How it works", ["Guest kernel ported to a hypervisor API (Xen, 2003)", "Hypercalls replace sensitive instructions", "Interrupt masking = write to a shared page", "Batched page-table updates (multicall)", "Split front-end / back-end drivers"], HEX.accent1);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.3, y: 1.2, w: 4.2, h: 2.35, rectRadius: 0.08, fill: { color: HEX.dk1 } });
  s.addText([
    { text: "// native kernel", options: { color: "8FA3C7", breakLine: true } },
    { text: "cli", options: { color: "FFFFFF", breakLine: true } },
    { text: "mov  cr3, eax", options: { color: "FFFFFF", breakLine: true } },
    { text: " ", options: { breakLine: true } },
    { text: "// para-virtualized kernel", options: { color: "8FA3C7", breakLine: true } },
    { text: "shared->evtchn_mask = 1;", options: { color: "F2C57C", breakLine: true } },
    { text: "HYPERVISOR_mmuext_op(NEW_BASEPTR);", options: { color: "F2C57C" } },
  ], { x: 5.5, y: 1.3, w: 3.9, h: 2.15, fontFace: "Courier New", fontSize: 12, valign: "middle", margin: 0, isTextBox: true });
  card(s, 0.5, 3.7, 4.6, 0.95, "+ Near-native speed, simpler VMM", null, HEX.accent6, { titleSize: 14 });
  card(s, 5.3, 3.7, 4.2, 0.95, "\u2212 Guest kernel must be modified", null, HEX.accent4, { titleSize: 14 });
}
{
  const s = content(SEC[2], "Hardware-assisted virtualization");
  centeredImage(s, "fig_vtx", 1.05, 8.4, 3.4, "Intel VT-x architecture and VMCS");
  takeaway(s, "Unmodified guest in ring 0 on its own CPU state; the VMCS decides what causes a VM exit.");
}
{
  const s = content(SEC[2], "Instruction by instruction: BT vs PV vs VT-x");
  const c = (t, kind) => ({ text: t, options: { color: OUTC[kind][0], fill: { color: OUTC[kind][1] }, bold: kind === "bug", align: "center" } });
  const H = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.dk1 }, align: "center" } });
  const code = (t) => ({ text: t, options: { fontFace: "Courier New", bold: true, color: HEX.dk1, fill: { color: HEX.lt2 } } });
  const rows = [
    [H("Instruction"), H("Naive trap-and-emulate"), H("Binary translation"), H("Para-virtualization"), H("VT-x + EPT")],
    [code("sgdt"), c("no trap (bug)", "bug"), c("translated in-line", "tr"), c("shared page", "pv"), c("runs natively", "ok")],
    [code("cli / sti"), c("trap", "trap"), c("translated in-line", "tr"), c("shared page", "pv"), c("runs natively", "ok")],
    [code("popf"), c("no trap (bug)", "bug"), c("translated in-line", "tr"), c("shared page", "pv"), c("runs natively", "ok")],
    [code("mov cr3"), c("trap", "trap"), c("call-out to VMM", "tr"), c("hypercall", "pv"), c("runs natively*", "ok")],
    [code("PTE write"), c("trap (shadow sync)", "trap"), c("trap (shadow sync)", "trap"), c("hypercall (batched)", "pv"), c("runs natively*", "ok")],
    [code("out"), c("trap", "trap"), c("call-out to VMM", "tr"), c("hypercall", "pv"), c("VM exit", "trap")],
    [code("hlt"), c("trap", "trap"), c("call-out to VMM", "tr"), c("hypercall", "pv"), c("VM exit", "trap")],
  ];
  s.addTable(rows, { x: 0.5, y: 1.1, w: 9.0, colW: [1.6, 1.85, 1.85, 1.85, 1.85], fontSize: 12, fontFace: THEME.bodyFontFace, border: { type: "solid", pt: 0.75, color: "FFFFFF" }, valign: "middle", rowH: 0.4 });
  s.addText("* without EPT (first-generation VT-x): VM exit + shadow page-table sync", { x: 0.5, y: 4.37, w: 9.0, h: 0.28, fontSize: 10.5, italic: true, color: HEX.accent5, margin: 0, isTextBox: true });
  takeaway(s, "VT-x runs most sensitive instructions natively on the guest's own state; only I/O and HLT exit.");
}
{
  const s = content(SEC[2], "Nested paging: EPT / NPT");
  centeredImage(s, "fig_memory", 1.05, 8.6, 3.6, "Nested paging and 2D page walk");
  takeaway(s, "No page-table exits, but a TLB miss costs up to (4+1)(4+1) \u2212 1 = 24 references instead of 4.");
}
{
  const s = content(SEC[2], "Virtualizing I/O");
  centeredImage(s, "fig_io", 1.05, 8.6, 3.5, "Three I/O virtualization approaches");
  takeaway(s, "Real systems mix them: hardware-assisted CPU + virtio I/O + pass-through for the fastest devices.");
}

// ================================================================== Comparison, applications, demo, conclusion
pres.addSection({ title: SEC[3] });
{
  const s = content(SEC[3], "Where does the guest kernel run?");
  centeredImage(s, "fig_rings", 1.05, 8.8, 3.55, "Privilege rings per technique");
  takeaway(s, "Rewrite the code (BT), rewrite the source (PV), or extend the CPU (VT-x / AMD-V).");
}
{
  const s = content(SEC[3], "Comparison");
  const hdr = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.dk1 }, align: "center" } });
  const rowLbl = (t) => ({ text: t, options: { bold: true, color: HEX.dk1, fill: { color: HEX.lt2 } } });
  const rows = [
    [hdr(""), hdr("Full (BT)"), hdr("Para-virtualization"), hdr("Hardware-assisted")],
    [rowLbl("Guest OS"), "Unmodified", "Modified kernel", "Unmodified"],
    [rowLbl("Sensitive instructions"), "Translated in software", "Hypercalls", "Run on guest state / VM exit"],
    [rowLbl("Guest kernel ring"), "1 (deprivileged)", "1 (deprivileged)", "0 (non-root)"],
    [rowLbl("Memory"), "Shadow page tables", "Validated guest PTs", "EPT / NPT"],
    [rowLbl("Performance"), "Good; costly when kernel-heavy", "Near native", "Near native (2nd gen.)"],
    [rowLbl("VMM complexity"), "Very high", "Moderate", "Lowest"],
    [rowLbl("Examples"), "VMware (early), VirtualBox", "Xen PV, virtio", "KVM, Hyper-V, ESXi"],
  ];
  s.addTable(rows, { x: 0.5, y: 1.15, w: 9.0, colW: [1.9, 2.4, 2.2, 2.5], fontSize: 12, color: HEX.dk1, border: { type: "solid", pt: 0.75, color: "C9D3DD" }, valign: "middle", rowH: 0.42, fontFace: THEME.bodyFontFace });
  takeaway(s, "Modern hypervisors are hybrids: hardware-assisted CPU and memory + para-virtual I/O.");
}
{
  const s = content(SEC[3], "Applications and live migration");
  card(s, 0.5, 1.15, 4.1, 3.45, "Where virtualization is used", ["Cloud (IaaS): VMs as the unit of rent", "Data centers: consolidation, elasticity", "Development and testing: snapshots, sandboxes", "Security: isolation of tenants", "Disaster recovery and high availability"], HEX.dk2, { bodySize: 14, paraSpace: 10 });
  const steps = ["Copy ALL memory while the VM runs", "Re-send pages dirtied meanwhile", "Repeat until the dirty set is small", "Pause, copy the rest + CPU state, resume on target"];
  s.addText("Live migration (pre-copy)", { x: 4.85, y: 1.15, w: 4.6, h: 0.4, fontSize: 16, bold: true, color: HEX.accent1, margin: 0, isTextBox: true });
  steps.forEach((t, i) => {
    const y = 1.62 + i * 0.6;
    s.addShape(pres.shapes.OVAL, { x: 4.85, y, w: 0.42, h: 0.42, fill: { color: i === 3 ? HEX.accent4 : HEX.accent1 } });
    s.addText(String(i + 1), { x: 4.85, y, w: 0.42, h: 0.42, align: "center", valign: "middle", fontSize: 13, bold: true, color: "FFFFFF", margin: 0, isTextBox: true });
    s.addText(t, { x: 5.4, y: y - 0.04, w: 4.1, h: 0.5, fontSize: 13, color: HEX.dk1, valign: "middle", margin: 0, isTextBox: true });
  });
  s.addText([{ text: "~77 ms", options: { fontSize: 30, bold: true, color: HEX.accent4 } }, { text: "   downtime vs 34 s stop-and-copy (our demo)", options: { fontSize: 12.5, color: HEX.accent5 } }],
    { x: 4.85, y: 4.05, w: 4.7, h: 0.6, valign: "middle", margin: 0, isTextBox: true });
}
{
  const s = content(SEC[3], "VMs vs containers");
  centeredImage(s, "fig_containers", 1.05, 8.0, 3.4, "VMs vs containers");
  takeaway(s, "Containers share the kernel (light); VMs virtualize the hardware (strong isolation).");
}
{
  const s = content(SEC[3], "Live demo: vdemo");
  const steps = [
    ["1  Host check", "vmx / svm, ept, /dev/kvm"], ["2  The x86 problem", "POPF and SGDT slip past the VMM"],
    ["3  Five engines", "native, T&E, BT, PV, VT-x(+EPT)"], ["4  Memory", "shadow vs nested, 4 vs 24 refs"],
    ["5  Live migration", "pre-copy rounds and downtime"], ["6  Real KVM", "our own VMM via /dev/kvm"],
  ];
  steps.forEach(([t, d], i) => {
    const x = 0.5 + (i % 3) * 3.05, y = 1.15 + Math.floor(i / 3) * 1.3;
    card(s, x, y, 2.9, 1.15, t, d, [HEX.accent5, HEX.accent4, HEX.dk2, HEX.accent1, HEX.accent2, HEX.accent6][i], { titleSize: 15, bodySize: 12 });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 3.85, w: 9.0, h: 0.75, rectRadius: 0.08, fill: { color: HEX.dk1 } });
  s.addText([{ text: "$ ", options: { color: "8FA3C7" } }, { text: "cd demo && python -m vdemo tour", options: { color: "F2C57C", bold: true } },
    { text: "   # or: check | popf | cpu | memory | migrate | kvm", options: { color: "8FA3C7" } }],
    { x: 0.7, y: 3.85, w: 8.6, h: 0.75, fontFace: "Courier New", fontSize: 11.5, valign: "middle", margin: 0, isTextBox: true });
}
{
  const s = content(SEC[3], "Demo results");
  const labels = ["Native", "Trap-and-emulate*", "Full (BT)", "Para-virt.", "VT-x, no EPT", "VT-x + EPT"];
  const vals = [1.0, 17.0, 9.9, 2.1, 14.0, 3.1];
  s.addChart(pres.charts.BAR, [{ name: "Slowdown vs native", labels, values: vals }], {
    x: 0.4, y: 1.05, w: 5.9, h: 3.6, barDir: "bar", chartColors: [HEX.accent5, HEX.accent4, HEX.dk2, HEX.accent1, HEX.accent2, "B8741A"],
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '0.0"x"', dataLabelFontSize: 11, dataLabelColor: HEX.dk1,
    catAxisLabelColor: HEX.dk1, valAxisLabelColor: HEX.accent5, catAxisLabelFontSize: 11, valAxisLabelFontSize: 10,
    valGridLine: { color: "E1E6EB", size: 0.5 }, catGridLine: { style: "none" }, showLegend: false,
    showTitle: true, title: "Simulated time relative to native (lower is better)", titleFontSize: 12, titleColor: HEX.dk1,
    catAxisOrientation: "maxMin", catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt",
  });
  s.addText("* incorrect: equivalence violated", { x: 0.5, y: 4.62, w: 5.8, h: 0.3, fontSize: 10, italic: true, color: HEX.accent4, margin: 0, isTextBox: true });
  [["4 \u2192 24", "memory references per TLB miss (native \u2192 nested)", HEX.accent1], ["77 ms", "live-migration downtime vs 34 s stop-and-copy", HEX.accent4], ["25 exits", "real KVM guest printing 24 chars + HLT", HEX.dk2]].forEach(([n, d, c], i) => {
    const y = 1.1 + i * 1.22;
    s.addText(n, { x: 6.6, y, w: 2.9, h: 0.6, fontSize: 30, bold: true, color: c, margin: 0, isTextBox: true });
    s.addText(d, { x: 6.6, y: y + 0.6, w: 2.9, h: 0.5, fontSize: 12, color: HEX.accent5, margin: 0, valign: "top", isTextBox: true });
  });
}
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: SEC[3] });
  s.addText("Conclusion", { placeholder: "title" });
  s.addText("One problem: sensitive instructions that do not trap. Three solutions that now coexist:", { placeholder: "body" });
  const pers = [["Confidential VMs", "AMD SEV-SNP, Intel TDX encrypt guest memory, even from the hypervisor"], ["MicroVMs", "Firecracker: VM isolation at container speed"], ["Nested virtualization", "hypervisors inside VMs"], ["Beyond x86", "ARM EL2, RISC-V H-extension"]];
  s.addText("Perspectives", { x: 6.5, y: 0.6, w: 3.0, h: 0.4, fontSize: 16, bold: true, color: "F2C57C", margin: 0, isTextBox: true });
  pers.forEach(([t, d], i) => {
    s.addText([{ text: t, options: { bold: true, color: "FFFFFF", fontSize: 14, breakLine: true } }, { text: d, options: { color: "CADCFC", fontSize: 11.5 } }],
      { x: 6.5, y: 1.1 + i * 0.95, w: 3.1, h: 0.85, valign: "top", margin: 0, isTextBox: true });
  });
  s.addText(["Full virtualization rewrote the code", "Para-virtualization rewrote the source", "Hardware assistance changed the CPU"].map((t, i, a) => ({ text: t, options: { bullet: { type: "number" }, breakLine: i < a.length - 1 } })),
    { x: 0.6, y: 4.0, w: 5.6, h: 1.0, fontSize: 14, color: "FFFFFF", margin: 0, isTextBox: true, paraSpaceAfter: 4 });
}
{
  const s = content(SEC[3], "References and questions");
  const refs = [
    "G. Popek, R. Goldberg, \"Formal requirements for virtualizable third generation architectures,\" CACM, 1974.",
    "J. Robin, C. Irvine, \"Analysis of the Intel Pentium's ability to support a secure VMM,\" USENIX Security, 2000.",
    "E. Bugnion et al., \"Bringing virtualization to the x86 architecture with the original VMware Workstation,\" ACM TOCS, 2012.",
    "P. Barham et al., \"Xen and the art of virtualization,\" SOSP, 2003.",
    "R. Uhlig et al., \"Intel virtualization technology,\" IEEE Computer, 2005.",
    "K. Adams, O. Agesen, \"A comparison of software and hardware techniques for x86 virtualization,\" ASPLOS, 2006.",
    "C. Clark et al., \"Live migration of virtual machines,\" NSDI, 2005.",
  ];
  s.addText(refs.map((r, i) => ({ text: r, options: { bullet: { type: "number" }, breakLine: i < refs.length - 1, paraSpaceAfter: 4 } })),
    { x: 0.5, y: 1.15, w: 5.9, h: 3.6, fontSize: 11, color: HEX.dk1, valign: "top", margin: 0, isTextBox: true });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.7, y: 1.15, w: 2.8, h: 3.6, rectRadius: 0.1, fill: { color: HEX.dk1 } });
  s.addText([{ text: "Questions?", options: { fontSize: 28, bold: true, color: "FFFFFF", breakLine: true } }, { text: "Code, report and slides in the project repository", options: { fontSize: 12, color: "CADCFC" } }],
    { x: 6.85, y: 1.15, w: 2.5, h: 3.6, align: "center", valign: "middle", margin: 0, isTextBox: true });
}

// ------------------------------------------------------------------ write
(async () => {
  const out = path.join(__dirname, "Virtualization_in_OS.pptx");
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("wrote", out);
})();
