'use client';

/**
 * The plain strand, for the two products that are only a strand: the gemstone
 * one and the freshwater pearl one.
 *
 * It takes the same inputs the configurator collects, so a product page can
 * drive it from the buyer's current selection and show the piece changing
 * rather than swapping between photographs. Stone and pearl are genuinely
 * different materials and not two colours of one, which is why `finish` picks
 * the shader rather than just the tint: a pearl without the interference layer
 * on it is a white bead, and a stone with one is a soap bubble.
 *
 * Client-only. Import through components/piece-3d, never from a page.
 */

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  BenchEnvironment,
  FitToViewport,
  GoldMaterial,
  NacreMaterial,
  Strand,
  catenary,
  useIdleTurn,
  usePalette,
  type Finish,
} from './jewelry-3d';

/**
 * The gemstone choices the catalog offers, keyed by the exact strings in its
 * `stone` list. Aventurine is the product swatch and onyx is the ink token;
 * the rest are the stones themselves, which are what they are.
 */
export const STONE_COLORS: Record<string, string> = {
  'Green aventurine': '#729981',
  'Black onyx': '#3a3033',
  'Pink rhodonite': '#c98a92',
  Amazonite: '#87b3ae',
  'Turquoise heishi': '#5fa6a4',
};

export const DEFAULT_STONE = 'Green aventurine';

const DESIGN_W = 4.4;
const DESIGN_H = 1.0;
// Below the origin by half the sag the frame actually shows, so the curve sits
// centred rather than riding the top of the canvas.
const STRAND_Y = -0.19;
const SAG = 9;
const BEAD_R = 0.055;

/** Where the accent beads fall along the strand, as a fraction from centre. */
const ACCENT_OFFSETS = [-1, -0.62, -0.3, 0.3, 0.62, 1];

/**
 * The pearl-and-gold accent add-on, rendered so the option can be seen rather
 * than only read. Spaced out from the centre rather than evenly across the
 * whole strand, because that is where they land on the piece: the front is
 * what shows above a collar.
 */
function Accents({ opacity }: { opacity: number }) {
  return (
    <>
      {ACCENT_OFFSETS.map((offset, i) => {
        const x = offset * 1.15;
        const y = catenary(x, SAG, STRAND_Y);
        const gold = i % 2 === 1;
        return (
          <mesh key={offset} position={[x, y, 0]} scale={gold ? BEAD_R * 1.05 : BEAD_R * 1.25}>
            <sphereGeometry args={[1, 16, 12]} />
            {gold ? (
              <GoldMaterial roughness={0.16} opacity={opacity} />
            ) : (
              <NacreMaterial opacity={opacity} />
            )}
          </mesh>
        );
      })}
    </>
  );
}

function Piece({
  color,
  finish,
  accents,
  animate,
  opacity,
  onReady,
}: {
  color: string;
  finish: Finish;
  accents: boolean;
  animate: boolean;
  opacity: number;
  onReady?: () => void;
}) {
  const sway = useRef<THREE.Group>(null);
  useIdleTurn(sway, { enabled: animate, amplitude: 0.16, speed: 0.26 });

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <FitToViewport width={DESIGN_W} height={DESIGN_H}>
      <group ref={sway}>
        <Strand
          y={STRAND_Y}
          sag={SAG}
          halfWidth={DESIGN_W * 1.1}
          radius={BEAD_R}
          pitch={0.114}
          color={color}
          finish={finish}
          opacity={opacity}
        />
        {accents ? <Accents opacity={opacity} /> : null}
      </group>
    </FitToViewport>
  );
}

export default function Strand3D({
  stone = DEFAULT_STONE,
  finish = 'stone',
  accents = false,
  animate,
  muted = false,
  onReady,
}: {
  /** One of the catalog's `stone` choices. Ignored when finish is 'pearl'. */
  stone?: string;
  finish?: Finish;
  /** Mirrors the pearl-and-gold accent add-on. */
  accents?: boolean;
  animate: boolean;
  muted?: boolean;
  onReady?: () => void;
}) {
  const palette = usePalette();
  const color = finish === 'pearl' ? palette.paper : (STONE_COLORS[stone] ?? STONE_COLORS[DEFAULT_STONE]);

  return (
    <Canvas
      frameloop={animate ? 'always' : 'demand'}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 7], fov: 26 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <BenchEnvironment />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 6]} intensity={1.2} />
      <Piece
        color={color}
        finish={finish}
        accents={accents}
        animate={animate}
        opacity={muted ? 0.42 : 1}
        onReady={onReady}
      />
    </Canvas>
  );
}
