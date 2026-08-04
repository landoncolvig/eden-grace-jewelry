'use client';

import { useId } from 'react';

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
 * the only description of the piece a screen reader ever gets.
 */

/** The strand hangs in the same curve here as it does in 3D, plotted rather
 *  than eyeballed, so the flat piece and the rendered one agree on the shape.
 *  y = sag * (cosh(x / sag) - 1), in viewBox units. */
const VIEW_W = 640;
const VIEW_H = 260;
const SAG = 620;
const STRAND_Y = 96;

/**
 * Every coordinate below goes through this.
 *
 * `Math.cosh` is not required to be correctly rounded, and Node and V8 in the
 * browser disagree in the last two digits. React serialises the number
 * verbatim, so the prerendered HTML said cy="189.19176853256215" and hydration
 * computed 189.191768532562, and React threw out the whole subtree as a
 * mismatch on every load. Two decimal places is far below a pixel at this
 * viewBox and identical on both sides.
 */
function round(n: number) {
  return Math.round(n * 100) / 100;
}

function strandY(x: number) {
  const dx = x - VIEW_W / 2;
  return round(STRAND_Y + SAG * (Math.cosh(dx / SAG) - 1));
}

/** Bead centres from edge to edge, close enough to touch. */
function beads(step: number) {
  const out: Array<{ x: number; y: number }> = [];
  for (let x = -step; x <= VIEW_W + step; x += step) out.push({ x, y: strandY(x) });
  return out;
}

type NecklaceSvgProps = {
  /** What the piece spells. Already resolved, including the placeholder word. */
  word: string;
  /** True when `word` is the stand-in rather than something the buyer typed. */
  muted: boolean;
  /** Bead color, matching the strand color the configurator offers. */
  color: string;
};

export function NecklaceSvg({ word, muted, color }: NecklaceSvgProps) {
  // Gradient ids have to be unique per instance. SVG resolves url(#id) against
  // the whole document, so two of these on one page with different bead
  // colors would both paint with whichever def came first.
  const id = useId();
  const beadFill = `bead-${id}`;
  const nacreFill = `nacre-${id}`;

  const letters = Array.from(word.toUpperCase()).slice(0, 10);

  // Long words get smaller discs rather than a row that runs off the edge.
  const radius = round(Math.min(26, (VIEW_W * 0.62) / (letters.length * 2.2)));
  const pitch = round(radius * 2.18);
  const firstX = round(VIEW_W / 2 - ((letters.length - 1) * pitch) / 2);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      role="img"
      aria-label={`A beaded necklace with mother-of-pearl letter discs spelling ${word}`}
      // Matches the 3D placeholder. Both used to sit near 0.4, which on the
      // state every visitor lands on read as a half-loaded asset rather than
      // as a stand-in word.
      opacity={muted ? 0.92 : 1}
      style={{ transition: 'opacity 220ms ease' }}
    >
      <defs>
        <radialGradient id={beadFill} cx="35%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.72" />
        </radialGradient>
        {/* Theme tokens rather than literals. `var()` does not parse in an SVG
            presentation attribute, but it does in the style property, which is
            how these stay tied to globals.css. */}
        <radialGradient id={nacreFill} cx="36%" cy="30%" r="76%">
          <stop offset="0%" style={{ stopColor: 'var(--color-paper)' }} />
          <stop offset="70%" style={{ stopColor: 'var(--color-bench)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--color-rule)' }} />
        </radialGradient>
      </defs>

      {/* The strand, drawn bead by bead rather than as a stroked path: a smooth
          line reads as a chain, and this shop does not sell chain. */}
      {beads(9.4).map((bead, i) => (
        <circle key={i} cx={bead.x} cy={bead.y} r="4.7" fill={`url(#${beadFill})`} />
      ))}

      {letters.map((char, i) => {
        const x = round(firstX + i * pitch);
        const attachY = round(strandY(x) + 5);
        const cy = round(attachY + 9 + radius);
        return (
          <g key={`${char}-${i}`}>
            {/* Jump ring. */}
            <circle
              cx={x}
              cy={round(attachY + 5)}
              r="5"
              fill="none"
              className="stroke-brass"
              strokeWidth="2"
            />
            {/* Gold-tone body with a nacre face inset, leaving a rim. */}
            <circle cx={x} cy={cy} r={radius} className="fill-brass" />
            <circle cx={x} cy={cy} r={round(radius * 0.87)} fill={`url(#${nacreFill})`} />
            <text
              x={x}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-display fill-ink"
              fontSize={round(radius * 1.05)}
            >
              {char}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type StrandSvgProps = {
  /** Bead color. Pearls pass their own near-white. */
  color: string;
  /** Draws the pearl and gold accent beads the add-on adds. */
  accents?: boolean;
};

export function StrandSvg({ color, accents = false }: StrandSvgProps) {
  const id = useId();
  const beadFill = `strand-${id}`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      role="img"
      aria-label={accents ? 'A beaded strand with pearl and gold accents' : 'A beaded strand'}
    >
      <defs>
        <radialGradient id={beadFill} cx="35%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.72" />
        </radialGradient>
      </defs>

      {beads(10.6).map((bead, i) => (
        <circle key={i} cx={bead.x} cy={round(bead.y + 30)} r="5.3" fill={`url(#${beadFill})`} />
      ))}

      {accents
        ? [-1, -0.62, -0.3, 0.3, 0.62, 1].map((offset, i) => {
            const x = round(VIEW_W / 2 + offset * 140);
            return (
              <circle
                key={offset}
                cx={x}
                cy={round(strandY(x) + 30)}
                r={i % 2 === 1 ? 5.6 : 6.6}
                className={i % 2 === 1 ? 'fill-brass' : 'fill-paper stroke-rule'}
              />
            );
          })
        : null}
    </svg>
  );
}
