import React from "react";
import { Card, Diagram, ImageSlot, List, Reveal, Takeaway } from "../components/blocks.jsx";
import TrapStepper from "../widgets/TrapStepper.jsx";
import PageWalk from "../widgets/PageWalk.jsx";
import MigrationSim from "../widgets/MigrationSim.jsx";
import CostExplorer from "../widgets/CostExplorer.jsx";
import { team, MEMBER_COLORS } from "./team.js";

const C = { indigo: "#3D4F8C", teal: "#0F7C80", amber: "#B8741A", red: "#C8553D", slate: "#4A5560", green: "#2E8B57" };

/**
 * Each slide: { title, member (1-4), steps (number of → reveals), dark, notes, render }.
 * Order and content mirror the PowerPoint deck; widgets replace static slides where
 * interaction explains more than a picture.
 */
export const SLIDES = [
  // ======================================================= M1
  {
    title: "Virtualization in Operating Systems", member: 1, dark: true, hideTitle: true, hideBadge: true,
    notes: "Welcome. Topic: virtualization in operating systems and the three techniques that make it possible - full, para- and hardware-assisted virtualization. Four presenters; I cover the introduction and background.",
    render: () => (
      <div className="row grow" style={{ alignItems: "stretch" }}>
        <div className="col grow" style={{ justifyContent: "center" }}>
          <h1 style={{ fontSize: 62, marginBottom: 10 }}>{team.title}</h1>
          <p className="lead" style={{ fontSize: 26 }}>{team.subtitle}</p>
          <div className="row" style={{ gap: 14, marginTop: 30, flexWrap: "wrap" }}>
            {team.members.map((m, i) => (
              <span key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18 }}>
                <span className="num" style={{ background: MEMBER_COLORS[i] }}>{i + 1}</span>{m.name}
              </span>
            ))}
          </div>
          <p style={{ color: "#8fa3c7", fontSize: 16, marginTop: 18 }}>{team.course} · {team.university} · {team.date}</p>
        </div>
        <ImageSlot id="hero" desc="One physical server splitting into several glowing, isolated virtual machines" style={{ width: 400 }} />
      </div>
    ),
  },
  {
    title: "Objectives and roadmap", member: 1,
    notes: "Objectives: understand what virtualization is and why it matters; the theory deciding whether a CPU can be virtualized; full, para- and hardware-assisted virtualization; and see them working live. Introduce each speaker.",
    render: () => {
      const parts = [
        ["What & why", "History", "Hypervisor types"], ["Popek-Goldberg", "Trap-and-emulate", "The x86 problem", "Binary translation"],
        ["Para-virtualization", "VT-x / AMD-V", "EPT / NPT", "I/O virtualization"], ["Comparison", "Applications & migration", "Live demo", "Conclusion"],
      ];
      const slots = ["0:00 - 4:30", "4:30 - 9:15", "9:15 - 14:00", "14:00 - 20:00"];
      return (
        <div className="body">
          <div className="row grow">
            {team.members.map((m, i) => (
              <Card key={m.id} title={m.name} num={i + 1} color={MEMBER_COLORS[i]} style={{ flex: 1 }}>
                <List items={parts[i]} />
                <p className="muted" style={{ marginTop: 12, fontSize: 15 }}>{slots[i]}</p>
              </Card>
            ))}
          </div>
          <Takeaway>One problem (sensitive instructions that do not trap), three solutions, one live demo.</Takeaway>
        </div>
      );
    },
  },
  {
    title: "What is virtualization?", member: 1, steps: 3,
    notes: "Definition from the brief: virtual rather than physical versions of resources - hardware platforms, storage, networks. A VM is an isolated environment running a full OS as if on dedicated hardware. The hypervisor or VMM creates VMs, allocates resources and enforces isolation. All VMs share the same physical hardware.",
    render: () => (
      <div className="row grow">
        <div className="col grow">
          <Reveal at={1}><Card title="Virtual machine (VM)" num={1} color={C.indigo}><p>An isolated environment running a complete OS, as if on dedicated hardware.</p></Card></Reveal>
          <Reveal at={2}><Card title="Hypervisor / VMM" num={2} color={C.teal}><p>The software layer that creates VMs and multiplexes CPU, memory and I/O among them.</p></Card></Reveal>
          <Reveal at={3}><Card title="Isolation and efficiency" num={3} color={C.amber}><p>A fault or attack in one VM must not affect the others, and VMs should run at near-native speed.</p></Card></Reveal>
        </div>
        <ImageSlot id="datacenter" desc="Modern data-center aisle with server racks" style={{ width: 420 }} />
      </div>
    ),
  },
  {
    title: "Why it matters", member: 1,
    notes: "Benefits from the brief: resource utilization, lower hardware cost, scalability and flexibility, isolation for testing, and disaster recovery through live migration. These are why clouds, data centers and developers use VMs.",
    render: () => (
      <div className="body">
        <div className="row grow">
          {[["Consolidation", "Many under-used servers become one well-used host: less hardware, energy and space.", C.teal],
            ["Isolation", "Run untrusted code, several OSs and test setups side by side, safely.", C.indigo],
            ["Flexibility", "VMs are files: snapshot, clone and provision in seconds; scale elastically.", C.amber],
            ["Resilience", "Live-migrate running VMs between hosts with no visible downtime.", C.red]].map(([t, d, c]) => (
            <Card key={t} title={t} color={c} style={{ flex: 1 }}><p>{d}</p></Card>
          ))}
        </div>
        <ImageSlot id="cloud" desc="Stylised cloud built from many small VM blocks over a world map" style={{ height: 200 }} />
        <Takeaway>Used everywhere: cloud computing, data centers, development and test, disaster recovery.</Takeaway>
      </div>
    ),
  },
  {
    title: "60 years of virtualization", member: 1,
    notes: "IBM CP-40/CP-67 (1967) and VM/370 (1972). Popek & Goldberg 1974. VMware 1999 (binary translation), Xen 2003 (para-virtualization), Intel VT-x 2005 / AMD-V 2006, KVM 2007, NPT/EPT 2007-08. Then containers, microVMs and confidential VMs.",
    render: () => (
      <div className="body">
        <Diagram name="fig_timeline" alt="Timeline of virtualization" />
        <Takeaway>Every era answered the same question: how do we run an OS on hardware it does not own?</Takeaway>
      </div>
    ),
  },
  {
    title: "Hypervisor types", member: 1,
    notes: "Type 1 bare-metal: ESXi, Xen, Hyper-V - servers and clouds. Type 2 hosted: VirtualBox, VMware Workstation - desktops. KVM turns Linux into a Type 1 hypervisor with QEMU for devices. Hand-over: how can a hypervisor control a CPU that the guest believes it owns?",
    render: () => (
      <div className="body">
        <Diagram name="fig_hypervisor_types" alt="Type 1 vs Type 2 hypervisors" />
        <Takeaway>Type 1 sits on the hardware (servers, cloud); Type 2 sits on an OS (desktops).</Takeaway>
      </div>
    ),
  },
  // ======================================================= M2
  {
    title: "What must a hypervisor virtualize?", member: 2, steps: 3,
    notes: "Three resources: CPU, memory, I/O. Popek & Goldberg define a VMM by three properties: equivalence, resource control and efficiency. Efficiency separates virtualization from slow emulation.",
    render: () => (
      <div className="row grow">
        <div className="col" style={{ width: 380 }}>
          {[["CPU", "privileged state and instructions", C.indigo], ["Memory", "address translation, page tables", C.teal], ["I/O devices", "devices, interrupts, DMA", C.slate]].map(([t, d, c]) => (
            <Card key={t} title={t} color={c}><p>{d}</p></Card>
          ))}
        </div>
        <div className="col grow">
          <h3 style={{ margin: 0, fontSize: 22 }}>Popek & Goldberg (1974): a VMM must provide</h3>
          {[["Equivalence", "a program behaves exactly as on bare hardware"], ["Resource control", "the VMM is always in charge of the resources"], ["Efficiency", "most instructions run natively, without the VMM"]].map(([t, d], i) => (
            <Reveal key={t} at={i + 1}><Card title={t} num={i + 1} color={C.teal}><p>{d}</p></Card></Reveal>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Trap-and-emulate", member: 2, steps: 1,
    notes: "Privileged instructions trap outside ring 0; sensitive instructions touch privileged state. Theorem: if sensitive ⊆ privileged, a VMM can be built. Run the guest kernel deprivileged; ordinary instructions run natively, sensitive ones trap and are emulated on a virtual CPU.",
    render: () => (
      <div className="body">
        <Diagram name="fig_trap_emulate" alt="Trap and emulate flow" style={{ flex: "0 0 230px" }} />
        <div className="row">
          <Card title="Privileged instruction" color={C.teal} style={{ flex: 1 }}><p>Traps if executed outside ring 0 (CLI, HLT, MOV CR3, OUT).</p></Card>
          <Card title="Sensitive instruction" color={C.indigo} style={{ flex: 1 }}><p>Reads or changes privileged machine state (interrupt flag, page tables, descriptor tables).</p></Card>
        </div>
        <Reveal at={1}><Takeaway>Virtualizable  ⇔  every sensitive instruction is also privileged.</Takeaway></Reveal>
      </div>
    ),
  },
  {
    title: "The x86 problem", member: 2,
    notes: "Classic x86 has 17 sensitive but unprivileged instructions (Robin & Irvine 2000). POPF in ring 1 silently ignores the IF bit; SGDT reveals the host's GDT. No trap, so the VMM never notices. Use the stepper: run the naive VMM and watch POPF and SGDT slip through.",
    render: () => (
      <div className="body">
        <Diagram name="fig_popek_goldberg" alt="Sensitive vs privileged sets" />
        <Takeaway>POPF in ring 1 silently drops the IF bit: no trap, wrong behaviour. Three fixes follow.</Takeaway>
      </div>
    ),
  },
  {
    title: "See it fail: naive trap-and-emulate", member: 2,
    notes: "Interactive. Run the naive VMM: privileged instructions trap correctly, but SGDT returns the host's GDT base and POPF fails to mask interrupts, so the critical section runs unmasked. Compare with Native. The VMM never noticed - equivalence is violated.",
    render: () => <div className="body"><TrapStepper initialMode="naive" modes={["native", "naive"]} /></div>,
  },
  {
    title: "Full virtualization: binary translation", member: 2, steps: 2,
    notes: "VMware 1999. Unmodified guest. User code runs directly; kernel code is translated basic block by basic block into a translation cache. Sensitive instructions become in-line sequences or VMM call-outs: no trap needed. Not the same as emulation (QEMU TCG, Bochs translate everything).",
    render: () => (
      <div className="body">
        <div className="row">
          {[["Guest kernel", "basic block with POPF / CLI", C.indigo], ["Translator", "rewrites sensitive instructions", C.teal], ["Translation cache", "reused on every later execution", C.teal], ["Runs natively", "ring 1, near full speed", C.slate]].map(([t, d, c], i) => (
            <div key={t} style={{ flex: 1, background: c, color: "#fff", borderRadius: 12, padding: "16px 18px" }}>
              <b style={{ fontSize: 20 }}>{i + 1}. {t}</b><p style={{ margin: "6px 0 0", fontSize: 16 }}>{d}</p>
            </div>
          ))}
        </div>
        <div className="row grow">
          <Reveal at={1} style={{ flex: 1 }}><Card title="How it works" color={C.teal}><List items={["Unmodified guest OS (even Windows)", "User code: direct execution", "Kernel code: translated once, cached"]} />
            <div className="code" style={{ marginTop: 10 }}><span className="c">; guest</span>  popf   <span className="h">→</span>   <span className="h">call vmm_popf</span>  <span className="c">; no trap</span></div></Card></Reveal>
          <Reveal at={2} style={{ flex: 1 }}><Card title="Trade-offs" color={C.red}><List items={["+ Works on any x86, no CPU support needed", "− Translation overhead", "− Very complex VMM", "− Costly page-table tracing (shadow paging)"]} /></Card></Reveal>
        </div>
      </div>
    ),
  },
  {
    title: "Shadow page tables", member: 2,
    notes: "Guest maps GVA→GPA, but real memory is HPA. The VMM keeps shadow tables GVA→HPA loaded in the MMU, write-protects guest page tables and intercepts every update and CR3 switch. Cheap TLB misses, expensive page-table updates. Hand-over to M3: change the guest, or change the CPU?",
    render: () => (
      <div className="body">
        <div className="row" style={{ alignItems: "center", gap: 0, marginTop: 10 }}>
          {[["GVA", "guest virtual", "#DDE6F0", "#1F2A44"], ["GPA", "guest 'physical'", C.indigo, "#fff"], ["HPA", "real memory", C.slate, "#fff"]].map(([t, d, bg, fg], i) => (
            <React.Fragment key={t}>
              <div style={{ background: bg, color: fg, borderRadius: 12, padding: "14px 26px", textAlign: "center", minWidth: 180 }}>
                <b style={{ fontSize: 26 }}>{t}</b><div style={{ fontSize: 15 }}>{d}</div></div>
              {i < 2 && <div style={{ flex: 1, textAlign: "center", fontSize: 15, color: C.indigo }}>{i === 0 ? "guest page table" : "VMM's mapping"}<div style={{ borderTop: "2px solid", margin: "4px 14px" }} /></div>}
            </React.Fragment>
          ))}
        </div>
        <div style={{ border: "2px dashed #E59A2B", borderRadius: 12, padding: 12, textAlign: "center", color: "#B8741A", fontWeight: 600, fontSize: 18 }}>
          Shadow page table: GVA → HPA in one step, kept in sync by the VMM (guest page tables write-protected)
        </div>
        <div className="row grow">
          <Card title="Cheap" color={C.green} style={{ flex: 1 }}><List items={["TLB miss = a normal 4-step walk", "Needs no CPU support"]} /></Card>
          <Card title="Expensive" color={C.red} style={{ flex: 1 }}><List items={["Every guest page-table write traps", "Every process switch (CR3 load) traps"]} /></Card>
        </div>
      </div>
    ),
  },
  // ======================================================= M3
  {
    title: "Para-virtualization", member: 3,
    notes: "Xen 2003. The guest kernel is modified: hypercalls replace sensitive instructions, interrupt masking is a write to a shared page, page-table updates are batched, devices use split front-end/back-end drivers. About 3,000 lines changed in Linux. Closed OSs cannot be ported; survives today as virtio drivers.",
    render: () => (
      <div className="body">
        <div className="row grow">
          <Card title="How it works" color={C.teal} style={{ flex: 1 }}><List items={["Kernel ported to a hypervisor API (Xen, 2003)", "Hypercalls replace sensitive instructions", "Interrupt masking = write to a shared page", "Batched page-table updates (multicall)", "Split front-end / back-end drivers"]} /></Card>
          <div className="code" style={{ flex: 1 }}>
            <div className="c">// native kernel</div><div>cli</div><div>mov  cr3, eax</div><br />
            <div className="c">// para-virtualized kernel</div><div className="h">shared-&gt;evtchn_mask = 1;</div><div className="h">HYPERVISOR_mmuext_op(NEW_BASEPTR);</div>
          </div>
        </div>
        <div className="row">
          <Card title="+ Near-native speed, simpler VMM" color={C.green} style={{ flex: 1 }} />
          <Card title="− Guest kernel must be modified" color={C.red} style={{ flex: 1 }} />
        </div>
      </div>
    ),
  },
  {
    title: "Hardware-assisted virtualization", member: 3, steps: 1,
    notes: "Intel VT-x 2005, AMD-V 2006. VMX root (hypervisor) vs non-root (guest). Guest kernel in ring 0 on its own CPU state in the VMCS/VMCB, so POPF/CLI just change the guest's copy. VMLAUNCH/VMRESUME enter the guest; configured events cause VM exits with an exit reason. Unmodified guests, simple VMM - KVM is mostly exit handlers.",
    render: () => (
      <div className="body">
        <Diagram name="fig_vtx" alt="Intel VT-x architecture" />
        <Reveal at={1}><Takeaway>Unmodified guest in ring 0 on its own CPU state; the VMCS decides what causes a VM exit.</Takeaway></Reveal>
      </div>
    ),
  },
  {
    title: "Instruction by instruction: BT vs PV vs VT-x", member: 3,
    notes: "Interactive. Same guest path under each technique. BT: sensitive instructions translated in-line. PV: the source shows hypercalls and shared-page writes. VT-x: CLI, POPF and SGDT run natively on the guest's own state; only OUT and HLT exit. Untick EPT to show first-generation behaviour: CR3 loads and page-table writes also exit.",
    render: () => <div className="body"><TrapStepper initialMode="vtx" modes={["naive", "bt", "pv", "vtx"]} /></div>,
  },
  {
    title: "Nested paging: EPT / NPT", member: 3,
    notes: "First-generation VT-x still needed shadow paging and expensive exits (Adams & Agesen 2006). Nested paging (AMD NPT 2007, Intel EPT 2008): hardware walks guest table then host table. No page-table exits, but up to 24 references per TLB miss. Animate: native 4, nested 24, huge pages 19.",
    render: () => <div className="body"><PageWalk /><Takeaway>No page-table exits, but a TLB miss costs up to 24 references; TLBs, walk caches, large pages and VPID hide most of it.</Takeaway></div>,
  },
  {
    title: "Virtualizing I/O", member: 3,
    notes: "Emulation: stock driver, every register access traps to QEMU - compatible, slow. Para-virtual (virtio): shared rings, batching - fast, needs a driver. Direct assignment with IOMMU (VT-d / AMD-Vi) and SR-IOV - near native, harder to migrate. Hand-over to M4.",
    render: () => (
      <div className="body">
        <Diagram name="fig_io" alt="I/O virtualization approaches" />
        <Takeaway>Real systems mix them: hardware-assisted CPU + virtio I/O + pass-through for the fastest devices.</Takeaway>
      </div>
    ),
  },
  // ======================================================= M4
  {
    title: "Where does the guest kernel run?", member: 4,
    notes: "Recap: full virtualization runs the kernel in ring 1, translated; para-virtualization runs a modified kernel in ring 1 using hypercalls; hardware-assisted runs the unmodified kernel in non-root ring 0 with VM exits.",
    render: () => <div className="body"><Diagram name="fig_rings" alt="Privilege rings per technique" /><Takeaway>Rewrite the code (BT), rewrite the source (PV), or extend the CPU (VT-x / AMD-V).</Takeaway></div>,
  },
  {
    title: "Comparison", member: 4,
    notes: "Read the table row by row. Modern systems are hybrids: KVM, Hyper-V and ESXi use hardware assistance for CPU and memory and virtio para-virtual drivers for I/O.",
    render: () => {
      const rows = [
        ["Guest OS", "Unmodified", "Modified kernel", "Unmodified"],
        ["Sensitive instructions", "Translated in software", "Hypercalls", "Run on guest state / VM exit"],
        ["Guest kernel ring", "1 (deprivileged)", "1 (deprivileged)", "0 (non-root)"],
        ["Memory", "Shadow page tables", "Validated guest PTs", "EPT / NPT"],
        ["Performance", "Good; costly when kernel-heavy", "Near native", "Near native (2nd gen.)"],
        ["VMM complexity", "Very high", "Moderate", "Lowest"],
        ["Examples", "VMware (early), VirtualBox", "Xen PV, virtio", "KVM, Hyper-V, ESXi"],
      ];
      return (
        <div className="body">
          <table className="state-table" style={{ fontSize: 19 }}>
            <thead><tr style={{ background: "#1F2A44", color: "#fff" }}><th /><th style={{ padding: 10 }}>Full (BT)</th><th>Para-virtualization</th><th>Hardware-assisted</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, j) => <td key={j} style={{ fontWeight: j === 0 ? 700 : 400, background: j === 0 ? "#F3F6F9" : undefined }}>{c}</td>)}</tr>)}</tbody>
          </table>
          <Takeaway>Modern hypervisors are hybrids: hardware-assisted CPU and memory + para-virtual I/O.</Takeaway>
        </div>
      );
    },
  },
  {
    title: "Live migration (pre-copy)", member: 4,
    notes: "Applications: cloud IaaS, consolidation, dev/test, security isolation, disaster recovery. Pre-copy (Clark et al. 2005): copy memory while running, re-send dirtied pages, short stop-and-copy. Drag the dirty-rate slider past the bandwidth to show non-convergence.",
    render: () => <div className="body"><MigrationSim /></div>,
  },
  {
    title: "VMs vs containers", member: 4,
    notes: "Containers share one kernel (namespaces + cgroups): light, millisecond start, weaker isolation. VMs bring their own kernel with hardware-enforced isolation. Clouds often run containers inside VMs; microVMs (Firecracker) combine both.",
    render: () => <div className="body"><Diagram name="fig_containers" alt="VMs vs containers" /><Takeaway>Containers share the kernel (light); VMs virtualize the hardware (strong isolation).</Takeaway></div>,
  },
  {
    title: "Live demo: vdemo", member: 4,
    notes: "Switch to the terminal: python -m vdemo tour. 1 host check, 2 POPF/SGDT failure, 3 five engines, 4 memory, 5 migration, 6 real KVM through /dev/kvm. Without KVM the tool prints a clearly labelled simulated result.",
    render: () => (
      <div className="body">
        <div className="row grow" style={{ flexWrap: "wrap" }}>
          {[["1  Host check", "vmx / svm, ept, /dev/kvm", C.slate], ["2  The x86 problem", "POPF and SGDT slip past the VMM", C.red], ["3  Five engines", "native, T&E, BT, PV, VT-x(+EPT)", C.indigo],
            ["4  Memory", "shadow vs nested, 4 vs 24 refs", C.teal], ["5  Live migration", "pre-copy rounds and downtime", C.amber], ["6  Real KVM", "our own VMM via /dev/kvm", C.green]].map(([t, d, c]) => (
            <Card key={t} title={t} color={c} style={{ flex: "1 1 30%" }}><p>{d}</p></Card>
          ))}
        </div>
        <div className="code" style={{ fontSize: 20 }}><span className="c">$ </span><span className="h">cd demo && python -m vdemo tour</span>   <span className="c"># or: check | popf | cpu | memory | migrate | kvm</span></div>
      </div>
    ),
  },
  {
    title: "Demo results: explore the cost model", member: 4,
    notes: "Backup for the live demo, and interactive: naive trap-and-emulate is slow and wrong, BT correct but heavy, PV fastest, VT-x without EPT suffers exits, EPT removes most. Lower the VM-exit cost to show why modern hardware assistance wins.",
    render: () => <div className="body"><CostExplorer /></div>,
  },
  {
    title: "Conclusion", member: 4, dark: true, steps: 1,
    notes: "Virtualization turns hardware into isolated, mobile, software-defined resources. One x86 problem, three solutions that now coexist. Perspectives: confidential computing (SEV-SNP, TDX), microVMs, nested virtualization, ARM and RISC-V.",
    render: () => (
      <div className="row grow">
        <div className="col grow" style={{ justifyContent: "center" }}>
          <p className="lead" style={{ fontSize: 28, color: "#fff" }}>One problem: sensitive instructions that do not trap.</p>
          {["Full virtualization rewrote the code", "Para-virtualization rewrote the source", "Hardware assistance changed the CPU"].map((t, i) => (
            <p key={t} style={{ fontSize: 24, margin: "6px 0", color: "#CADCFC" }}><span className="num" style={{ background: MEMBER_COLORS[i + 1], marginRight: 12 }}>{i + 1}</span>{t}</p>
          ))}
        </div>
        <Reveal at={1} className="col" style={{ width: 420, justifyContent: "center" }}>
          <h3 style={{ color: "#F2C57C", margin: 0, fontSize: 24 }}>Perspectives</h3>
          {[["Confidential VMs", "AMD SEV-SNP, Intel TDX encrypt guest memory, even from the hypervisor"], ["MicroVMs", "Firecracker: VM isolation at container speed"], ["Nested virtualization", "hypervisors inside VMs"], ["Beyond x86", "ARM EL2, RISC-V H-extension"]].map(([t, d]) => (
            <div key={t}><b style={{ fontSize: 20 }}>{t}</b><p style={{ margin: "2px 0 0", color: "#CADCFC", fontSize: 17 }}>{d}</p></div>
          ))}
        </Reveal>
      </div>
    ),
  },
  {
    title: "References and questions", member: 4,
    notes: "Invite questions. Each member answers questions on their own part.",
    render: () => (
      <div className="row grow">
        <ol className="col grow" style={{ fontSize: 17, lineHeight: 1.45, margin: 0, paddingLeft: 22 }}>
          <li>G. Popek, R. Goldberg, "Formal requirements for virtualizable third generation architectures," CACM, 1974.</li>
          <li>J. Robin, C. Irvine, "Analysis of the Intel Pentium's ability to support a secure VMM," USENIX Security, 2000.</li>
          <li>E. Bugnion et al., "Bringing virtualization to the x86 architecture with the original VMware Workstation," ACM TOCS, 2012.</li>
          <li>P. Barham et al., "Xen and the art of virtualization," SOSP, 2003.</li>
          <li>R. Uhlig et al., "Intel virtualization technology," IEEE Computer, 2005.</li>
          <li>K. Adams, O. Agesen, "A comparison of software and hardware techniques for x86 virtualization," ASPLOS, 2006.</li>
          <li>C. Clark et al., "Live migration of virtual machines," NSDI, 2005.</li>
        </ol>
        <div style={{ width: 340, background: "#1F2A44", color: "#fff", borderRadius: 16, display: "grid", placeItems: "center", textAlign: "center", padding: 20 }}>
          <div><div style={{ fontSize: 44, fontWeight: 700 }}>Questions?</div><p style={{ color: "#CADCFC" }}>Code, report and slides in the project repository</p></div>
        </div>
      </div>
    ),
  },
];
