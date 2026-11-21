import React from "react";
import { FaCloud, FaServer, FaFlask, FaShieldAlt, FaSyncAlt, FaCompressAlt, FaClone } from "react-icons/fa";
import { Card, Diagram, ImageSlot, List, Reveal, Takeaway } from "../components/blocks.jsx";
import TrapStepper from "../widgets/TrapStepper.jsx";
import PageWalk from "../widgets/PageWalk.jsx";
import MigrationSim from "../widgets/MigrationSim.jsx";
import CostExplorer from "../widgets/CostExplorer.jsx";
import { team, PALETTE } from "./team.js";
import { CountUp } from "../components/motion.jsx";

const C = { indigo: "#3D4F8C", teal: "#0F7C80", amber: "#B8741A", red: "#C8553D", slate: "#4A5560", green: "#2E8B57", ink: "#1F2A44" };

/** Outcome colours shared by the instruction tables: [text, tint]. */
const OUT = { bug: ["#C8553D", "#FBE9E5"], trap: ["#9A5F10", "#FDF1DF"], ok: ["#2E7D4F", "#E6F3EC"], tr: ["#3D4F8C", "#E8EBF5"], pv: ["#0F7C80", "#E3F2F2"] };

const Sub = ({ children }) => <p className="subhead">{children}</p>;
const IconDot = ({ icon: I, color, size = 40 }) => (
  <span className="icon-dot" style={{ background: color, width: size, height: size }}><I size={size * 0.5} color="#fff" /></span>
);

/**
 * Each slide: { title, steps (number of → reveals), dark, hideTitle, render }.
 * Order and wording mirror the PowerPoint deck slide for slide; widgets add
 * interaction where it explains more than a picture.
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
        <ImageSlot id="hero" ratio="2.9 / 4.1" desc="One physical server splitting into several glowing, isolated virtual machines" style={{ width: 410 }} />
      </div>
    ),
  },
  {
    title: "Outline",
    render: () => {
      const parts = [
        ["Background", "What virtualization is, why it matters, 60 years of history", "Definitions · benefits · timeline · hypervisor types"],
        ["CPU theory", "When can a CPU be virtualized at all, and why classic x86 could not", "Popek-Goldberg · trap-and-emulate · the x86 problem"],
        ["Techniques", "Three answers to the x86 problem, plus memory and I/O", "Full virtualization · para-virtualization · VT-x / AMD-V · EPT / NPT · I/O"],
        ["In practice", "How the techniques compare, where they are used, and a live demo", "Comparison · applications & live migration · demo · conclusion"],
      ];
      return (
        <div className="body">
          <div className="col grow" style={{ gap: 12 }}>
            {parts.map(([t, d, topics], i) => (
              <div key={t} className="card agenda">
                <span className="num big-num" style={{ background: PALETTE[i] }}>{i + 1}</span>
                <b style={{ color: PALETTE[i] }}>{t}</b>
                <div><p>{d}</p><p className="muted small">{topics}</p></div>
              </div>
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
        <div className="col grow big-cards" style={{ justifyContent: "center", gap: 16 }}>
          <Reveal at={1}><Card title="Virtual machine (VM)" num={1} color={C.indigo}><p>An isolated environment running a complete OS, as if on dedicated hardware.</p></Card></Reveal>
          <Reveal at={2}><Card title="Hypervisor / VMM" num={2} color={C.teal}><p>The layer that creates VMs and multiplexes CPU, memory and I/O among them.</p></Card></Reveal>
          <Reveal at={3}><Card title="Isolation and efficiency" num={3} color={C.amber}><p>A fault or attack in one VM must not affect the others or the host.</p></Card></Reveal>
          <div className="takeaway analogy"><b>Analogy</b>apartments in one building: shared structure, private units</div>
        </div>
        <ImageSlot id="datacenter" ratio="3.4 / 3.69" desc="Modern data-center aisle with server racks" style={{ width: 440 }} />
      </div>
    ),
  },
  {
    title: "Why it matters",
    render: () => (
      <div className="body">
        <div className="row grow">
          <div className="grid2 grow">
            {[["Consolidation", "Many under-used servers become one well-used host: less hardware, energy and space.", C.teal, FaCompressAlt],
              ["Isolation", "Run untrusted code, several OSs and test setups side by side, safely.", C.indigo, FaShieldAlt],
              ["Flexibility", "VMs are files: snapshot, clone and provision in seconds; scale elastically.", C.amber, FaClone],
              ["Resilience", "Live-migrate running VMs between hosts with no visible downtime.", C.red, FaSyncAlt]].map(([t, d, c, I]) => (
              <div key={t} className="card">
                <h3 style={{ color: c }}><IconDot icon={I} color={c} size={36} />{t}</h3><p>{d}</p>
              </div>
            ))}
          </div>
          <ImageSlot id="consolidation" ratio="3.7 / 3.4" desc="Many idle servers become one busy server running several VMs" style={{ width: 470 }} />
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
        <div className="col" style={{ width: 400 }}>
          <h3 className="colhead">Three resources to virtualize</h3>
          {[["CPU", "privileged state and instructions", C.indigo], ["Memory", "address translation, page tables", C.teal], ["I/O devices", "devices, interrupts, DMA", C.slate]].map(([t, d, c]) => (
            <Card key={t} title={t} color={c} style={{ flex: 1 }}><p>{d}</p></Card>
          ))}
        </div>
        <div className="col grow">
          <h3 className="colhead">Popek & Goldberg (1974): a VMM must provide</h3>
          {[["Equivalence", "a program behaves exactly as on bare hardware"], ["Resource control", "the VMM is always in charge of the resources"], ["Efficiency", "most instructions run natively, without the VMM"]].map(([t, d], i) => (
            <Reveal key={t} at={i + 1} style={{ flex: 1, display: "flex" }}><Card title={t} num={i + 1} color={C.teal} style={{ flex: 1 }}><p>{d}</p></Card></Reveal>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Trap-and-emulate", steps: 1,
    render: () => (
      <div className="body">
        <Diagram name="fig_trap_emulate" alt="Trap and emulate flow" />
        <div className="row">
          <Card title="Privileged instruction" color={C.teal} style={{ flex: 1 }}><List items={["Traps when executed outside ring 0", "CLI / STI: interrupt flag", "HLT: halt the CPU", "MOV CR3: page-table base", "IN / OUT: device I/O"]} /></Card>
          <Card title="Sensitive instruction" color={C.indigo} style={{ flex: 1 }}><List items={["Reads or changes privileged machine state", "POPF: restores flags, including IF", "SGDT / SIDT: descriptor-table addresses", "Page-table writes: the memory map", "On x86, not always privileged (next slide)"]} /></Card>
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
    title: "Full virtualization: binary translation",
    render: () => {
      const rows = [
        ["mov  eax, [flags]", "mov  eax, [flags]", "copied as-is"],
        ["push eax", "push eax", "copied as-is"],
        ["popf", "call vmm_popf", "updates the virtual IF", 1],
        ["cli", "mov  [vcpu.IF], 0", "in-line, no trap", 1],
        ["mov  cr3, ebx", "call vmm_set_cr3", "VMM swaps shadow tables", 1],
        ["add  ecx, 1", "add  ecx, 1", "copied as-is"],
      ];
      return (
        <div className="body">
          <div className="row">
            {[["Guest kernel", "basic block with POPF / CLI", C.indigo], ["Translator", "rewrites sensitive instructions", C.teal], ["Translation cache", "reused on every later execution", C.teal], ["Runs natively", "ring 1, near full speed", C.slate]].map(([t, d, c], i) => (
              <div key={t} className="card flow" style={{ background: c }}>
                <b>{i + 1}. {t}</b><p>{d}</p>
              </div>
            ))}
          </div>
          <div className="row grow">
            <table className="data-table grow">
              <thead><tr><th>Original guest code</th><th>Translated code (what runs)</th><th>Why</th></tr></thead>
              <tbody>
                {rows.map(([a, b, w, ch]) => (
                  <tr key={a + b}>
                    <td className="mono strong" style={{ background: "#F3F6F9" }}>{a}</td>
                    <td className="mono strong" style={ch ? { background: OUT.trap[1], color: OUT.trap[0] } : { background: "#F3F6F9" }}>{b}</td>
                    <td style={ch ? { color: OUT.trap[0], fontWeight: 700 } : { color: "var(--muted)" }}>{w}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Card title="Trade-offs" color={C.red} style={{ width: 330 }}><List plain items={["+  Unmodified guest OS (even Windows)", "+  No CPU support needed", "−  Translation overhead", "−  Very complex VMM", "−  Shadow-paging costs"]} /></Card>
          </div>
          <Takeaway>User code runs directly; only guest-kernel code is translated, once, and then cached.</Takeaway>
        </div>
      );
    },
  },
  {
    title: "Shadow page tables",
    render: () => (
      <div className="body" style={{ justifyContent: "space-between" }}>
        <div className="row" style={{ alignItems: "center", gap: 0 }}>
          {[["GVA", "guest virtual", "#DDE6F0", C.ink], ["GPA", "guest 'physical'", C.indigo, "#fff"], ["HPA", "real memory", C.slate, "#fff"]].map(([t, d, bg, fg], i) => (
            <React.Fragment key={t}>
              <div style={{ background: bg, color: fg, borderRadius: 12, padding: "10px 26px", textAlign: "center", minWidth: 180 }}>
                <b style={{ fontSize: 24 }}>{t}</b><div style={{ fontSize: 15 }}>{d}</div></div>
              {i < 2 && <div style={{ flex: 1, textAlign: "center", fontSize: 15, color: C.indigo }}>{i === 0 ? "guest page table" : "VMM's mapping"}<div style={{ borderTop: "2px solid", margin: "4px 14px" }} /></div>}
            </React.Fragment>
          ))}
        </div>
        <div style={{ border: "2px dashed #E59A2B", borderRadius: 12, padding: 10, textAlign: "center", color: "#B8741A", fontWeight: 600, fontSize: 17 }}>
          Shadow page table: GVA → HPA in one step, kept in sync by the VMM (guest page tables write-protected)
        </div>
        <h3 className="colhead">When the guest edits one of its page tables:</h3>
        <div className="row" style={{ alignItems: "center", gap: 10 }}>
          {[["Guest writes a page-table entry", C.indigo], ["The page is write-protected: the fault traps to the VMM", "#E59A2B"], ["VMM updates the shadow table, then resumes the guest", C.teal]].map(([t, c], i) => (
            <React.Fragment key={t}>
              <div className="step" style={{ background: c }}><b>{i + 1}</b>{t}</div>
              {i < 2 && <span className="step-arrow">➜</span>}
            </React.Fragment>
          ))}
        </div>
        <div className="row">
          <Card title="Cheap" color={C.green} style={{ flex: 1 }}><List items={["TLB miss = normal 4-step walk", "Works without any CPU support"]} /></Card>
          <Card title="Expensive" color={C.red} style={{ flex: 1 }}><List items={["Every guest page-table write traps", "Every process switch (CR3 load) traps"]} /></Card>
        </div>
      </div>
    ),
  },
  // ======================================================= Para- and hardware-assisted
  {
    title: "Para-virtualization",
    render: () => {
      const rows = [
        ["Disable interrupts", "cli", "evtchn_mask = 1;", "a write to a page shared with Xen: no trap"],
        ["Switch process", "mov cr3, eax", "HYPERVISOR_mmuext_op()", "one explicit hypercall"],
        ["Update N page-table entries", "N × mov [pte], v", "HYPERVISOR_mmu_update(N)", "N updates batched into one call"],
        ["Send a network packet", "write NIC registers", "netfront → ring → netback", "split driver: Dom0 drives the real NIC"],
      ];
      return (
        <div className="body">
          <Sub>Xen (2003): the guest kernel is ported to call the hypervisor explicitly. The same operations, before and after porting Linux (about 3,000 lines changed):</Sub>
          <div className="row grow">
            <Diagram name="fig_xen" alt="Xen architecture: Dom0, modified guests, hypervisor" style={{ width: 470, flex: "none" }} />
            <table className="data-table grow">
              <thead><tr><th>Operation</th><th>Native kernel</th><th>Para-virtualized kernel</th></tr></thead>
              <tbody>
                {rows.map(([op, nat, pv, note]) => (
                  <tr key={op}>
                    <td className="strong" style={{ background: "#F3F6F9" }}>{op}</td>
                    <td className="mono">{nat}</td>
                    <td style={{ background: OUT.pv[1] }}><span className="mono strong" style={{ color: C.teal }}>{pv}</span><br /><span className="muted small">{note}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <Card title="+ Near-native speed, simpler VMM" color={C.green} style={{ flex: 1, padding: "10px 18px" }} />
            <Card title="− Guest kernel must be modified" color={C.red} style={{ flex: 1, padding: "10px 18px" }} />
          </div>
        </div>
      );
    },
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
        ["Performance", "Good; slower when kernel-heavy", "Near native", "Near native (2nd gen.)"],
        ["VMM complexity", "Very high", "Moderate", "Lowest"],
        ["Examples", "VMware (early), VirtualBox", "Xen PV, virtio", "KVM, Hyper-V, ESXi"],
        ["Best suited for", "No VT-x; unmodified OSs", "Open-source guests; I/O drivers", "Cloud, servers, desktops today"],
      ];
      return (
        <div className="body">
          <table className="data-table grow" style={{ fontSize: 18.5 }}>
            <thead><tr><th /><th>Full (BT)</th><th>Para-virtualization</th><th>Hardware-assisted</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, j) => <td key={j} className={j === 0 ? "strong" : ""} style={{ background: j === 0 ? "#F3F6F9" : undefined }}>{c}</td>)}</tr>)}</tbody>
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
          {[["Cloud (IaaS)", FaCloud, C.teal], ["Data centers", FaServer, C.indigo], ["Development & testing", FaFlask, C.amber], ["Security", FaShieldAlt, C.red], ["Disaster recovery", FaSyncAlt, C.green]].map(([t, I, c]) => (
            <span key={t} className="tag icon-tag"><IconDot icon={I} color={c} size={24} />{t}</span>
          ))}
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
        <div className="grid3 grow">
          {[["1  Host check", "Does this CPU support VT-x / AMD-V?", ["[yes] vmx   Intel VT-x", "/dev/kvm present: yes"], C.slate],
            ["2  The x86 problem", "Naive VMM vs real hardware", ["GDTR 0x1000 vs 0xffff8000", "IF=0 work 28 vs 20 MISMATCH"], C.red],
            ["3  Five engines", "Same guest kernel, 5 techniques", ["Para-virt.   2.07x  correct", "VT-x + EPT   3.05x  correct"], C.indigo],
            ["4  Memory", "Shadow vs nested paging", ["native walk:   4 refs", "nested walk:  24 refs"], C.teal],
            ["5  Live migration", "Pre-copy rounds and downtime", ["pre-copy :    77 ms down", "stop&copy: 34375 ms down"], C.amber],
            ["6  Real KVM", "Our own VMM via /dev/kvm", ["> Hello from a KVM guest!", "KVM_EXIT_IO=24  HLT=1"], C.green]].map(([t, d, out, c]) => (
            <div key={t} className="card demo-card">
              <h3 style={{ color: c }}>{t}</h3><p>{d}</p>
              <pre className="term"><span className="h">{out[0]}</span>{"\n"}{out[1]}</pre>
            </div>
          ))}
        </div>
        <div className="code" style={{ fontSize: 19 }}><span className="c">$ </span><span className="h">cd demo && python -m vdemo tour</span>   <span className="c"># or: check | popf | cpu | memory | migrate | kvm</span></div>
      </div>
    ),
  },
  {
    title: "Demo results",
    render: () => (
      <div className="body">
        <CostExplorer />
        <div className="row">
          {[[<>4 → <CountUp value={24} /></>, "memory references per TLB miss (native → nested)", C.teal], [<CountUp value={77} suffix=" ms" />, "live-migration downtime vs 34 s stop-and-copy", C.red], [<CountUp value={25} suffix=" exits" />, "real KVM guest printing 24 chars + HLT", C.indigo]].map(([n, d, c], k) => (
            <div key={k} className="card" style={{ flex: 1, padding: "10px 16px", display: "flex", alignItems: "baseline", gap: 12 }}>
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
        <div className="col grow" style={{ justifyContent: "center", gap: 12 }}>
          <p className="lead" style={{ fontSize: 24, margin: 0 }}>One problem: sensitive instructions that do not trap. Three solutions that now coexist:</p>
          {["Full virtualization rewrote the code", "Para-virtualization rewrote the source", "Hardware assistance changed the CPU"].map((t, i) => (
            <p key={t} style={{ fontSize: 22, margin: 0, color: "#fff" }}><span className="num" style={{ background: PALETTE[i + 1], marginRight: 12 }}>{i + 1}</span>{t}</p>
          ))}
          <Reveal at={1}>
            <h3 style={{ color: "#F2C57C", margin: "10px 0 8px", fontSize: 22 }}>Perspectives</h3>
            <div className="grid2" style={{ gap: 10 }}>
              {[["Confidential VMs", "SEV-SNP, TDX: memory hidden even from the hypervisor"], ["MicroVMs", "Firecracker: VM isolation at container speed"], ["Nested virtualization", "hypervisors running inside VMs"], ["Beyond x86", "ARM EL2, RISC-V H-extension"]].map(([t, d]) => (
                <div key={t} className="persp"><b>{t}</b><p>{d}</p></div>
              ))}
            </div>
          </Reveal>
        </div>
        <ImageSlot id="future" ratio="2.95 / 4.17" desc="A virtual-machine panel protected inside a glowing padlock shield (confidential computing)" style={{ width: 400 }} />
      </div>
    ),
  },
  {
    title: "References and questions",
    render: () => {
      const refs = [
        'G. Popek, R. Goldberg, "Formal requirements for virtualizable third generation architectures," CACM, 1974.',
        'J. Robin, C. Irvine, "Analysis of the Intel Pentium\'s ability to support a secure VMM," USENIX Security, 2000.',
        'E. Bugnion et al., "Bringing virtualization to the x86 architecture with the original VMware Workstation," ACM TOCS, 2012.',
        'P. Barham et al., "Xen and the art of virtualization," SOSP, 2003.',
        'R. Uhlig et al., "Intel virtualization technology," IEEE Computer, 2005.',
        'K. Adams, O. Agesen, "A comparison of software and hardware techniques for x86 virtualization," ASPLOS, 2006.',
        'A. Kivity et al., "kvm: the Linux virtual machine monitor," Ottawa Linux Symp., 2007.',
        'R. Bhargava et al., "Accelerating two-dimensional page walks for virtualized systems," ASPLOS, 2008.',
        'R. Russell, "virtio: towards a de-facto standard for virtual I/O devices," ACM SIGOPS OSR, 2008.',
        'C. Clark et al., "Live migration of virtual machines," NSDI, 2005.',
      ];
      return (
        <div className="row grow">
          <div className="col grow">
            <div className="row grow" style={{ gap: 28 }}>
              {[refs.slice(0, 5), refs.slice(5)].map((col, k) => (
                <ol key={k} start={k * 5 + 1} className="refs">{col.map((r) => <li key={r}>{r}</li>)}</ol>
              ))}
            </div>
            <div className="takeaway"><b>Tools you can try</b>QEMU · KVM · Xen · VirtualBox · VMware Workstation Player · Firecracker</div>
          </div>
          <div style={{ width: 250, background: C.ink, color: "#fff", borderRadius: 16, display: "grid", placeItems: "center", textAlign: "center", padding: 20 }}>
            <div><div style={{ fontSize: 38, fontWeight: 700 }}>Questions?</div><p style={{ color: "#CADCFC", fontSize: 18 }}>Thank you</p></div>
          </div>
        </div>
      );
    },
  },
];
