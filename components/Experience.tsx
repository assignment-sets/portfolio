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

export default function Experience() {
  const [index, setIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      const timeout = setTimeout(() => {
        setIndex((prev) => (prev + 1) % PHRASES.length);
        setIsFading(false);
      }, 200);

      return () => clearTimeout(timeout);
    }, 3200);

    return () => clearInterval(timer);
  }, []);

  const current = PHRASES[index];

  return (
    <section id="experience">
      <h2>Experience</h2>
      <div className="exp-skeleton-wrap">
        <div className="exp-skeleton-card">
          <div>
            <div className="skel skel-line tiny"></div>
            <div
              className="skel skel-line tiny"
              style={{ width: "30%", marginTop: "4px" }}
            ></div>
          </div>
          <div>
            <div className="skel skel-line short"></div>
            <div className="skel skel-line medium"></div>
            <div className="skel skel-line long"></div>
            <div
              className="skel skel-line short"
              style={{ width: "45%" }}
            ></div>
          </div>
        </div>

        <div className="exp-skeleton-card">
          <div>
            <div className="skel skel-line tiny"></div>
            <div
              className="skel skel-line tiny"
              style={{ width: "28%", marginTop: "4px" }}
            ></div>
          </div>
          <div>
            <div
              className="skel skel-line medium"
              style={{ width: "50%" }}
            ></div>
            <div className="skel skel-line long"></div>
            <div className="skel skel-line medium"></div>
          </div>
        </div>
      </div>
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
    </section>
  );
}
