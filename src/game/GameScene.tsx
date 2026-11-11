import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Physics } from '@react-three/rapier';
import { Player } from './Player';
import { World } from './World';
import { useGameStore } from './gameStore';

export function GameScene() {
  const phase = useGameStore((state) => state.phase);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 6, 9], fov: 48, near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      fallback={<div className="webgl-fallback">Este navegador não conseguiu iniciar o WebGL.</div>}
    >
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} paused={phase !== 'playing'} timeStep="vary">
          <World />
          <Player />
        </Physics>
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.72} intensity={0.65} mipmapBlur />
          <Vignette offset={0.25} darkness={0.7} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
