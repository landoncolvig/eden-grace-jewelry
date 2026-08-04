'use client';

/**
 * The parts both 3D pieces share: the room they are lit in, the materials, the
 * strand itself, the fit-to-viewport rule, and the idle motion.
 *
 * Two constraints shape all of it.
 *
 * The site is a static export on GitHub Pages, so nothing here may reach for a
 * CDN. That rules out drei's `<Environment preset>`, which streams an HDRI off
 * raw.githack at runtime and would leave every piece unlit the first time the
 * network hiccups. The environment below is built from lightformers and
 * rendered into a cube map on the client instead, which costs one 256px cube
 * render at mount and nothing after.
 *
 * The palette is the storefront's, read off the CSS custom properties that
 * globals.css already defines. Hardcoding the gold here would drift the moment
 * someone retunes the brass token, and the findings on the piece should be the
 * same metal the prices and the focus rings are drawn in.
 */

import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';

/**
 * Read a theme token off :root. Tailwind emits every `@theme` entry as a real
 * custom property, so this is the live value rather than a copy of it. The
 * fallback covers the first paint and any future build that inlines the token.
 */
function token(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function usePalette() {
  return useMemo(
    () => ({
      // Fallbacks must track globals.css. When a token is renamed the
      // fallback is what silently ships, so a stale one here reinstates the
      // old palette inside the canvas while the rest of the page moves on.
      brass: token('--color-brass', '#ba863f'),
      brassDeep: token('--color-rose-deep', '#8f3f42'),
      ink: token('--color-ink', '#4a3b38'),
      inkFaint: token('--color-ink-faint', '#846e64'),
      bench: token('--color-bench', '#fdf7f2'),
      paper: token('--color-paper', '#ffffff'),
      patina: token('--color-sage', '#729981'),
    }),
    []
  );
}

/**
 * A jeweler's bench rather than a showroom.
 *
 * Every material on these pieces is glossy, and a gloss is a mirror: what you
 * see on a bead is a picture of the room, not a picture of the bead. The two
 * panels sitting where the viewer stands are doing most of the work. Take them
 * out and every bead reflects the dark surround and the strand goes to slate.
 *
 * So: a broad daylight lamp overhead, two unequal panels filling the near side,
 * warm strips either side to put an edge on the gold findings, and an ink
 * surround behind it all. The dark is load-bearing too. A gloss with nothing
 * dark to reflect has no shape.
 *
 * `frames={1}` bakes the cube map once at mount. Nothing in here moves.
 */
export function BenchEnvironment() {
  const palette = usePalette();

  return (
    <Environment resolution={256} frames={1}>
      {/* The room itself. Without this the surround is black and everything
          goes muddy in the shadows. */}
      <mesh scale={60}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color={palette.ink} side={THREE.BackSide} toneMapped={false} />
      </mesh>

      {/* Daylight lamp, overhead and slightly forward. */}
      <Lightformer
        form="rect"
        intensity={3.4}
        color={palette.bench}
        position={[0, 5, 2.5]}
        scale={[10, 5, 1]}
      />
      {/* The near side of the room, which is what the front of every bead is
          actually showing. Two panels rather than one, at different sizes and
          brightnesses, so the reflection has somewhere to travel as the piece
          turns instead of sitting there evenly lit. */}
      <Lightformer
        form="rect"
        intensity={1.9}
        color={palette.bench}
        position={[-3.4, 1.6, 7]}
        scale={[8, 9, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2.8}
        color={palette.paper}
        position={[3.6, -0.8, 6.5]}
        scale={[6, 7, 1]}
      />
      {/* Bench top bouncing light back up into the underside of the piece. */}
      <Lightformer
        form="rect"
        intensity={1.1}
        color={palette.paper}
        position={[0, -4, 2]}
        scale={[8, 4, 1]}
      />
      {/* Warm rims, for the edge highlights on the findings. */}
      <Lightformer
        form="rect"
        intensity={3.2}
        color={palette.brass}
        position={[-5, 1, 1]}
        scale={[2, 6, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2.8}
        color={palette.brass}
        position={[5, 0, 1]}
        scale={[2, 6, 1]}
      />
      {/* A small hot spot dead front. This is the pinpoint catchlight that sits
          on the top left of every bead and does most of the work of saying the
          beads are round and polished. */}
      <Lightformer
        form="circle"
        intensity={3.6}
        color={palette.paper}
        position={[-1.6, 2.4, 6]}
        scale={2}
      />
    </Environment>
  );
}

/**
 * Gold-tone findings: the jump rings the letters hang from, and the accent
 * rounds. The only actual metal on the piece.
 */
export function GoldMaterial({ roughness = 0.18 }: { roughness?: number }) {
  const palette = usePalette();
  return (
    <meshPhysicalMaterial
      color={palette.brass}
      metalness={1}
      roughness={roughness}
      clearcoat={0.4}
      clearcoatRoughness={0.2}
      envMapIntensity={1.4}
    />
  );
}

/**
 * Polished stone or glass. Not metal: a bead has a body color of its own plus
 * a hard clear surface over it, which is what the clearcoat is. Metalness here
 * would delete the color and leave a chrome ball.
 *
 * Left white by default because the strand colors the beads per instance.
 */
export function BeadMaterial({ color = '#ffffff' }: { color?: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={0}
      roughness={0.16}
      // A full clearcoat washed the bead color out the same way it drowned
      // the letters: the specular lobe is additive white on top of the body
      // color, so at 1.0 under this environment every strand trended pale
      // regardless of the color it was given. Half is still a hard polished
      // surface and lets the stone read.
      clearcoat={0.5}
      clearcoatRoughness={0.1}
      ior={1.55}
      // Low, deliberately. The environment is bright and near-neutral, so a
      // strong reflection contribution drains the bead's own color toward
      // grey. Under-lighting them and letting the body color dominate reads
      // more like stone than a higher value does.
      envMapIntensity={0.5}
    />
  );
}

/**
 * Nacre: mother of pearl, and freshwater pearl, which are the same material.
 *
 * The iridescence layer is the whole point. Nacre is stacked aragonite
 * platelets a few hundred nanometres thick, and the color shift across a
 * pearl is thin-film interference in those layers, not pigment. three models
 * exactly that, so the thickness range below is doing physics rather than
 * faking a rainbow gradient. Without it a pearl renders as a white ball.
 */
export function NacreMaterial({
  color,
  map,
  roughnessMap,
}: {
  color?: string;
  map?: THREE.Texture | null;
  /**
   * Per-texel roughness. The letter discs use it to make the stamped glyph
   * matte while the shell around it stays polished, which is the only thing
   * that keeps the letter readable: clearcoat and iridescence add specular on
   * top of the diffuse term, so darkening the color map alone never wins.
   */
  roughnessMap?: THREE.Texture | null;
}) {
  const palette = usePalette();
  return (
    <meshPhysicalMaterial
      color={color ?? palette.paper}
      map={map ?? null}
      roughnessMap={roughnessMap ?? null}
      metalness={0}
      // Against a dark panel a plain white diffuse reads as concrete. Shell is
      // luminous because light enters, scatters under the surface, and comes
      // back out; sheen approximates that without a full subsurface pass.
      sheen={0.6}
      sheenColor="#ffe9d2"
      sheenRoughness={0.4}
      // Nacre is glossy, but a mirror finish here blew out the stamped letters
      // on the disc faces. Backed off far enough to keep them legible while
      // still reading as shell rather than plastic.
      roughness={0.22}
      clearcoat={0.55}
      clearcoatRoughness={0.12}
      iridescence={0.35}
      iridescenceIOR={1.6}
      iridescenceThicknessRange={[120, 420]}
      envMapIntensity={1.25}
    />
  );
}

/**
 * Scales its children so a design-space box of `width` x `height` fits the
 * canvas whatever shape the canvas happens to be. The hero canvas runs from
 * roughly 1.4:1 on a phone to 2.8:1 on a desktop, and a fixed camera distance
 * would either crop the piece on one or strand it in the middle of the other.
 *
 * `viewport` is world units at z=0, and it is reactive, so this re-fits on
 * resize without a listener.
 */
export function FitToViewport({
  width,
  height,
  margin = 0.94,
  children,
}: {
  width: number;
  height: number;
  margin?: number;
  children: ReactNode;
}) {
  const viewport = useThree((state) => state.viewport);
  const scale = Math.min((viewport.width * margin) / width, (viewport.height * margin) / height);
  return <group scale={scale}>{children}</group>;
}

/**
 * The idle. A necklace lying on a surface does not spin, it settles and turns
 * a little way back and forth, which is also the only motion that keeps a
 * stamped letter readable the whole time. Two sines at unrelated speeds so the
 * turn never lands in the same place twice, and a phase offset so a row of
 * letters catches the light one after another rather than in lockstep.
 *
 * When motion is off this still applies a fixed three-quarter angle: the point
 * of reduced motion is to stop the movement, not to flatten the object back
 * into the 2D version the buyer was already shown.
 */
const RESTING_ANGLE = 0.2;

export function useIdleTurn<T extends THREE.Object3D>(
  ref: RefObject<T | null>,
  {
    enabled,
    amplitude = 0.3,
    speed = 0.38,
    phase = 0,
  }: { enabled: boolean; amplitude?: number; speed?: number; phase?: number }
) {
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (!enabled) ref.current.rotation.set(0, RESTING_ANGLE, 0);
  }, [ref, enabled]);

  useFrame((state) => {
    if (!enabled || !ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = Math.sin(t * speed + phase) * amplitude;
    ref.current.rotation.x = Math.sin(t * speed * 0.61 + phase) * amplitude * 0.07;
  });
}

/**
 * Deterministic noise. The beads need to look hand-strung rather than
 * extruded, and that means every one is a slightly different size and shade.
 * Math.random would reshuffle the whole strand on every re-render, which shows
 * up as the necklace twitching each time the buyer types a character.
 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The curve a strand hangs in. Flatter through the middle as `sag` rises. */
export function catenary(x: number, sag: number, y: number) {
  return y + sag * (Math.cosh(x / sag) - 1);
}

export type Finish = 'stone' | 'pearl';

/**
 * The strand: round beads threaded end to end along a catenary.
 *
 * One instanced mesh, so a hundred-odd beads cost one draw call rather than a
 * hundred. Each gets its own size and shade off the seeded noise above, which
 * is the difference between a strung necklace and a string of identical balls.
 * The catalog says natural stone shifts bead to bead and no two strands come
 * out the same; this is that sentence, rendered.
 */
export function Strand({
  halfWidth = 5,
  sag = 9,
  y = 0,
  radius = 0.05,
  pitch = 0.104,
  color,
  finish = 'stone',
  seed = 7,
}: {
  halfWidth?: number;
  sag?: number;
  /** World y of the low point of the curve. */
  y?: number;
  radius?: number;
  /** Distance between bead centres along the curve. */
  pitch?: number;
  color: string;
  finish?: Finish;
  seed?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  const beads = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const x = -halfWidth + (2 * halfWidth * i) / 160;
      points.push(new THREE.Vector3(x, catenary(x, sag, y), 0));
    }
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0);
    const count = Math.max(2, Math.floor(curve.getLength() / pitch));

    const random = rng(seed);
    const base = new THREE.Color(color);
    const axis = new THREE.Vector3(1, 0, 0);
    const quaternion = new THREE.Quaternion();

    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];

    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const position = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      quaternion.setFromUnitVectors(axis, tangent);

      // Drilled beads are wider than they are long once they are pushed
      // together on the wire, and no two are quite the same.
      const jitter = 1 + (random() - 0.5) * 0.14;
      const scale = new THREE.Vector3(radius * 0.92 * jitter, radius * jitter, radius * jitter);
      matrices.push(new THREE.Matrix4().compose(position, quaternion, scale));

      const shade = base.clone();
      shade.offsetHSL((random() - 0.5) * 0.03, (random() - 0.5) * 0.1, (random() - 0.5) * 0.09);
      colors.push(shade);
    }

    return { matrices, colors };
  }, [halfWidth, sag, y, radius, pitch, color, seed]);

  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    beads.matrices.forEach((matrix, i) => target.setMatrixAt(i, matrix));
    beads.colors.forEach((shade, i) => target.setColorAt(i, shade));
    target.instanceMatrix.needsUpdate = true;
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
    target.computeBoundingSphere();
  }, [beads]);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, beads.matrices.length]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 16, 12]} />
      {/* White, both of them: the shade of each bead rides on the instance
          color, and the shader multiplies the two. A tinted material here
          would tint the whole strand a second time. */}
      {finish === 'pearl' ? <NacreMaterial color="#ffffff" /> : <BeadMaterial />}
    </instancedMesh>
  );
}
