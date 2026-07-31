/**
 * The mark: a strand seen flat.
 *
 * Twelve varied beads around a circle with a brass toggle clasp at the top.
 * A beaded necklace laid on a table is already a circle, so the mark is a
 * simplified picture of Jenna's work rather than a generic monogram.
 *
 * Drawn rather than lettered because a wordmark alone gave the header nothing
 * to hold at small sizes, and drawn as geometry rather than shipped as an
 * image so it stays crisp at 16px in a browser tab and picks up the palette
 * through currentColor.
 *
 * The visible ring and bar keep the small mark from reading as a loading
 * spinner, while the varied bead sizes echo the way Jenna spaces a strand.
 */
export default function Logo({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const beadRadii = [5.2, 4.4, 5.8, 4.8, 6.2, 4.6, 5.4, 4.4, 5.8, 4.8, 6, 4.6];
  const radius = 37;
  const centre = 50;

  // Leave enough room for the toggle to remain legible at favicon size.
  const gap = 0.92;
  const start = -Math.PI / 2 + gap / 2;
  const sweep = Math.PI * 2 - gap;

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
      <circle cx="42" cy="12.5" r="5.2" stroke="#ba863f" strokeWidth="3" />
      <line
        x1="56"
        y1="12.5"
        x2="69"
        y2="12.5"
        stroke="#ba863f"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {beadRadii.map((beadRadius, i) => {
        const angle = start + (sweep * i) / (beadRadii.length - 1);
        const cx = centre + Math.cos(angle) * radius;
        const cy = centre + Math.sin(angle) * radius;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={beadRadius}
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}
