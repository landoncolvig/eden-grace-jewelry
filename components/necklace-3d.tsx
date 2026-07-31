'use client';

/**
 * The name necklace as an actual object: a strung strand with a mother-of-pearl
 * letter disc hanging off it for every character the buyer types.
 *
 * The flat version of this hero showed the word as type. This one shows the
 * piece, because what the buyer is deciding is not whether their name looks
 * good set in a face, it is whether three little discs of nacre spell it
 * nicely across the front of a strand. Nacre is also the one material on the
 * site that a photograph struggles with and a renderer does not: the colour
 * shift across it moves when the piece moves, so it only reads as itself once
 * it is turning.
 *
 * Client-only by construction. There is no server-side WebGL, so this module
 * must never be imported directly by a page. Go through components/piece-3d.
 */

import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  BenchEnvironment,
  FitToViewport,
  GoldMaterial,
  NacreMaterial,
  Strand,
  catenary,
  useIdleTurn,
  usePalette,
} from './jewelry-3d';

/**
 * The four strand colours the configurator offers, keyed by the exact strings
 * in the catalog's `base` choices so the two cannot drift apart. Values come
 * from the product swatches and the theme tokens rather than being picked by
 * eye: pale blue and green are the swatches on the two products that use them,
 * cream and black are the paper and ink tokens.
 */
export const STRAND_COLORS: Record<string, string> = {
  'Pale blue': '#8fb4cc',
  Cream: '#fdf7f2',
  'Black onyx': '#3a3033',
  'Green aventurine': '#729981',
};

export const DEFAULT_STRAND = 'Pale blue';

// Design space. The scene is authored against this and then fitted to whatever
// the canvas turns out to be, so nothing below has to know about breakpoints.
const DESIGN_H = 1.42;
const MIN_DESIGN_W = 4.4;
const STRAND_Y = 0.62;
const SAG = 9;

const BEAD_R = 0.05;
const DISC_R = 0.26;
const DISC_DEPTH = 0.055;
const DISC_GAP = 0.045;
const RING_R = 0.062;

/** The catalog caps the word at ten characters. */
const MAX_LETTERS = 10;

const TEXTURE_PX = 256;

/**
 * Each letter is drawn to a canvas and used as the face of its disc, rather
 * than modelled as geometry.
 *
 * That is not a shortcut, it is what the object is. The letters on the real
 * piece are stamped into flat nacre and filled dark; they have no relief to
 * model. A texture also means the disc face can use the storefront's own
 * display serif, which extruded text could not without shipping a second copy
 * of the font as outline data.
 */
/**
 * Near black, but darkening the ink alone was never going to be enough.
 *
 * The colour map multiplies into the DIFFUSE term, while clearcoat and
 * iridescence add SPECULAR on top, and specular is not multiplied by albedo.
 * So a black texel under this environment still receives a full white
 * highlight and reads mid-grey. Two earlier attempts at this failed for
 * exactly that reason.
 *
 * The fix is the roughness map below: the letter is made matte so it takes no
 * highlight at all, while the surrounding nacre stays polished. That is also
 * what the real object does, since a stamped letter is filled with pigment and
 * does not shine like the shell around it.
 */
const LETTER_INK = '#0b0807';

/** Shared glyph placement, so colour and roughness stay in register. */
function paintGlyph(ctx: CanvasRenderingContext2D, char: string, family: string) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(TEXTURE_PX * 0.52)}px ${family}`;
  // Optical rather than metric centring: cap-height glyphs sit high in the
  // em box, so a mathematically centred letter reads as floating.
  ctx.fillText(char, TEXTURE_PX / 2, TEXTURE_PX * 0.545);
}

function drawLetter(char: string, family: string, face: string, ink: string) {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_PX;
  canvas.height = TEXTURE_PX;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = face;
  ctx.fillRect(0, 0, TEXTURE_PX, TEXTURE_PX);
  ctx.fillStyle = ink;
  paintGlyph(ctx, char, family);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * The roughness companion to drawLetter.
 *
 * White where the glyph is, near-black elsewhere: three.js reads this channel
 * as roughness directly, so the letter becomes fully matte while the shell
 * around it stays polished. This is the map that actually makes the letter
 * readable, because it removes the specular highlight over the glyph rather
 * than trying to out-darken it.
 *
 * No colour space is set: roughness is linear data, not colour, and tagging it
 * sRGB would apply a gamma curve to a value that is not one.
 */
function drawLetterRoughness(char: string, family: string) {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_PX;
  canvas.height = TEXTURE_PX;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Polished nacre around the glyph.
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, TEXTURE_PX, TEXTURE_PX);

  // Matte pigment in the stamped letter.
  ctx.fillStyle = '#ffffff';
  paintGlyph(ctx, char, family);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

/**
 * Builds one texture per distinct character and hands back the per-letter list.
 *
 * Waits for the webfont before drawing. next/font loads Cormorant with
 * `display: swap`, so drawing on first paint would bake the fallback serif into
 * the texture permanently: unlike DOM text, a canvas does not repaint itself
 * when the real face arrives.
 */
type LetterMaps = { map: THREE.Texture | null; roughnessMap: THREE.Texture | null };

function useLetterTextures(word: string): LetterMaps[] {
  const palette = usePalette();
  const invalidate = useThree((state) => state.invalidate);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => {
      if (live) setFontsReady(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const textures = useMemo(() => {
    const family =
      getComputedStyle(document.documentElement).getPropertyValue('--font-cormorant').trim() ||
      'Georgia, serif';

    const cache = new Map<string, LetterMaps>();
    return Array.from(word.toUpperCase()).map((char) => {
      if (!cache.has(char)) {
        cache.set(char, {
          map: drawLetter(char, family, palette.paper, LETTER_INK),
          roughnessMap: drawLetterRoughness(char, family),
        });
      }
      return cache.get(char) ?? { map: null, roughnessMap: null };
    });
    // fontsReady is a redraw trigger, not data. Once the real face lands every
    // texture has to be rebuilt against it.
  }, [word, palette, fontsReady]);

  useEffect(() => {
    invalidate();
    // Canvas textures hold a GPU allocation each. Nothing else will free them
    // when the buyer edits the word, and they edit it a character at a time.
    return () => {
      const seen = new Set<THREE.Texture>();
      textures.forEach(({ map, roughnessMap }) => {
        [map, roughnessMap].forEach((texture) => {
          if (texture && !seen.has(texture)) {
            seen.add(texture);
            texture.dispose();
          }
        });
      });
    };
  }, [textures, invalidate]);

  return textures;
}

/**
 * One letter: a nacre disc in a gold-tone surround, hanging off its own jump
 * ring. The ring is what fixes it to the strand, so the whole assembly pivots
 * there, which is where a real one swings from.
 */
function Letter({
  maps,
  x,
  animate,
  phase,
}: {
  maps: LetterMaps;
  x: number;
  animate: boolean;
  phase: number;
}) {
  const pivot = useRef<THREE.Group>(null);
  // Small enough that the letter stays readable at the extremes. Past about
  // a third of a radian a disc turns far enough to show its gold back, and the
  // buyer momentarily cannot read their own name.
  useIdleTurn(pivot, { enabled: animate, amplitude: 0.24, speed: 0.42, phase });

  // The strand is a curve, so the discs toward the ends of a long word hang
  // from a point slightly higher than the ones in the middle. Following it
  // costs one cosh and is the difference between a row of charms and a row of
  // stickers.
  const attachY = catenary(x, SAG, STRAND_Y) - BEAD_R - RING_R;

  return (
    <group ref={pivot} position={[x, attachY, 0]}>
      <mesh>
        <torusGeometry args={[RING_R, 0.014, 8, 24]} />
        <GoldMaterial />
      </mesh>

      <group position={[0, -RING_R - DISC_R + 0.03, 0]}>
        {/* Body. Gold-tone, and only its rim and back are ever seen: the face
            is covered by the nacre disc below. */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[DISC_R, DISC_R, DISC_DEPTH, 44]} />
          <GoldMaterial />
        </mesh>
        {/* The nacre face, inset far enough to leave the gold showing as a
            rim, with the letter mapped onto it. */}
        <mesh position={[0, 0, DISC_DEPTH / 2 + 0.001]}>
          <circleGeometry args={[DISC_R * 0.87, 44]} />
          <NacreMaterial map={maps.map} roughnessMap={maps.roughnessMap} />
        </mesh>
      </group>
    </group>
  );
}

function Piece({
  word,
  strand,
  animate,
  onReady,
}: {
  word: string;
  strand: string;
  animate: boolean;
  onReady?: () => void;
}) {
  const sway = useRef<THREE.Group>(null);
  useIdleTurn(sway, { enabled: animate, amplitude: 0.1, speed: 0.24 });

  const letters = Array.from(word).slice(0, MAX_LETTERS);
  const textures = useLetterTextures(letters.join(''));

  const pitch = DISC_R * 2 + DISC_GAP;
  const firstX = -((letters.length - 1) * pitch) / 2;

  // A ten-character word is physically most of the front of a 16 inch strand,
  // so the frame widens to hold it rather than the letters shrinking on the
  // wire. The piece gets smaller on screen, which is what a photograph of the
  // real thing would do.
  const designWidth = Math.max(MIN_DESIGN_W, letters.length * pitch + 2.4);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <FitToViewport width={designWidth} height={DESIGN_H}>
      {/* The piece hangs in the top half of its own design box: the strand is
          up at STRAND_Y and the discs come down off it. Lifting the whole
          thing by the midpoint of that span is what centres it in the frame. */}
      <group ref={sway} position={[0, -0.47, 0]}>
        <Strand
          y={STRAND_Y}
          sag={SAG}
          // Past the edge of the frame on both sides. A strand that stops
          // exactly at the crop reads as a broken necklace lying on a table;
          // running it off says the rest of it carries on around a neck.
          halfWidth={designWidth * 1.1}
          radius={BEAD_R}
          color={STRAND_COLORS[strand] ?? STRAND_COLORS[DEFAULT_STRAND]}
        />

        {letters.map((char, i) => (
          <Letter
            key={`${char}-${i}`}
            maps={textures[i] ?? { map: null, roughnessMap: null }}
            x={firstX + i * pitch}
            animate={animate}
            // A sixth of a turn between neighbours, so the light walks along
            // the row instead of flashing across all of it at once.
            phase={i * 0.55}
          />
        ))}
      </group>
    </FitToViewport>
  );
}

export default function Necklace3D({
  word,
  strand = DEFAULT_STRAND,
  animate,
  onReady,
}: {
  word: string;
  /** One of the catalog's `base` choices. Anything else falls back to blue. */
  strand?: string;
  animate: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      // Demand rendering when the idle turn is off: with nothing moving, a
      // continuous 60fps loop is pure battery for an identical picture.
      frameloop={animate ? 'always' : 'demand'}
      // Retina is worth paying for on a stamped letter. Past 2x it is not.
      dpr={[1, 2]}
      camera={{ position: [0, 0, 7], fov: 26 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <BenchEnvironment />
      {/* Pulled down from 0.4/1.2. The environment already carries most of the
          light, and the extra fill was flattening the disc faces. */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 5, 6]} intensity={0.85} />
      <Suspense fallback={null}>
        <Piece word={word} strand={strand} animate={animate} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
