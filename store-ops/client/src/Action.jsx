import { useEffect, useState } from "react";

export const BUSY_HOLD_MS = 1200;
const DOT_STEPS = [1, 3, 6];

export function WaitingCopy({ text, active }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      return undefined;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(1);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % DOT_STEPS.length);
    }, 360);
    return () => window.clearInterval(timer);
  }, [active]);

  const shown = DOT_STEPS[step];
  return (
    <span className="wait-copy">
      {text}
      <span className="wait-dots" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className={index < shown ? "on" : "off"}>.</span>
        ))}
      </span>
    </span>
  );
}

export function Action({ id, busyId, pending, children }) {
  const waiting = busyId === id;
  return (
    <span className={waiting ? "action is-busy" : "action"}>
      {children}
      <label className="action-status" htmlFor={id} aria-hidden={waiting ? "false" : "true"}>
        <span>
          <progress />
          <WaitingCopy text={pending} active={waiting} />
        </span>
      </label>
    </span>
  );
}
