"use client";

import { useEffect, useState } from "react";

interface RotatingPhrase {
  text: string;
  link?: {
    label: string;
    href: string;
  };
}

const PHRASES: RotatingPhrase[] = [
  { text: "still loading… (no eta)" },
  { text: "loading… (still looking for my first gig)" },
  { text: "error 404: job experience not found yet" },
  { text: "plot twist: it doesn't exist yet" },
  { text: "could be your company right here" },
  {
    text: "maybe hire me?",
    link: { label: "get in touch →", href: "/#contact" },
  },
];

export default function RotatingExperienceNote() {
  const [index, setIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    let fadeTimeout: NodeJS.Timeout | null = null;

    const timer = setInterval(() => {
      setIsFading(true);
      fadeTimeout = setTimeout(() => {
        setIndex((prev) => (prev + 1) % PHRASES.length);
        setIsFading(false);
      }, 200);
    }, 3200);

    return () => {
      clearInterval(timer);
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
      }
    };
  }, []);

  const current = PHRASES[index];

  return (
    <p className="exp-note" aria-live="polite">
      <span className="exp-note-dot" aria-hidden="true" />
      <span className={`exp-note-text${isFading ? " fading" : ""}`}>
        {current.text}
        {current.link && (
          <a href={current.link.href} className="exp-note-link">
            {current.link.label}
          </a>
        )}
      </span>
    </p>
  );
}
