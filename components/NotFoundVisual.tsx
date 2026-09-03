export default function NotFoundVisual() {
  return (
    <div className="not-found-visual-box" aria-hidden="true">
      <svg
        width="220"
        height="180"
        viewBox="0 0 220 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="select-none"
      >
        {/* Background Subtle Frame */}
        <rect
          x="10"
          y="10"
          width="200"
          height="160"
          rx="2"
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Corner Accents */}
        <path
          d="M 10 22 L 10 10 L 22 10"
          stroke="var(--border-strong)"
          strokeWidth="1.5"
        />
        <path
          d="M 198 10 L 210 10 L 210 22"
          stroke="var(--border-strong)"
          strokeWidth="1.5"
        />
        <path
          d="M 10 158 L 10 170 L 22 170"
          stroke="var(--border-strong)"
          strokeWidth="1.5"
        />
        <path
          d="M 198 170 L 210 170 L 210 158"
          stroke="var(--border-strong)"
          strokeWidth="1.5"
        />

        {/* Central Compass / Radar Target */}
        <circle
          cx="110"
          cy="85"
          r="48"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <circle
          cx="110"
          cy="85"
          r="32"
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <circle
          cx="110"
          cy="85"
          r="16"
          stroke="var(--border-strong)"
          strokeWidth="1"
        />

        {/* Crosshair Lines */}
        <line
          x1="50"
          y1="85"
          x2="170"
          y2="85"
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <line
          x1="110"
          y1="28"
          x2="110"
          y2="142"
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Rotating Radar Sweep Line */}
        <g style={{ transformOrigin: "110px 85px", animation: "radarSweep 6s linear infinite" }}>
          <line
            x1="110"
            y1="85"
            x2="152"
            y2="55"
            stroke="var(--text-mid)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* Blinking / Pulsing Lost Beacon Pin */}
        <circle
          cx="140"
          cy="65"
          r="4"
          fill="var(--text)"
          style={{ transformOrigin: "140px 65px", animation: "pulsePing 2.4s ease-in-out infinite" }}
        />
        <circle
          cx="140"
          cy="65"
          r="1.5"
          fill="var(--bg)"
        />

        {/* Central Core Marker */}
        <circle cx="110" cy="85" r="2.5" fill="var(--text)" />

        {/* Minimal Terminal Coordinates Tag */}
        <text
          x="20"
          y="26"
          fill="var(--text-dim)"
          fontSize="8"
          fontFamily="monospace"
          letterSpacing="1"
        >
          SYS: 0x404
        </text>
        <text
          x="200"
          y="162"
          textAnchor="end"
          fill="var(--text-dim)"
          fontSize="8"
          fontFamily="monospace"
          letterSpacing="1"
        >
          LOC: UNKNOWN
        </text>
      </svg>
    </div>
  );
}
