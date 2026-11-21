import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { STEP_PROGRAM, outcome } from "../sim/cpu.js";

const MODES = [
  ["native", "Native"], ["naive", "Naive trap-and-emulate"], ["bt", "Binary translation"],
  ["pv", "Para-virtualization"], ["vtx", "VT-x / AMD-V"],
];
const WHERE = {
  direct: ["runs natively", "#2E8B57"], silent: ["NO TRAP (bug)", "#C8553D"], trap: ["trap to VMM", "#E59A2B"],
  translated: ["translated", "#3D4F8C"], shared: ["shared page", "#0F7C80"], hypercall: ["hypercall", "#0F7C80"], exit: ["VM exit", "#E59A2B"],
};
const GOES_TO_VMM = new Set(["trap", "hypercall", "exit", "translated"]);

/** Simulate guest-visible state after executing `upto` instructions under `mode`. */
function simulate(mode, upto, ept) {
  const st = { IF: 1, gdt: "-", cr3: "0x1000", masked: 0, vmm: 0 };
  for (let k = 0; k < upto; k++) {
    const ins = STEP_PROGRAM[k];
    const o = outcome(mode, ins, ept);
    if (GOES_TO_VMM.has(o.where)) st.vmm++;
    if (ins.op === "PLAIN" && ins.cs && st.IF === 0) st.masked++;
    if (o.bug) {
      if (ins.op === "SGDT") st.gdt = "0xffff8000 (host!)";
      continue; // POPF silently ignored
    }
    if (ins.op === "CLI") st.IF = 0;
    if (ins.op === "STI") st.IF = 1;
    if (ins.op === "POPF") st.IF = ins.v;
    if (ins.op === "SGDT") st.gdt = "0x1000";
    if (ins.op === "MOVCR3") st.cr3 = "0x2000";
  }
  return st;
}

export default function TrapStepper({ initialMode = "naive", modes }) {
  const [mode, setMode] = useState(initialMode);
  const [pc, setPc] = useState(0);
  const [ept, setEpt] = useState(true);
  const [playing, setPlaying] = useState(false);
  const shownModes = modes ? MODES.filter(([m]) => modes.includes(m)) : MODES;

  useEffect(() => {
    if (!playing) return undefined;
    if (pc >= STEP_PROGRAM.length) { setPlaying(false); return undefined; }
    const t = setTimeout(() => setPc((p) => p + 1), 900);
    return () => clearTimeout(t);
  }, [playing, pc]);

  const cur = STEP_PROGRAM[Math.min(pc, STEP_PROGRAM.length - 1)];
  const o = pc > 0 ? outcome(mode, STEP_PROGRAM[pc - 1], ept) : null;
  const st = useMemo(() => simulate(mode, pc, ept), [mode, pc, ept]);
  const ref = useMemo(() => simulate("native", pc, ept), [pc, ept]);
  const inVmm = o && GOES_TO_VMM.has(o.where);
  const stop = (e) => e.stopPropagation();

  return (
    <div className="col grow" onKeyDown={stop}>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Virtualization technique">
          {shownModes.map(([m, label]) => (
            <button key={m} aria-pressed={mode === m} onClick={() => { setMode(m); setPc(0); setPlaying(false); }}>{label}</button>
          ))}
        </div>
        {mode === "vtx" && (
          <label style={{ fontSize: 15 }}><input type="checkbox" checked={ept} onChange={(e) => setEpt(e.target.checked)} /> EPT</label>
        )}
        <span className="grow" />
        <button className="btn" onClick={() => { setPc(0); setPlaying(false); }}>Reset</button>
        <button className="btn" onClick={() => setPc((p) => Math.min(STEP_PROGRAM.length, p + 1))}>Step</button>
        <button className="btn primary" onClick={() => { if (pc >= STEP_PROGRAM.length) setPc(0); setPlaying((v) => !v); }}>{playing ? "Pause" : "Run"}</button>
      </div>

      <div className="row grow">
        {/* instruction stream */}
        <div className="card" style={{ width: 430, padding: 12 }}>
          {STEP_PROGRAM.map((ins, k) => {
            const oc = k < pc ? outcome(mode, ins, ept) : null;
            const text = mode === "pv" && ins.pv ? ins.pv : ins.asm;
            return (
              <div key={k} className={`instr ${k === pc ? "cur" : k < pc ? "done" : ""}`}>
                <span style={{ width: 18, opacity: 0.6 }}>{k}</span>
                <span className="grow" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{text}</span>
                {oc && <span className="pill" style={{ background: WHERE[oc.where][1] }}>{WHERE[oc.where][0]}</span>}
              </div>
            );
          })}
        </div>

        {/* guest / VMM lanes */}
        <div className="col grow">
          <div style={{ position: "relative", height: 210, borderRadius: 14, background: "var(--surface)" }}>
            <div style={{ position: "absolute", left: 16, top: 14, right: 16, height: 74, borderRadius: 10, background: "#3D4F8C", color: "#fff", padding: "10px 14px" }}>
              <b>Guest kernel</b> <span style={{ opacity: 0.8 }}>{mode === "vtx" ? "non-root, ring 0" : mode === "native" ? "ring 0 (bare metal)" : "ring 1 (deprivileged)"}</span>
            </div>
            <div style={{ position: "absolute", left: 16, bottom: 14, right: 16, height: 74, borderRadius: 10, background: mode === "native" ? "#4A5560" : "#0F7C80", color: "#fff", padding: "10px 14px" }}>
              <b>{mode === "native" ? "Hardware" : mode === "vtx" ? "Hypervisor (VMX root)" : "VMM / hypervisor (ring 0)"}</b>
            </div>
            <motion.div
              animate={{ top: inVmm ? 140 : 46, background: o?.bug ? "#C8553D" : inVmm ? "#E59A2B" : "#ffffff" }}
              transition={{ type: "spring", stiffness: 160, damping: 18 }}
              style={{ position: "absolute", right: 34, width: 190, padding: "6px 10px", borderRadius: 8, fontSize: 14, fontFamily: "IBM Plex Mono", color: inVmm || o?.bug ? "#fff" : "#1F2A44", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }}>
              {pc > 0 ? STEP_PROGRAM[pc - 1].asm.split(";")[0] : "ready"}
            </motion.div>
          </div>
          <div className="card" style={{ minHeight: 84, borderLeft: "none", background: o?.bug ? "#fbe9e5" : "var(--surface)" }}>
            <p style={{ fontSize: 17 }}>{o ? o.text : "Press Step or Run. Each instruction is executed under the selected technique."}</p>
          </div>
          <table className="state-table">
            <tbody>
              <tr><td>guest-visible IF</td><td className={`mono ${st.IF !== ref.IF ? "bad" : ""}`}>{st.IF}</td><td className="mono muted">native: {ref.IF}</td></tr>
              <tr><td>SGDT result</td><td className={`mono ${st.gdt !== ref.gdt ? "bad" : ""}`}>{st.gdt}</td><td className="mono muted">native: {ref.gdt}</td></tr>
              <tr><td>critical work done masked</td><td className={`mono ${st.masked !== ref.masked ? "bad" : ""}`}>{st.masked}</td><td className="mono muted">native: {ref.masked}</td></tr>
              <tr><td>transitions into VMM</td><td className="mono">{st.vmm}</td><td className="mono muted">fewer is faster</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
