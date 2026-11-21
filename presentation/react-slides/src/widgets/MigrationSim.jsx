import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { precopy } from "../sim/migration.js";
import { CountUp } from "../components/motion.jsx";

function Slider({ label, value, min, max, step, onChange, fmt }) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="mono" style={{ textAlign: "right" }}>{fmt(value)}</span>
    </label>
  );
}

/** Interactive pre-copy live migration (same model as `python -m vdemo migrate`). */
export default function MigrationSim() {
  const [mem, setMem] = useState(4096);
  const [bw, setBw] = useState(1000);
  const [dirty, setDirty] = useState(15000);
  const [wws, setWws] = useState(256);
  const first = useRef(true);
  useEffect(() => { first.current = false; }, []);
  const r = useMemo(() => precopy({ memMiB: mem, bwMbps: bw, dirtyPerS: dirty, wwsMiB: wws }), [mem, bw, dirty, wws]);
  const maxPages = Math.max(...r.rounds.map((x) => x.pages));
  const H = 190, W = 560;
  const bars = [...r.rounds.map((x) => ({ v: x.pages, live: true })), { v: r.finalPages, live: false }];
  const bw_ = Math.min(60, (W - 20) / bars.length - 6);

  return (
    <div className="row grow" onKeyDown={(e) => e.stopPropagation()}>
      <div className="col" style={{ width: 520 }}>
        <Slider label="VM memory" value={mem} min={1024} max={16384} step={1024} onChange={setMem} fmt={(v) => `${v / 1024} GiB`} />
        <Slider label="Link bandwidth" value={bw} min={500} max={10000} step={500} onChange={setBw} fmt={(v) => `${(v / 1000).toFixed(1)} Gb/s`} />
        <Slider label="Dirty rate" value={dirty} min={0} max={80000} step={1000} onChange={setDirty} fmt={(v) => `${(v / 1000).toFixed(0)}k pg/s`} />
        <Slider label="Writable working set" value={wws} min={64} max={1024} step={64} onChange={setWws} fmt={(v) => `${v} MiB`} />
        <div className="row" style={{ marginTop: 10 }}>
          <div className="card grow"><div className="big" style={{ color: r.converged ? "#2E8B57" : "#C8553D" }}>{r.downtimeMs < 1000 ? <CountUp value={r.downtimeMs} suffix=" ms" /> : <CountUp value={r.downtimeMs / 1000} decimals={1} suffix=" s" />}</div><p className="muted">downtime (pre-copy)</p></div>
          <div className="card grow"><div className="big" style={{ color: "#C8553D" }}><CountUp value={r.stopAndCopyMs / 1000} decimals={1} suffix=" s" /></div><p className="muted">downtime (stop-and-copy)</p></div>
        </div>
        <p className="muted" style={{ fontSize: 16, margin: 0 }}>
          {r.rounds.length} rounds · total {r.totalS.toFixed(1)} s · {r.sentMiB.toFixed(0)} MiB sent
          {!r.converged && <b className="bad"> · not converging: dirty rate ≥ bandwidth</b>}
        </p>
      </div>
      <div className="card grow" style={{ display: "flex", flexDirection: "column" }}>
        <h3>Pages sent per round</h3>
        <svg viewBox={`0 0 ${W} ${H + 40}`} style={{ width: "100%", flex: 1 }} role="img" aria-label="Pages sent per pre-copy round">
          {bars.map((b, i) => {
            const h = Math.max(2, (Math.log10(b.v + 1) / Math.log10(maxPages + 1)) * H);
            const x = 10 + i * (bw_ + 6);
            return (
              <g key={i}>
                <motion.rect initial={{ y: H, height: 0 }} animate={{ y: H - h, height: h }} transition={{ type: "spring", stiffness: 90, damping: 16, delay: first.current ? 0.5 + i * 0.09 : 0 }} x={x} width={bw_} rx={4} fill={b.live ? "#0F7C80" : "#C8553D"} />
                <text x={x + bw_ / 2} y={H + 18} fontSize="13" textAnchor="middle" fill="#5f6b78">{b.live ? i : "stop"}</text>
              </g>
            );
          })}
          <text x={W - 6} y={H + 36} fontSize="12" textAnchor="end" fill="#5f6b78">log scale · teal = VM running · red = VM paused</text>
        </svg>
      </div>
    </div>
  );
}
