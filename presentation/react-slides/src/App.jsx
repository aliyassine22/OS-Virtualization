import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SLIDES } from "./deck/slides.jsx";
import { team } from "./deck/team.js";
import { StepContext } from "./components/blocks.jsx";
import { AmbientBackground, AnimatedTitle, useEntrance } from "./components/motion.jsx";

/**
 * Deck engine.
 *   Right / Space / PageDown : next step, then next slide     Left / PageUp : back
 *   Home / End : first / last     O : overview     F : fullscreen
 * The URL hash (#/7) keeps your place on reload.
 */
const readHash = () => {
  const n = parseInt(window.location.hash.replace("#/", ""), 10);
  return Number.isFinite(n) && n >= 1 && n <= SLIDES.length ? n - 1 : 0;
};

function useStageScale() {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1280, window.innerHeight / 720));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return scale;
}

export default function App() {
  const [index, setIndex] = useState(readHash);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [overview, setOverview] = useState(false);
  const scale = useStageScale();
  const reduce = useReducedMotion();
  const slide = SLIDES[index];
  const steps = slide.steps || 0;

  const go = useCallback((i, s = 0) => {
    const ni = Math.max(0, Math.min(SLIDES.length - 1, i));
    setDir(ni >= index ? 1 : -1);
    setIndex(ni);
    setStep(s);
    window.history.replaceState(null, "", `#/${ni + 1}`);
  }, [index]);

  const next = useCallback(() => (step < steps ? setStep(step + 1) : go(index + 1)), [step, steps, index, go]);
  const prev = useCallback(() => (step > 0 ? setStep(step - 1) : index > 0 && go(index - 1, SLIDES[index - 1].steps || 0)), [step, index, go]);

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      const k = e.key;
      if (["ArrowRight", "PageDown", " "].includes(k)) { e.preventDefault(); next(); }
      else if (["ArrowLeft", "PageUp"].includes(k)) { e.preventDefault(); prev(); }
      else if (k === "Home") go(0);
      else if (k === "End") go(SLIDES.length - 1);
      else if (k === "o" || k === "O" || k === "Escape") setOverview((v) => (k === "Escape" ? false : !v));
      else if (k === "f" || k === "F") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, go]);

  useEffect(() => {
    const onHash = () => { setIndex(readHash()); setStep(0); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const Body = slide.render;
  const variants = reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
      enter: (d) => ({ opacity: 0, x: 90 * d, scale: 0.985, filter: "blur(6px)" }),
      center: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
      exit: (d) => ({ opacity: 0, x: -90 * d, scale: 0.985, filter: "blur(6px)" }),
    };

  return (
    <>
      <div className="viewport">
        <div className="stage" style={{ transform: `scale(${scale})` }}>
          <AnimatePresence custom={dir} initial={false}>
            <SlideFrame
              key={index}
              index={index}
              className={`slide ${slide.dark ? "dark" : ""}`}
              custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
              aria-roledescription="slide" aria-label={`${index + 1} of ${SLIDES.length}: ${slide.title}`}
            >
              {slide.dark && <AmbientBackground />}
              {!slide.hideTitle && <AnimatedTitle text={slide.title} />}
              <StepContext.Provider value={step}>
                <Body step={step} />
              </StepContext.Provider>
              <div className="footer">
                <span>{team.title} · {team.course}{index === 0 ? "  ·  press O for overview & keys" : ""}</span>
                <span>{index + 1} / {SLIDES.length}</span>
              </div>
              <div className="progress" aria-hidden>
                {SLIDES.map((s, i) => (
                  <motion.span key={i} initial={false} animate={{ opacity: i <= index ? 1 : 0.18, scaleY: i === index ? 1.8 : 1 }}
                    transition={{ duration: 0.4 }} style={{ flex: 1, background: i === index ? "#E59A2B" : "#0F7C80", transformOrigin: "bottom" }} />
                ))}
              </div>
            </SlideFrame>
          </AnimatePresence>
        </div>
      </div>

      {overview && (
        <div className="overlay" role="dialog" aria-label="Slide overview">
          <p style={{ color: "#CADCFC", marginTop: 0 }}>←/→ or Space: navigate · O / Esc: overview · F: fullscreen · Home/End</p>
          <div className="grid-ov">
            {SLIDES.map((s, i) => (
              <button key={i} className="ov-item" aria-current={i === index} onClick={() => { go(i); setOverview(false); }}>
                <b>{i + 1}. {s.title}</b>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** A slide section that runs the entrance choreography once it mounts. */
const SlideFrame = React.forwardRef(function SlideFrame({ index, children, ...rest }, _ref) {
  const ref = React.useRef(null);
  useEntrance(ref, index);
  return <motion.section ref={ref} {...rest}>{children}</motion.section>;
});
