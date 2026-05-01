import { useEffect, useState } from "react";

/** Aligns with Registers tab styling (`styles.css` @media max-width 820px). */
export const REGISTERS_MOBILE_BREAKPOINT = "(max-width: 820px)";

export function useMediaQuery(query: string): boolean {
  const getMatches = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    mq.addEventListener("change", handler);
    setMatches(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
