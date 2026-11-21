import React, { createContext, useContext } from "react";
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
 * Image placeholder. Drop assets/images/<id>.png (or .jpg/.webp) and it replaces
 * the dashed box automatically. Prompts: assets/placeholders/IMAGE_PROMPTS.md
 */
const IMAGES = import.meta.glob("@repo/assets/images/*.{png,jpg,jpeg,webp}", { eager: true, query: "?url", import: "default" });
const imageFor = (id) => {
  const key = Object.keys(IMAGES).find((k) => new RegExp(`/${id}\\.(png|jpe?g|webp)$`).test(k));
  return key ? IMAGES[key] : null;
};

export function ImageSlot({ id, desc, ratio, style }) {
  const src = imageFor(id);
  return (
    <div className="imgslot" style={{ aspectRatio: ratio, alignSelf: "center", padding: src ? 0 : undefined, ...style }}>
      {src ? (
        <img src={src} alt={desc} className="kenburns" />
      ) : (
        <div><b>IMAGE PLACEHOLDER · {id}</b>{desc}<br /><span className="mono" style={{ fontSize: 12 }}>assets/images/{id}.png</span></div>
      )}
    </div>
  );
}
