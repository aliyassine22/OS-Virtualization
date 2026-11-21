/**
 * JavaScript port of demo/vdemo (isa.py + cpu_virt.py) so the slides can
 * recompute results live while the audience watches. Same instruction mix,
 * same cost model, same equivalence check.
 */
export const DEFAULT_COSTS = {
  plain: 1, native_priv: 20, native_cr3: 120, native_io: 300, trap: 700, emulate: 80,
  bt_translate: 40, bt_inline: 15, shadow_sync: 450, hypercall: 250, hypercall_per_entry: 30,
  vmexit: 1200, vmexit_handler: 100, device_model: 300,
};

const PRIV = new Set(["CLI", "STI", "OUT", "MOVCR3", "HLT"]);
const SENS_UNPRIV = new Set(["POPF", "SGDT"]);

export function guestKernel(iterations = 200) {
  const p = [{ op: "SGDT" }];
  for (let i = 0; i < iterations; i++) {
    p.push({ op: "ADD", r: "a", v: 1 }, { op: "LOAD" }, { op: "ADD", r: "b", v: 2 });
    if (i % 10 === 0) p.push({ op: "CLI" }, { op: "ADD", r: "a", v: 3 }, { op: "STI" });
    if (i % 25 === 0) p.push({ op: "POPF", v: 0 }, { op: "ADD", r: "b", v: 1 }, { op: "POPF", v: 1 });
    if (i % 20 === 0) p.push({ op: "PTWRITE", idx: i % 16, v: i }, { op: "PTWRITE", idx: (i + 1) % 16, v: i + 1 });
    if (i % 50 === 0) p.push({ op: "MOVCR3", v: 0x2000 + i });
    if (i % 40 === 0) p.push({ op: "OUT", v: i & 0xff });
  }
  p.push({ op: "HLT" });
  return p;
}

const newState = () => ({ a: 0, b: 0, IF: 1, cr3: 0, gdtSeen: null, io: 0, pt: {}, ifOffWork: 0 });

function plain(st, ins) {
  if (ins.op === "ADD") st[ins.r] += ins.v;
  if (st.IF === 0) st.ifOffWork++;
}
function sensitive(st, ins) {
  switch (ins.op) {
    case "CLI": st.IF = 0; break;
    case "STI": st.IF = 1; break;
    case "POPF": st.IF = ins.v; break;
    case "SGDT": st.gdtSeen = 0x1000; break;
    case "OUT": st.io++; break;
    case "MOVCR3": st.cr3 = ins.v; break;
    case "PTWRITE": st.pt[ins.idx] = ins.v; break;
    default: break;
  }
}

function run(name, prog, step) {
  const st = newState();
  let cycles = 0, direct = 0;
  const events = {};
  const ev = (k) => { events[k] = (events[k] || 0) + 1; };
  for (const ins of prog) {
    const r = step(st, ins, ev);
    cycles += r.c; if (r.d) direct++;
  }
  return { name, cycles, events, direct, total: prog.length, state: st };
}

export function engines(C = DEFAULT_COSTS) {
  return [
    ["Native", (st, i) => {
      if (i.op === "ADD" || i.op === "LOAD") { plain(st, i); return { c: C.plain, d: 1 }; }
      sensitive(st, i);
      return { c: i.op === "MOVCR3" ? C.native_cr3 : i.op === "OUT" ? C.native_io : i.op === "PTWRITE" ? C.plain : C.native_priv, d: 1 };
    }],
    ["Trap-and-emulate", (st, i, ev) => {
      if (i.op === "ADD" || i.op === "LOAD") { plain(st, i); return { c: C.plain, d: 1 }; }
      if (PRIV.has(i.op)) { ev("trap"); sensitive(st, i); return { c: C.trap + C.emulate + (i.op === "OUT" ? C.device_model : 0) }; }
      if (i.op === "PTWRITE") { ev("trap"); sensitive(st, i); return { c: C.trap + C.shadow_sync }; }
      ev("silent"); if (i.op === "SGDT") st.gdtSeen = 0xffff80000000; // POPF: IF silently ignored
      return { c: C.native_priv, d: 1 };
    }],
    ["Full virt. (BT)", (() => {
      const tc = new Set(); let idx = 0; const B = 8; let blockKey = ""; let pending = [];
      // translation cost is charged per block shape on first sight (computed lazily)
      return (st, i, ev) => {
        let c = 0;
        if (idx % B === 0) { pending = []; }
        pending.push(i.op + (["CLI", "STI", "HLT"].includes(i.op) ? "" : ""));
        idx++;
        if (idx % B === 0) { blockKey = pending.join(","); if (!tc.has(blockKey)) { tc.add(blockKey); c += C.bt_translate * B; ev("translate"); } }
        if (i.op === "ADD" || i.op === "LOAD") { plain(st, i); return { c: c + C.plain, d: 1 }; }
        if (["CLI", "STI", "POPF", "SGDT"].includes(i.op)) { ev("inline"); sensitive(st, i); return { c: c + C.bt_inline }; }
        if (i.op === "PTWRITE") { ev("shadow"); sensitive(st, i); return { c: c + C.trap + C.shadow_sync }; }
        ev("callout"); sensitive(st, i);
        return { c: c + C.emulate * 2 + (i.op === "OUT" ? C.device_model : 0) + (i.op === "MOVCR3" ? C.shadow_sync : 0) };
      };
    })()],
    ["Para-virt.", (() => {
      let batch = 0;
      return (st, i, ev) => {
        if (i.op === "PTWRITE") { sensitive(st, i); batch++; return { c: batch === 1 ? C.hypercall + C.hypercall_per_entry : C.hypercall_per_entry }; }
        batch = 0;
        if (i.op === "ADD" || i.op === "LOAD") { plain(st, i); return { c: C.plain, d: 1 }; }
        sensitive(st, i);
        if (["CLI", "STI", "POPF", "SGDT"].includes(i.op)) { ev("shared"); return { c: 2 * C.plain }; }
        ev("hypercall"); return { c: C.hypercall + (i.op === "OUT" ? C.device_model : 0) };
      };
    })()],
    ["VT-x, no EPT", (st, i, ev) => vtx(st, i, ev, C, false)],
    ["VT-x + EPT", (st, i, ev) => vtx(st, i, ev, C, true)],
  ];
}

function vtx(st, i, ev, C, ept) {
  const exit = (extra = 0) => { ev("exit"); return C.vmexit + C.vmexit_handler + extra; };
  if (i.op === "ADD" || i.op === "LOAD") { plain(st, i); return { c: C.plain, d: 1 }; }
  if (["CLI", "STI", "POPF", "SGDT"].includes(i.op)) { sensitive(st, i); return { c: C.native_priv, d: 1 }; }
  sensitive(st, i);
  if (i.op === "OUT") return { c: exit(C.device_model) };
  if (i.op === "HLT") return { c: exit() };
  if (i.op === "MOVCR3") return ept ? { c: C.native_cr3, d: 1 } : { c: exit(C.shadow_sync) };
  if (i.op === "PTWRITE") return ept ? { c: C.plain, d: 1 } : { c: exit(C.shadow_sync) };
  return { c: 0 };
}

export function compareAll(costs = DEFAULT_COSTS, iterations = 200) {
  const prog = guestKernel(iterations);
  const res = engines(costs).map(([n, f]) => run(n, prog, f));
  const ref = JSON.stringify(res[0].state);
  res.forEach((r) => { r.correct = JSON.stringify(r.state) === ref; r.slowdown = r.cycles / res[0].cycles; });
  return res;
}

// ------------------------------------------------------------------ stepper data
/** A short, readable guest-kernel path for the interactive stepper. */
export const STEP_PROGRAM = [
  { asm: "mov  a, 1", op: "PLAIN", note: "ordinary kernel work" },
  { asm: "sgdt [gdt_copy]", op: "SGDT", pv: "gdt = shared->gdt_base", note: "read where the GDT (descriptor table) lives" },
  { asm: "cli", op: "CLI", pv: "shared->evtchn_mask = 1", note: "disable interrupts" },
  { asm: "add  a, 3", op: "PLAIN", cs: true, note: "critical-section work" },
  { asm: "sti", op: "STI", pv: "shared->evtchn_mask = 0", note: "re-enable interrupts" },
  { asm: "popf", op: "POPF", v: 0, pv: "shared->evtchn_mask = 1", note: "restore saved flags: interrupts OFF" },
  { asm: "add  b, 1", op: "PLAIN", cs: true, note: "work that must run with interrupts off" },
  { asm: "popf", op: "POPF", v: 1, pv: "shared->evtchn_mask = 0", note: "restore saved flags: interrupts ON" },
  { asm: "mov  cr3, 0x2000", op: "MOVCR3", pv: "HYPERVISOR_mmuext_op()", note: "switch to another process" },
  { asm: "mov  [pte], val", op: "PTWRITE", pv: "HYPERVISOR_mmu_update()", note: "edit a page-table entry" },
  { asm: "out  0x3f8, 'A'", op: "OUT", pv: "HYPERVISOR_console_io()", note: "print 'A' on the serial port" },
  { asm: "hlt", op: "HLT", pv: "HYPERVISOR_sched_op()", note: "halt until the next interrupt" },
];

/** Why each kind of outcome matters (shown under "What just happened"). */
export const WHY = {
  direct: "No VMM involvement: full native speed.",
  silent: "The VMM is never told, so the guest's view of the machine is now wrong.",
  trap: "Correct, but every trap costs hundreds of cycles.",
  translated: "Correct and no trap, but the VMM had to translate this code first.",
  shared: "Just a memory write: practically free.",
  hypercall: "One deliberate call instead of a trap; requires a modified kernel.",
  exit: "Correct; costs a VM exit + entry (hundreds to thousands of cycles).",
};

/** What happens to each instruction under each technique. */
export function outcome(mode, ins, ept = true) {
  const op = ins.op;
  if (op === "PLAIN") return { where: "direct", text: "Ordinary instruction: runs directly on the CPU." };
  switch (mode) {
    case "native":
      return { where: "direct", text: "Bare metal: the kernel is in ring 0, everything runs natively." };
    case "naive":
      if (op === "POPF") return { where: "silent", text: "POPF in ring 1 does NOT trap: the IF bit is silently ignored. The VMM never knows.", bug: true };
      if (op === "SGDT") return { where: "silent", text: "SGDT does NOT trap: the guest reads the HOST's GDT base (0xffff8000...).", bug: true };
      if (op === "PTWRITE") return { where: "trap", text: "Guest page tables are write-protected: page fault, VMM updates the shadow table." };
      return { where: "trap", text: `${op} is privileged: #GP trap to the VMM, which emulates it on the virtual CPU.` };
    case "bt":
      if (["CLI", "STI", "POPF", "SGDT"].includes(op)) return { where: "translated", text: "Translator rewrote this into an in-line update of the virtual CPU: no trap at all." };
      if (op === "PTWRITE") return { where: "trap", text: "Shadow paging: the write to a protected page table faults; the VMM syncs the shadow table." };
      return { where: "translated", text: "Rewritten into a call-out into the VMM (device or MMU emulation)." };
    case "pv":
      if (["CLI", "STI", "POPF", "SGDT"].includes(op)) return { where: "shared", text: `The ported kernel writes a page shared with Xen: ${ins.pv}. No transition.` };
      return { where: "hypercall", text: `The ported kernel calls the hypervisor explicitly: ${ins.pv}.` };
    case "vtx":
      if (["CLI", "STI", "POPF", "SGDT"].includes(op)) return { where: "direct", text: "Non-root ring 0 has its own copy of IF and GDTR in the VMCS: runs natively and correctly." };
      if (op === "MOVCR3" || op === "PTWRITE")
        return ept ? { where: "direct", text: "With EPT the guest owns its page tables: no exit." }
          : { where: "exit", text: `Without EPT: VM exit (${op === "MOVCR3" ? "CR access" : "EPT-less #PF"}), hypervisor syncs the shadow table.` };
      return { where: "exit", text: `VM exit, reason ${op === "OUT" ? "IO_INSTRUCTION" : "HLT"}: the hypervisor handles it, then VMRESUME.` };
    default:
      return { where: "direct", text: "" };
  }
}

export const WHERE_COST = { direct: 1, silent: 20, trap: 780, translated: 40, shared: 2, hypercall: 250, exit: 1300 };
