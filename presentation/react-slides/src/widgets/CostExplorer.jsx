import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { compareAll, DEFAULT_COSTS } from "../sim/cpu.js";

const COLORS = ["#4A5560", "#C8553D", "#3D4F8C", "#0F7C80", "#E59A2B", "#B8741A"];

/** Live version of `python -m vdemo cpu`: tweak the cost model, watch the ranking change. */
export default function CostExplorer() {
  const [vmexit, setVmexit] = useState(DEFAULT_COSTS.vmexit);
  const [trap, setTrap] = useState(DEFAULT_COSTS.trap);
  const [hyper, setHyper] = useState(DEFAULT_COSTS.hypercall);
  const first = useRef(true);
  useEffect(() => { first.current = false; }, []);
  const res = useMemo(() => compareAll({ ...DEFAULT_COSTS, vmexit, trap, hypercall: hyper }), [vmexit, trap, hyper]);
  const max = Math.max(...res.map((r) => r.slowdown));
  const S = ({ label, v, set, min, max: mx, note }) => (
    <label className="slider" style={{ gridTemplateColumns: "190px 1fr 110px" }}>
      <span>{label}<br /><small className="muted">{note}</small></span>
      <input type="range" min={min} max={mx} step={50} value={v} onChange={(e) => set(Number(e.target.value))} />
      <span className="mono" style={{ textAlign: "right" }}>{v} cyc</span>
    </label>
  );
  return (
    <div className="row grow" onKeyDown={(e) => e.stopPropagation()}>
      <div className="col grow">
        {res.map((r, i) => (
          <div key={r.name} style={{ display: "grid", gridTemplateColumns: "190px 1fr", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 17, fontWeight: 600 }}>{r.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${(r.slowdown / max) * 78}%` }} transition={{ type: "spring", stiffness: 120, damping: 20, delay: first.current ? 0.35 + i * 0.08 : 0 }}
                style={{ height: 34, borderRadius: 6, background: COLORS[i], minWidth: 6 }} />
              <span className="mono" style={{ fontSize: 16 }}>{r.slowdown.toFixed(1)}x</span>
              {!r.correct && <span className="pill" style={{ background: "#C8553D" }}>incorrect</span>}
            </div>
          </div>
        ))}
        <p className="muted" style={{ fontSize: 15, margin: 0 }}>Kernel-heavy synthetic guest, illustrative cycle costs. Real CPU-bound applications run within a few percent of native.</p>
      </div>
      <div className="col" style={{ width: 470 }}>
        <S label="VM exit + entry" v={vmexit} set={setVmexit} min={100} max={3000} note="early VT-x: thousands" />
        <S label="Trap into VMM" v={trap} set={setTrap} min={100} max={1500} note="ring 1 -> ring 0" />
        <S label="Hypercall" v={hyper} set={setHyper} min={50} max={800} note="explicit call" />
        <div className="card"><p>First-generation VT-x (no EPT) loses to binary translation, as Adams & Agesen measured in 2006. Drop the exit cost to ~300 cycles (modern CPUs) and watch the gap close.</p></div>
      </div>
    </div>
  );
}
