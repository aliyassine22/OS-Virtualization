"""
Five ways to run the same guest kernel, mirroring Sections III-IV of the report:

    NativeCPU            bare-metal baseline (the reference for *equivalence*)
    TrapAndEmulateVMM    classic Popek-Goldberg VMM on an architecture with
                         sensitive-but-unprivileged instructions  -> INCORRECT
    BinaryTranslationVMM full virtualization a la VMware (1999)   -> correct
    ParavirtVMM          Xen-style hypercalls, guest source modified
    HardwareAssistedVMM  Intel VT-x / AMD-V, optionally with EPT/NPT

Every engine returns a `RunResult`: simulated cycle count, the number of
traps / VM exits / hypercalls broken down by cause, and whether the final
guest-visible state is identical to native execution.

The cycle costs are ILLUSTRATIVE, order-of-magnitude values chosen to make the
qualitative trade-offs visible (see COSTS and the report, Sec. V). Change them
on the command line to explore "what if VM exits were 5x cheaper?".
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Dict, List

from .isa import HYPERCALL, PRIVILEGED, SENSITIVE_UNPRIVILEGED, Instr, MachineState, paravirtualize

# --------------------------------------------------------------------------- #
# Cost model (simulated CPU cycles)                                           #
# --------------------------------------------------------------------------- #
COSTS: Dict[str, int] = {
    "plain": 1,               # ordinary instruction, executed directly
    "native_priv": 20,        # privileged instruction on bare metal
    "native_cr3": 120,        # CR3 load incl. TLB flush on bare metal
    "native_io": 300,         # port I/O to a real device
    "trap": 700,              # ring-1 -> ring-0 trap into the VMM and back
    "emulate": 80,            # VMM decodes + emulates one instruction
    "bt_translate": 40,       # translating one instruction (first time only)
    "bt_inline": 15,          # translated sensitive instr. emulated in-line
    "shadow_sync": 450,       # update shadow page table after a guest PT write
    "hypercall": 250,         # explicit guest -> hypervisor call
    "hypercall_per_entry": 30,
    "vmexit": 1200,           # VM exit + VM entry round trip (VT-x / AMD-V)
    "vmexit_handler": 100,    # hypervisor work per exit
    "device_model": 300,      # emulating a virtual device (any technique)
}

HOST_GDTR = 0xFFFF_8000_0000  # what a deprivileged SGDT leaks on real x86


@dataclass
class RunResult:
    name: str
    cycles: int = 0
    events: Counter = field(default_factory=Counter)      # traps/exits by cause
    direct: int = 0                                        # instr. run natively
    total: int = 0
    state: dict = field(default_factory=dict)
    correct: bool = True
    diffs: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)

    @property
    def direct_ratio(self) -> float:
        return self.direct / self.total if self.total else 0.0


# --------------------------------------------------------------------------- #
# Shared semantics                                                            #
# --------------------------------------------------------------------------- #
def _apply_plain(st: MachineState, ins: Instr) -> None:
    if ins.op == "ADD":
        reg, val = ins.args
        st.regs[reg] = st.regs.get(reg, 0) + val
    # LOAD has no architectural side effect in this model
    if st.interrupt_flag == 0:
        st.work_with_if_off += 1     # observable: did the critical section run masked?


def _apply_sensitive(st: MachineState, op: str, args: tuple) -> None:
    """The *correct* (virtual) semantics of each sensitive operation."""
    if op == "CLI":
        st.interrupt_flag = 0
    elif op == "STI":
        st.interrupt_flag = 1
    elif op == "POPF":
        st.interrupt_flag = args[0]
    elif op == "SGDT":
        st.regs["gdt_seen"] = st.gdtr
    elif op == "OUT":
        st.io_log.append(args)
    elif op == "MOVCR3":
        st.cr3 = args[0]
    elif op == "PTWRITE":
        idx, val = args
        st.page_table[idx] = val
    elif op == "HLT":
        st.halted = True


class _Engine:
    name = "engine"

    def run(self, prog: List[Instr]) -> RunResult:
        raise NotImplementedError


# --------------------------------------------------------------------------- #
# 0. Native                                                                   #
# --------------------------------------------------------------------------- #
class NativeCPU(_Engine):
    name = "Native (bare metal)"

    def run(self, prog):
        st, r = MachineState(), RunResult(self.name)
        for ins in prog:
            r.total += 1
            r.direct += 1
            if ins.op in ("ADD", "LOAD"):
                _apply_plain(st, ins)
                r.cycles += COSTS["plain"]
            else:
                _apply_sensitive(st, ins.op, ins.args)
                r.cycles += {"MOVCR3": COSTS["native_cr3"], "OUT": COSTS["native_io"]}.get(
                    ins.op, COSTS["native_priv"] if ins.op != "PTWRITE" else COSTS["plain"])
        r.state = st.snapshot()
        return r


# --------------------------------------------------------------------------- #
# 1. Classic trap-and-emulate on x86 (guest kernel deprivileged to ring 1)    #
# --------------------------------------------------------------------------- #
class TrapAndEmulateVMM(_Engine):
    """
    Correct only if every sensitive instruction is privileged (Popek-Goldberg
    Theorem 1). On x86 POPF and SGDT are not, so they execute directly and
    produce WRONG results without the VMM ever noticing.
    """
    name = "Trap-and-emulate (naive x86)"

    def run(self, prog):
        st, r = MachineState(), RunResult(self.name)
        for ins in prog:
            r.total += 1
            if ins.op in ("ADD", "LOAD"):
                _apply_plain(st, ins); r.direct += 1; r.cycles += COSTS["plain"]
            elif ins.op in PRIVILEGED:
                # CPU raises #GP in ring 1 -> VMM emulates against virtual state
                r.events[f"trap:{ins.op}"] += 1
                r.cycles += COSTS["trap"] + COSTS["emulate"]
                if ins.op == "OUT":
                    r.cycles += COSTS["device_model"]
                _apply_sensitive(st, ins.op, ins.args)
            elif ins.op == "PTWRITE":
                # guest page tables are write-protected -> page-fault trap
                r.events["trap:PTWRITE(#PF)"] += 1
                r.cycles += COSTS["trap"] + COSTS["shadow_sync"]
                _apply_sensitive(st, ins.op, ins.args)
            elif ins.op in SENSITIVE_UNPRIVILEGED:
                # *** NO TRAP *** -- executes directly with ring-1 semantics
                r.direct += 1; r.cycles += COSTS["native_priv"]
                if ins.op == "POPF":
                    pass                      # IF bit silently ignored in ring 1
                elif ins.op == "SGDT":
                    st.regs["gdt_seen"] = HOST_GDTR   # leaks the host's GDTR
                r.events[f"SILENT:{ins.op}"] += 1
        r.state = st.snapshot()
        r.notes.append("POPF/SGDT are sensitive but unprivileged: they never trap, "
                       "so the VMM cannot virtualize them (Robin & Irvine, 2000).")
        return r


# --------------------------------------------------------------------------- #
# 2. Full virtualization with binary translation (VMware Workstation, 1999)   #
# --------------------------------------------------------------------------- #
class BinaryTranslationVMM(_Engine):
    """
    Guest *kernel* code is translated basic block by basic block into a
    translation cache (TC). Sensitive instructions are rewritten into safe
    in-line sequences or call-outs into the VMM; everything else is copied
    "identically". Guest *user* code would run directly (not modelled).
    Memory is virtualized with shadow page tables.
    """
    name = "Full virt. (binary translation)"

    def __init__(self, block_size: int = 8):
        self.block_size = block_size

    def run(self, prog):
        st, r = MachineState(), RunResult(self.name)
        tc: Dict[tuple, bool] = {}                   # translation cache
        # A loop body repeats; identify blocks by their instruction *shape*
        for start in range(0, len(prog), self.block_size):
            block = prog[start:start + self.block_size]
            key = tuple((i.op, i.args if i.op in ("CLI", "STI", "HLT") else None) for i in block)
            if key not in tc:
                tc[key] = True
                r.events["bt:translate_block"] += 1
                r.cycles += COSTS["bt_translate"] * len(block)
            else:
                r.events["bt:tc_hit"] += 1
            for ins in block:
                r.total += 1
                if ins.op in ("ADD", "LOAD"):
                    _apply_plain(st, ins); r.direct += 1; r.cycles += COSTS["plain"]
                elif ins.op in ("CLI", "STI", "POPF", "SGDT"):
                    # rewritten to operate on the VMM's virtual CPU state in-line
                    r.events[f"bt:inline:{ins.op}"] += 1
                    r.cycles += COSTS["bt_inline"]
                    _apply_sensitive(st, ins.op, ins.args)
                elif ins.op == "PTWRITE":
                    r.events["bt:shadow_pt_sync"] += 1
                    r.cycles += COSTS["trap"] + COSTS["shadow_sync"]
                    _apply_sensitive(st, ins.op, ins.args)
                else:   # OUT, MOVCR3, HLT -> call-out into the VMM
                    r.events[f"bt:callout:{ins.op}"] += 1
                    r.cycles += COSTS["emulate"] * 2 + (COSTS["device_model"] if ins.op == "OUT" else 0) \
                        + (COSTS["shadow_sync"] if ins.op == "MOVCR3" else 0)
                    _apply_sensitive(st, ins.op, ins.args)
        r.state = st.snapshot()
        r.notes.append(f"Translation cache holds {len(tc)} unique blocks; "
                       f"{r.events['bt:tc_hit']} block executions were cache hits.")
        return r


# --------------------------------------------------------------------------- #
# 3. Para-virtualization (Xen, 2003)                                          #
# --------------------------------------------------------------------------- #
class ParavirtVMM(_Engine):
    """The guest kernel was modified: sensitive ops are explicit hypercalls."""
    name = "Para-virtualization (hypercalls)"

    def __init__(self, batch: bool = True):
        self.batch = batch

    def run(self, prog):
        pv_prog = paravirtualize(prog, batch_pt_updates=self.batch)
        st, r = MachineState(), RunResult(self.name)
        for ins in pv_prog:
            r.total += 1
            if ins.op in ("ADD", "LOAD"):
                _apply_plain(st, ins); r.direct += 1; r.cycles += COSTS["plain"]
                continue
            assert ins.op == HYPERCALL, ins
            kind, payload = ins.args
            if kind == "mmu_update":
                r.events["hypercall:mmu_update(batched)"] += 1
                r.cycles += COSTS["hypercall"] + COSTS["hypercall_per_entry"] * len(payload)
                for entry in payload:
                    _apply_sensitive(st, "PTWRITE", entry)
                continue
            op = kind.upper()
            if op in ("CLI", "STI", "POPF"):
                # Xen PV: virtual IF lives in a page shared with the hypervisor
                # -> a plain memory write, no transition at all
                r.events[f"shared_page:{op}"] += 1
                r.cycles += COSTS["plain"] * 2
            elif op == "SGDT":
                r.events["shared_page:SGDT"] += 1
                r.cycles += COSTS["plain"] * 2
            else:
                r.events[f"hypercall:{kind}"] += 1
                r.cycles += COSTS["hypercall"] + (COSTS["device_model"] if op == "OUT" else 0)
            _apply_sensitive(st, op, payload)
        r.state = st.snapshot()
        r.notes.append(f"Guest source was rewritten: {len(prog)} -> {len(pv_prog)} instructions "
                       f"(page-table writes batched into multicalls).")
        return r


# --------------------------------------------------------------------------- #
# 4. Hardware-assisted virtualization (Intel VT-x / AMD-V)                    #
# --------------------------------------------------------------------------- #
class HardwareAssistedVMM(_Engine):
    """
    The unmodified guest runs in VMX *non-root* mode, ring 0. The CPU keeps a
    separate copy of guest state in the VMCS (Intel) / VMCB (AMD), so CLI, STI,
    POPF and SGDT simply act on the *guest's* copy - no exit needed. Only
    operations configured in the VMCS execution controls cause VM exits:
    port I/O (I/O bitmap), HLT, and - without EPT - CR3 loads and guest
    page-table writes (shadow paging).
    """

    def __init__(self, ept: bool = True):
        self.ept = ept
        self.name = "HW-assisted (VT-x + EPT)" if ept else "HW-assisted (VT-x, no EPT)"

    def _exit(self, r: RunResult, reason: str, extra: int = 0):
        r.events[f"vmexit:{reason}"] += 1
        r.cycles += COSTS["vmexit"] + COSTS["vmexit_handler"] + extra

    def run(self, prog):
        st, r = MachineState(), RunResult(self.name)
        for ins in prog:
            r.total += 1
            op = ins.op
            if op in ("ADD", "LOAD"):
                _apply_plain(st, ins); r.direct += 1; r.cycles += COSTS["plain"]
            elif op in ("CLI", "STI", "POPF", "SGDT"):
                _apply_sensitive(st, op, ins.args); r.direct += 1; r.cycles += COSTS["native_priv"]
            elif op == "OUT":
                self._exit(r, "IO_INSTRUCTION", COSTS["device_model"]); _apply_sensitive(st, op, ins.args)
            elif op == "HLT":
                self._exit(r, "HLT"); _apply_sensitive(st, op, ins.args)
            elif op == "MOVCR3":
                if self.ept:
                    _apply_sensitive(st, op, ins.args); r.direct += 1; r.cycles += COSTS["native_cr3"]
                else:
                    self._exit(r, "CR_ACCESS", COSTS["shadow_sync"]); _apply_sensitive(st, op, ins.args)
            elif op == "PTWRITE":
                if self.ept:
                    _apply_sensitive(st, op, ins.args); r.direct += 1; r.cycles += COSTS["plain"]
                else:
                    self._exit(r, "EXCEPTION(#PF)", COSTS["shadow_sync"]); _apply_sensitive(st, op, ins.args)
        r.state = st.snapshot()
        r.notes.append("Unmodified guest; CPU state switch via VMCS on every VM entry/exit.")
        return r


# --------------------------------------------------------------------------- #
def all_engines() -> List[_Engine]:
    return [NativeCPU(), TrapAndEmulateVMM(), BinaryTranslationVMM(), ParavirtVMM(),
            HardwareAssistedVMM(ept=False), HardwareAssistedVMM(ept=True)]


def compare(prog: List[Instr]) -> List[RunResult]:
    """Run every engine and check *equivalence* against native execution."""
    results = [e.run(prog) for e in all_engines()]
    ref = results[0].state
    for res in results[1:]:
        for k, v in ref.items():
            if res.state.get(k) != v:
                res.correct = False
                shown = (lambda x: hex(x) if isinstance(x, int) and x > 0xFFF else str(x)[:40])
                res.diffs.append(f"{k}: native={shown(v)}  vm={shown(res.state.get(k))}")
    return results
