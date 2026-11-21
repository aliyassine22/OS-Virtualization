import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const MODES = { native: "Native (4-level)", nested: "Nested 4 x 4 (EPT/NPT)", huge: "Nested, 2 MiB host pages" };

/** Animated count of memory references for one TLB miss. */
export default function PageWalk() {
  const [mode, setMode] = useState("nested");
  const [n, setN] = useState(0);
  const [playing, setPlaying] = useState(false);
  const hostLevels = mode === "huge" ? 3 : 4;
  const rows = mode === "native" ? 1 : 5;
  const cols = mode === "native" ? 4 : hostLevels + 1;
  const total = mode === "native" ? 4 : rows * cols - 1;

  useEffect(() => {
    const t = setTimeout(() => setPlaying(true), 900);   // play once when the slide appears
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    if (n >= total) { setPlaying(false); return undefined; }
    const t = setTimeout(() => setN((v) => v + 1), 220);
    return () => clearTimeout(t);
  }, [playing, n, total]);

  const colLbl = (j) => (mode === "native" ? `L${4 - j}` : j < hostLevels ? `host L${hostLevels - j}` : "guest PTE");
  const rowLbl = (i) => (mode === "native" ? "guest walk" : ["gCR3", "guest L4", "guest L3", "guest L2", "data GPA"][i]);

  return (
    <div className="col grow" onKeyDown={(e) => e.stopPropagation()}>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Walk type">
          {Object.entries(MODES).map(([k, v]) => (
            <button key={k} aria-pressed={mode === k} onClick={() => { setMode(k); setN(0); setPlaying(false); }}>{v}</button>
          ))}
        </div>
        <span className="grow" />
        <button className="btn primary" onClick={() => { setN(0); setPlaying(true); }}>Animate walk</button>
      </div>
      <div className="row grow" style={{ alignItems: "center" }}>
        <div style={{ display: "grid", gridTemplateColumns: `110px repeat(${cols}, 96px)`, gap: 6, alignItems: "center" }}>
          <span />
          {Array.from({ length: cols }, (_, j) => (
            <span key={j} style={{ fontSize: 13, fontWeight: 600, textAlign: "center", color: mode !== "native" && j === cols - 1 ? "#3D4F8C" : "#0F7C80" }}>{colLbl(j)}</span>
          ))}
          {Array.from({ length: rows }, (_, i) => (
            <React.Fragment key={i}>
              <span style={{ fontSize: 14, fontWeight: 600, textAlign: "right" }}>{rowLbl(i)}</span>
              {Array.from({ length: cols }, (_, j) => {
                const idx = i * cols + j + 1;
                const isData = mode !== "native" && i === rows - 1 && j === cols - 1;
                const on = isData ? n >= total : idx <= n;
                const base = isData ? "#E59A2B" : mode !== "native" && j === cols - 1 ? "#3D4F8C" : "#0F7C80";
                return (
                  <motion.div key={j} animate={{ opacity: on ? 1 : 0.18, scale: on ? 1 : 0.94 }}
                    style={{ height: 40, borderRadius: 7, background: base, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700 }}>
                    {isData ? "data" : idx}
                  </motion.div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <div className="col" style={{ marginLeft: 30 }}>
          <span className="big" style={{ color: "#0F7C80" }}>{Math.min(n, total)} / {total}</span>
          <span className="muted" style={{ fontSize: 18 }}>memory references for one TLB miss</span>
          <code style={{ fontSize: 18 }}>(n+1)(m+1) - 1</code>
          <span className="muted" style={{ fontSize: 16, maxWidth: 300 }}>Every guest page-table pointer is a guest-physical address that must itself be translated by the host table.</span>
        </div>
      </div>
    </div>
  );
}
