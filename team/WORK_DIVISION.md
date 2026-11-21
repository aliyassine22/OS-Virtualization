# Work division: 20-minute presentation

Each member has a full guide PDF in this folder (`Member_N_Guide.pdf`). Each guide contains:

- a slide-by-slide script
- the report sections to master
- the member's demo responsibilities
- likely questions with answers
- the **common core** that every member must know

## Timing

| Member | Slot | Topics | Slides (both decks) |
|---|---|---|---|
| **M1** | 0:00 – 4:30 | Introduction, outline, what & why, history, hypervisor types | 1–6 |
| **M2** | 4:30 – 9:15 | Popek–Goldberg, trap-and-emulate, the x86 problem, full virtualization (binary translation), shadow page tables | 7–12 |
| **M3** | 9:15 – 14:00 | Para-virtualization, hardware-assisted (VT-x/AMD-V, VMCS, VM exits), EPT/NPT, I/O virtualization | 13–17 |
| **M4** | 14:00 – 20:00 | Comparison, applications & live migration, VMs vs containers, **live demo (~4 min)**, conclusion | 18–25 |

**Why M4 has 6 minutes.** You asked for at least 5 minutes of demo. M1–M3 therefore run 4.5–4.75 minutes each, and M4's slot combines about 1.5 minutes of synthesis, about 4 minutes of demo and about 0.5 minutes of conclusion.

An alternative split gives everyone exactly 5 minutes. M3 takes the comparison slide, and M4 keeps only the demo and the conclusion.

## Report ownership (for Q&A)

| Report section | Owner |
|---|---|
| Abstract, I. Introduction, II-A History, II-B Hypervisor types | M1 |
| II-C Popek–Goldberg, II-D x86 problem, III-A Full virtualization (+ shadow paging) | M2 |
| III-B Para-virtualization, III-C Hardware-assisted, IV Memory & I/O | M3 |
| III-D Comparison, V Applications, VI Demonstration, VII Conclusion | M4 |

## Demo mapping

Each demo step illustrates the content of one member, who should be ready to answer questions about it.

| `python -m vdemo …` | Concept | Owner of the concept |
|---|---|---|
| `check` | CPU support (vmx/svm, ept), /dev/kvm | M1 / M3 |
| `popf` | Sensitive-but-unprivileged instructions break trap-and-emulate | M2 |
| `cpu` | Full vs para vs hardware-assisted (with and without EPT) | M2 + M3 |
| `memory` | Shadow paging vs nested paging, 24-reference walk | M3 |
| `migrate` | Pre-copy live migration, downtime | M4 |
| `kvm` | A real VM driven through the KVM API | M3 / M4 |

## Common core: everyone

Virtualization and the hypervisor (Type 1/2) · Popek–Goldberg properties and theorem · privileged vs sensitive instructions · why x86 failed (POPF, SGDT) · one-sentence summary of BT, PV and VT-x · nested paging (4 vs 24 references) · hybrid reality (HW CPU + virtio I/O) · pre-copy live migration · VMs vs containers · what each demo step shows.
