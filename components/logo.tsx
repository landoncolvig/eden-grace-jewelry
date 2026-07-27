/**
 * The mark: a strand seen flat.
 *
 * Sixteen beads around a circle with a gap at the top where the clasp sits,
 * and one brass bead off to one side. It is the product drawn as simply as it
 * can be drawn, which is the whole idea: a beaded necklace laid on a table is
 * already a circle of dots, so the mark is not a metaphor for the thing, it is
 * a picture of it.
 *
 * Drawn rather than lettered because a wordmark alone gave the header nothing
 * to hold at small sizes, and drawn as geometry rather than shipped as an
 * image so it stays crisp at 16px in a browser tab and picks up the palette
 * through currentColor.
 *
 * The gap matters. A closed ring reads as a generic circle; the break is what
 * makes it read as something with two ends that fasten.
 */
export default function Logo({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const beads = 16;
  const radius = 38;
  const centre = 50;

  // Leave a wedge open at the top for the clasp. Beads are laid out across the
  // remaining arc rather than the full circle, so the spacing stays even.
  const gap = 0.42; // radians of opening
  const start = -Math.PI / 2 + gap / 2;
  const sweep = Math.PI * 2 - gap;

  // The accent sits a third of the way round rather than at dead centre, which
  // would read as a deliberate axis and make the mark look symmetrical.
  const accentIndex = 5;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      role="img"
      aria-label="Eden Grace Jewelry Co."
    >
      {Array.from({ length: beads }, (_, i) => {
        const angle = start + (sweep * i) / (beads - 1);
        const cx = centre + Math.cos(angle) * radius;
        const cy = centre + Math.sin(angle) * radius;
        const accent = i === accentIndex;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={accent ? 6.4 : 5}
            // currentColor for the strand so the mark inherits whatever it is
            // placed on; the accent is fixed brass so the gold reads on both
            // the dark header and the cream page.
            fill={accent ? '#ba863f' : 'currentColor'}
          />
        );
      })}
    </svg>
  );
}
