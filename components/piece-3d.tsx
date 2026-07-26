'use client';

/**
 * The seam between the flat storefront and the 3D pieces.
 *
 * Nothing in this file may import three, drei, or fiber. It is in the first
 * bundle; they are not, and one stray import would pull most of a megabyte of
 * renderer into the critical path of a page whose job is to show a price. The
 * scenes are reached only through `next/dynamic` below, with `ssr: false`,
 * which is also what keeps the static export buildable: there is no
 * server-side WebGL, so a prerendered canvas is not a thing that can exist.
 *
 * Three ways the 3D can fail to arrive, and all three land on the flat piece:
 *
 *   1. No WebGL. Detected before mounting anything.
 *   2. The chunk fails to load, or the renderer throws on init. Caught by the
 *      boundary and latched, so it does not retry into a loop.
 *   3. It is simply still loading. The flat piece is what is on screen until
 *      the scene says it has something to draw.
 *
 * The flat piece is not a spinner. It is the real treatment, drawn
 * immediately, that the 3D one fades in over.
 */

import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useState, type ReactNode } from 'react';
import { NecklaceSvg, StrandSvg } from './piece-svg';

// Both point at the same module on purpose. See components/scenes-3d.
const Necklace3D = dynamic(() => import('./scenes-3d').then((m) => m.Necklace3D), {
  ssr: false,
  loading: () => null,
});
const Strand3D = dynamic(() => import('./scenes-3d').then((m) => m.Strand3D), {
  ssr: false,
  loading: () => null,
});

/** Shown when the buyer has not typed anything yet. Matches the catalog. */
export const DEFAULT_WORD = 'ROSE';

/** The catalog caps the word at ten characters. */
export const MAX_WORD_LENGTH = 10;

/**
 * Kept here rather than imported from the scene module so that reading a
 * colour does not drag the renderer into the first bundle. The keys are the
 * catalog's `base` choices; the scene holds the matching table.
 */
export const STRAND_SWATCHES: Record<string, string> = {
  'Pale blue': '#8fb4cc',
  Cream: '#fdf7f2',
  'Black onyx': '#3a3033',
  'Green aventurine': '#729981',
};

export const DEFAULT_STRAND = 'Pale blue';

/** Keys are the catalog's `stone` choices. The scene holds the matching table. */
const STONE_SWATCHES: Record<string, string> = {
  'Green aventurine': '#729981',
  'Black onyx': '#3a3033',
  'Pink rhodonite': '#c98a92',
  Amazonite: '#87b3ae',
  'Turquoise heishi': '#5fa6a4',
};

/**
 * Rebuilding the letter discs costs a texture upload per character. That is
 * nothing once and a stutter on every keystroke, so the 3D piece trails the
 * input by one beat. The flat piece underneath it still tracks every character
 * immediately.
 */
const SETTLE_MS = 140;

function useSettled<T>(value: T, ms = SETTLE_MS) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * Starts false, so the very first client render matches the server's and the
 * flat piece is what hydrates. The probe context is thrown away immediately;
 * browsers cap how many live WebGL contexts a document may hold, and the real
 * canvas needs one of them.
 */
function useWebGL() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    let ok = false;
    try {
      const canvas = document.createElement('canvas');
      const context =
        canvas.getContext('webgl2') ??
        (canvas.getContext('webgl') as WebGLRenderingContext | null);
      ok = Boolean(context);
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      ok = false;
    }
    setSupported(ok);
  }, []);

  return supported;
}

class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Everything the two wrappers do identically. */
function usePiece() {
  const reducedMotion = usePrefersReducedMotion();
  const webgl = useWebGL();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);

  const show = webgl && !failed;
  return { animate: !reducedMotion, show, ready: ready && show, onReady, onError };
}

/**
 * Stacks the flat piece and the canvas in one box and cross-fades between
 * them. Both fill the container, so the caller owns the height: give it a
 * capped one. An uncapped 3D hero eats a phone screen.
 */
function Stack({
  flat,
  scene,
  ready,
  className,
}: {
  flat: ReactNode;
  scene: ReactNode;
  ready: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <div
        className="h-full w-full transition-opacity duration-500"
        style={{ opacity: ready ? 0 : 1 }}
      >
        {flat}
      </div>
      {scene ? (
        // The canvas carries no information the flat piece does not, and it
        // cannot be read aloud, so it stays out of the accessibility tree.
        <div
          aria-hidden
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: ready ? 1 : 0 }}
        >
          {scene}
        </div>
      ) : null}
    </div>
  );
}

export function NecklacePiece({
  name,
  strand = DEFAULT_STRAND,
  className,
}: {
  name: string;
  /** One of the catalog's `base` choices. */
  strand?: string;
  className?: string;
}) {
  const typed = name.trim().slice(0, MAX_WORD_LENGTH);
  const settled = useSettled(typed);
  const { animate, show, ready, onReady, onError } = usePiece();

  return (
    <Stack
      className={className}
      ready={ready}
      flat={
        <NecklaceSvg
          word={typed || DEFAULT_WORD}
          muted={typed.length === 0}
          color={STRAND_SWATCHES[strand] ?? STRAND_SWATCHES[DEFAULT_STRAND]}
        />
      }
      scene={
        show ? (
          <SceneBoundary onError={onError}>
            <Necklace3D
              word={settled || DEFAULT_WORD}
              strand={strand}
              muted={settled.length === 0}
              animate={animate}
              onReady={onReady}
            />
          </SceneBoundary>
        ) : null
      }
    />
  );
}

/**
 * The plain strand, ready for the gemstone and pearl product pages: pass the
 * stone and add-on state the configurator is currently holding and the piece
 * follows it.
 */
export function StrandPiece({
  stone,
  finish = 'stone',
  accents = false,
  className,
}: {
  stone?: string;
  finish?: 'stone' | 'pearl';
  accents?: boolean;
  className?: string;
}) {
  const settledStone = useSettled(stone);
  const { animate, show, ready, onReady, onError } = usePiece();

  // Pearls are near-white whatever the stone picker says; the gradient is what
  // gives them shape against the cream ground.
  const flatColor =
    finish === 'pearl'
      ? '#ffffff'
      : (STONE_SWATCHES[stone ?? ''] ?? STONE_SWATCHES['Green aventurine']);

  return (
    <Stack
      className={className}
      ready={ready}
      flat={<StrandSvg color={flatColor} accents={accents} />}
      scene={
        show ? (
          <SceneBoundary onError={onError}>
            <Strand3D
              stone={settledStone}
              finish={finish}
              accents={accents}
              animate={animate}
              onReady={onReady}
            />
          </SceneBoundary>
        ) : null
      }
    />
  );
}
