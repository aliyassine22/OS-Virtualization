import React, { createContext, useContext, useState } from "react";
import { motion } from "framer-motion";
import { diagram } from "../deck/team.js";

export const StepContext = createContext(0);

/** Content that appears at step `at` (press → to reveal). */
export function Reveal({ at = 1, children, as = "div", style, className }) {
  const step = useContext(StepContext);
  const M = motion[as];
  return (
    <M className={className} style={style} initial={false}
      animate={{ opacity: step >= at ? 1 : 0, y: step >= at ? 0 : 12 }} transition={{ duration: 0.3 }}
      aria-hidden={step < at}>
      {children}
    </M>
  );
}

export const Card = ({ title, children, color = "var(--ink)", num, style }) => (
  <div className="card" style={style}>
    <h3 style={{ color }}>{num !== undefined && <span className="num" style={{ background: color }}>{num}</span>}{title}</h3>
    {children}
  </div>
);

export const List = ({ items, plain }) => (
  <ul style={plain ? { listStyle: "none", paddingLeft: 0 } : undefined}>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
);

export const Takeaway = ({ children }) => <div className="takeaway"><b>Key idea</b>{children}</div>;

export const Diagram = ({ name, alt, style }) => (
  <div className="diagram-wrap" style={style}><img className="diagram" src={diagram(name)} alt={alt || name} /></div>
);

/**
 * Image placeholder. Drop public/images/<id>.png (or .jpg/.webp) and it replaces
 * the dashed box automatically. Prompts: assets/placeholders/IMAGE_PROMPTS.md
 */
export function ImageSlot({ id, desc, style }) {
  const exts = ["png", "jpg", "webp"];
  const [i, setI] = useState(0);
  const failed = i >= exts.length;
  return (
    <div className="imgslot" style={style}>
      {!failed ? (
        <img src={`./images/${id}.${exts[i]}`} alt={desc} onError={() => setI(i + 1)} />
      ) : (
        <div><b>IMAGE PLACEHOLDER · {id}</b>{desc}<br /><span className="mono" style={{ fontSize: 12 }}>public/images/{id}.png</span></div>
      )}
    </div>
  );
}
