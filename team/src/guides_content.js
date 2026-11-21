/**
 * Content of the four member guides (one PDF per presenter).
 * Shared "common core" goes into every guide; each member adds their own part.
 */
module.exports.timing = [
  ["M1", "0:00 - 4:30", "Introduction, background, history, hypervisor types", "PPT 1-6", "React 1-6"],
  ["M2", "4:30 - 9:15", "Popek-Goldberg, trap-and-emulate, x86 problem, full virtualization (BT), shadow page tables", "PPT 7-11", "React 7-12"],
  ["M3", "9:15 - 14:00", "Para-virtualization, hardware-assisted (VT-x/AMD-V), EPT/NPT, I/O virtualization", "PPT 12-15", "React 13-17"],
  ["M4", "14:00 - 20:00", "Comparison, applications & live migration, containers, LIVE DEMO (~4 min), conclusion", "PPT 16-23", "React 18-25"],
];

module.exports.common = {
  intro: "Every member must be able to answer these questions without notes. The jury can ask anyone anything; these are the ideas that hold the whole talk together.",
  items: [
    ["Virtualization", "Creating virtual (not physical) versions of resources: CPU, memory, storage, network. A virtual machine (VM) is an isolated environment that runs a full OS as if it owned dedicated hardware; all VMs share the same physical machine."],
    ["Hypervisor / VMM", "The software layer that creates VMs, allocates CPU, memory and I/O to them, and enforces isolation. Type 1 runs on bare metal (ESXi, Xen, Hyper-V); Type 2 runs on a host OS (VirtualBox, VMware Workstation). KVM turns Linux itself into a Type 1 hypervisor."],
    ["Popek & Goldberg (1974)", "A VMM must provide equivalence (same behaviour as on real hardware), resource control (the VMM stays in charge) and efficiency (most instructions run natively). Theorem: a VMM can be built if every sensitive instruction is privileged. Then trap-and-emulate works."],
    ["Privileged vs sensitive", "Privileged = traps when executed outside ring 0. Sensitive = reads or changes privileged machine state (interrupt flag, page tables, descriptor tables, I/O)."],
    ["The x86 problem", "Classic x86 had 17 sensitive but unprivileged instructions (Robin & Irvine, 2000), e.g. POPF (silently ignores the IF bit in ring 1) and SGDT (reveals the host's GDT). They never trap, so naive trap-and-emulate breaks equivalence."],
    ["Full virtualization (BT)", "VMware 1999. Unmodified guest. User code runs directly; kernel code is binary-translated block by block into a translation cache; sensitive instructions are rewritten. Memory via shadow page tables. Correct, but complex and costly for kernel-heavy workloads."],
    ["Para-virtualization", "Xen 2003. The guest kernel is modified to call the hypervisor through hypercalls (and shared pages, batched page-table updates, split drivers). Near-native speed, simpler VMM, but needs a modified guest. Survives today as virtio drivers."],
    ["Hardware-assisted", "Intel VT-x (2005), AMD-V (2006). New CPU mode: root (hypervisor) vs non-root (guest). The guest kernel runs in ring 0 on its own CPU state stored in the VMCS/VMCB. Configured events cause VM exits; VMLAUNCH/VMRESUME (AMD: VMRUN) re-enter. 2nd generation adds EPT/NPT (nested paging) and VPID."],
    ["Nested paging", "GVA -> GPA (guest table) -> HPA (hypervisor table), both walked by hardware. No page-table exits, but a TLB miss can cost (4+1)(4+1)-1 = 24 memory references instead of 4."],
    ["Modern reality", "Hybrid: hardware-assisted CPU and memory + para-virtual (virtio) I/O + device pass-through (IOMMU, SR-IOV) when maximum speed is needed."],
    ["Live migration", "Pre-copy (Clark et al., 2005): copy memory while the VM runs, re-send dirtied pages in rounds, then a short pause to copy the rest. Downtime: tens to hundreds of ms. Basis of zero-downtime maintenance and disaster recovery."],
    ["VMs vs containers", "Containers share one host kernel (namespaces + cgroups): light, fast, weaker isolation. VMs have their own kernel with hardware-enforced isolation."],
  ],
  demo: [
    "Run from the repository root: cd demo && python -m vdemo tour   (Python 3.9+, no dependencies).",
    "Step 1 check: real CPU flags (vmx/svm, ept/npt, vpid) and /dev/kvm.",
    "Step 2 popf: naive trap-and-emulate VMM runs a guest kernel; SGDT leaks the host GDT and POPF fails to mask interrupts: equivalence violated.",
    "Step 3 cpu: the same guest kernel under native, trap-and-emulate, BT, para-virtualization, VT-x without and with EPT. Cycles come from an illustrative cost model (not a benchmark); each engine checks its final state against native.",
    "Step 4 memory: 2-D page walk = 24 references; shadow vs nested paging on three workloads.",
    "Step 5 migrate: pre-copy rounds for a 4 GiB VM over 1 Gbit/s; about 77 ms downtime vs 34 s stop-and-copy.",
    "Step 6 kvm: a 150-line Python VMM using the real /dev/kvm API: creates a VM, loads 15 bytes of 16-bit code, and handles one KVM_EXIT_IO per printed character plus one KVM_EXIT_HLT. On machines without KVM it shows a clearly labelled simulated result.",
  ],
};

module.exports.members = {
  1: {
    focus: "You open the talk. Your job is to make the audience care and to give them the vocabulary (VM, hypervisor, Type 1/2) that everyone else will use.",
    report: [
      ["Abstract and I. Introduction", "Definition of virtualization; benefits (utilization, cost, isolation, snapshots, live migration); the three techniques; organization of the paper."],
      ["II-A Historical overview", "IBM CP-40/CP-67 (1967) and VM/370 (1972); Popek & Goldberg 1974; VMware 1999; Xen 2003; VT-x 2005 / AMD-V 2006; NPT 2007 / EPT 2008; KVM 2007."],
      ["II-B Hypervisors and their types", "Type 1 vs Type 2 with examples; KVM's special position; the three resources a hypervisor must virtualize (CPU, memory, I/O)."],
      ["V Applications (first paragraph)", "Cloud, data centers, development/testing, security. Know enough to answer 'where is this used?'."],
    ],
    slides: [
      ["1. Title", "Greet, present the topic and the team in one sentence. 'Our topic is how one machine can safely pretend to be many.'"],
      ["2. Objectives and roadmap", "State the four objectives, introduce each member and their minutes. Mention there is a live demo at the end."],
      ["3. What is virtualization?", "Define VM, hypervisor/VMM, isolation. Stress: VMs share the same hardware but cannot see each other."],
      ["4. Why it matters", "Consolidation, isolation, flexibility (VMs are files), resilience (live migration). Name the users: cloud, data centers, developers, disaster recovery."],
      ["5. 60 years of virtualization", "Walk the timeline quickly (about 45 s): mainframes -> Popek & Goldberg -> x86 'impossible' -> VMware -> Xen -> VT-x/AMD-V -> KVM -> containers, microVMs, confidential VMs."],
      ["6. Hypervisor types", "Type 1 vs Type 2, examples, KVM. Hand-over line: 'But how can a hypervisor stay in control of a CPU the guest thinks it owns? [Member 2] will explain.'"],
    ],
    demo: "You do not drive the demo, but you must be able to explain step 1 (host check): the vmx/svm flag means the CPU supports hardware-assisted virtualization; the 'hypervisor' flag means the machine is itself a VM; /dev/kvm is the Linux interface to that hardware support.",
    qa: [
      ["Is virtualization the same as emulation?", "No. Emulation (QEMU TCG, Bochs) interprets or translates every instruction and can emulate a different CPU; virtualization runs most guest instructions directly on the same CPU, which is why it is fast."],
      ["Why did virtualization disappear and come back?", "Cheap PCs in the 1980s-90s made one-OS-per-machine acceptable; in the late 1990s data centers were full of under-used servers, and VMware showed x86 could be virtualized."],
      ["Is KVM Type 1 or Type 2?", "Usually classified as Type 1: the hypervisor is part of the Linux kernel running on bare metal. QEMU (user space) only provides device emulation."],
      ["What are the main benefits?", "Utilization and cost (consolidation), isolation, fast provisioning and snapshots, scalability, live migration and disaster recovery."],
    ],
  },
  2: {
    focus: "You give the theory that the whole talk rests on (Popek-Goldberg), show why x86 broke it, and explain the first solution: full virtualization by binary translation, with shadow page tables.",
    report: [
      ["II-C The Popek-Goldberg requirements", "Equivalence, resource control, efficiency; privileged vs sensitive (control- and behavior-sensitive); the theorem; how trap-and-emulate works."],
      ["II-D Why classic x86 was not virtualizable", "Rings 0-3; 17 sensitive unprivileged instructions; POPF and SGDT/SIDT/SMSW examples."],
      ["III-A Full virtualization (binary translation)", "Direct execution of user code; on-demand translation of kernel basic blocks; translation cache; identity translation; in-line sequences and call-outs; difference from emulation."],
      ["III-A (memory) and IV (first half)", "Shadow page tables: GVA->HPA tables built by the VMM; write-protected guest page tables; costs on page-table updates and CR3 switches."],
    ],
    slides: [
      ["7. What must a hypervisor virtualize?", "CPU, memory, I/O. Then the three Popek-Goldberg properties: equivalence, resource control, efficiency. Efficiency is what makes it virtualization rather than emulation."],
      ["8. Trap-and-emulate", "Define privileged and sensitive. Walk the CLI example: guest in ring 1 -> trap -> VMM updates the virtual interrupt flag -> guest resumes. State the theorem."],
      ["9. The x86 problem", "17 instructions are sensitive but not privileged. POPF in ring 1 silently ignores IF; SGDT leaks the host GDT. No trap, so the VMM is blind. (React deck: run the 'See it fail' stepper.)"],
      ["10. Full virtualization: binary translation", "The four-box flow: kernel block -> translator -> translation cache -> run natively. 'popf becomes call vmm_popf - no trap needed.' Trade-offs: no CPU support needed, but complex and with overhead."],
      ["11. Shadow page tables", "GVA -> GPA -> HPA; the VMM collapses it into one shadow table loaded into the MMU. Cheap TLB misses, expensive page-table writes and process switches. Hand-over: 'What if we change the guest, or the CPU? [Member 3].'"],
    ],
    demo: "Know demo step 2 (popf) by heart: the table shows GDTR_seen = 0xffff80000000 instead of 0x1000 (host leak) and work_with_IF=0 = 20 instead of 28 (critical sections ran with interrupts enabled); the VMM saw 70 traps but 17 instructions slipped past. In step 3, explain the BT line: correct, about 9.9x in this kernel-heavy model, with translation-cache hits and shadow page-table syncs as the main costs.",
    qa: [
      ["Why not make POPF trap in software?", "The VMM cannot intercept an instruction that does not trap; it must either rewrite it before it runs (BT), remove it from the source (PV), or rely on new hardware (VT-x)."],
      ["Does binary translation translate user programs too?", "No. User-mode code is safe and runs directly; only guest kernel code is translated, and only once per block thanks to the translation cache."],
      ["What is the difference between control- and behavior-sensitive?", "Control-sensitive instructions change system configuration (e.g. CLI, MOV CR3); behavior-sensitive ones behave differently depending on mode or configuration (e.g. POPF, SGDT)."],
      ["Why are shadow page tables expensive?", "Every guest page-table write must be intercepted (write protection -> page fault) and every CR3 switch must change the shadow root; fork- and context-switch-heavy workloads suffer most."],
    ],
  },
  3: {
    focus: "You present the two other answers to the x86 problem: change the guest (para-virtualization) or change the CPU (VT-x/AMD-V), including the second-generation memory support and I/O virtualization.",
    report: [
      ["III-B Para-virtualization", "Hypercalls; Xen guest in ring 1; validated and batched page-table updates; event channels; shared-page interrupt flag; split drivers; ~3,000 lines changed in Linux; pros/cons; today's hybrid use (virtio, PV clocks)."],
      ["III-C Hardware-assisted virtualization", "VMX root/non-root; separate guest state; VMCS/VMCB; VM entry (VMLAUNCH/VMRESUME, VMRUN) and VM exit with exit reason; Adams & Agesen result; EPT/NPT, VPID/ASID, APICv, VT-d."],
      ["IV Memory and I/O virtualization", "Nested paging and the (n+1)(m+1)-1 formula (24 references); large pages (19); ballooning and page sharing; emulated vs para-virtual vs direct-assigned I/O; IOMMU and SR-IOV."],
    ],
    slides: [
      ["12. Para-virtualization", "Xen 2003: modify the guest. Read the code box: native 'cli' becomes a write to a shared page; 'mov cr3' becomes a hypercall. Pros: near-native, simpler VMM. Cons: modified guest, no closed-source OS."],
      ["13. Hardware-assisted virtualization", "Root vs non-root mode; guest kernel in ring 0 on its own state in the VMCS; VM entry and VM exit; exit reasons; AMD names in parentheses. 'KVM is mostly a set of exit handlers.' (React deck: slide 15 stepper - VT-x mode, then untick EPT.)"],
      ["14. Nested paging: EPT / NPT", "First-generation VT-x still needed shadow paging and costly exits, so BT often won (Adams & Agesen 2006). EPT/NPT: hardware walks both tables. No exits, but 24 references per TLB miss; caches, large pages and VPID hide most of it. (React: animate the walk.)"],
      ["15. Virtualizing I/O", "Emulated (compatible, slow), para-virtual virtio (fast, needs a driver), direct assignment with IOMMU/SR-IOV (near native, hard to migrate). Hand-over: 'So which one wins? [Member 4].'"],
    ],
    demo: "Know demo steps 3 and 4. Step 3: para-virtualization is the fastest (~2.1x), VT-x without EPT (~14x) suffers EXCEPTION(#PF) and CR_ACCESS exits, VT-x + EPT (~3.1x) only exits on IO_INSTRUCTION and HLT. Step 4: 4 vs 24 vs 19 references; shadow paging wins only for compute-bound code. Step 6: each OUT instruction leaves non-root mode as a VM exit (KVM_EXIT_IO) handled by our Python VMM.",
    qa: [
      ["If hardware support exists, why is para-virtualization still used?", "For I/O: virtio avoids trapping on every emulated register access by batching requests through shared rings. PV clocks, spinlocks and TLB-flush hypercalls also beat pure emulation."],
      ["What exactly causes a VM exit?", "Whatever the VMCS execution controls select: I/O instructions (I/O bitmap), HLT, CPUID, some control-register accesses, EPT violations, external interrupts, etc. The exit reason is stored in the VMCS."],
      ["Why was first-generation VT-x sometimes slower than binary translation?", "Each VM exit cost thousands of cycles and memory still used shadow paging, so page-table-heavy workloads exited constantly; a mature binary translator avoided many of these transitions."],
      ["What is VPID?", "A tag on TLB entries identifying the address space (VM), so the TLB does not have to be flushed on every VM entry and exit (AMD: ASID)."],
    ],
  },
  4: {
    focus: "You tie everything together, prove it works with the live demo, and close. You have the longest slot (about 6.5 min): ~1.5 min comparison and applications, ~4 min demo, ~0.5 min conclusion.",
    report: [
      ["III-D Comparison (Table I)", "Guest modification, handling of sensitive instructions, ring of the guest kernel, memory technique, performance, complexity, examples; hybrid practice (KVM/Hyper-V/ESXi, Xen PVH)."],
      ["V Applications", "Cloud/IaaS, Firecracker microVMs, dev/test, security limits (VM escape, side channels), pre-copy live migration and disaster recovery, containers vs VMs."],
      ["VI Demonstration", "The six steps of vdemo, what each measures, and the honest caveat: the cost model is illustrative and the synthetic kernel is kernel-heavy."],
      ["VII Conclusion and perspectives", "Three solutions to one problem; confidential computing (SEV-SNP, TDX), microVMs/unikernels, nested virtualization, ARM EL2 and RISC-V H-extension."],
    ],
    slides: [
      ["16. Where does the guest kernel run?", "Recap the rings figure in 20 s: ring 1 translated, ring 1 modified, ring 0 non-root."],
      ["17. Comparison", "Read 3-4 rows, then the key message: modern hypervisors are hybrids."],
      ["18. Applications and live migration", "List the applications; explain the four pre-copy steps; ~77 ms vs 34 s. (React: move the dirty-rate slider past the bandwidth to show non-convergence.)"],
      ["19. VMs vs containers", "One sentence each; clouds run containers inside VMs."],
      ["20. Live demo", "Switch to the terminal: python -m vdemo tour. Narrate each step in 30-40 s and link it to the member who explained the concept."],
      ["21. Demo results", "Backup if the demo fails (or the React cost explorer)."],
      ["22. Conclusion", "Code rewritten (BT), source rewritten (PV), CPU changed (VT-x). Perspectives in one breath."],
      ["23. References and questions", "Invite questions; route technical questions to the member who owns the topic."],
    ],
    demo: "You DRIVE the demo. Rehearse it twice on the presentation laptop. Before the talk: open a terminal in demo/, run python -m vdemo check, and increase the font size. During the talk run python -m vdemo tour and press Enter between steps. If /dev/kvm is missing (Windows/macOS or a VM without nested virtualization), step 6 prints a clearly labelled simulated result - say so honestly; optionally run it beforehand on a Linux machine with KVM and keep a screenshot. If anything breaks, switch to slide 21 (PowerPoint) or the cost-explorer slide (React).",
    qa: [
      ["Are the demo numbers real measurements?", "Steps 2-5 are a simulator with an illustrative cost model chosen to reproduce the qualitative findings of the literature; step 6 is real hardware-assisted virtualization through /dev/kvm."],
      ["When does live migration fail to converge?", "When the guest dirties memory faster than the link can send it; then hypervisors throttle the vCPUs (auto-converge) or switch to post-copy."],
      ["Which technique is best?", "None alone: hardware assistance for CPU and memory, para-virtual drivers for I/O, pass-through for the fastest devices, emulation for compatibility."],
      ["What is confidential computing?", "Hardware (AMD SEV-SNP, Intel TDX) encrypts and integrity-protects VM memory so even the hypervisor or cloud operator cannot read it."],
    ],
  },
};
