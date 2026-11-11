import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BallCollider, CuboidCollider, RigidBody } from '@react-three/rapier';
import type { Group, Mesh } from 'three';
import { PICKUP_POSITIONS } from './config';
import { playPickupSound } from './audio';
import { useGameStore } from './gameStore';

const wallMaterial = '#273639';
const obstacleMaterial = '#596866';

function Block({
  position,
  size,
  color = obstacleMaterial,
  emissive,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  emissive?: string;
}) {
  const isLong = size[0] > size[2];
  const stripePosition: [number, number, number] = isLong
    ? [0, -size[1] * 0.22, -Math.sign(position[2]) * (size[2] / 2 + 0.014)]
    : [-Math.sign(position[0]) * (size[0] / 2 + 0.014), -size[1] * 0.22, 0];
  const stripeSize: [number, number, number] = isLong
    ? [size[0] * 0.88, 0.045, 0.024]
    : [0.024, 0.045, size[2] * 0.88];

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
          <meshStandardMaterial color={color} roughness={0.42} metalness={0.72} />
      </mesh>
      {emissive && (
        <mesh position={stripePosition}>
          <boxGeometry args={stripeSize} />
          <meshBasicMaterial color={emissive} toneMapped={false} />
        </mesh>
      )}
    </RigidBody>
  );
}

function CargoPod({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  const frontZ = size[2] / 2 + 0.018;
  const railX = size[0] / 2 - 0.07;
  const railHeight = size[1] * 0.88;

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.46} metalness={0.68} />
      </mesh>
      <mesh position={[0, size[1] / 2 + 0.025, 0]}>
        <boxGeometry args={[size[0] * 0.84, 0.05, size[2] * 0.84]} />
        <meshStandardMaterial color="#89938a" roughness={0.4} metalness={0.82} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} castShadow position={[side * railX, 0, frontZ]}>
          <boxGeometry args={[0.075, railHeight, 0.06]} />
          <meshStandardMaterial color="#a3a99b" roughness={0.38} metalness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, size[1] * 0.14, frontZ + 0.004]}>
        <boxGeometry args={[size[0] * 0.54, size[1] * 0.36, 0.035]} />
        <meshStandardMaterial color="#1c2829" roughness={0.34} metalness={0.74} />
      </mesh>
      <mesh position={[0, -size[1] * 0.28, frontZ + 0.03]}>
        <boxGeometry args={[size[0] * 0.48, 0.055, 0.025]} />
        <meshBasicMaterial color="#f2a74e" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -frontZ]}>
        <boxGeometry args={[size[0] * 0.48, 0.055, 0.025]} />
        <meshBasicMaterial color="#f2a74e" toneMapped={false} />
      </mesh>
    </RigidBody>
  );
}

function FloorPanels() {
  const tileColors = ['#344246', '#2e3b3e', '#394548', '#303c3f'];

  return (
    <group>
      {Array.from({ length: 7 }, (_, row) => Array.from({ length: 7 }, (_, column) => {
        const x = (column - 3) * 3;
        const z = (row - 3) * 3;
        const tileColor = tileColors[(row * 3 + column) % tileColors.length];
        return (
          <group key={`${row}-${column}`} position={[x, 0.2, z]}>
            <mesh receiveShadow>
              <boxGeometry args={[2.88, 0.035, 2.88]} />
              <meshStandardMaterial color={tileColor} roughness={0.46} metalness={0.58} />
            </mesh>
            <mesh position={[-1.05, 0.02, -1.05]}>
              <boxGeometry args={[0.32, 0.009, 0.035]} />
              <meshBasicMaterial color={(row + column) % 4 === 0 ? '#b88448' : '#71827d'} />
            </mesh>
          </group>
        );
      }))}
    </group>
  );
}

function HangarGate() {
  return (
    <group position={[0, 0, -10.52]}>
      <mesh castShadow position={[0, 1.72, -0.1]}>
        <boxGeometry args={[4.45, 3.58, 0.3]} />
        <meshStandardMaterial color="#344447" roughness={0.36} metalness={0.82} />
      </mesh>
      <mesh position={[0, 1.46, 0.075]}>
        <boxGeometry args={[3.18, 2.96, 0.06]} />
        <meshBasicMaterial color="#101a1d" />
      </mesh>
      <mesh position={[0, 1.55, 0.13]}>
        <torusGeometry args={[1.38, 0.12, 12, 48]} />
        <meshStandardMaterial color="#768781" roughness={0.24} metalness={0.9} />
      </mesh>
      <mesh position={[0, 1.55, 0.16]}>
        <torusGeometry args={[1.14, 0.027, 8, 48]} />
        <meshBasicMaterial color="#5ce3cc" toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.55, 0.17]}>
        <torusGeometry args={[1.62, 0.025, 8, 48]} />
        <meshBasicMaterial color="#e0a653" toneMapped={false} />
      </mesh>
      <mesh position={[0, 3.53, 0.08]}>
        <boxGeometry args={[3.25, 0.065, 0.045]} />
        <meshBasicMaterial color="#5ce3cc" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.8, 1]} color="#43c9b5" intensity={18} distance={8} />
    </group>
  );
}

function HangarRibs() {
  return (
    <>
      {[-8, -5, 5, 8].map((x) => (
        <mesh key={x} castShadow position={[x, 0.88, -10.65]}>
          <boxGeometry args={[0.16, 1.58, 0.18]} />
          <meshStandardMaterial color="#667570" roughness={0.34} metalness={0.84} />
        </mesh>
      ))}
      <mesh rotation={[0, 0, 0]} position={[0, 0.02, -9.5]}>
        <torusGeometry args={[10.2, 0.12, 8, 64, Math.PI]} />
        <meshStandardMaterial color="#53615d" roughness={0.32} metalness={0.88} />
      </mesh>
      <mesh position={[-10.15, 5.2, -9.5]}>
        <boxGeometry args={[0.13, 0.16, 0.18]} />
        <meshBasicMaterial color="#efaa50" toneMapped={false} />
      </mesh>
      <mesh position={[10.15, 5.2, -9.5]}>
        <boxGeometry args={[0.13, 0.16, 0.18]} />
        <meshBasicMaterial color="#efaa50" toneMapped={false} />
      </mesh>
    </>
  );
}

function Floor() {
  return (
    <RigidBody type="fixed" colliders={false} position={[0, -0.18, 0]}>
      <CuboidCollider args={[11, 0.18, 11]} friction={1.1} />
      <mesh receiveShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[22, 0.2, 22]} />
        <meshStandardMaterial color="#263438" roughness={0.78} metalness={0.38} />
      </mesh>
      <FloorPanels />
    </RigidBody>
  );
}

function Pickup({ id, position }: { id: number; position: [number, number, number] }) {
  const group = useRef<Group>(null);
  const collected = useGameStore((state) => state.collected.includes(id));
  const collect = useGameStore((state) => state.collect);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 1.3;
    group.current.position.y = Math.sin(clock.elapsedTime * 2.4 + id) * 0.11;
  });

  if (collected) return null;

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <BallCollider
        args={[0.78]}
        sensor
        onIntersectionEnter={() => {
          collect(id);
          playPickupSound();
        }}
      />
      <group ref={group}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.34, 1]} />
          <meshStandardMaterial color="#f7bd63" emissive="#ff8d32" emissiveIntensity={2.6} roughness={0.2} metalness={0.18} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.54, 0.035, 8, 32]} />
          <meshBasicMaterial color="#70f1db" />
        </mesh>
        <pointLight color="#ffb14d" intensity={1.8} distance={3.5} />
      </group>
    </RigidBody>
  );
}

function LandingMark({ position }: { position: [number, number, number] }) {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.2 + position[0]) * 0.035);
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.025, position[2]]}>
      <ringGeometry args={[0.65, 0.69, 32]} />
      <meshBasicMaterial color="#d68f43" transparent opacity={0.5} />
    </mesh>
  );
}

export function World() {
  return (
    <>
      <color attach="background" args={['#101719']} />
      <fog attach="fog" args={['#101719', 20, 42]} />
      <ambientLight intensity={0.8} color="#c3d7cb" />
      <hemisphereLight args={['#d7e9d8', '#34342b', 1.35]} />
      <directionalLight
        castShadow
        position={[-6, 12, 5]}
        intensity={2.8}
        color="#ffd8a1"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <pointLight position={[-7, 3.6, -6]} intensity={25} distance={10} color="#50d5c2" />
      <pointLight position={[7, 3.6, -6]} intensity={20} distance={10} color="#e4a654" />
      <pointLight position={[0, 3.4, 5]} intensity={12} distance={10} color="#63a99c" />
      <Floor />
      <HangarRibs />
      <HangarGate />

      <Block position={[0, 0.82, -11]} size={[22, 1.8, 0.5]} color={wallMaterial} emissive="#41cfbd" />
      <Block position={[0, 0.82, 11]} size={[22, 1.8, 0.5]} color={wallMaterial} emissive="#cb8b43" />
      <Block position={[-11, 0.82, 0]} size={[0.5, 1.8, 22]} color={wallMaterial} />
      <Block position={[11, 0.82, 0]} size={[0.5, 1.8, 22]} color={wallMaterial} />

      <CargoPod position={[-3.4, 0.72, -2.8]} size={[1.5, 1.4, 1.5]} color="#59665e" />
      <CargoPod position={[3.3, 0.55, -1.6]} size={[2.1, 1.1, 1.1]} color="#625742" />
      <CargoPod position={[-3.6, 0.5, 3.3]} size={[1.2, 1, 2.1]} color="#405458" />
      <CargoPod position={[3.8, 0.72, 3.1]} size={[1.5, 1.4, 1.5]} color="#59665e" />

      {PICKUP_POSITIONS.map((position, id) => (
        <group key={id}>
          <LandingMark position={position} />
          <Pickup id={id} position={position} />
        </group>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]}>
        <circleGeometry args={[1.35, 48]} />
        <meshBasicMaterial color="#52c7b1" transparent opacity={0.08} />
      </mesh>
    </>
  );
}
