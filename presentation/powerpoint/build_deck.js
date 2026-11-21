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
pres.defineSlideMaster({ title: "DARK_FREE", background: { color: HEX.dk1 }, objects: [] });
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: HEX.lt1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.28, w: 8.2, h: 0.7, fontSize: 28, bold: true, color: C.text1, valign: "middle", align: "left", margin: 0, fontFace: THEME.headFontFace }, text: "" } },
    { text: { text: `${team.title}  |  ${team.course}`, options: { x: 0.5, y: 5.25, w: 6, h: 0.25, fontSize: 9, color: HEX.accent5, margin: 0 } } },
  ],
  slideNumber: { x: 9.0, y: 5.22, w: 0.5, h: 0.28, fontSize: 9, color: HEX.accent5, align: "right" },
});

// ------------------------------------------------------------------ icons (react-icons -> PNG, rendered once per build)
const ICON_DIR = path.join(ROOT, "assets", "icons");
const ICONS = { cloud: "FaCloud", server: "FaServer", flask: "FaFlask", shield: "FaShieldAlt", sync: "FaSyncAlt", compress: "FaCompressAlt", clone: "FaClone" };
fs.mkdirSync(ICON_DIR, { recursive: true });
require("child_process").execFileSync(process.execPath, ["-e", `
  const React = require("react"), { renderToStaticMarkup } = require("react-dom/server"), fa = require("react-icons/fa"), sharp = require("sharp"), path = require("path");
  const icons = ${JSON.stringify(ICONS)};
  Promise.all(Object.entries(icons).map(([k, n]) => sharp(Buffer.from(renderToStaticMarkup(React.createElement(fa[n], { size: 256, color: "#FFFFFF" }))))
    .png().toFile(path.join(${JSON.stringify(ICON_DIR)}, k + ".png"))));
`], { cwd: ROOT, stdio: "inherit" });
const ICON = (k) => path.join(ICON_DIR, `${k}.png`);

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
  // If the generated image exists in assets/images/<id>.(png|jpg|jpeg|webp), use it (cropped to fill the slot).
  const img = ["png", "jpg", "jpeg", "webp"].map((e) => path.join(ROOT, "assets", "images", `${id}.${e}`)).find((f) => fs.existsSync(f));
  if (img) {
    slide.addImage({ path: img, x, y, w, h, sizing: { type: "cover", w, h }, altText: desc, objectName: `IMG_${id}` });
    return;
  }
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
  const c = o.compact;                       // compact: tighter title band for short cards
  const cy = y + (c ? 0.1 : 0.17), cd = c ? 0.36 : 0.42;
  if (o.num !== undefined || o.icon) {
    slide.addShape(pres.shapes.OVAL, { x: x + 0.15, y: cy, w: cd, h: cd, fill: { color } });
    if (o.icon) slide.addImage({ path: ICON(o.icon), x: x + 0.15 + cd * 0.22, y: cy + cd * 0.22, w: cd * 0.56, h: cd * 0.56 });
    else slide.addText(String(o.num), { x: x + 0.15, y: cy, w: cd, h: cd, align: "center", valign: "middle", fontSize: 13, bold: true, color: "FFFFFF", margin: 0, isTextBox: true });
  }
  const tx = o.num !== undefined || o.icon ? x + 0.15 + cd + 0.12 : x + 0.18;
  slide.addText(title, { x: tx, y: y + (c ? 0.06 : 0.12), w: w - (tx - x) - 0.12, h: c ? 0.42 : 0.5, fontSize: o.titleSize || 15, bold: true, color, valign: "middle", margin: 0, isTextBox: true });
  if (body) {
    const items = Array.isArray(body) ? body : [body];
    const by = y + (c ? 0.52 : 0.66);
    slide.addText(items.map((t, i) => ({ text: t, options: { bullet: Array.isArray(body) && !o.noBullet ? { indent: 12 } : false, breakLine: i < items.length - 1, paraSpaceAfter: o.paraSpace ?? 3 } })),
      { x: x + 0.18, y: by, w: w - 0.32, h: y + h - by - 0.08, fontSize: o.bodySize || 12.5, color: HEX.dk1, valign: "top", margin: 0, isTextBox: true });
  }
}
function takeaway(slide, text, y = 4.72, o = {}) {
  const x = o.x ?? 0.5, w = o.w ?? 9.0;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.42, rectRadius: 0.08, fill: { color: o.fill || "E7F2F2" }, objectName: "takeaway" });
  slide.addText([{ text: `${o.label || "Key idea"}  `, options: { bold: true, color: o.labelColor || HEX.accent1 } }, { text, options: { color: HEX.dk1 } }],
    { x: x + 0.15, y, w: w - 0.3, h: 0.42, fontSize: o.size || 13, valign: "middle", margin: 0, isTextBox: true });
}
function subhead(slide, text, y = 1.03, o = {}) {      // one-line context under the title
  slide.addText(text, { x: o.x ?? 0.5, y, w: o.w ?? 9.0, h: 0.3, fontSize: 12.5, italic: true, color: HEX.accent5, margin: 0, isTextBox: true });
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
    ["Background", "What virtualization is, why it matters, 60 years of history", "Definitions · benefits · timeline · hypervisor types", HEX.dk2],
    ["CPU theory", "When can a CPU be virtualized at all, and why classic x86 could not", "Popek-Goldberg · trap-and-emulate · the x86 problem", HEX.accent1],
    ["Techniques", "Three answers to the x86 problem, plus memory and I/O", "Full virtualization · para-virtualization · VT-x / AMD-V · EPT / NPT · I/O", HEX.accent2],
    ["In practice", "How the techniques compare, where they are used, and a live demo", "Comparison · applications & live migration · demo · conclusion", HEX.accent4],
  ];
  parts.forEach(([t, d, topics, c], i) => {
    const y = 1.12 + i * 0.88;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y, w: 9.0, h: 0.78, rectRadius: 0.08, fill: { color: HEX.lt2 }, objectName: `outline_${i + 1}` });
    s.addShape(pres.shapes.OVAL, { x: 0.68, y: y + 0.17, w: 0.44, h: 0.44, fill: { color: c } });
    s.addText(String(i + 1), { x: 0.68, y: y + 0.17, w: 0.44, h: 0.44, align: "center", valign: "middle", fontSize: 14, bold: true, color: "FFFFFF", margin: 0, isTextBox: true });
    s.addText(t, { x: 1.3, y, w: 2.0, h: 0.78, fontSize: 17, bold: true, color: c, valign: "middle", margin: 0, isTextBox: true });
    s.addText([{ text: d, options: { fontSize: 13.5, color: HEX.dk1, breakLine: true } }, { text: topics, options: { fontSize: 11, color: HEX.accent5 } }],
      { x: 3.35, y, w: 6.0, h: 0.78, valign: "middle", margin: 0, isTextBox: true });
  });
  takeaway(s, "One problem (sensitive instructions that do not trap), three solutions, one live demo.");
}
{
  const s = content(SEC[0], "What is virtualization?");
  card(s, 0.5, 1.15, 5.4, 0.98, "Virtual machine (VM)", "An isolated environment running a complete OS, as if on dedicated hardware.", HEX.dk2, { num: 1, compact: true, bodySize: 13 });
  card(s, 0.5, 2.23, 5.4, 0.98, "Hypervisor / VMM", "The layer that creates VMs and multiplexes CPU, memory and I/O among them.", HEX.accent1, { num: 2, compact: true, bodySize: 13 });
  card(s, 0.5, 3.31, 5.4, 0.98, "Isolation and efficiency", "A fault or attack in one VM must not affect the others or the host.", HEX.accent2, { num: 3, compact: true, bodySize: 13 });
  takeaway(s, "apartments in one building: shared structure, private units", 4.42, { label: "Analogy", w: 5.4, fill: "FDF1DF", labelColor: "9A5F10", size: 12.5 });
  placeholder(s, "datacenter", 6.1, 1.15, 3.4, 3.69, "Modern data-center aisle with server racks (photo-style)");
}
{
  const s = content(SEC[0], "Why it matters");
  const items = [
    ["Consolidation", "Many under-used servers become one well-used host: less hardware, energy and space.", HEX.accent1, "compress"],
    ["Isolation", "Run untrusted code, several OSs and test setups side by side, safely.", HEX.dk2, "shield"],
    ["Flexibility", "VMs are files: snapshot, clone and provision in seconds; scale elastically.", HEX.accent2, "clone"],
    ["Resilience", "Live-migrate running VMs between hosts with no visible downtime.", HEX.accent4, "sync"],
  ];
  items.forEach(([t, d, c, ic], i) => {
    const x = 0.5 + (i % 2) * 2.6, y = 1.15 + Math.floor(i / 2) * 1.77;
    card(s, x, y, 2.45, 1.62, t, d, c, { icon: ic, titleSize: 15, bodySize: 12 });
  });
  placeholder(s, "consolidation", 5.8, 1.15, 3.7, 3.4, "Many idle servers become one busy server running several VMs");
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
  centeredImage(s, "fig_trap_emulate", 1.05, 9.0, 1.62, "Trap and emulate flow");
  card(s, 0.5, 2.8, 4.4, 1.82, "Privileged instruction", ["Traps when executed outside ring 0", "CLI / STI: interrupt flag", "HLT: halt the CPU", "MOV CR3: page-table base", "IN / OUT: device I/O"], HEX.accent1, { compact: true, bodySize: 12 });
  card(s, 5.1, 2.8, 4.4, 1.82, "Sensitive instruction", ["Reads or changes privileged machine state", "POPF: restores flags, including IF", "SGDT / SIDT: descriptor-table addresses", "Page-table writes: the memory map", "On x86, not always privileged (next slide)"], HEX.dk2, { compact: true, bodySize: 12 });
  takeaway(s, "Virtualizable  ⇔  every sensitive instruction is also privileged.");
}
{
  const s = content(SEC[1], "The x86 problem");
  centeredImage(s, "fig_popek_goldberg", 1.05, 8.2, 3.35, "Venn diagrams of sensitive and privileged instructions");
  takeaway(s, "POPF in ring 1 silently drops the IF bit: no trap, wrong behaviour. Three fixes follow.");
}
{
  const s = content(SEC[1], "See it fail: naive trap-and-emulate");
  subhead(s, "A guest kernel runs deprivileged in ring 1 under a classic trap-and-emulate VMM. Here is what happens to each operation:");
  const cell = (t, kind, bold) => ({ text: t, options: { color: OUTC[kind][0], fill: { color: OUTC[kind][1] }, bold: !!bold } });
  const H = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.dk1 } } });
  const code = (t) => ({ text: t, options: { fontFace: "Courier New", bold: true, color: HEX.dk1, fill: { color: HEX.lt2 } } });
  const want = (t) => ({ text: t, options: { color: HEX.dk1, fill: { color: "FFFFFF" } } });
  const rows = [
    [H("Instruction"), H("What the kernel wants"), H("What the VMM sees"), H("Effect on the guest")],
    [code("sgdt [gdt]"), want("read its GDT address"), cell("no trap (sensitive, unprivileged)", "bug", true), cell("reads the HOST's GDT base", "bug")],
    [code("cli / sti"), want("interrupts off / on"), cell("trap → emulated", "trap"), cell("correct", "ok")],
    [code("popf ; IF=0"), want("restore flags: interrupts off"), cell("no trap (sensitive, unprivileged)", "bug", true), cell("IF stays 1: critical section runs unmasked", "bug")],
    [code("mov cr3, ..."), want("switch process, edit page table"), cell("trap → emulated + shadow sync", "trap"), cell("correct, but expensive", "ok")],
    [code("out / hlt"), want("print a character, halt"), cell("trap → emulated", "trap"), cell("correct", "ok")],
  ];
  s.addTable(rows, { x: 0.5, y: 1.4, w: 6.15, colW: [1.25, 1.5, 1.7, 1.7], fontSize: 10.5, fontFace: THEME.bodyFontFace, border: { type: "solid", pt: 0.75, color: "D5DDE6" }, valign: "middle", rowH: 0.5 });
  [["SGDT result", "0x1000", "0xffff8000 (host!)"], ["Critical work done masked", "2", "1"]].forEach(([t, n, v], i) => {
    const y = 1.4 + i * 1.55;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.85, y, w: 2.65, h: 1.4, rectRadius: 0.08, fill: { color: "FBE9E5" } });
    s.addText([{ text: t, options: { bold: true, color: HEX.dk1, fontSize: 13, breakLine: true } }, { text: `native: ${n}`, options: { color: HEX.accent5, fontSize: 12, breakLine: true } },
      { text: `VM: ${v}`, options: { color: HEX.accent4, fontSize: 15, bold: true } }], { x: 7.0, y, w: 2.4, h: 1.4, valign: "middle", margin: 0, isTextBox: true });
  });
  takeaway(s, "Equivalence violated, and the VMM never noticed: POPF and SGDT never trapped.");
}
{
  const s = content(SEC[1], "Full virtualization: binary translation");
  const steps = [["Guest kernel", "basic block with POPF / CLI"], ["Translator", "rewrites sensitive instructions"], ["Translation cache", "reused on every later execution"], ["Runs natively", "ring 1, near full speed"]];
  steps.forEach(([t, d], i) => {
    const x = 0.5 + i * 2.33;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.08, w: 1.95, h: 0.8, rectRadius: 0.08, fill: { color: [HEX.dk2, HEX.accent1, HEX.accent1, HEX.accent5][i] } });
    s.addText([{ text: `${i + 1}. ${t}`, options: { bold: true, fontSize: 13.5, breakLine: true } }, { text: d, options: { fontSize: 10.5 } }],
      { x: x + 0.08, y: 1.08, w: 1.8, h: 0.8, color: "FFFFFF", align: "center", valign: "middle", margin: 0, isTextBox: true });
    if (i < 3) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 2.0, y: 1.33, w: 0.28, h: 0.3, fill: { color: HEX.accent2 }, line: { color: HEX.accent2, width: 0 }, objectName: `arrow_${i}` });
  });
  const H = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.dk1 } } });
  const code = (t, changed) => ({ text: t, options: { fontFace: "Courier New", bold: true, color: changed ? "9A5F10" : HEX.dk1, fill: { color: changed ? "FDF1DF" : HEX.lt2 } } });
  const why = (t, changed) => ({ text: t, options: { color: changed ? "9A5F10" : HEX.accent5, bold: !!changed, fill: { color: "FFFFFF" } } });
  const rows = [
    [H("Original guest code"), H("Translated code (what runs)"), H("Why")],
    [code("mov  eax, [flags]"), code("mov  eax, [flags]"), why("copied as-is")],
    [code("push eax"), code("push eax"), why("copied as-is")],
    [code("popf"), code("call vmm_popf", 1), why("updates the virtual IF", 1)],
    [code("cli"), code("mov  [vcpu.IF], 0", 1), why("in-line, no trap", 1)],
    [code("mov  cr3, ebx"), code("call vmm_set_cr3", 1), why("VMM swaps shadow tables", 1)],
    [code("add  ecx, 1"), code("add  ecx, 1"), why("copied as-is")],
  ];
  s.addTable(rows, { x: 0.5, y: 2.05, w: 6.05, colW: [1.85, 2.15, 2.05], fontSize: 11, fontFace: THEME.bodyFontFace, border: { type: "solid", pt: 0.75, color: "D5DDE6" }, valign: "middle", rowH: 0.35 });
  card(s, 6.75, 2.05, 2.75, 2.5, "Trade-offs", ["+  Unmodified guest OS (even Windows)", "+  No CPU support needed", "−  Translation overhead", "−  Very complex VMM", "−  Shadow-paging costs"], HEX.accent4, { noBullet: true, compact: true, bodySize: 12, paraSpace: 6 });
  takeaway(s, "User code runs directly; only guest-kernel code is translated, once, and then cached.");
}
{
  const s = content(SEC[1], "Shadow page tables");
  const y = 1.08;
  const nodes = [["GVA", "guest virtual", HEX.lt2, HEX.dk1], ["GPA", "guest 'physical'", HEX.dk2, "FFFFFF"], ["HPA", "real memory", HEX.accent5, "FFFFFF"]];
  nodes.forEach(([t, d, f, c], i) => {
    const x = 0.7 + i * 3.2;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 1.7, h: 0.75, rectRadius: 0.08, fill: { color: f }, line: { color: HEX.dk2, width: 1 } });
    s.addText([{ text: t, options: { bold: true, fontSize: 17, breakLine: true } }, { text: d, options: { fontSize: 10.5 } }], { x, y, w: 1.7, h: 0.75, align: "center", valign: "middle", color: c, margin: 0, isTextBox: true });
  });
  s.addText("guest page table", { x: 2.45, y: y + 0.02, w: 1.4, h: 0.3, fontSize: 11, color: HEX.dk2, align: "center", margin: 0, isTextBox: true });
  s.addShape(pres.shapes.LINE, { x: 2.45, y: y + 0.38, w: 1.4, h: 0, line: { color: HEX.dk2, width: 2, endArrowType: "triangle" } });
  s.addText("VMM's mapping", { x: 5.65, y: y + 0.02, w: 1.4, h: 0.3, fontSize: 11, color: HEX.accent5, align: "center", margin: 0, isTextBox: true });
  s.addShape(pres.shapes.LINE, { x: 5.65, y: y + 0.38, w: 1.4, h: 0, line: { color: HEX.accent5, width: 2, endArrowType: "triangle" } });
  s.addShape(pres.shapes.LINE, { x: 1.55, y: y + 0.9, w: 6.4, h: 0, line: { color: HEX.accent2, width: 2.5, dashType: "dash", endArrowType: "triangle" } });
  s.addText("Shadow page table: GVA → HPA in one step, kept in sync by the VMM (guest page tables write-protected)", { x: 0.5, y: y + 0.95, w: 9.0, h: 0.3, fontSize: 12.5, bold: true, color: HEX.accent2, align: "center", margin: 0, isTextBox: true });
  s.addText("When the guest edits one of its page tables:", { x: 0.5, y: 2.42, w: 9.0, h: 0.28, fontSize: 12.5, bold: true, color: HEX.dk1, margin: 0, isTextBox: true });
  [["1", "Guest writes a page-table entry", HEX.dk2], ["2", "The page is write-protected: the fault traps to the VMM", HEX.accent2], ["3", "VMM updates the shadow table, then resumes the guest", HEX.accent1]].forEach(([n, t, c], i) => {
    const x = 0.5 + i * 3.12;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.75, w: 2.76, h: 0.75, rectRadius: 0.08, fill: { color: c } });
    s.addText([{ text: `${n}  `, options: { bold: true, fontSize: 16 } }, { text: t, options: { fontSize: 12 } }], { x: x + 0.12, y: 2.75, w: 2.55, h: 0.75, color: "FFFFFF", valign: "middle", margin: 0, isTextBox: true });
    if (i < 2) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 2.8, y: 2.98, w: 0.28, h: 0.3, fill: { color: HEX.accent5 }, line: { color: HEX.accent5, width: 0 } });
  });
  card(s, 0.5, 3.65, 4.4, 1.0, "Cheap", ["TLB miss = normal 4-step walk", "Works without any CPU support"], HEX.accent6, { compact: true, bodySize: 12 });
  card(s, 5.1, 3.65, 4.4, 1.0, "Expensive", ["Every guest page-table write traps", "Every process switch (CR3 load) traps"], HEX.accent4, { compact: true, bodySize: 12 });
}

// ================================================================== Para- and hardware-assisted
pres.addSection({ title: SEC[2] });
{
  const s = content(SEC[2], "Para-virtualization");
  subhead(s, "Xen (2003): the guest kernel is ported to call the hypervisor explicitly. The same operations, before and after porting Linux (about 3,000 lines changed):");
  image(s, "fig_xen", 0.5, 1.48, 3.7, 2.75, "Xen architecture: Dom0, modified guests, hypervisor");
  const H = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.dk1 } } });
  const op = (t) => ({ text: t, options: { bold: true, color: HEX.dk1, fill: { color: HEX.lt2 } } });
  const nat = (t) => ({ text: t, options: { fontFace: "Courier New", color: HEX.dk1, fill: { color: "FFFFFF" } } });
  const pv = (c, note) => ({ text: [{ text: c, options: { fontFace: "Courier New", bold: true, color: HEX.accent1, breakLine: true } }, { text: note, options: { fontSize: 9.5, color: HEX.accent5 } }], options: { fill: { color: "E3F2F2" } } });
  const rows = [
    [H("Operation"), H("Native kernel"), H("Para-virtualized kernel")],
    [op("Disable interrupts"), nat("cli"), pv("evtchn_mask = 1;", "a write to a page shared with Xen: no trap")],
    [op("Switch process"), nat("mov cr3, eax"), pv("HYPERVISOR_mmuext_op()", "one explicit hypercall")],
    [op("Update N page-table entries"), nat("N x mov [pte], v"), pv("HYPERVISOR_mmu_update(N)", "N updates batched into one call")],
    [op("Send a network packet"), nat("write NIC registers"), pv("netfront → ring → netback", "split driver: Dom0 drives the real NIC")],
  ];
  s.addTable(rows, { x: 4.4, y: 1.48, w: 5.1, colW: [1.3, 1.35, 2.45], fontSize: 10.5, fontFace: THEME.bodyFontFace, border: { type: "solid", pt: 0.75, color: "D5DDE6" }, valign: "middle", rowH: [0.34, 0.6, 0.6, 0.6, 0.6] });
  card(s, 0.5, 4.32, 4.4, 0.5, "+ Near-native speed, simpler VMM", null, HEX.accent6, { compact: true, titleSize: 14 });
  card(s, 5.1, 4.32, 4.4, 0.5, "− Guest kernel must be modified", null, HEX.accent4, { compact: true, titleSize: 14 });
}
{
  const s = content(SEC[2], "Hardware-assisted virtualization");
  centeredImage(s, "fig_vtx", 1.05, 8.4, 3.4, "Intel VT-x architecture and VMCS");
  takeaway(s, "Unmodified guest in ring 0 on its own CPU state; the VMCS decides what causes a VM exit.");
}
{
  const s = content(SEC[2], "Instruction by instruction: BT vs PV vs VT-x");
  subhead(s, "The same guest-kernel fragment, seven sensitive operations: what each technique does with them.");
  const c = (t, kind) => ({ text: t, options: { color: OUTC[kind][0], fill: { color: OUTC[kind][1] }, bold: kind === "bug", align: "center" } });
  const H = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.dk1 }, align: "center" } });
  const code = (t) => ({ text: t, options: { fontFace: "Courier New", bold: true, color: HEX.dk1, fill: { color: HEX.lt2 } } });
  const pur = (t) => ({ text: t, options: { color: HEX.accent5, fill: { color: "FFFFFF" } } });
  const rows = [
    [H("Instruction"), H("Purpose"), H("Naive trap-and-emulate"), H("Binary translation"), H("Para-virtualization"), H("VT-x + EPT")],
    [code("sgdt"), pur("read GDT address"), c("no trap (bug)", "bug"), c("translated in-line", "tr"), c("shared page", "pv"), c("runs natively", "ok")],
    [code("cli / sti"), pur("interrupts off / on"), c("trap", "trap"), c("translated in-line", "tr"), c("shared page", "pv"), c("runs natively", "ok")],
    [code("popf"), pur("restore flags (IF)"), c("no trap (bug)", "bug"), c("translated in-line", "tr"), c("shared page", "pv"), c("runs natively", "ok")],
    [code("mov cr3"), pur("switch process"), c("trap", "trap"), c("call-out to VMM", "tr"), c("hypercall", "pv"), c("runs natively*", "ok")],
    [code("PTE write"), pur("edit page table"), c("trap (shadow sync)", "trap"), c("trap (shadow sync)", "trap"), c("hypercall (batched)", "pv"), c("runs natively*", "ok")],
    [code("out"), pur("device I/O"), c("trap", "trap"), c("call-out to VMM", "tr"), c("hypercall", "pv"), c("VM exit", "trap")],
    [code("hlt"), pur("halt the CPU"), c("trap", "trap"), c("call-out to VMM", "tr"), c("hypercall", "pv"), c("VM exit", "trap")],
  ];
  s.addTable(rows, { x: 0.5, y: 1.4, w: 9.0, colW: [1.15, 1.45, 1.65, 1.6, 1.6, 1.55], fontSize: 11, fontFace: THEME.bodyFontFace, border: { type: "solid", pt: 0.75, color: "FFFFFF" }, valign: "middle", rowH: 0.37 });
  s.addText("* without EPT (first-generation VT-x): VM exit + shadow page-table sync", { x: 0.5, y: 4.4, w: 9.0, h: 0.26, fontSize: 10.5, italic: true, color: HEX.accent5, margin: 0, isTextBox: true });
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
    [rowLbl("Performance"), "Good; slower when kernel-heavy", "Near native", "Near native (2nd gen.)"],
    [rowLbl("VMM complexity"), "Very high", "Moderate", "Lowest"],
    [rowLbl("Examples"), "VMware (early), VirtualBox", "Xen PV, virtio", "KVM, Hyper-V, ESXi"],
    [rowLbl("Best suited for"), "No VT-x; unmodified OSs", "Open-source guests; I/O drivers", "Cloud, servers, desktops today"],
  ];
  s.addTable(rows, { x: 0.5, y: 1.15, w: 9.0, colW: [1.8, 2.45, 2.25, 2.5], fontSize: 12, color: HEX.dk1, border: { type: "solid", pt: 0.75, color: "C9D3DD" }, valign: "middle", rowH: 0.38, fontFace: THEME.bodyFontFace });
  takeaway(s, "Modern hypervisors are hybrids: hardware-assisted CPU and memory + para-virtual I/O.");
}
{
  const s = content(SEC[3], "Applications and live migration");
  card(s, 0.5, 1.15, 4.1, 3.45, "Where virtualization is used", null, HEX.dk2, { titleSize: 16 });
  [["cloud", "Cloud (IaaS)", "VMs are the unit you rent", HEX.accent1], ["server", "Data centers", "consolidation and elasticity", HEX.dk2],
    ["flask", "Development & testing", "snapshots, disposable sandboxes", HEX.accent2], ["shield", "Security", "isolate tenants and untrusted code", HEX.accent4],
    ["sync", "Disaster recovery", "replicate and migrate running VMs", HEX.accent6]].forEach(([ic, t, d, c], i) => {
    const y = 1.78 + i * 0.56;
    s.addShape(pres.shapes.OVAL, { x: 0.7, y, w: 0.4, h: 0.4, fill: { color: c } });
    s.addImage({ path: ICON(ic), x: 0.79, y: y + 0.09, w: 0.22, h: 0.22 });
    s.addText([{ text: t, options: { bold: true, color: HEX.dk1, fontSize: 13, breakLine: true } }, { text: d, options: { color: HEX.accent5, fontSize: 11 } }],
      { x: 1.22, y: y - 0.06, w: 3.25, h: 0.52, valign: "middle", margin: 0, isTextBox: true });
  });
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
    ["1  Host check", "Does this CPU support VT-x / AMD-V?", ["[yes] vmx   Intel VT-x", "/dev/kvm present: yes"]],
    ["2  The x86 problem", "Naive VMM vs real hardware", ["GDTR 0x1000 vs 0xffff8000", "IF=0 work 28 vs 20 MISMATCH"]],
    ["3  Five engines", "Same guest kernel, 5 techniques", ["Para-virt.   2.07x  correct", "VT-x + EPT   3.05x  correct"]],
    ["4  Memory", "Shadow vs nested paging", ["native walk:   4 refs", "nested walk:  24 refs"]],
    ["5  Live migration", "Pre-copy rounds and downtime", ["pre-copy :    77 ms down", "stop&copy: 34375 ms down"]],
    ["6  Real KVM", "Our own VMM via /dev/kvm", ["> Hello from a KVM guest!", "KVM_EXIT_IO=24  HLT=1"]],
  ];
  const cols = [HEX.accent5, HEX.accent4, HEX.dk2, HEX.accent1, HEX.accent2, HEX.accent6];
  steps.forEach(([t, d, out], i) => {
    const x = 0.5 + (i % 3) * 3.05, y = 1.1 + Math.floor(i / 3) * 1.48;
    card(s, x, y, 2.9, 1.36, t, null, cols[i], { compact: true, titleSize: 14 });
    s.addText(d, { x: x + 0.18, y: y + 0.44, w: 2.6, h: 0.24, fontSize: 11, color: HEX.dk1, margin: 0, isTextBox: true });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.12, y: y + 0.74, w: 2.66, h: 0.52, rectRadius: 0.05, fill: { color: HEX.dk1 } });
    s.addText(out.map((l, k) => ({ text: l, options: { breakLine: k === 0, color: k === 0 ? "F2C57C" : "CADCFC" } })),
      { x: x + 0.2, y: y + 0.74, w: 2.55, h: 0.52, fontFace: "Courier New", fontSize: 9.5, valign: "middle", margin: 0, isTextBox: true });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.1, w: 9.0, h: 0.55, rectRadius: 0.08, fill: { color: HEX.dk1 } });
  s.addText([{ text: "$ ", options: { color: "8FA3C7" } }, { text: "cd demo && python -m vdemo tour", options: { color: "F2C57C", bold: true } },
    { text: "   # or: check | popf | cpu | memory | migrate | kvm", options: { color: "8FA3C7" } }],
    { x: 0.7, y: 4.1, w: 8.6, h: 0.55, fontFace: "Courier New", fontSize: 11.5, valign: "middle", margin: 0, isTextBox: true });
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
  const s = pres.addSlide({ masterName: "DARK_FREE", sectionTitle: SEC[3] });
  s.addText("Conclusion", { x: 0.6, y: 0.45, w: 5.6, h: 0.7, fontSize: 34, bold: true, color: "FFFFFF", fontFace: THEME.headFontFace, margin: 0, isTextBox: true });
  s.addText("One problem: sensitive instructions that do not trap. Three solutions that now coexist:", { x: 0.6, y: 1.2, w: 5.6, h: 0.7, fontSize: 16, color: "CADCFC", margin: 0, isTextBox: true });
  s.addText(["Full virtualization rewrote the code", "Para-virtualization rewrote the source", "Hardware assistance changed the CPU"].map((t, i, a) => ({ text: t, options: { bullet: { type: "number" }, breakLine: i < a.length - 1 } })),
    { x: 0.6, y: 1.98, w: 5.6, h: 1.05, fontSize: 14.5, color: "FFFFFF", margin: 0, isTextBox: true, paraSpaceAfter: 5 });
  s.addText("Perspectives", { x: 0.6, y: 3.18, w: 5.6, h: 0.3, fontSize: 15, bold: true, color: "F2C57C", margin: 0, isTextBox: true });
  [["Confidential VMs", "SEV-SNP, TDX: memory hidden even from the hypervisor"], ["MicroVMs", "Firecracker: VM isolation at container speed"], ["Nested virtualization", "hypervisors running inside VMs"], ["Beyond x86", "ARM EL2, RISC-V H-extension"]].forEach(([t, d], i) => {
    const x = 0.6 + (i % 2) * 2.85, y = 3.55 + Math.floor(i / 2) * 0.68;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.72, h: 0.6, rectRadius: 0.06, fill: { color: "2B3A5C" } });
    s.addText([{ text: t, options: { bold: true, color: "FFFFFF", fontSize: 12, breakLine: true } }, { text: d, options: { color: "CADCFC", fontSize: 9.5 } }],
      { x: x + 0.12, y, w: 2.52, h: 0.6, valign: "middle", margin: 0, isTextBox: true });
  });
  placeholder(s, "future", 6.55, 0.55, 2.95, 4.17, "A virtual-machine panel protected inside a glowing padlock shield (confidential computing)", true);
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
    "A. Kivity et al., \"kvm: the Linux virtual machine monitor,\" Ottawa Linux Symp., 2007.",
    "R. Bhargava et al., \"Accelerating two-dimensional page walks for virtualized systems,\" ASPLOS, 2008.",
    "R. Russell, \"virtio: towards a de-facto standard for virtual I/O devices,\" ACM SIGOPS OSR, 2008.",
    "C. Clark et al., \"Live migration of virtual machines,\" NSDI, 2005.",
  ];
  [refs.slice(0, 5), refs.slice(5)].forEach((col, k) => {
    s.addText(col.map((r, i) => ({ text: r, options: { bullet: { type: "number", numberStartAt: k * 5 + 1 }, breakLine: i < col.length - 1, paraSpaceAfter: 8 } })),
      { x: 0.5 + k * 3.5, y: 1.1, w: 3.35, h: 3.1, fontSize: 11, color: HEX.dk1, valign: "top", margin: 0, isTextBox: true });
  });
  takeaway(s, "QEMU · KVM · Xen · VirtualBox · VMware Workstation Player · Firecracker", 4.3, { label: "Tools you can try", w: 6.85, size: 12 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.55, y: 1.1, w: 1.95, h: 3.62, rectRadius: 0.1, fill: { color: HEX.dk1 } });
  s.addText([{ text: "Questions?", options: { fontSize: 24, bold: true, color: "FFFFFF", breakLine: true } }, { text: "Thank you", options: { fontSize: 13, color: "CADCFC" } }],
    { x: 7.6, y: 1.1, w: 1.85, h: 3.62, align: "center", valign: "middle", margin: 0, isTextBox: true });
}

// ------------------------------------------------------------------ write
(async () => {
  const out = path.join(__dirname, "Virtualization_in_OS.pptx");
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("wrote", out);
})();
