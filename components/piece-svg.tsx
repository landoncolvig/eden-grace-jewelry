/**
 * The flat treatments of both pieces.
 *
 * These are not decoration. They are the floor the 3D scenes stand on: the
 * markup that renders before the three.js chunk arrives, what shows when the
 * chunk fails, and what a machine without WebGL gets permanently. Everything
 * here is inline SVG with no dependencies, so it survives every failure mode
 * the canvas has.
 *
 * They also carry the accessible name. The canvas is aria-hidden, so this is
 * the only description of the piece a screen reader ever reads.
 */

type NecklaceSvgProps = {
  /** What the piece says. Already resolved, including the placeholder word. */
  word: string;
  /** True when `word` is the stand-in rather than something the buyer typed. */
  muted: boolean;
};

export function NecklaceSvg({ word, muted }: NecklaceSvgProps) {
  // The script face runs wider per character than a text face, so long names
  // have to be pulled in or they overrun the chain.
  const fontSize = word.length <= 5 ? 92 : word.length <= 8 ? 74 : 58;

  return (
    <svg
      viewBox="0 0 640 260"
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      role="img"
      aria-label={`A necklace reading ${word}`}
    >
      <defs>
        <linearGradient id="piece-svg-chain" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8a6d3f" />
          <stop offset="50%" stopColor="#d8b982" />
          <stop offset="100%" stopColor="#8a6d3f" />
        </linearGradient>
      </defs>

      {/* Chain: a catenary-ish curve running off both edges, so the piece reads
          as being worn rather than laid flat. */}
      <path
        d="M -10 18 C 120 18, 150 132, 320 132 C 490 132, 520 18, 650 18"
        fill="none"
        stroke="url(#piece-svg-chain)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Clasp ring at the low point where the pendant hangs. */}
      <circle
        cx="320"
        cy="132"
        r="5.5"
        fill="none"
        stroke="url(#piece-svg-chain)"
        strokeWidth="2.5"
      />

      <text
        x="320"
        y="212"
        textAnchor="middle"
        className="font-script"
        fontSize={fontSize}
        fill="#b08d57"
        opacity={muted ? 0.34 : 1}
        style={{ transition: 'opacity 220ms ease, font-size 220ms ease' }}
      >
        {word}
      </text>
    </svg>
  );
}

type PendantSvgProps = {
  /** How many stones sit on the disc. The disc widens to hold them. */
  stones: number;
};

export function PendantSvg({ stones }: PendantSvgProps) {
  const count = Math.max(1, Math.min(stones, 9));
  // Same rule the 3D disc uses: the disc grows with the count so a row of
  // stones reads as a row rather than a cluster.
  const radius = 56 + count * 7;
  const spacing = 20;
  const firstX = 320 - ((count - 1) * spacing) / 2;

  return (
    <svg
      viewBox="0 0 640 260"
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      role="img"
      aria-label={`A brushed disc pendant set with ${count} ${count === 1 ? 'stone' : 'stones'}`}
    >
      <defs>
        <linearGradient id="piece-svg-silver" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbfbf9" />
          <stop offset="55%" stopColor="#d3d6d0" />
          <stop offset="100%" stopColor="#8b969d" />
        </linearGradient>
      </defs>

      <path
        d="M -10 8 C 130 8, 160 96, 320 96 C 480 96, 510 8, 650 8"
        fill="none"
        stroke="url(#piece-svg-silver)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Bail, then the disc hanging off it. */}
      <circle cx="320" cy="104" r="7" fill="none" stroke="url(#piece-svg-silver)" strokeWidth="3" />

      <circle
        cx="320"
        cy={116 + radius}
        r={radius}
        fill="url(#piece-svg-silver)"
        stroke="#8b969d"
        strokeWidth="1.5"
      />

      {Array.from({ length: count }, (_, i) => (
        <g key={i}>
          <circle
            cx={firstX + i * spacing}
            cy={116 + radius}
            r="7.5"
            fill="none"
            stroke="#8b969d"
            strokeWidth="2"
          />
          <circle cx={firstX + i * spacing} cy={116 + radius} r="5" fill="#4a7c74" />
        </g>
      ))}
    </svg>
  );
}
