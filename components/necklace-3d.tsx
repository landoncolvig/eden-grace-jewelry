'use client';

/**
 * The name necklace as an actual object.
 *
 * The flat version of this hero showed the buyer their word set in a script
 * face. This one shows them the piece: the same word extruded and bevelled
 * into 14k gold fill, hung off a chain of interlocking links, turning slowly
 * enough that the rim lights walk across the letterforms. What sells a name
 * necklace is the metal catching light on a filed edge, and that is the one
 * thing flat type cannot do.
 *
 * Client-only by construction. There is no server-side WebGL, so this module
 * must never be imported directly by a page. Go through components/piece-3d.
 */

import * as THREE from 'three';
import { Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Text3D, useFont } from '@react-three/drei';
import { BenchEnvironment, Chain, FitToViewport, GoldMaterial, useIdleTurn } from './jewelry-3d';

/**
 * Pinyon Script, converted to three's typeface JSON by scripts/make-typeface.
 * Served from /public rather than bundled: it is 200 KB of outline data that
 * would otherwise sit inside a JS chunk the parser has to walk.
 */
const FONT = '/fonts/pinyon-script.typeface.json';

// Kick the fetch off as soon as this chunk lands so the font and the rest of
// the scene are not two round trips in sequence.
useFont.preload(FONT);

// Design space. The scene is authored against this box and then fitted to
// whatever the canvas turns out to be, so the numbers below never have to know
// about breakpoints.
const DESIGN_W = 5.2;
const DESIGN_H = 2.7;
const CLASP_Y = 0.9;
const HANG_Y = 0.8;

// How much room the word gets. The height cap is what stops a two-letter name
// from rendering at billboard size, the width cap is what keeps a twelve-letter
// one inside the frame.
const WORD_W = 3.7;
const WORD_H = 1.4;
const WORD_MAX_SCALE = 1.3;

function Piece({
  word,
  muted,
  animate,
  onReady,
}: {
  word: string;
  muted: boolean;
  animate: boolean;
  onReady?: () => void;
}) {
  const pivot = useRef<THREE.Group>(null);
  const fit = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  useIdleTurn(pivot, { enabled: animate });

  // Size and hang the word off its own measurements rather than off character
  // count. A script face varies enough between letters that counting them gets
  // "Wm" and "iiii" badly wrong.
  useLayoutEffect(() => {
    const target = mesh.current;
    const group = fit.current;
    if (!target || !group) return;

    target.geometry.computeBoundingBox();
    const box = target.geometry.boundingBox;
    if (!box) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = Math.min(WORD_W / size.x, WORD_H / size.y, WORD_MAX_SCALE);

    // Centre the glyph run on its own bounding box, then drop the group so the
    // top edge of the word sits just under the jump ring. The pivot stays at
    // the ring, which is where a pendant actually turns from.
    target.position.set(-center.x, -center.y, -center.z);
    group.scale.setScalar(scale);
    group.position.y = -0.06 - (size.y * scale) / 2;

    invalidate();
  }, [word, invalidate]);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <FitToViewport width={DESIGN_W} height={DESIGN_H}>
      <Chain y={CLASP_Y} halfWidth={5} sag={9} />

      {/* Clasp ring at the low point of the chain, and the jump ring through
          it that the word hangs from. The jump ring turns with the piece. */}
      <mesh position={[0, CLASP_Y, 0]}>
        <torusGeometry args={[0.085, 0.018, 10, 28]} />
        <GoldMaterial roughness={0.2} />
      </mesh>

      <group ref={pivot} position={[0, HANG_Y, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.072, 0.016, 10, 28]} />
          <GoldMaterial roughness={0.2} />
        </mesh>

        <group ref={fit}>
          <Text3D
            ref={mesh}
            font={FONT}
            size={1}
            height={0.2}
            curveSegments={4}
            bevelEnabled
            bevelThickness={0.022}
            bevelSize={0.016}
            bevelOffset={0}
            bevelSegments={2}
          >
            {word}
            {/* An unset name is shown as a ghost of the piece, the same way the
                flat version dims it, so a placeholder never reads as an order. */}
            <GoldMaterial opacity={muted ? 0.4 : 1} />
          </Text3D>
        </group>
      </group>
    </FitToViewport>
  );
}

export default function Necklace3D({
  word,
  muted,
  animate,
  onReady,
}: {
  word: string;
  muted: boolean;
  animate: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      // Demand rendering when the idle turn is off: with nothing moving, a
      // continuous 60fps loop is pure battery for an identical picture.
      frameloop={animate ? 'always' : 'demand'}
      // Retina is worth paying for on a bevelled edge. Anything past 2x is not.
      dpr={[1, 2]}
      camera={{ position: [0, 0, 7], fov: 26 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <BenchEnvironment />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 6]} intensity={1.1} />
      <Suspense fallback={null}>
        <Piece word={word} muted={muted} animate={animate} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
