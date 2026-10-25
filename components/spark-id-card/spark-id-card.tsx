"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createSparkIdCardEngine } from "./spark-id-card-engine";

export type SparkIdCardProps = {
  /** Name printed in the card display box. */
  name?: string;
  /** Extra classes for the sizing wrapper. */
  className?: string;
  /** Inline styles for the sizing wrapper (width, height, etc.). */
  style?: CSSProperties;
  /** Enable subtle pointer-driven parallax. Defaults to true. */
  interactive?: boolean;
  /** Accessible label for the card artwork. */
  ariaLabel?: string;
};

const DEFAULT_ASPECT = "420 / 1000";

export function SparkIdCard({
  name = "Gourab",
  className = "",
  style,
  interactive = true,
  ariaLabel,
}: SparkIdCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const displayName = name.trim() || "Gourab";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setReady(false);
    const engine = createSparkIdCardEngine(canvas, {
      name: displayName,
      interactive,
      onReady: () => setReady(true),
    });

    return () => {
      engine.destroy();
    };
  }, [displayName, interactive]);

  return (
    <div
      className={`spark-id-card${className ? ` ${className}` : ""}`}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: DEFAULT_ASPECT,
        ...style,
      }}
      data-state={ready ? "ready" : "loading"}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel ?? `Animated ID card for ${displayName}`}
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
          width: "100%",
          height: "100%",
          opacity: ready ? 1 : 0,
          transition: "opacity 280ms ease",
          pointerEvents: interactive ? "auto" : "none",
        }}
      />
    </div>
  );
}

export default SparkIdCard;
