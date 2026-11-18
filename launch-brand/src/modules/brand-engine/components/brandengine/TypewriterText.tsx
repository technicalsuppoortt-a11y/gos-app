import { useEffect, useState } from "react";

/**
 * Types `text` out one character at a time (names "forming" in front of the
 * customer). Works for Arabic and English: characters are revealed in logical
 * order and the browser shapes the partial word. The full text is exposed to
 * screen readers immediately, and reduced-motion users see it at once.
 */
export function TypewriterText({ text, delay = 0, speed = 70, as: Tag = "strong" }: {
  text: string; delay?: number; speed?: number; as?: "strong" | "span";
}) {
  const characters = Array.from(text);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(reduced ? characters.length : 0);
  useEffect(() => {
    if (reduced) { setShown(characters.length); return undefined; }
    setShown(0);
    let step = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        step += 1;
        setShown(step);
        if (step >= characters.length && interval) clearInterval(interval);
      }, speed);
    }, delay);
    return () => { clearTimeout(start); if (interval) clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay, speed, reduced]);
  const typing = shown < characters.length;
  return (
    <Tag className="lb-typewriter" dir="auto" aria-label={text}>
      <span aria-hidden="true">{characters.slice(0, shown).join("")}</span>
      <span aria-hidden="true" className={`lb-typewriter-caret${typing ? " is-typing" : ""}`} />
    </Tag>
  );
}
