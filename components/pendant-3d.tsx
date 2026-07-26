'use client';

/**
 * The birthstone pendant as an object: a brushed sterling disc on a bail, with
 * one bezel-set stone per person on it.
 *
 * The disc widens with the count, which is the same rule the copy states and
 * the same rule the flat version follows. It is the detail that makes the
 * add-on legible before anyone reads the price: order a fourth stone and the
 * piece visibly grows to hold it.
 *
 * Same room and same materials as the name necklace, so the two pieces look
 * like they came off one bench. The metal is the difference, not the lighting.
 *
 * Client-only. Import through components/piece-3d, never from a page.
 */

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  BenchEnvironment,
  Chain,
  FitToViewport,
  SilverMaterial,
  StoneMaterial,
  useIdleTurn,
} from './jewelry-3d';

const DESIGN_W = 5.2;
const DESIGN_H = 2.6;
const CLASP_Y = 0.95;

const DISC_DEPTH = 0.055;
const STONE_SPACING = 0.2;
const STONE_RADIUS = 0.078;
const BEZEL_RADIUS = 0.09;

/** Nine stones is where a row stops reading as a row. */
const MAX_STONES = 9;

function discRadius(stones: number) {
  // Wide enough to hold the row with a margin of metal either side, and never
  // narrower than a single-stone disc looks right at.
  return Math.max(0.62, ((stones - 1) * STONE_SPACING) / 2 + 0.36);
}

function Piece({
  stones,
  animate,
  onReady,
}: {
  stones: number;
  animate: boolean;
  onReady?: () => void;
}) {
  const pivot = useRef<THREE.Group>(null);
  useIdleTurn(pivot, { enabled: animate, amplitude: 0.4, speed: 0.34 });

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  const count = Math.max(1, Math.min(Math.round(stones), MAX_STONES));
  const radius = discRadius(count);
  const firstX = -((count - 1) * STONE_SPACING) / 2;
  const face = DISC_DEPTH / 2;

  return (
    <FitToViewport width={DESIGN_W} height={DESIGN_H}>
      <Chain y={CLASP_Y} halfWidth={5} sag={9} metal="silver" />

      {/* The bail stays threaded on the chain. The disc swivels below it,
          which is what a pendant actually does. */}
      <mesh position={[0, CLASP_Y, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.085, 0.02, 10, 28]} />
        <SilverMaterial roughness={0.22} anisotropy={0} />
      </mesh>

      <group ref={pivot} position={[0, CLASP_Y - 0.075, 0]}>
        <group position={[0, -radius, 0]}>
          {/* Disc face. Brushed, so it holds a smear of light rather than a
              mirror of the room. */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[radius, radius, DISC_DEPTH, 72]} />
            <SilverMaterial />
          </mesh>
          {/* Rounded edge. A flat-sawn rim goes dead at every angle; this is
              the line of light that runs around the piece as it turns. */}
          <mesh>
            <torusGeometry args={[radius, DISC_DEPTH / 2, 10, 80]} />
            <SilverMaterial roughness={0.2} anisotropy={0} />
          </mesh>

          {Array.from({ length: count }, (_, i) => (
            <group key={i} position={[firstX + i * STONE_SPACING, 0, 0]}>
              {/* Bezel: a collar of metal pushed over the girdle of the stone,
                  which is why it sits proud of the face. Open-ended, because
                  the stone is what closes it. */}
              <mesh position={[0, 0, face - 0.012]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[BEZEL_RADIUS, BEZEL_RADIUS, 0.055, 28, 1, true]} />
                <SilverMaterial roughness={0.18} anisotropy={0} />
              </mesh>
              {/* The stone. Flat-shaded facets on a low-poly solid, each one
                  catching a different part of the room. That scatter is the
                  read; a smooth sphere here would look like a bead. */}
              <mesh position={[0, 0, face + 0.01]} scale={[1, 1, 0.62]}>
                <dodecahedronGeometry args={[STONE_RADIUS, 0]} />
                <StoneMaterial />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </FitToViewport>
  );
}

export default function Pendant3D({
  stones = 3,
  animate,
  onReady,
}: {
  /** One per person on the piece. The disc grows to hold them. */
  stones?: number;
  animate: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      frameloop={animate ? 'always' : 'demand'}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 7], fov: 26 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <BenchEnvironment />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 6]} intensity={1.1} />
      <Piece stones={stones} animate={animate} onReady={onReady} />
    </Canvas>
  );
}
