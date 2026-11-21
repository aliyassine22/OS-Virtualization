"""
Memory virtualization: shadow page tables vs. nested paging (Intel EPT / AMD NPT).

Three address spaces exist once a guest OS runs inside a VM:

    GVA (guest virtual) --guest page table--> GPA (guest physical)
    GPA                 --EPT / NPT-------->  HPA (host physical)

* Shadow paging (software; used by BT and first-generation VT-x):
  the VMM builds a *shadow* table mapping GVA -> HPA directly. The hardware
  walks only that table on a TLB miss (cheap: n references), but every guest
  page-table write and every CR3 switch must be intercepted to keep the shadow
  in sync (expensive traps / VM exits).

* Nested paging (hardware; EPT 2008 / NPT 2007):
  the guest owns its page tables, no intercepts needed - but a TLB miss now
  needs a *two-dimensional* walk: every guest page-table pointer is itself a
  GPA that must be translated through the host table.
  References = (n + 1) * (m + 1) - 1   ->  24 for 4-level guest and 4-level host.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

MEM_REF = 30          # cycles per page-walk memory reference (partly cached)
EXIT = 1300           # VM exit + handler
SYNC = 450            # shadow page-table maintenance per intercepted write
CR3_REBUILD = 1500    # shadow paging: switch / revalidate shadow root


def two_d_walk(guest_levels: int = 4, host_levels: int = 4) -> List[Tuple[str, str]]:
    """Enumerate every memory reference of a 2-D (nested) page walk."""
    refs: List[Tuple[str, str]] = []
    for g in range(guest_levels, 0, -1):
        # the guest table pointer at level g is a GPA -> translate it first
        for h in range(host_levels, 0, -1):
            refs.append((f"gL{g}", f"host L{h}"))
        refs.append((f"gL{g}", "read guest PTE"))
    # finally the resulting GPA of the data page itself
    for h in range(host_levels, 0, -1):
        refs.append(("data", f"host L{h}"))
    return refs


def walk_refs(guest_levels: int = 4, host_levels: int = 4) -> int:
    return (guest_levels + 1) * (host_levels + 1) - 1


@dataclass
class Workload:
    name: str
    tlb_misses: int
    pt_writes: int
    cr3_switches: int


WORKLOADS = [
    Workload("CPU-bound (compute kernel)", tlb_misses=20_000, pt_writes=50, cr3_switches=10),
    Workload("Web server (many processes)", tlb_misses=20_000, pt_writes=4_000, cr3_switches=2_000),
    Workload("fork()-heavy build (make -j)", tlb_misses=20_000, pt_writes=15_000, cr3_switches=3_000),
]


def cost_native(w: Workload) -> int:
    return w.tlb_misses * 4 * MEM_REF + w.pt_writes * 1 + w.cr3_switches * 120


def cost_shadow(w: Workload) -> int:
    return (w.tlb_misses * 4 * MEM_REF
            + w.pt_writes * (EXIT + SYNC)
            + w.cr3_switches * (EXIT + CR3_REBUILD))


def cost_nested(w: Workload, host_levels: int = 4) -> int:
    return w.tlb_misses * walk_refs(4, host_levels) * MEM_REF + w.pt_writes * 1 + w.cr3_switches * 120


def compare_workloads():
    rows = []
    for w in WORKLOADS:
        n = cost_native(w)
        rows.append((w.name, n, cost_shadow(w), cost_nested(w), cost_nested(w, host_levels=3)))
    return rows
