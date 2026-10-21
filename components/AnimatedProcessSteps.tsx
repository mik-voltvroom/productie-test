"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

const processSteps = [
  ["01", "Vertel hoe u rijdt", "Dagelijkse afstand, laadmogelijkheden, budget en wat u belangrijk vindt."],
  ["02", "Vergelijk met bewijs", "U ziet per auto alleen onderbouwde feiten over historie, techniek en beschikbare accu-informatie. Geen aannames."],
  ["03", "Rijd. Vraag. Beslis.", "Een proefrit en een helder voorstel. Zonder druk, met ruimte om zelf te kiezen."],
] as const;

export function AnimatedProcessSteps() {
  const listRef = useRef<HTMLOListElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.2 },
    );

    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  return (
    <ol ref={listRef} className={`processGrid processGridAnimated${isVisible ? " isVisible" : ""}`}>
      {processSteps.map(([number, title, text], index) => (
        <li key={number} style={{ "--step-index": index } as CSSProperties}>
          <div className="processStepMarker" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <circle className="processStepTrack" cx="32" cy="32" r="29" />
              <circle className="processStepProgress" cx="32" cy="32" r="29" pathLength={1} />
            </svg>
            <span>{number}</span>
          </div>
          <div className="processStepCopy">
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
