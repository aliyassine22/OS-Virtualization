import React from "react";
import { Card, Diagram, ImageSlot, List, Reveal, Takeaway } from "../components/blocks.jsx";
import TrapStepper from "../widgets/TrapStepper.jsx";
import PageWalk from "../widgets/PageWalk.jsx";
import MigrationSim from "../widgets/MigrationSim.jsx";
import CostExplorer from "../widgets/CostExplorer.jsx";
import { team, PALETTE } from "./team.js";

const C = { indigo: "#3D4F8C", teal: "#0F7C80", amber: "#B8741A", red: "#C8553D", slate: "#4A5560", green: "#2E8B57" };

/**
 * Each slide: { title, steps (number of → reveals), dark, hideTitle, render }.
 * Order and content mirror the PowerPoint deck; widgets replace static slides where
 * interaction explains more than a picture.
 */
export const SLIDES = [
  // ======================================================= Introduction and background
  {
    title: "Virtualization in Operating Systems", dark: true, hideTitle: true,
    render: () => (
      <div className="row grow" style={{ alignItems: "stretch" }}>
        <div className="col grow" style={{ justifyContent: "center" }}>
          <h1 style={{ fontSize: 62, marginBottom: 10 }}>{team.title}</h1>
          <p className="lead" style={{ fontSize: 26 }}>{team.subtitle}</p>
          <p style={{ fontSize: 20, marginTop: 30, color: "#fff" }}>{team.members.map((m) => m.name).join("  ·  ")}</p>
          <p style={{ color: "#8fa3c7", fontSize: 16, marginTop: 18 }}>{team.course} · {team.university} · {team.date}</p>
        </div>
        <ImageSlot id="hero" desc="One physical server splitting into several glowing, isolated virtual machines" style={{ width: 400 }} />
      </div>
    ),
  },
  {
    title: "Outline",
    render: () => {
      const parts = [
        ["Background", ["What and why", "History", "Hypervisor types"]],
        ["CPU theory", ["Popek-Goldberg", "Trap-and-emulate", "The x86 problem"]],
        ["Techniques", ["Full virtualization", "Para-virtualization", "VT-x / AMD-V", "EPT / NPT", "I/O virtualization"]],
        ["In practice", ["Comparison", "Applications & migration", "Live demo", "Conclusion"]],
      ];
      return (
        <div className="body">
          <div className="row grow">
            {parts.map(([t, items], i) => (
              <Card key={t} title={t} num={i + 1} color={PALETTE[i]} style={{ flex: 1 }}><List items={items} /></Card>
            ))}
          </div>
          <Takeaway>One problem (sensitive instructions that do not trap), three solutions, one live demo.</Takeaway>
        </div>
      );
    },
  },
  {
    title: "What is virtualization?", steps: 3,
    render: () => (
      <div className="row grow">
        <div className="col grow">
          <Reveal at={1}><Card title="Virtual machine (VM)" num={1} color={C.indigo}><p>An isolated environment running a complete OS, as if on dedicated hardware.</p></Card></Reveal>
          <Reveal at={2}><Card title="Hypervisor / VMM" num={2} color={C.teal}><p>The software layer that creates VMs and multiplexes CPU, memory and I/O among them.</p></Card></Reveal>
          <Reveal at={3}><Card title="Isolation and efficiency" num={3} color={C.amber}><p>A fault or attack in one VM must not affect the others or the host.</p></Card></Reveal>
        </div>
        <ImageSlot id="datacenter" desc="Modern data-center aisle with server racks" style={{ width: 420 }} />
      </div>
    ),
  },
  {
    title: "Why it matters",
    render: () => (
      <div className="body">
        <div className="row grow" style={{ flexWrap: "wrap", alignContent: "stretch" }}>
          {[["Consolidation", "Many under-used servers become one well-used host: less hardware, energy and space.", C.teal],
            ["Isolation", "Run untrusted code, several OSs and test setups side by side, safely.", C.indigo],
            ["Flexibility", "VMs are files: snapshot, clone and provision in seconds; scale elastically.", C.amber],
            ["Resilience", "Live-migrate running VMs between hosts with no visible downtime.", C.red]].map(([t, d, c]) => (
            <Card key={t} title={t} color={c} style={{ flex: "1 1 45%" }}><p>{d}</p></Card>
          ))}
        </div>
        <Takeaway>Used everywhere: cloud computing, data centers, development and test, disaster recovery.</Takeaway>
      </div>
    ),
  },
  {
    title: "60 years of virtualization",
    render: () => (
      <div className="body">
        <Diagram name="fig_timeline" alt="Timeline of virtualization" />
        <Takeaway>Each era answered the same question: how do we run an OS on hardware it does not own?</Takeaway>
      </div>
    ),
  },
  {
    title: "Hypervisor types",
    render: () => (
      <div className="body">
        <Diagram name="fig_hypervisor_types" alt="Type 1 vs Type 2 hypervisors" />
        <Takeaway>Type 1 sits on the hardware (servers, cloud); Type 2 sits on an OS (desktops).</Takeaway>
      </div>
    ),
  },
  // ======================================================= CPU virtualization
  {
    title: "What must a hypervisor virtualize?", steps: 3,
    render: () => (
      <div className="row grow">
        <div className="col" style={{ width: 380 }}>
          <h3 style={{ margin: 0, fontSize: 22 }}>Three resources to virtualize</h3>
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
    title: "Trap-and-emulate", steps: 1,
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
    title: "The x86 problem",
    render: () => (
      <div className="body">
        <Diagram name="fig_popek_goldberg" alt="Sensitive vs privileged sets" />
        <Takeaway>POPF in ring 1 silently drops the IF bit: no trap, wrong behaviour. Three fixes follow.</Takeaway>
      </div>
    ),
  },
  {
    title: "See it fail: naive trap-and-emulate",
    render: () => <div className="body"><TrapStepper initialMode="naive" modes={["native", "naive"]} /><Takeaway>Equivalence violated, and the VMM never noticed: POPF and SGDT never trapped.</Takeaway></div>,
  },
  {
    title: "Full virtualization: binary translation", steps: 2,
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
          <Reveal at={1} style={{ flex: 1 }}><Card title="How it works" color={C.teal}><List items={["Unmodified guest OS (even Windows)", "User code: direct execution", "Kernel code: translated once, cached", "popf  →  call vmm_popf (no trap)"]} /></Card></Reveal>
          <Reveal at={2} style={{ flex: 1 }}><Card title="Trade-offs" color={C.red}><List plain items={["+  Works on any x86, no CPU support needed", "−  Translation overhead", "−  Very complex VMM", "−  Costly page-table tracing (shadow paging)"]} /></Card></Reveal>
        </div>
      </div>
    ),
  },
  {
    title: "Shadow page tables",
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
          <Card title="Cheap" color={C.green} style={{ flex: 1 }}><List items={["TLB miss = normal 4-step walk", "Works without any CPU support"]} /></Card>
          <Card title="Expensive" color={C.red} style={{ flex: 1 }}><List items={["Every guest page-table write traps", "Every process switch (CR3 load) traps"]} /></Card>
        </div>
      </div>
    ),
  },
  // ======================================================= Para- and hardware-assisted
  {
    title: "Para-virtualization",
    render: () => (
      <div className="body">
        <div className="row grow">
          <Card title="How it works" color={C.teal} style={{ flex: 1 }}><List items={["Guest kernel ported to a hypervisor API (Xen, 2003)", "Hypercalls replace sensitive instructions", "Interrupt masking = write to a shared page", "Batched page-table updates (multicall)", "Split front-end / back-end drivers"]} /></Card>
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
    title: "Hardware-assisted virtualization", steps: 1,
    render: () => (
      <div className="body">
        <Diagram name="fig_vtx" alt="Intel VT-x architecture" />
        <Reveal at={1}><Takeaway>Unmodified guest in ring 0 on its own CPU state; the VMCS decides what causes a VM exit.</Takeaway></Reveal>
      </div>
    ),
  },
  {
    title: "Instruction by instruction: BT vs PV vs VT-x",
    render: () => <div className="body"><TrapStepper initialMode="vtx" modes={["naive", "bt", "pv", "vtx"]} /><Takeaway>VT-x runs most sensitive instructions natively on the guest's own state; only I/O and HLT exit.</Takeaway></div>,
  },
  {
    title: "Nested paging: EPT / NPT",
    render: () => <div className="body"><PageWalk /><Takeaway>No page-table exits, but a TLB miss costs up to (4+1)(4+1) − 1 = 24 references instead of 4.</Takeaway></div>,
  },
  {
    title: "Virtualizing I/O",
    render: () => (
      <div className="body">
        <Diagram name="fig_io" alt="I/O virtualization approaches" />
        <Takeaway>Real systems mix them: hardware-assisted CPU + virtio I/O + pass-through for the fastest devices.</Takeaway>
      </div>
    ),
  },
  // ======================================================= Comparison, applications, demo, conclusion
  {
    title: "Where does the guest kernel run?",
    render: () => <div className="body"><Diagram name="fig_rings" alt="Privilege rings per technique" /><Takeaway>Rewrite the code (BT), rewrite the source (PV), or extend the CPU (VT-x / AMD-V).</Takeaway></div>,
  },
  {
    title: "Comparison",
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
    title: "Applications and live migration",
    render: () => (
      <div className="body">
        <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <b style={{ fontSize: 17, color: C.indigo }}>Where virtualization is used:</b>
          {["Cloud (IaaS)", "Data centers", "Development and testing", "Security isolation", "Disaster recovery"].map((t) => <span key={t} className="tag" style={{ fontSize: 15 }}>{t}</span>)}
        </div>
        <h3 style={{ margin: 0, fontSize: 20, color: C.teal }}>Live migration (pre-copy): copy memory while running, re-send dirtied pages, short final pause</h3>
        <MigrationSim />
      </div>
    ),
  },
  {
    title: "VMs vs containers",
    render: () => <div className="body"><Diagram name="fig_containers" alt="VMs vs containers" /><Takeaway>Containers share the kernel (light); VMs virtualize the hardware (strong isolation).</Takeaway></div>,
  },
  {
    title: "Live demo: vdemo",
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
    title: "Demo results",
    render: () => (
      <div className="body">
        <CostExplorer />
        <div className="row">
          {[["4 → 24", "memory references per TLB miss (native → nested)", C.teal], ["77 ms", "live-migration downtime vs 34 s stop-and-copy", C.red], ["25 exits", "real KVM guest printing 24 chars + HLT", C.indigo]].map(([n, d, c]) => (
            <div key={n} className="card" style={{ flex: 1, padding: "10px 16px", display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: c, whiteSpace: "nowrap" }}>{n}</span><span className="muted" style={{ fontSize: 15 }}>{d}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Conclusion", dark: true, steps: 1,
    render: () => (
      <div className="row grow">
        <div className="col grow" style={{ justifyContent: "center" }}>
          <p className="lead" style={{ fontSize: 28, color: "#fff" }}>One problem: sensitive instructions that do not trap. Three solutions that now coexist:</p>
          {["Full virtualization rewrote the code", "Para-virtualization rewrote the source", "Hardware assistance changed the CPU"].map((t, i) => (
            <p key={t} style={{ fontSize: 24, margin: "6px 0", color: "#CADCFC" }}><span className="num" style={{ background: PALETTE[i + 1], marginRight: 12 }}>{i + 1}</span>{t}</p>
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
    title: "References and questions",
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
