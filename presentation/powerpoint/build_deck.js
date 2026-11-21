/**
 * Builds the 20-minute PowerPoint deck.
 *
 *   node presentation/powerpoint/build_deck.js
 *   -> presentation/powerpoint/Virtualization_in_OS.pptx
 *
 * Structure: theme -> layouts -> sections (one per member) -> slides with speaker notes.
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
const MEMBER_COLORS = [HEX.dk2, HEX.accent1, HEX.accent2, HEX.accent4];

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = `${team.title}: ${team.subtitle}`;
pres.author = team.members.map((m) => m.name).join(", ");
pres.subject = team.course;
const C = pres.SchemeColor;

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
function badge(slide, m) {
  const col = MEMBER_COLORS[m - 1];
  slide.addShape(pres.shapes.OVAL, { x: 9.0, y: 0.33, w: 0.6, h: 0.6, fill: { color: col }, objectName: `speaker_badge_M${m}` });
  slide.addText(`M${m}`, { x: 9.0, y: 0.33, w: 0.6, h: 0.6, align: "center", valign: "middle", fontSize: 14, bold: true, color: "FFFFFF", margin: 0, isTextBox: true });
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
    slide.addText(items.map((t, i) => ({ text: t, options: { bullet: Array.isArray(body) ? { indent: 12 } : false, breakLine: i < items.length - 1, paraSpaceAfter: 3 } })),
      { x: x + 0.18, y: y + 0.66, w: w - 0.32, h: h - 0.78, fontSize: o.bodySize || 12.5, color: HEX.dk1, valign: "top", margin: 0, isTextBox: true });
  }
}
function takeaway(slide, text, y = 4.72) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y, w: 9.0, h: 0.42, rectRadius: 0.08, fill: { color: "E7F2F2" }, objectName: "takeaway" });
  slide.addText([{ text: "Key idea  ", options: { bold: true, color: HEX.accent1 } }, { text, options: { color: HEX.dk1 } }],
    { x: 0.65, y, w: 8.7, h: 0.42, fontSize: 13, valign: "middle", margin: 0, isTextBox: true });
}
function content(section, m, title, notes) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  badge(s, m);
  s.addNotes(`[${team.members[m - 1].name} - M${m}]\n${notes}`);
  return s;
}
const SEC = [
  `M1 - Introduction & background (${team.members[0].name})`,
  `M2 - CPU virtualization & full virtualization (${team.members[1].name})`,
  `M3 - Para- & hardware-assisted virtualization (${team.members[2].name})`,
  `M4 - Comparison, applications, demo & conclusion (${team.members[3].name})`,
];

// ================================================================== M1
pres.addSection({ title: SEC[0] });
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: SEC[0] });
  s.addText(team.title, { placeholder: "title" });
  s.addText(team.subtitle, { placeholder: "body" });
  s.addText(team.members.map((m) => m.name).join("   |   "), { x: 0.6, y: 4.15, w: 5.8, h: 0.35, fontSize: 13, color: "FFFFFF", margin: 0, isTextBox: true });
  s.addText(`${team.course}  -  ${team.university}  -  ${team.date}`, { x: 0.6, y: 4.5, w: 5.8, h: 0.3, fontSize: 11, color: "8FA3C7", margin: 0, isTextBox: true });
  placeholder(s, "hero", 6.6, 0.75, 2.9, 4.1, "Abstract illustration: one physical server splitting into several glowing, isolated virtual machines", true);
  s.addNotes(`[${team.members[0].name} - M1]\nGood morning. Our topic is virtualization in operating systems, and in particular the three techniques that make it possible: full virtualization, para-virtualization and hardware-assisted virtualization. We are four presenters; I will introduce the topic and the background, then hand over.`);
}
{
  const s = content(SEC[0], 1, "Objectives and roadmap", "Objectives: (1) understand what virtualization is and why it matters, (2) understand the theory that decides whether a CPU can be virtualized, (3) explain full, para- and hardware-assisted virtualization and their trade-offs, (4) see them working in a live demo. Introduce each speaker and their part.");
  const slots = ["0:00-4:30", "4:30-9:15", "9:15-14:00", "14:00-20:00"];
  const topics = [
    ["What & why", "History", "Hypervisor types"],
    ["Popek-Goldberg", "Trap-and-emulate", "x86 problem", "Binary translation"],
    ["Para-virtualization", "VT-x / AMD-V", "EPT / NPT", "I/O virtualization"],
    ["Comparison", "Applications & migration", "Live demo", "Conclusion"],
  ];
  team.members.forEach((m, i) => {
    const x = 0.5 + i * 2.28;
    card(s, x, 1.25, 2.12, 3.2, m.name, topics[i], MEMBER_COLORS[i], { num: `M${i + 1}`.slice(1), bodySize: 12.5 });
    s.addText(slots[i], { x: x + 0.18, y: 4.0, w: 1.8, h: 0.3, fontSize: 11, color: HEX.accent5, italic: true, margin: 0, isTextBox: true });
  });
  takeaway(s, "One problem (sensitive instructions that do not trap), three solutions, one live demo.");
}
{
  const s = content(SEC[0], 1, "What is virtualization?", "Definition: creating virtual rather than physical versions of resources - CPU, memory, storage, network. A virtual machine is an isolated environment that runs a full OS and believes it owns the hardware. The hypervisor, or virtual machine monitor, is the software layer that creates VMs, allocates resources and enforces isolation. Emphasise: every VM shares the same physical hardware, yet none can see or harm the others.");
  card(s, 0.5, 1.2, 5.3, 1.0, "Virtual machine (VM)", "An isolated environment running a complete OS, as if on dedicated hardware.", HEX.dk2, { num: 1 });
  card(s, 0.5, 2.35, 5.3, 1.0, "Hypervisor / VMM", "The layer that creates VMs and multiplexes CPU, memory and I/O among them.", HEX.accent1, { num: 2 });
  card(s, 0.5, 3.5, 5.3, 1.0, "Isolation and efficiency", "A fault or attack in one VM must not affect the others or the host.", HEX.accent2, { num: 3 });
  placeholder(s, "datacenter", 6.1, 1.2, 3.4, 3.3, "Modern data-center aisle with server racks (photo-style)");
}
{
  const s = content(SEC[0], 1, "Why it matters", "Benefits listed in the brief: better resource utilization, lower hardware cost, scalability and flexibility, isolation for testing, and disaster recovery through live migration. These are why clouds, data centers and developers all use VMs. Mention that our demo shows a live migration with about 77 ms of downtime.");
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
  const s = content(SEC[0], 1, "60 years of virtualization", "IBM CP-40/CP-67 (1967) and VM/370 (1972) on mainframes. Popek and Goldberg formalized the requirements in 1974. On PCs, x86 was considered non-virtualizable until VMware (1999) used binary translation. Xen (2003) introduced para-virtualization. Intel VT-x (2005) and AMD-V (2006) added hardware support, followed by nested paging (2007-2008) and KVM in Linux (2007). Today: containers, microVMs and confidential VMs.");
  centeredImage(s, "fig_timeline", 1.15, 9.0, 3.4, "Timeline from IBM CP-67 to confidential VMs");
  takeaway(s, "Each era answered the same question: how do we run an OS on hardware it does not own?");
}
{
  const s = content(SEC[0], 1, "Hypervisor types", "Type 1 (bare-metal) hypervisors run directly on hardware: ESXi, Xen, Hyper-V; they are used in servers and clouds. Type 2 (hosted) hypervisors run as applications on a host OS: VirtualBox, VMware Workstation. KVM is special: a Linux kernel module turns Linux itself into a Type 1 hypervisor, and QEMU provides the devices. Hand over to M2: 'How can a hypervisor control a CPU that the guest believes it owns?'");
  centeredImage(s, "fig_hypervisor_types", 1.1, 8.6, 3.55, "Type 1 vs Type 2 hypervisor stacks");
  takeaway(s, "Type 1 sits on the hardware (servers, cloud); Type 2 sits on an OS (desktops).");
}

// ================================================================== M2
pres.addSection({ title: SEC[1] });
{
  const s = content(SEC[1], 2, "What must a hypervisor virtualize?", "Three resources: the CPU, memory and I/O. For the CPU, Popek and Goldberg (1974) define a VMM by three properties. Equivalence: the guest behaves exactly as on real hardware. Resource control: the VMM stays in charge of all resources. Efficiency: most instructions run directly on the CPU. Efficiency is what separates virtualization from slow emulation.");
  ["CPU", "Memory", "I/O devices"].forEach((t, i) => {
    const d = ["privileged state and instructions", "address translation, page tables", "devices, interrupts, DMA"][i];
    card(s, 0.5, 1.2 + i * 1.12, 3.4, 0.98, t, d, [HEX.dk2, HEX.accent1, HEX.accent5][i], { titleSize: 16 });
  });
  s.addText("Popek & Goldberg (1974): a VMM must provide", { x: 4.3, y: 1.15, w: 5.2, h: 0.4, fontSize: 15, bold: true, color: HEX.dk1, margin: 0, isTextBox: true });
  [["Equivalence", "a program behaves as on bare hardware"], ["Resource control", "the VMM is always in charge"], ["Efficiency", "most instructions run natively, no VMM"]].forEach(([t, d], i) => {
    card(s, 4.3, 1.62 + i * 0.95, 5.2, 0.82, t, null, HEX.accent1, { num: i + 1, titleSize: 15 });
    s.addText(d, { x: 6.55, y: 1.62 + i * 0.95, w: 2.85, h: 0.82, fontSize: 12.5, color: HEX.dk1, valign: "middle", margin: 0, isTextBox: true });
  });
}
{
  const s = content(SEC[1], 2, "Trap-and-emulate", "Privileged instructions trap when run outside ring 0. Sensitive instructions touch privileged state. Theorem: if every sensitive instruction is privileged, we can build a VMM. Run the guest kernel deprivileged; ordinary instructions run natively, and every sensitive instruction traps to the VMM, which emulates it on a virtual CPU and resumes the guest. Walk through the CLI example in the diagram.");
  centeredImage(s, "fig_trap_emulate", 1.1, 8.8, 1.85, "Trap and emulate flow");
  card(s, 0.5, 3.1, 4.4, 1.45, "Privileged instruction", "Traps if executed outside ring 0 (e.g. CLI, HLT, MOV CR3).", HEX.accent1, { titleSize: 15 });
  card(s, 5.1, 3.1, 4.4, 1.45, "Sensitive instruction", "Reads or changes privileged machine state (e.g. interrupt flag, page tables).", HEX.dk2, { titleSize: 15 });
  takeaway(s, "Virtualizable  <=>  sensitive instructions are a subset of privileged instructions.");
}
{
  const s = content(SEC[1], 2, "The x86 problem", "On classic x86, 17 instructions are sensitive but not privileged (Robin and Irvine, 2000). POPF executed in ring 1 silently ignores the interrupt-flag bit: no trap, no error. The guest believes interrupts are disabled while they are not. SGDT reveals the host's descriptor table. The VMM never notices, so equivalence is violated. Our demo step 2 shows exactly this.");
  centeredImage(s, "fig_popek_goldberg", 1.05, 8.2, 3.35, "Venn diagrams of sensitive and privileged instructions");
  takeaway(s, "POPF in ring 1 silently drops the IF bit: no trap, wrong behaviour. Three fixes follow.");
}
{
  const s = content(SEC[1], 2, "Full virtualization: binary translation", "VMware, 1999. The guest is unmodified. User code runs directly. Kernel code is translated on the fly, one basic block at a time, the first time it executes; results go into a translation cache. Most instructions are copied as-is; sensitive ones become safe in-line sequences or call-outs to the VMM. No trap is needed for POPF anymore. Note: full virtualization is not emulation - QEMU TCG or Bochs translate everything and are much slower.");
  const steps = [["Guest kernel", "basic block\nPOPF / CLI ..."], ["Translator", "rewrite sensitive\ninstructions"], ["Translation cache", "reuse on every\nlater execution"], ["Run natively", "ring 1, near\nfull speed"]];
  steps.forEach(([t, d], i) => {
    const x = 0.5 + i * 2.33;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.2, w: 1.95, h: 1.15, rectRadius: 0.08, fill: { color: [HEX.dk2, HEX.accent1, HEX.accent1, HEX.accent5][i] } });
    s.addText([{ text: t, options: { bold: true, fontSize: 14, breakLine: true } }, { text: d.replace("\n", " "), options: { fontSize: 11.5 } }],
      { x: x + 0.08, y: 1.2, w: 1.8, h: 1.15, color: "FFFFFF", align: "center", valign: "middle", margin: 0, isTextBox: true });
    if (i < 3) s.addShape(pres.shapes.RIGHT_TRIANGLE, { x: x + 2.02, y: 1.62, w: 0.24, h: 0.3, rotate: 0, fill: { color: HEX.accent2 }, flipH: false, objectName: `arrow_${i}` });
  });
  card(s, 0.5, 2.6, 4.4, 1.95, "How it works", ["Unmodified guest OS (even Windows)", "User code: direct execution", "Kernel code: translated once, cached", "popf  ->  call vmm_popf (no trap)"], HEX.accent1);
  card(s, 5.1, 2.6, 4.4, 1.95, "Trade-offs", ["+ Works on any x86, no CPU support needed", "- Translation overhead", "- Very complex VMM", "- Costly page-table tracing (next slide)"], HEX.accent4);
}
{
  const s = content(SEC[1], 2, "Shadow page tables", "The guest believes it maps virtual to physical addresses; the real memory is elsewhere. The VMM builds shadow page tables mapping guest virtual addresses directly to host physical addresses and loads them into the MMU. To keep them in sync, it write-protects the guest page tables and intercepts every update and every CR3 switch. A TLB miss is cheap, but fork-heavy or context-switch-heavy workloads become expensive. Hand over to M3: 'What if we change the guest, or the CPU, instead?'");
  const y = 1.35;
  const nodes = [["GVA", "guest virtual", HEX.lt2, HEX.dk1], ["GPA", "guest 'physical'", HEX.dk2, "FFFFFF"], ["HPA", "real memory", HEX.accent5, "FFFFFF"]];
  nodes.forEach(([t, d, f, c], i) => {
    const x = 0.7 + i * 3.2;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 1.7, h: 0.85, rectRadius: 0.08, fill: { color: f }, line: { color: HEX.dk2, width: 1 } });
    s.addText([{ text: t, options: { bold: true, fontSize: 18, breakLine: true } }, { text: d, options: { fontSize: 11 } }], { x, y, w: 1.7, h: 0.85, align: "center", valign: "middle", color: c, margin: 0, isTextBox: true });
  });
  s.addText("guest page table", { x: 2.45, y: y + 0.05, w: 1.4, h: 0.3, fontSize: 11, color: HEX.dk2, align: "center", margin: 0, isTextBox: true });
  s.addShape(pres.shapes.LINE, { x: 2.45, y: y + 0.43, w: 1.4, h: 0, line: { color: HEX.dk2, width: 2, endArrowType: "triangle" } });
  s.addText("VMM's map", { x: 5.65, y: y + 0.05, w: 1.4, h: 0.3, fontSize: 11, color: HEX.accent5, align: "center", margin: 0, isTextBox: true });
  s.addShape(pres.shapes.LINE, { x: 5.65, y: y + 0.43, w: 1.4, h: 0, line: { color: HEX.accent5, width: 2, endArrowType: "triangle" } });
  s.addShape(pres.shapes.LINE, { x: 1.55, y: y + 1.05, w: 6.4, h: 0, line: { color: HEX.accent2, width: 2.5, dashType: "dash", endArrowType: "triangle" } });
  s.addText("Shadow page table: GVA -> HPA in one step (what the real MMU uses)", { x: 1.55, y: y + 1.1, w: 6.4, h: 0.32, fontSize: 12.5, bold: true, color: HEX.accent2, align: "center", margin: 0, isTextBox: true });
  card(s, 0.5, 3.0, 4.4, 1.55, "Cheap", ["TLB miss = normal 4-step walk", "Works without any CPU support"], HEX.accent6);
  card(s, 5.1, 3.0, 4.4, 1.55, "Expensive", ["Every guest page-table write traps", "Every process switch (CR3) traps"], HEX.accent4);
}

// ================================================================== M3
pres.addSection({ title: SEC[2] });
{
  const s = content(SEC[2], 3, "Para-virtualization", "Xen, 2003. Instead of hiding the hypervisor, the guest kernel is modified to cooperate with it. Sensitive operations become hypercalls - like system calls, but to the hypervisor. Disabling interrupts becomes a write to a shared page: no trap at all. Page-table updates are batched into one multicall. Devices use split drivers: a front-end in the guest and a back-end in Dom0, connected by shared-memory rings. Porting Linux changed about 3,000 lines. Downside: you need the kernel source, so closed OSs cannot be ported. Today it lives on as virtio drivers.");
  card(s, 0.5, 1.2, 4.6, 2.35, "How it works", ["Guest kernel ported to a hypervisor API", "Hypercalls replace sensitive instructions", "Batched page-table updates (multicall)", "Event channels replace interrupts", "Split front-end / back-end drivers"], HEX.accent1);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.3, y: 1.2, w: 4.2, h: 2.35, rectRadius: 0.08, fill: { color: HEX.dk1 } });
  s.addText([
    { text: "// native kernel", options: { color: "8FA3C7", breakLine: true } },
    { text: "cli", options: { color: "FFFFFF", breakLine: true } },
    { text: "mov  cr3, eax", options: { color: "FFFFFF", breakLine: true } },
    { text: " ", options: { breakLine: true } },
    { text: "// para-virtualized kernel", options: { color: "8FA3C7", breakLine: true } },
    { text: "shared->evtchn_mask = 1;", options: { color: "F2C57C", breakLine: true } },
    { text: "HYPERVISOR_mmuext_op(NEW_BASEPTR)", options: { color: "F2C57C" } },
  ], { x: 5.5, y: 1.3, w: 3.9, h: 2.15, fontFace: "Courier New", fontSize: 12, valign: "middle", margin: 0, isTextBox: true });
  card(s, 0.5, 3.7, 4.6, 0.95, "+ Near-native speed, simpler VMM", null, HEX.accent6, { titleSize: 14 });
  card(s, 5.3, 3.7, 4.2, 0.95, "- Guest must be modified", null, HEX.accent4, { titleSize: 14 });
}
{
  const s = content(SEC[2], 3, "Hardware-assisted virtualization", "Intel VT-x (2005) and AMD-V (2006) make x86 classically virtualizable. The CPU gains a new mode: VMX root for the hypervisor, non-root for guests. The guest kernel runs in ring 0, but on its own copy of the CPU state stored in the VMCS (AMD: VMCB). So POPF or CLI simply change the guest's copy: no trap needed. The hypervisor starts the guest with VMLAUNCH/VMRESUME; configured events (I/O, HLT, CPUID, EPT faults) cause a VM exit with an exit reason. Result: unmodified guests and a much simpler VMM - KVM is mostly exit handlers.");
  centeredImage(s, "fig_vtx", 1.05, 8.4, 3.4, "Intel VT-x architecture and VMCS");
  takeaway(s, "Unmodified guest in ring 0 on its own CPU state; the VMCS decides what causes a VM exit.");
}
{
  const s = content(SEC[2], 3, "Nested paging: EPT / NPT", "First-generation VT-x still needed shadow page tables, and each VM exit cost thousands of cycles; Adams and Agesen (2006) showed it was often slower than binary translation. Nested paging (AMD NPT 2007, Intel EPT 2008) lets the hardware translate GVA to GPA with the guest table, and GPA to HPA with the hypervisor's table. No more page-table traps, but a TLB miss can cost 24 memory references instead of 4. TLBs, page-walk caches, large pages and VPID tags hide most of this.");
  centeredImage(s, "fig_memory", 1.05, 8.6, 3.6, "Nested paging and 2D page walk");
  takeaway(s, "No page-table exits; a TLB miss costs (4+1)(4+1) - 1 = 24 references instead of 4.");
}
{
  const s = content(SEC[2], 3, "Virtualizing I/O", "Three options. Emulation: the guest sees a well-known device such as an e1000; every register access traps to a device model in QEMU - compatible but slow. Para-virtual I/O: virtio front-end and back-end drivers share rings and batch requests - fast, needs a driver. Direct assignment: the guest drives real hardware, an IOMMU (VT-d/AMD-Vi) remaps DMA and interrupts for isolation, and SR-IOV splits one device into many virtual functions - near-native, but harder to live-migrate. Hand over to M4.");
  centeredImage(s, "fig_io", 1.05, 8.6, 3.5, "Three I/O virtualization approaches");
  takeaway(s, "Real systems mix them: hardware-assisted CPU + virtio I/O + pass-through for the fastest devices.");
}

// ================================================================== M4
pres.addSection({ title: SEC[3] });
{
  const s = content(SEC[3], 4, "Where does the guest kernel run?", "Recap the three answers to the x86 problem in one picture. Full virtualization: guest kernel in ring 1, translated. Para-virtualization: modified kernel in ring 1, using hypercalls. Hardware-assisted: unmodified kernel in ring 0 of non-root mode, with VM exits to the root-mode hypervisor.");
  centeredImage(s, "fig_rings", 1.05, 8.8, 3.55, "Privilege rings per technique");
  takeaway(s, "Rewrite the code (BT), rewrite the source (PV), or extend the CPU (VT-x / AMD-V).");
}
{
  const s = content(SEC[3], 4, "Comparison", "Read the table by rows: guest modification, how sensitive instructions are handled, memory virtualization, performance, complexity, examples. Stress that modern systems are hybrids: KVM, Hyper-V and ESXi use hardware assistance for the CPU and memory, and para-virtual virtio drivers for I/O.");
  const hdr = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.dk1 }, align: "center" } });
  const rowLbl = (t) => ({ text: t, options: { bold: true, color: HEX.dk1, fill: { color: HEX.lt2 } } });
  const rows = [
    [hdr(""), hdr("Full (binary translation)"), hdr("Para-virtualization"), hdr("Hardware-assisted")],
    [rowLbl("Guest OS"), "Unmodified", "Modified kernel", "Unmodified"],
    [rowLbl("Sensitive instructions"), "Translated in software", "Hypercalls", "Run on guest state / VM exit"],
    [rowLbl("Memory"), "Shadow page tables", "Validated guest PTs", "EPT / NPT"],
    [rowLbl("Performance"), "Good, costly when kernel-heavy", "Near native", "Near native (2nd gen.)"],
    [rowLbl("VMM complexity"), "Very high", "Moderate", "Lowest"],
    [rowLbl("Examples"), "VMware (early), VirtualBox", "Xen PV, virtio", "KVM, Hyper-V, ESXi"],
  ];
  s.addTable(rows, { x: 0.5, y: 1.15, w: 9.0, colW: [1.9, 2.4, 2.2, 2.5], fontSize: 12, color: HEX.dk1, border: { type: "solid", pt: 0.75, color: "C9D3DD" }, valign: "middle", rowH: 0.45, fontFace: THEME.bodyFontFace });
  takeaway(s, "Modern hypervisors are hybrids: hardware-assisted CPU and memory + para-virtual I/O.");
}
{
  const s = content(SEC[3], 4, "Applications and live migration", "Applications: cloud IaaS, data-center consolidation, development and test sandboxes, security isolation, disaster recovery. Live migration by pre-copy (Clark et al., 2005): copy all memory while the VM runs, re-send pages dirtied in the meantime, repeat until the dirty set is small, then pause briefly to copy the rest and resume on the target. In our demo: a 4 GiB VM over 1 Gbit/s has about 77 ms of downtime, compared with 34 s for stop-and-copy.");
  card(s, 0.5, 1.15, 4.1, 3.45, "Where virtualization is used", ["Cloud computing (IaaS): VMs as the unit of rent", "Data centers: consolidation, elasticity", "Development and testing: snapshots, sandboxes", "Security: isolation of tenants", "Disaster recovery and high availability"], HEX.dk2);
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
  const s = content(SEC[3], 4, "VMs vs containers", "Containers are OS-level virtualization: namespaces and cgroups isolate processes, but all containers share one host kernel. They are lighter and start in milliseconds, but isolate less strongly and must use the host's kernel. VMs carry their own kernel and offer hardware-enforced isolation. Clouds often run containers inside VMs, and microVMs such as Firecracker combine both.");
  centeredImage(s, "fig_containers", 1.05, 8.0, 3.4, "VMs vs containers");
  takeaway(s, "Containers share the kernel (light); VMs virtualize the hardware (strong isolation).");
}
{
  const s = content(SEC[3], 4, "Live demo: vdemo", "Switch to the terminal and run python -m vdemo tour. Each step maps to one part of the talk. Step 1: host CPU flags (vmx/svm, ept, /dev/kvm). Step 2: naive trap-and-emulate breaks on POPF/SGDT (M2's slide). Step 3: same guest kernel under BT, PV and VT-x with and without EPT (M2 and M3). Step 4: shadow vs nested paging, 24 references (M3). Step 5: live migration (M4). Step 6: a real VM through /dev/kvm in 150 lines of Python. If the laptop lacks KVM, the tool shows a clearly labelled simulated result.");
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
    { text: "     # or: popf | cpu | memory | kvm", options: { color: "8FA3C7" } }],
    { x: 0.7, y: 3.85, w: 8.6, h: 0.75, fontFace: "Courier New", fontSize: 14, valign: "middle", margin: 0, isTextBox: true });
}
{
  const s = content(SEC[3], 4, "Demo results", "Backup slide in case the live demo fails. Naive trap-and-emulate is both slow and wrong. BT is correct but heavy. PV is fastest. VT-x without EPT suffers from page-fault and CR3 exits; with EPT only I/O and HLT exit. The numbers come from an illustrative cost model with a kernel-heavy guest, so absolute slowdowns are exaggerated; real CPU-bound applications run within a few percent of native.");
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
  [["4 -> 24", "memory references per TLB miss (native -> nested)", HEX.accent1], ["77 ms", "live-migration downtime vs 34 s stop-and-copy", HEX.accent4], ["25 exits", "real KVM guest printing 24 chars + HLT", HEX.dk2]].forEach(([n, d, c], i) => {
    const y = 1.1 + i * 1.22;
    s.addText(n, { x: 6.6, y, w: 2.9, h: 0.6, fontSize: 30, bold: true, color: c, margin: 0, isTextBox: true });
    s.addText(d, { x: 6.6, y: y + 0.6, w: 2.9, h: 0.5, fontSize: 12, color: HEX.accent5, margin: 0, valign: "top", isTextBox: true });
  });
}
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: SEC[3] });
  s.addText("Conclusion", { placeholder: "title" });
  s.addText("One problem - sensitive instructions that do not trap - and three solutions that now coexist.", { placeholder: "body" });
  const pers = [["Confidential VMs", "AMD SEV-SNP, Intel TDX encrypt guest memory, even from the hypervisor"], ["MicroVMs", "Firecracker: VM isolation at container speed"], ["Nested virtualization", "hypervisors inside VMs"], ["Beyond x86", "ARM EL2, RISC-V H-extension"]];
  s.addText("Perspectives", { x: 6.5, y: 0.6, w: 3.0, h: 0.4, fontSize: 16, bold: true, color: "F2C57C", margin: 0, isTextBox: true });
  pers.forEach(([t, d], i) => {
    s.addText([{ text: t, options: { bold: true, color: "FFFFFF", fontSize: 14, breakLine: true } }, { text: d, options: { color: "CADCFC", fontSize: 11.5 } }],
      { x: 6.5, y: 1.1 + i * 0.95, w: 3.1, h: 0.85, valign: "top", margin: 0, isTextBox: true });
  });
  s.addText(["Full virtualization rewrote the code", "Para-virtualization rewrote the source", "Hardware assistance changed the CPU"].map((t, i, a) => ({ text: t, options: { bullet: true, breakLine: i < a.length - 1 } })),
    { x: 0.6, y: 4.0, w: 5.6, h: 1.0, fontSize: 14, color: "FFFFFF", margin: 0, isTextBox: true, paraSpaceAfter: 4 });
  s.addNotes(`[${team.members[3].name} - M4]\nSynthesis: virtualization turns hardware into isolated, mobile, software-defined resources. On x86 the problem was sensitive instructions that do not trap. Full virtualization rewrote the guest's code at run time, para-virtualization rewrote its source, and hardware assistance changed the processor. Modern systems combine them. Perspectives: confidential computing, microVMs, nested virtualization, and virtualization on ARM and RISC-V.`);
}
{
  const s = content(SEC[3], 4, "References and questions", "Invite questions. Every member should be ready to answer questions on their own part; the general questions are listed in each member guide.");
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
