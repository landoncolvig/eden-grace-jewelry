'use client';

/**
 * The parts both 3D pieces share: the room they are lit in, the two metals,
 * the fit-to-viewport rule, and the idle motion.
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
 * globals.css already defines. A hardcoded gold here would drift the moment
 * someone retunes the brass token, and the whole point of the piece is that it
 * is the same metal the prices and the focus rings are drawn in.
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
      brass: token('--color-brass', '#b08d57'),
      brassDeep: token('--color-brass-deep', '#8a6d3f'),
      ink: token('--color-ink', '#1b2a33'),
      bench: token('--color-bench', '#edeeea'),
      paper: token('--color-paper', '#fbfbf9'),
      patina: token('--color-patina', '#4a7c74'),
    }),
    []
  );
}

/**
 * A jeweler's bench rather than a showroom: one broad soft source overhead
 * standing in for the daylight lamp, a warm strip either side for the edge
 * highlights that make a filed edge legible, and an ink surround so the metal
 * has something dark to reflect. Polished metal with nothing dark in its
 * environment reads as plastic, which is the failure mode this is avoiding.
 *
 * `frames={1}` bakes the cube map once at mount. Nothing in here moves.
 */
export function BenchEnvironment() {
  const palette = usePalette();

  return (
    <Environment resolution={256} frames={1}>
      {/* The room itself. Without this the surround is black and the metal
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
      {/* Bench top bouncing light back up into the underside of the piece. */}
      <Lightformer
        form="rect"
        intensity={0.9}
        color={palette.paper}
        position={[0, -4, 2]}
        scale={[8, 4, 1]}
      />
      {/* Warm rims. These are what travel across the letterforms as the piece
          turns, so they are the whole reason the rotation is worth having. */}
      <Lightformer
        form="rect"
        intensity={2.6}
        color={palette.brass}
        position={[-5, 1, 1]}
        scale={[2, 6, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2.2}
        color={palette.brass}
        position={[5, 0, 1]}
        scale={[2, 6, 1]}
      />
      {/* A small hot spot dead front, for the specular catch on the bevels. */}
      <Lightformer
        form="circle"
        intensity={2.0}
        color={palette.paper}
        position={[1.2, 2, 6]}
        scale={2.4}
      />
    </Environment>
  );
}

/**
 * 14k gold fill. metalness 1 and a low roughness means effectively all of its
 * colour comes from the environment above; `envMapIntensity` is the exposure
 * dial on that. The clearcoat is the polish, and it is what separates this
 * from raw cast metal.
 */
export function GoldMaterial({
  roughness = 0.15,
  opacity = 1,
}: {
  roughness?: number;
  opacity?: number;
}) {
  const palette = usePalette();
  const faded = opacity < 1;
  return (
    <meshPhysicalMaterial
      color={palette.brass}
      metalness={1}
      roughness={roughness}
      clearcoat={0.4}
      clearcoatRoughness={0.2}
      envMapIntensity={1.4}
      transparent={faded}
      opacity={opacity}
      // Script letterforms overlap constantly. Writing depth while translucent
      // makes the overlaps fight each other and the word flickers as it turns;
      // not writing it renders the whole run as one even ghost.
      depthWrite={!faded}
    />
  );
}

/**
 * Sterling with a hand-brushed face. Rougher than the gold, and anisotropic,
 * so the highlight smears in one direction the way a brushed surface does
 * instead of pooling into a point.
 */
export function SilverMaterial({
  roughness = 0.32,
  anisotropy = 0.75,
}: {
  roughness?: number;
  anisotropy?: number;
}) {
  const palette = usePalette();
  return (
    <meshPhysicalMaterial
      color={palette.bench}
      metalness={1}
      roughness={roughness}
      anisotropy={anisotropy}
      anisotropyRotation={Math.PI / 2}
      envMapIntensity={1.25}
    />
  );
}

/**
 * A faceted stone. Not transmissive: real refraction needs a second render
 * pass per frame, which is a poor trade on a phone for a 3mm object. Flat
 * shading on a low-poly solid plus a hard clearcoat gets the same read.
 */
export function StoneMaterial() {
  const palette = usePalette();
  return (
    <meshPhysicalMaterial
      color={palette.patina}
      metalness={0}
      roughness={0.04}
      clearcoat={1}
      clearcoatRoughness={0}
      ior={2.4}
      reflectivity={1}
      envMapIntensity={2.2}
      flatShading
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
  margin = 0.92,
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
 * The idle. A piece on a chain does not spin, it turns a little way and comes
 * back, which is also the only motion that keeps the letterforms legible the
 * whole time. Two sine waves at unrelated speeds so the turn never lands in
 * the same place twice.
 *
 * When motion is off this still applies a fixed three-quarter angle: the point
 * of reduced motion is to stop the movement, not to flatten the object back
 * into the 2D version the buyer was already shown.
 */
const RESTING_ANGLE = 0.24;

export function useIdleTurn<T extends THREE.Object3D>(
  ref: RefObject<T | null>,
  { enabled, amplitude = 0.32, speed = 0.38 }: { enabled: boolean; amplitude?: number; speed?: number }
) {
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (!enabled) {
      ref.current.rotation.set(0, RESTING_ANGLE, 0);
    }
  }, [ref, enabled]);

  useFrame((state) => {
    if (!enabled || !ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = Math.sin(t * speed) * amplitude;
    ref.current.rotation.x = Math.sin(t * speed * 0.61) * amplitude * 0.08;
  });
}

/**
 * A run of interlocking links following a catenary, which is the curve a chain
 * actually hangs in. Built once into an instanced mesh: 100-odd links is one
 * draw call this way and 100 the obvious way.
 *
 * Every other link is rolled 90 degrees about the direction of travel, which
 * is the whole visual difference between a chain and a string of rings.
 */
export function Chain({
  halfWidth = 5,
  sag = 9,
  y = 0,
  linkRadius = 0.062,
  tube = 0.016,
  step = 0.09,
  metal = 'gold',
}: {
  halfWidth?: number;
  /** Catenary constant. Larger is flatter through the middle. */
  sag?: number;
  /** World y of the low point of the curve. */
  y?: number;
  linkRadius?: number;
  tube?: number;
  /** Arc distance between link centres. */
  step?: number;
  metal?: 'gold' | 'silver';
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  const links = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const x = -halfWidth + (2 * halfWidth * i) / 160;
      points.push(new THREE.Vector3(x, y + sag * (Math.cosh(x / sag) - 1), 0));
    }
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0);
    const count = Math.max(2, Math.floor(curve.getLength() / step));

    const axis = new THREE.Vector3(1, 0, 0);
    const roll = new THREE.Quaternion().setFromAxisAngle(axis, Math.PI / 2);
    const scale = new THREE.Vector3(1.5, 1, 1);
    const quaternion = new THREE.Quaternion();

    const matrices: THREE.Matrix4[] = [];
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const position = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      quaternion.setFromUnitVectors(axis, tangent);
      // Post-multiplying rolls about the link's own long axis, which is the
      // tangent, so alternating links interlock instead of stacking flat.
      if (i % 2 === 1) quaternion.multiply(roll);
      matrices.push(new THREE.Matrix4().compose(position, quaternion, scale));
    }
    return matrices;
  }, [halfWidth, sag, y, step]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    links.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [links]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, links.length]} frustumCulled={false}>
      <torusGeometry args={[linkRadius, tube, 8, 16]} />
      {metal === 'gold' ? <GoldMaterial roughness={0.24} /> : <SilverMaterial roughness={0.3} />}
    </instancedMesh>
  );
}
