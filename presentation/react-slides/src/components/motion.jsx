import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";

/**
 * Entrance choreography. When a slide mounts, every building block inside it is
 * tagged with data-enter="<kind>" and a staggered delay (--d). The keyframes in
 * styles.css do the rest. Data attributes are used (not classes) so React
 * re-renders never strip them.
 *
 *   rise   cards, takeaways, code, tables, tags   (fade + lift + de-blur)
 *   wipe   diagrams                               (left-to-right reveal)
 *   item   list items and table rows              (short slide-in)
 *   pop    numbered badges                        (scale bounce)
 */
const RULES = [
  [".diagram-wrap", "wipe"],
  [".card, .takeaway, .code, .imgslot, .toolbar, .tag, .state-table, .lead, .stat", "rise"],
  [".card li, ol > li, .state-table tbody tr", "item"],
  [".num", "pop"],
];

export function useEntrance(ref, key) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const seen = new Set();
    let i = 0;
    const tagged = [];
    // walk in document order so the stagger follows reading order
    root.querySelectorAll(RULES.map((r) => r[0]).join(",")).forEach((el) => {
      if (seen.has(el) || el.closest(".footer, .progress, .instr")) return;
      const rule = RULES.find(([sel]) => el.matches(sel));
      if (!rule) return;
      seen.add(el);
      const kind = rule[1];
      const delay = Math.min(0.15 + i * (kind === "item" ? 0.045 : 0.07), 1.4);
      el.style.setProperty("--d", `${delay.toFixed(2)}s`);
      el.dataset.enter = kind;
      tagged.push(el);
      i++;
    });
    // clean up after the choreography so later interactions are unaffected
    const t = setTimeout(() => tagged.forEach((el) => { el.dataset.entered = "1"; }), 2600);
    return () => clearTimeout(t);
  }, [ref, key]);
}

/** Slide title: words rise in one after another behind a mask. */
export function AnimatedTitle({ text, style }) {
  const words = text.split(" ");
  return (
    <h1 style={style} aria-label={text}>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span className="word-mask" aria-hidden>
            <span className="word" style={{ "--w": `${0.05 + i * 0.06}s` }}>{w}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </h1>
  );
}

/** Number that counts up on mount and tweens smoothly whenever it changes. */
export function CountUp({ value, decimals = 0, suffix = "", prefix = "", duration = 1.1, delay = 0.25, style, className }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const prev = useRef(0);
  useEffect(() => {
    if (reduce) { setShown(value); return undefined; }
    const ctrl = animate(prev.current, value, {
      duration, delay: prev.current === 0 ? delay : 0, ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => setShown(v),
    });
    prev.current = value;
    return () => ctrl.stop();
  }, [value, reduce, duration, delay]);
  return <span className={className} style={style}>{prefix}{shown.toFixed(decimals)}{suffix}</span>;
}

/**
 * Ambient background for dark slides: translucent "virtual machines" drifting
 * slowly over a faint grid, a quiet visual echo of the topic.
 */
const BLOCKS = [
  { x: 6, y: 12, s: 120, c: "#0F7C80", d: 0 }, { x: 72, y: 8, s: 70, c: "#3D4F8C", d: 1.2 },
  { x: 84, y: 62, s: 140, c: "#0F7C80", d: 0.6 }, { x: 40, y: 74, s: 90, c: "#E59A2B", d: 2.0 },
  { x: 18, y: 58, s: 60, c: "#3D4F8C", d: 1.6 }, { x: 58, y: 30, s: 50, c: "#E59A2B", d: 0.9 },
  { x: 92, y: 28, s: 46, c: "#CADCFC", d: 2.4 }, { x: 30, y: 6, s: 40, c: "#CADCFC", d: 3.0 },
];

export function AmbientBackground() {
  const reduce = useReducedMotion();
  return (
    <div className="ambient" aria-hidden>
      <div className="ambient-grid" />
      {BLOCKS.map((b, i) => (
        <motion.div
          key={i}
          className="ambient-block"
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.s, height: b.s * 0.7, borderColor: b.c, background: `${b.c}14` }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={reduce ? { opacity: 0.55, scale: 1 } : {
            opacity: [0, 0.55, 0.55], scale: 1,
            y: [0, -18, 0, 14, 0], x: [0, 10, 0, -8, 0], rotate: [0, 2, 0, -2, 0],
          }}
          transition={reduce ? { duration: 0.4 } : {
            opacity: { duration: 1.2, delay: b.d * 0.3 }, scale: { duration: 1.2, delay: b.d * 0.3 },
            y: { duration: 14 + i, repeat: Infinity, ease: "easeInOut", delay: b.d },
            x: { duration: 18 + i, repeat: Infinity, ease: "easeInOut", delay: b.d },
            rotate: { duration: 20 + i, repeat: Infinity, ease: "easeInOut", delay: b.d },
          }}
        />
      ))}
    </div>
  );
}
