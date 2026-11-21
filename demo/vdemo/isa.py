"""
A tiny, x86-flavoured instruction set used to *illustrate* CPU virtualization.

The point is not realism but faithfully modelling the property that matters for
Popek & Goldberg (1974):

    * privileged instruction  -> traps when executed outside ring 0
    * sensitive instruction   -> reads or changes privileged machine state
    * the x86 problem         -> some sensitive instructions do NOT trap in
                                 ring > 0; they silently behave differently
                                 (e.g. POPF ignores the IF bit, SGDT leaks
                                 the real GDTR).

Instruction table
-----------------
    name        privileged  sensitive   notes
    ---------   ----------  ---------   -----------------------------------
    ADD r,v     no          no          ordinary ALU work
    LOAD/STORE  no          no          memory access (may TLB-miss)
    CLI / STI   yes         yes         clear / set interrupt flag (IF)
    OUT p,v     yes         yes         port I/O (device access)
    MOVCR3 v    yes         yes         switch page table root
    PTWRITE a,v no*         yes         write a page-table entry in memory
                                        (*ordinary store; the MMU state it
                                         edits is sensitive)
    POPF v      NO          yes         x86 hole: in ring>0 the IF bit is
                                        silently ignored, no trap
    SGDT        NO          yes         x86 hole: returns the *host* GDTR
                                        in ring>0, no trap
    HLT         yes         yes         stop the CPU
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Tuple

PRIVILEGED = {"CLI", "STI", "OUT", "MOVCR3", "HLT"}
SENSITIVE_UNPRIVILEGED = {"POPF", "SGDT"}          # the "x86 holes"
SENSITIVE = PRIVILEGED | SENSITIVE_UNPRIVILEGED | {"PTWRITE"}

# Paravirtual guests replace sensitive instructions with explicit hypercalls.
HYPERCALL = "HYPERCALL"


@dataclass(frozen=True)
class Instr:
    op: str
    args: Tuple = ()

    def __str__(self) -> str:  # pragma: no cover - cosmetic
        return f"{self.op} {', '.join(map(str, self.args))}".strip()


@dataclass
class MachineState:
    """Architectural state that must be identical in a correct VM (equivalence)."""
    regs: dict = field(default_factory=lambda: {"a": 0, "b": 0})
    interrupt_flag: int = 1
    cr3: int = 0
    gdtr: int = 0x1000            # the guest's *own* idea of its GDT base
    io_log: List[Tuple[int, int]] = field(default_factory=list)
    page_table: dict = field(default_factory=dict)
    halted: bool = False
    work_with_if_off: int = 0     # instructions run while interrupts were masked

    def snapshot(self) -> dict:
        return {
            "regs": {k: v for k, v in self.regs.items() if k != "gdt_seen"},
            "IF": self.interrupt_flag,
            "CR3": self.cr3,
            "GDTR_seen": self.regs.get("gdt_seen"),
            "io": list(self.io_log),
            "pt": dict(self.page_table),
            "halted": self.halted,
            "work_with_IF=0": self.work_with_if_off,
        }


def guest_kernel(iterations: int = 200) -> List[Instr]:
    """
    A synthetic guest-OS kernel path: a loop that does mostly ordinary work but
    periodically touches privileged state, the way a real kernel does in its
    interrupt, scheduling and memory-management paths.
    """
    prog: List[Instr] = [Instr("SGDT")]                      # kernel inspects its GDT
    for i in range(iterations):
        prog += [Instr("ADD", ("a", 1)), Instr("LOAD", (i % 64,)), Instr("ADD", ("b", 2))]
        if i % 10 == 0:                                      # critical section
            prog += [Instr("CLI"), Instr("ADD", ("a", 3)), Instr("STI")]
        if i % 25 == 0:                                      # restore saved flags (IF=0)
            prog += [Instr("POPF", (0,)), Instr("ADD", ("b", 1)), Instr("POPF", (1,))]
        if i % 20 == 0:                                      # memory management
            prog += [Instr("PTWRITE", (i % 16, i)), Instr("PTWRITE", ((i + 1) % 16, i + 1))]
        if i % 50 == 0:                                      # context switch
            prog += [Instr("MOVCR3", (0x2000 + i,))]
        if i % 40 == 0:                                      # device I/O
            prog += [Instr("OUT", (0x3F8, i & 0xFF))]
    prog.append(Instr("HLT"))
    return prog


def paravirtualize(prog: List[Instr], batch_pt_updates: bool = True) -> List[Instr]:
    """
    'Port' the guest kernel to a para-virtual interface (what Xen required of
    Linux in 2003): every sensitive instruction becomes an explicit HYPERCALL,
    and consecutive page-table writes are batched into one multicall.
    """
    out: List[Instr] = []
    pending_pt: List[Tuple] = []

    def flush():
        if pending_pt:
            out.append(Instr(HYPERCALL, ("mmu_update", tuple(pending_pt))))
            pending_pt.clear()

    for ins in prog:
        if ins.op == "PTWRITE" and batch_pt_updates:
            pending_pt.append(ins.args)
            continue
        flush()
        if ins.op in SENSITIVE:
            out.append(Instr(HYPERCALL, (ins.op.lower(), ins.args)))
        else:
            out.append(ins)
    flush()
    return out
