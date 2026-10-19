import { useEffect, useState } from "react";

// Keeps an element mounted for `ms` after `open` turns false so a CSS exit
// animation can play, then unmounts it. Pair the returned `state` with a
// `data-state` attribute and the `.exit-*` classes in index.css.
export function useExitTransition(open, ms = 160) {
  const [lingering, setLingering] = useState(open);

  useEffect(() => {
    if (open) {
      setLingering(true);
      return undefined;
    }
    const t = setTimeout(() => setLingering(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);

  return { mounted: open || lingering, state: open ? "open" : "closed" };
}
