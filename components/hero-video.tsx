'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/**
 * The hero: a real necklace turning in the light.
 *
 * This replaces two earlier attempts. The first was a photograph, which is
 * honest but static. Before that was a procedurally modelled necklace in
 * WebGL, which was removed because generated geometry reads as a diagram next
 * to real product photography. Jenna then sent four seconds of an actual
 * strand rotating against a wall, which is what both attempts were reaching
 * for and neither could fake.
 *
 * Encoded from a 9.4 MB 4K clip down to about 400 KB of MP4 and 260 KB of
 * WebM. WebM is listed first so Chrome and Firefox take the smaller file and
 * Safari falls through to MP4.
 *
 * Autoplay rules that actually matter in browsers: it only works muted, and
 * iOS additionally requires playsInline or the video hijacks the screen into
 * fullscreen. Both are set. There is no audio track in the file at all, so
 * muted costs nothing.
 */
export default function HeroVideo({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (reducedMotion) {
      el.pause();
      // Park on a frame where the whole strand is visible rather than
      // wherever it happened to stop.
      el.currentTime = 1.5;
    } else {
      // Autoplay can still be refused (data saver, battery saver, some
      // enterprise policies). A rejected promise is not an error worth
      // surfacing; the poster stays up and the page is fine.
      el.play().catch(() => {});
    }
  }, [reducedMotion]);

  // Reduced motion, or the file would not load: the poster alone. Same frame
  // either way, so the layout never shifts.
  if (reducedMotion || failed) {
    return (
      <Image
        src="/video/eden-strand-poster.jpg"
        alt="A green aventurine and freshwater pearl strand, held up against a wall"
        width={800}
        height={1000}
        priority
        className={className}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      poster="/video/eden-strand-poster.jpg"
      muted
      loop
      playsInline
      autoPlay
      // auto, not metadata. This is the hero: it should be moving by the time
      // anyone looks at it, and metadata-only leaves autoplay waiting on a
      // buffer it has not started filling. At 261 KB of WebM the eager fetch
      // is cheaper than the stall.
      preload="auto"
      onError={() => setFailed(true)}
      aria-label="A green aventurine and freshwater pearl strand, turning slowly"
      className={className}
    >
      <source src="/video/eden-strand.webm" type="video/webm" />
      <source src="/video/eden-strand.mp4" type="video/mp4" />
    </video>
  );
}
