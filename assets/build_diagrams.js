/**
 * Generates the shared technical diagrams (SVG + 3x PNG) used by the report,
 * the PowerPoint deck and the React slides.
 *
 *   node assets/build_diagrams.js      ->  assets/diagrams/*.svg, *.png
 *
 * Palette (shared across all deliverables):
 *   ink #1F2A44  hypervisor teal #0F7C80  guest indigo #3D4F8C
 *   app #DDE6F0  hardware slate #4A5560  trap/exit amber #E59A2B  fail red #C8553D
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT = path.join(__dirname, "diagrams");
fs.mkdirSync(OUT, { recursive: true });

const P = {
  ink: "#1F2A44", teal: "#0F7C80", indigo: "#3D4F8C", app: "#DDE6F0", hw: "#4A5560",
  amber: "#E59A2B", red: "#C8553D", grey: "#8A96A3", light: "#F3F6F9", white: "#FFFFFF", green: "#2E8B57",
};
const FONT = "Liberation Sans, Arial, Helvetica, sans-serif";

// ------------------------------------------------------------------ helpers
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function text(x, y, s, o = {}) {
  const lines = Array.isArray(s) ? s : [s];
  const size = o.size || 15, lh = o.lh || size * 1.25;
  const y0 = y - ((lines.length - 1) * lh) / 2;
  return lines.map((l, i) =>
    `<text x="${x}" y="${y0 + i * lh}" font-family="${FONT}" font-size="${size}" fill="${o.color || P.ink}"` +
    ` text-anchor="${o.anchor || "middle"}" dominant-baseline="central" font-weight="${o.weight || "normal"}"` +
    `${o.italic ? ' font-style="italic"' : ""}>${esc(l)}</text>`).join("");
}

function box(x, y, w, h, fill, label, o = {}) {
  const stroke = o.stroke || "none", dash = o.dash ? ` stroke-dasharray="${o.dash}"` : "";
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 8}" fill="${fill}" stroke="${stroke}" stroke-width="${o.sw || 1.5}"${dash}/>`;
  if (o.tag) s += text(x + 8, y + 12, o.tag, { size: 11, anchor: "start", color: o.tagColor || o.color || P.white, weight: "bold" });
  if (label) s += text(x + w / 2, y + h / 2 + (o.tag ? 6 : 0), label, { size: o.size || 15, color: o.color || P.white, weight: o.weight || "bold" });
  return s;
}

let arrowId = 0;
function arrow(x1, y1, x2, y2, color = P.ink, o = {}) {
  const id = `ah${arrowId++}`;
  let s = `<defs><marker id="${id}" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker></defs>`;
  s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${o.w || 2.2}" marker-end="url(#${id})"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
  if (o.label) s += text(o.lx ?? (x1 + x2) / 2, o.ly ?? (y1 + y2) / 2, o.label, { size: o.size || 12, color, weight: "bold", anchor: o.anchor || "middle" });
  return s;
}

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  `<rect width="${w}" height="${h}" fill="${P.white}"/>${body}</svg>`;

// ------------------------------------------------------------------ 1. hypervisor types
function hypervisorTypes() {
  let b = "";
  const col = (x0, title, sub) => {
    b += text(x0 + 205, 24, title, { size: 19, weight: "bold" });
    b += text(x0 + 205, 48, sub, { size: 13, color: P.grey, italic: true });
  };
  // Type 1
  col(20, "Type 1 - bare-metal hypervisor", "VMware ESXi, Xen, Microsoft Hyper-V, KVM*");
  for (let i = 0; i < 3; i++) {
    const x = 30 + i * 135;
    b += box(x, 75, 125, 50, P.app, "Apps", { color: P.ink });
    b += box(x, 132, 125, 72, P.indigo, ["Guest OS", i === 2 ? "(Windows)" : "(Linux)"], { size: 14 });
  }
  for (let i = 0; i < 3; i++) b += text(92 + i * 135, 222, `VM ${i + 1}`, { size: 12, color: P.grey, weight: "bold" });
  b += box(30, 238, 395, 58, P.teal, "Hypervisor / VMM", { size: 17 });
  b += box(30, 304, 395, 52, P.hw, "Physical hardware (CPU, RAM, NIC, disk)", { size: 14 });
  // Type 2
  const X = 500;
  col(X, "Type 2 - hosted hypervisor", "VirtualBox, VMware Workstation, Parallels");
  for (let i = 0; i < 2; i++) {
    const x = X + 10 + i * 135;
    b += box(x, 75, 125, 50, P.app, "Apps", { color: P.ink });
    b += box(x, 132, 125, 60, P.indigo, "Guest OS", { size: 14 });
  }
  b += box(X + 10, 198, 260, 40, P.teal, "Hypervisor (user process)", { size: 14 });
  b += box(X + 280, 132, 125, 106, P.app, ["Host", "apps"], { color: P.ink });
  b += box(X + 10, 246, 395, 50, P.ink, "Host operating system", { size: 15 });
  b += box(X + 10, 304, 395, 52, P.hw, "Physical hardware", { size: 14 });
  b += text(500, 378, "* KVM turns the Linux kernel itself into a Type 1 hypervisor; QEMU supplies device models in user space.", { size: 12, color: P.grey, italic: true });
  return svg(920, 395, b);
}

// ------------------------------------------------------------------ 2. privilege rings per technique
function ringsComparison() {
  let b = "";
  const W = 228, G = 22, X0 = 18;
  const cols = [
    { t: "Native", s: "no virtualization" },
    { t: "Full virtualization", s: "binary translation (VMware '99)" },
    { t: "Para-virtualization", s: "hypercalls (Xen '03)" },
    { t: "Hardware-assisted", s: "Intel VT-x / AMD-V ('05-'06)" },
  ];
  cols.forEach((c, i) => {
    const x = X0 + i * (W + G);
    b += text(x + W / 2, 22, c.t, { size: 17, weight: "bold" });
    b += text(x + W / 2, 44, c.s, { size: 12, color: P.grey, italic: true });
  });
  const y3 = 64, y1 = 146, y0 = 262, yh = 372;
  // Native
  let x = X0;
  b += box(x, y3, W, 62, P.app, "User applications", { tag: "Ring 3", color: P.ink });
  b += box(x, y1, W, 72, P.white, "(unused)", { tag: "Ring 1", stroke: P.grey, dash: "5 4", color: P.grey, weight: "normal" });
  b += box(x, y0, W, 72, P.indigo, "OS kernel", { tag: "Ring 0" });
  b += box(x, yh, W, 48, P.hw, "Hardware", { size: 14 });
  // Full (BT)
  x = X0 + (W + G);
  b += box(x, y3, W, 62, P.app, ["User apps", "(direct execution)"], { tag: "Ring 3", color: P.ink, size: 13 });
  b += box(x, y1, W, 72, P.indigo, ["Unmodified guest", "kernel"], { tag: "Ring 1 (deprivileged)", size: 14 });
  b += box(x, y0, W, 72, P.teal, ["VMM: binary translator", "+ shadow page tables"], { tag: "Ring 0", size: 13 });
  b += box(x, yh, W, 48, P.hw, "Hardware", { size: 14 });
  b += arrow(x + 60, y1 + 74, x + 60, y0 - 4, P.amber, { label: "translated", lx: x + 120, ly: y1 + 94, size: 11 });
  b += text(x + 162, y1 + 106, "sensitive instr.", { size: 11, color: P.amber, weight: "bold" });
  // Para
  x = X0 + 2 * (W + G);
  b += box(x, y3, W, 62, P.app, "User applications", { tag: "Ring 3", color: P.ink });
  b += box(x, y1, W, 72, P.indigo, ["MODIFIED guest", "kernel (PV ops)"], { tag: "Ring 1", size: 14 });
  b += box(x, y0, W, 72, P.teal, ["Hypervisor (Xen)", "+ Dom0 drivers"], { tag: "Ring 0", size: 14 });
  b += box(x, yh, W, 48, P.hw, "Hardware", { size: 14 });
  b += arrow(x + 60, y1 + 74, x + 60, y0 - 4, P.amber, { label: "hypercalls", lx: x + 128, ly: y1 + 98, size: 12 });
  // HW-assisted
  x = X0 + 3 * (W + G);
  b += `<rect x="${x - 6}" y="${y3 - 8}" width="${W + 12}" height="${y1 + 72 - y3 + 16}" rx="10" fill="none" stroke="${P.indigo}" stroke-width="1.5" stroke-dasharray="6 4"/>`;
  b += box(x, y3, W, 62, P.app, "User applications", { tag: "Non-root, ring 3", color: P.ink });
  b += box(x, y1, W, 72, P.indigo, ["Unmodified guest", "kernel"], { tag: "Non-root, ring 0", size: 14 });
  b += box(x, y0, W, 72, P.teal, ["VMM (KVM, Hyper-V,", "ESXi) + VMCS/VMCB"], { tag: "Root mode, ring 0", size: 13 });
  b += box(x, yh, W, 48, P.hw, "Hardware with VT-x / AMD-V", { size: 13 });
  b += arrow(x + 50, y1 + 76, x + 50, y0 - 4, P.amber, { label: "VM exit", lx: x + 58, ly: y1 + 92, size: 11, anchor: "start" });
  b += arrow(x + 178, y0 - 4, x + 178, y1 + 76, P.teal, {});
  b += text(x + 170, y1 + 110, "VM entry", { size: 11, color: P.teal, weight: "bold", anchor: "end" });
  return svg(1000, 432, b);
}

// ------------------------------------------------------------------ 3. Popek-Goldberg sets
function popekGoldberg() {
  let b = "";
  b += text(240, 24, "Virtualizable ISA (Popek & Goldberg, 1974)", { size: 17, weight: "bold" });
  b += `<circle cx="240" cy="200" r="150" fill="${P.teal}" fill-opacity="0.15" stroke="${P.teal}" stroke-width="2.5"/>`;
  b += text(240, 80, "Privileged instructions", { size: 15, weight: "bold", color: P.teal });
  b += text(240, 102, "(trap if executed outside ring 0)", { size: 12, color: P.teal });
  b += `<circle cx="240" cy="230" r="85" fill="${P.indigo}" fill-opacity="0.22" stroke="${P.indigo}" stroke-width="2.5"/>`;
  b += text(240, 222, "Sensitive", { size: 15, weight: "bold", color: P.indigo });
  b += text(240, 244, "instructions", { size: 15, weight: "bold", color: P.indigo });
  b += text(240, 375, "sensitive ⊆ privileged  ⇒  trap-and-emulate works", { size: 14, weight: "bold", color: P.green });

  b += text(735, 24, "Classic x86 (before VT-x / AMD-V)", { size: 17, weight: "bold" });
  b += `<circle cx="660" cy="200" r="140" fill="${P.teal}" fill-opacity="0.15" stroke="${P.teal}" stroke-width="2.5"/>`;
  b += text(610, 120, "Privileged", { size: 15, weight: "bold", color: P.teal });
  b += text(610, 140, "CLI, STI, HLT, LGDT,", { size: 12, color: P.teal });
  b += text(610, 156, "MOV CR3, IN/OUT ...", { size: 12, color: P.teal });
  b += `<circle cx="820" cy="215" r="125" fill="${P.red}" fill-opacity="0.12" stroke="${P.red}" stroke-width="2.5"/>`;
  b += text(735, 215, ["sensitive", "and", "privileged"], { size: 12, color: P.ink });
  b += text(850, 120, "Sensitive but", { size: 14, weight: "bold", color: P.red });
  b += text(850, 138, "NOT privileged", { size: 14, weight: "bold", color: P.red });
  b += text(872, 222, ["POPF, PUSHF,", "SGDT, SIDT, SLDT,", "SMSW, STR, LAR, LSL,", "VERR, VERW, MOV/PUSH", "seg, far CALL/JMP/RET"], { size: 11.5, color: P.ink, lh: 16 });
  b += text(735, 375, "17 instructions never trap  ⇒  naive trap-and-emulate fails", { size: 14, weight: "bold", color: P.red });
  return svg(1000, 395, b);
}

// ------------------------------------------------------------------ 4. trap-and-emulate flow
function trapEmulate() {
  let b = "";
  b += box(20, 40, 270, 110, P.indigo, ["Guest kernel (ring 1)", "... ADD  CLI  MOV ..."], { size: 15 });
  b += box(365, 40, 270, 110, P.teal, ["VMM (ring 0)", "decode + emulate CLI", "on the virtual CPU: vIF = 0"], { size: 14 });
  b += box(710, 40, 270, 110, P.indigo, ["Guest resumes at", "next instruction", "(never noticed)"], { size: 15 });
  b += arrow(292, 78, 362, 78, P.amber, { label: "1. trap (#GP)", ly: 64, size: 12 });
  b += arrow(637, 78, 707, 78, P.teal, { label: "2. return", ly: 64, size: 12 });
  b += text(500, 182, "Ordinary instructions (ADD, MOV, LOAD ...) execute directly on the CPU at full speed: the efficiency property.", { size: 13, color: P.grey, italic: true });
  return svg(1000, 205, b);
}

// ------------------------------------------------------------------ 5. VT-x architecture
function vtx() {
  let b = "";
  b += `<rect x="20" y="20" width="600" height="135" rx="12" fill="${P.indigo}" fill-opacity="0.10" stroke="${P.indigo}" stroke-width="2"/>`;
  b += text(36, 40, "VMX non-root operation (guest)  - AMD: guest mode", { size: 14, weight: "bold", color: P.indigo, anchor: "start" });
  b += box(40, 58, 270, 80, P.app, ["Guest apps", "(ring 3)"], { color: P.ink });
  b += box(330, 58, 270, 80, P.indigo, ["Unmodified guest OS", "(ring 0 - full privilege", "over *virtual* state)"], { size: 13 });
  b += `<rect x="20" y="265" width="600" height="115" rx="12" fill="${P.teal}" fill-opacity="0.10" stroke="${P.teal}" stroke-width="2"/>`;
  b += text(36, 366, "VMX root operation (hypervisor)  - AMD: host mode", { size: 14, weight: "bold", color: P.teal, anchor: "start" });
  b += box(40, 280, 560, 64, P.teal, ["VMM: handle exit reason, emulate device / update EPT,", "then VMRESUME"], { size: 14 });
  b += arrow(170, 276, 170, 160, P.teal, {});
  b += text(182, 200, ["VM entry", "VMLAUNCH / VMRESUME", "(AMD: VMRUN)"], { size: 12, color: P.teal, weight: "bold", anchor: "start" });
  b += arrow(430, 160, 430, 276, P.amber, {});
  b += text(442, 200, ["VM exit (AMD: #VMEXIT)", "I/O, HLT, CPUID,", "EPT violation, interrupts"], { size: 12, color: P.amber, weight: "bold", anchor: "start" });
  // VMCS
  b += box(660, 20, 320, 360, P.light, null, { stroke: P.ink, sw: 1.5 });
  b += text(820, 46, "VMCS (Intel) / VMCB (AMD)", { size: 16, weight: "bold" });
  b += text(820, 66, "one per vCPU, in memory", { size: 12, color: P.grey, italic: true });
  const rows = [["Guest-state area", "saved / loaded on exit / entry", P.indigo],
    ["Host-state area", "loaded on every VM exit", P.teal],
    ["VM-execution controls", "WHICH events cause exits", P.amber],
    ["VM-exit controls", "", P.grey], ["VM-entry controls", "event injection", P.grey],
    ["VM-exit information", "exit reason + qualification", P.red]];
  rows.forEach(([t, s, c], i) => {
    const y = 84 + i * 48;
    b += `<rect x="676" y="${y}" width="288" height="42" rx="6" fill="${P.white}" stroke="${c}" stroke-width="2"/>`;
    b += text(690, y + (s ? 14 : 21), t, { size: 13, weight: "bold", anchor: "start", color: P.ink });
    if (s) b += text(690, y + 30, s, { size: 11, anchor: "start", color: P.grey });
  });
  return svg(1000, 400, b);
}

// ------------------------------------------------------------------ 6. memory virtualization
function memory() {
  let b = "";
  const chain = [["GVA", "guest virtual", P.app, P.ink], ["GPA", "guest physical", P.indigo, P.white], ["HPA", "host physical", P.hw, P.white]];
  chain.forEach(([t, s, f, c], i) => {
    const x = 30 + i * 330;
    b += box(x, 30, 150, 64, f, null);
    b += text(x + 75, 52, t, { size: 20, weight: "bold", color: c });
    b += text(x + 75, 76, s, { size: 12, color: c });
  });
  b += arrow(184, 62, 356, 62, P.indigo, { label: "guest page table (guest OS)", ly: 46, size: 12 });
  b += arrow(514, 62, 686, 62, P.teal, { label: "EPT / NPT (hypervisor)", ly: 46, size: 12 });
  b += `<path d="M105 98 C 105 150, 765 150, 765 98" fill="none" stroke="${P.amber}" stroke-width="2.4" stroke-dasharray="7 5"/>`;
  b += text(435, 150, "shadow page table: GVA -> HPA directly, kept in sync by the VMM (guest PT write-protected)", { size: 12, color: P.amber, weight: "bold" });
  // 2D walk grid
  const gx = 120, gy = 205, cw = 92, ch = 34;
  b += text(500, 182, "Nested (2-D) page walk on a TLB miss: (4+1) x (4+1) - 1 = 24 memory references", { size: 15, weight: "bold" });
  const colsH = ["host L4", "host L3", "host L2", "host L1", "guest PTE"];
  const rowsG = ["gCR3 -> L4", "guest L4", "guest L3", "guest L2", "data GPA"];
  colsH.forEach((c, j) => { b += text(gx + 110 + j * (cw + 6) + cw / 2, gy, c, { size: 12, weight: "bold", color: j < 4 ? P.teal : P.indigo }); });
  let n = 0;
  rowsG.forEach((r, i) => {
    const y = gy + 16 + i * (ch + 6);
    b += text(gx + 100, y + ch / 2, r, { size: 12, anchor: "end", weight: "bold" });
    colsH.forEach((c, j) => {
      const x = gx + 110 + j * (cw + 6);
      const last = i === 4 && j === 4;
      const fill = last ? P.amber : j < 4 ? P.teal : P.indigo;
      if (!last) n++;
      b += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="5" fill="${fill}" fill-opacity="${last ? 1 : 0.85}"/>`;
      b += text(x + cw / 2, y + ch / 2, last ? "data access" : String(n), { size: 13, color: P.white, weight: "bold" });
    });
  });
  b += text(790, 330, ["Native walk: 4 refs", "Nested walk: 24 refs", "2 MiB host pages: 19 refs", "", "Mitigated by TLB, page-walk", "caches and VPID/ASID tags"], { size: 12, anchor: "start", lh: 17 });
  return svg(1000, 420, b);
}

// ------------------------------------------------------------------ 7. history timeline
function timeline() {
  let b = "";
  const ev = [
    [1967, "IBM CP-40/CP-67", "first VMs, S/360-67"], [1972, "IBM VM/370", "commercial VMM"],
    [1974, "Popek & Goldberg", "formal requirements"], [1999, "VMware Workstation", "x86 binary translation"],
    [2003, "Xen", "para-virtualization"], [2005, "Intel VT-x", "AMD-V in 2006"],
    [2007, "KVM in Linux 2.6.20", "AMD NPT (2007)"], [2008, "Intel EPT, virtio", "2nd-gen HW assist"],
    [2013, "Docker", "OS-level containers"], [2018, "Firecracker microVMs", "serverless"],
    [2021, "Confidential VMs", "AMD SEV-SNP, Intel TDX"]];
  const x = (yr) => 40 + ((yr - 1964) / (2024 - 1964)) * 920;
  b += `<line x1="30" y1="150" x2="975" y2="150" stroke="${P.ink}" stroke-width="3"/>`;
  [1970, 1980, 1990, 2000, 2010, 2020].forEach((d) => { b += text(x(d), 168, String(d), { size: 11, color: P.grey }); b += `<line x1="${x(d)}" y1="146" x2="${x(d)}" y2="154" stroke="${P.grey}"/>`; });
  // manual vertical lanes to avoid overlap in the dense 1999-2021 region
  const lanes = [[-1, 60], [1, 230], [-1, 100], [-1, 60], [1, 225], [-1, 100], [1, 265], [-1, 20], [1, 225], [-1, 60], [1, 265]];
  ev.forEach(([yr, t, s], i) => {
    const [side, ly] = lanes[i];
    const cx = x(yr);
    const c = i < 3 ? P.hw : i < 8 ? P.teal : P.indigo;
    b += `<line x1="${cx}" y1="150" x2="${cx}" y2="${side < 0 ? ly + 26 : ly - 26}" stroke="${c}" stroke-width="1.3"/>`;
    b += `<circle cx="${cx}" cy="150" r="6" fill="${c}"/>`;
    b += text(cx, ly - 8, `${yr}  ${t}`, { size: 12, weight: "bold", color: c });
    b += text(cx, ly + 9, s, { size: 11, color: P.grey });
  });
  return svg(1000, 290, b);
}

// ------------------------------------------------------------------ 8. I/O virtualization
function io() {
  let b = "";
  const cols = [["Emulated device", "QEMU e1000, IDE"], ["Para-virtual device", "virtio, Xen split drivers"], ["Direct assignment", "VT-d / AMD-Vi IOMMU, SR-IOV"]];
  cols.forEach(([t, s], i) => {
    const x = 20 + i * 330;
    b += text(x + 145, 20, t, { size: 17, weight: "bold" });
    b += text(x + 145, 42, s, { size: 12, color: P.grey, italic: true });
  });
  // emulated
  b += box(20, 62, 290, 56, P.indigo, ["Guest: stock e1000 driver"], { size: 13 });
  b += box(20, 178, 290, 56, P.teal, ["Device model (QEMU)", "emulates registers"], { size: 13 });
  b += box(20, 290, 290, 52, P.hw, "Host driver -> real NIC", { size: 13 });
  b += arrow(165, 120, 165, 175, P.amber, { label: "trap on EVERY register access", lx: 175, ly: 148, anchor: "start", size: 11 });
  b += arrow(165, 236, 165, 287, P.ink, {});
  // virtio
  b += box(350, 62, 290, 56, P.indigo, ["Guest: virtio-net front-end", "(PV driver)"], { size: 13 });
  b += box(350, 135, 290, 34, P.light, "shared virtqueue rings", { color: P.ink, stroke: P.amber, size: 13 });
  b += box(350, 186, 290, 48, P.teal, ["Back-end (vhost / Dom0)"], { size: 13 });
  b += box(350, 290, 290, 52, P.hw, "Host driver -> real NIC", { size: 13 });
  b += arrow(495, 120, 495, 133, P.ink, {}); b += arrow(495, 171, 495, 184, P.ink, {});
  b += arrow(495, 236, 495, 287, P.ink, {});
  b += text(495, 262, "batched notifications", { size: 11, color: P.amber, weight: "bold", anchor: "start" });
  // passthrough
  b += box(680, 62, 290, 56, P.indigo, ["Guest: native vendor driver"], { size: 13 });
  b += box(680, 178, 290, 56, P.light, ["IOMMU: DMA + interrupt", "remapping (isolation)"], { color: P.ink, stroke: P.teal, size: 13 });
  b += box(680, 290, 290, 52, P.hw, "Physical NIC / SR-IOV VF", { size: 13 });
  b += arrow(825, 120, 825, 175, P.green, {}); b += arrow(825, 236, 825, 287, P.green, {});
  b += text(835, 148, "no VMM on the data path", { size: 11, color: P.green, weight: "bold", anchor: "start" });
  b += text(835, 262, "DMA to guest memory", { size: 11, color: P.green, weight: "bold", anchor: "start" });
  b += text(500, 368, "compatibility  <------------------------------------------>  performance", { size: 13, color: P.grey, weight: "bold" });
  return svg(1000, 385, b);
}

// ------------------------------------------------------------------ 9. VMs vs containers
function containers() {
  let b = "";
  b += text(220, 22, "Virtual machines", { size: 17, weight: "bold" });
  b += text(680, 22, "Containers (OS-level virtualization)", { size: 17, weight: "bold" });
  for (let i = 0; i < 3; i++) {
    const x = 20 + i * 135;
    b += box(x, 44, 125, 44, P.app, "App", { color: P.ink });
    b += box(x, 94, 125, 36, P.app, "Bins / libs", { color: P.ink, size: 13 });
    b += box(x, 136, 125, 56, P.indigo, ["Guest OS", "kernel"], { size: 13 });
  }
  b += box(20, 200, 395, 46, P.teal, "Hypervisor", { size: 15 });
  b += box(20, 252, 395, 46, P.hw, "Hardware", { size: 14 });
  for (let i = 0; i < 3; i++) {
    const x = 480 + i * 135;
    b += box(x, 94, 125, 44, P.app, "App", { color: P.ink });
    b += box(x, 144, 125, 48, P.app, "Bins / libs", { color: P.ink, size: 13 });
  }
  b += box(480, 200, 395, 46, P.indigo, "ONE shared host kernel (namespaces + cgroups)", { size: 13 });
  b += box(480, 252, 395, 46, P.hw, "Hardware", { size: 14 });
  b += text(218, 322, "strong isolation, any OS, GBs, boots in seconds", { size: 12, color: P.grey, italic: true });
  b += text(678, 322, "weaker isolation, same kernel, MBs, starts in ms", { size: 12, color: P.grey, italic: true });
  return svg(900, 340, b);
}

const DIAGRAMS = {
  fig_hypervisor_types: hypervisorTypes, fig_rings: ringsComparison, fig_popek_goldberg: popekGoldberg,
  fig_trap_emulate: trapEmulate, fig_vtx: vtx, fig_memory: memory, fig_timeline: timeline,
  fig_io: io, fig_containers: containers,
};

(async () => {
  for (const [name, fn] of Object.entries(DIAGRAMS)) {
    const s = fn();
    fs.writeFileSync(path.join(OUT, `${name}.svg`), s);
    await sharp(Buffer.from(s), { density: 216 }).png().toFile(path.join(OUT, `${name}.png`));
    console.log("wrote", name);
  }
})();
