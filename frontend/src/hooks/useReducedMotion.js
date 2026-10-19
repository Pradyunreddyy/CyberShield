import { useEffect, useState } from "react";

// For libraries that animate in JS (Recharts) and so cannot be reached by the
// CSS prefers-reduced-motion rules.
export function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduce, setReduce] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduce;
}
