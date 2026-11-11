import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { Vector3, type Group } from 'three';
import { GAME_CONFIG } from './config';
import { useGameStore } from './gameStore';

const heldKeys = new Set<string>();
let virtualJumpQueued = false;
const GAMEPAD_DEADZONE = 0.18;

function applyGamepadDeadzone(value: number): number {
  const magnitude = Math.abs(value);
  if (magnitude < GAMEPAD_DEADZONE) return 0;
  return Math.sign(value) * (magnitude - GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE);
}

export function setVirtualKey(code: string, pressed: boolean): void {
  if (pressed) heldKeys.add(code);
  else heldKeys.delete(code);
  if (code === 'Space' && pressed) virtualJumpQueued = true;
}

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const avatar = useRef<Group>(null);
  const jumpQueued = useRef(false);
  const gamepadJumpWasPressed = useRef(false);
  const phase = useGameStore((state) => state.phase);
  const collectedCount = useGameStore((state) => state.collected.length);
  const previousCount = useRef(collectedCount);
  const moveDirection = useRef(new Vector3());
  const desiredCamera = useRef(new Vector3());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      heldKeys.add(event.code);
      if (event.code === 'Space') {
        event.preventDefault();
        jumpQueued.current = true;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => heldKeys.delete(event.code);
    const clearKeys = () => {
      heldKeys.clear();
      jumpQueued.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  useFrame(({ camera }, delta) => {
    const rigidBody = body.current;
    if (!rigidBody) return;

    const position = rigidBody.translation();
    const active = phase === 'playing';
    const gamepad = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
      ? Array.from(navigator.getGamepads()).find((pad) => pad?.connected)
      : undefined;
    const gamepadX = applyGamepadDeadzone(gamepad?.axes[0] ?? 0);
    const gamepadZ = applyGamepadDeadzone(gamepad?.axes[1] ?? 0);
    const dpadX = Number(Boolean(gamepad?.buttons[15]?.pressed)) - Number(Boolean(gamepad?.buttons[14]?.pressed));
    const dpadZ = Number(Boolean(gamepad?.buttons[13]?.pressed)) - Number(Boolean(gamepad?.buttons[12]?.pressed));
    const x = Number(heldKeys.has('KeyD') || heldKeys.has('ArrowRight')) - Number(heldKeys.has('KeyA') || heldKeys.has('ArrowLeft')) + gamepadX + dpadX;
    const z = Number(heldKeys.has('KeyS') || heldKeys.has('ArrowDown')) - Number(heldKeys.has('KeyW') || heldKeys.has('ArrowUp')) + gamepadZ + dpadZ;
    const direction = moveDirection.current.set(x, 0, z);

    if (!active) direction.set(0, 0, 0);
    else if (direction.lengthSq() > 1) direction.normalize();

    const gamepadJumpPressed = Boolean(gamepad?.buttons[0]?.pressed);
    if (active && gamepadJumpPressed && !gamepadJumpWasPressed.current) jumpQueued.current = true;
    gamepadJumpWasPressed.current = gamepadJumpPressed;

    const velocity = rigidBody.linvel();
    const blend = 1 - Math.exp(-GAME_CONFIG.playerAcceleration * delta);
    rigidBody.setLinvel({
      x: velocity.x + (direction.x * GAME_CONFIG.playerSpeed - velocity.x) * blend,
      y: velocity.y,
      z: velocity.z + (direction.z * GAME_CONFIG.playerSpeed - velocity.z) * blend,
    }, true);

    if (active && (jumpQueued.current || virtualJumpQueued)) {
      if (position.y < 0.96) rigidBody.applyImpulse({ x: 0, y: GAME_CONFIG.playerJumpImpulse, z: 0 }, true);
      jumpQueued.current = false;
      virtualJumpQueued = false;
    }

    if (avatar.current && direction.lengthSq() > 0.01) {
      const targetRotation = Math.atan2(direction.x, direction.z);
      const rotationDelta = Math.atan2(
        Math.sin(targetRotation - avatar.current.rotation.y),
        Math.cos(targetRotation - avatar.current.rotation.y),
      );
      avatar.current.rotation.y += rotationDelta * Math.min(1, delta * 12);
    }

    if (collectedCount !== previousCount.current) {
      previousCount.current = collectedCount;
      camera.position.x += 0.14;
    }

    const cameraTarget = desiredCamera.current.set(position.x, position.y + GAME_CONFIG.cameraHeight, position.z + GAME_CONFIG.cameraDistance);
    camera.position.lerp(cameraTarget, 1 - Math.exp(-5 * delta));
    camera.lookAt(position.x, position.y + 0.45, position.z - 0.6);
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={[0, 0.82, 0]}
      enabledRotations={[false, false, false]}
      linearDamping={0.8}
      angularDamping={1}
      ccd
    >
      <CapsuleCollider args={[0.42, 0.34]} />
      <group ref={avatar} position={[0, -0.12, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
          <capsuleGeometry args={[0.29, 0.4, 8, 14]} />
          <meshStandardMaterial color="#d2ddd1" roughness={0.34} metalness={0.3} />
        </mesh>
        <mesh castShadow position={[0, 0.64, 0]}>
          <sphereGeometry args={[0.23, 24, 18]} />
          <meshStandardMaterial color="#e5e9d9" roughness={0.25} metalness={0.24} />
        </mesh>
        <mesh position={[0, 0.63, 0.195]}>
          <sphereGeometry args={[0.2, 20, 12]} />
          <meshStandardMaterial color="#203538" roughness={0.18} metalness={0.72} />
        </mesh>
        <mesh position={[0, 0.64, 0.235]}>
          <boxGeometry args={[0.2, 0.018, 0.018]} />
          <meshBasicMaterial color="#66e7cf" toneMapped={false} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh castShadow position={[side * 0.23, 0.64, 0]}>
              <sphereGeometry args={[0.055, 12, 10]} />
              <meshStandardMaterial color="#bf8a48" roughness={0.3} metalness={0.75} />
            </mesh>
            <mesh castShadow position={[side * 0.35, 0.24, 0]}>
              <sphereGeometry args={[0.17, 16, 12]} />
              <meshStandardMaterial color="#526360" roughness={0.36} metalness={0.72} />
            </mesh>
            <mesh castShadow position={[side * 0.39, -0.03, 0.025]} rotation={[0, 0, side * 0.08]}>
              <capsuleGeometry args={[0.105, 0.28, 5, 10]} />
              <meshStandardMaterial color="#c5d0c7" roughness={0.38} metalness={0.3} />
            </mesh>
            <mesh castShadow position={[side * 0.4, -0.27, 0.05]}>
              <sphereGeometry args={[0.105, 14, 10]} />
              <meshStandardMaterial color="#384847" roughness={0.42} metalness={0.66} />
            </mesh>
            <mesh castShadow position={[side * 0.14, -0.38, 0]}>
              <capsuleGeometry args={[0.105, 0.22, 5, 10]} />
              <meshStandardMaterial color="#87968b" roughness={0.43} metalness={0.38} />
            </mesh>
            <mesh castShadow position={[side * 0.14, -0.53, 0.055]}>
              <boxGeometry args={[0.24, 0.13, 0.34]} />
              <meshStandardMaterial color="#344341" roughness={0.4} metalness={0.7} />
            </mesh>
          </group>
        ))}
        <mesh castShadow position={[0, 0.22, 0.29]}>
          <boxGeometry args={[0.31, 0.3, 0.065]} />
          <meshStandardMaterial color="#425451" roughness={0.28} metalness={0.66} />
        </mesh>
        <mesh position={[0, 0.25, 0.33]}>
          <boxGeometry args={[0.19, 0.045, 0.015]} />
          <meshBasicMaterial color="#ffb34e" toneMapped={false} />
        </mesh>
        <mesh castShadow position={[0, 0.04, -0.29]}>
          <boxGeometry args={[0.38, 0.46, 0.2]} />
          <meshStandardMaterial color="#44534f" roughness={0.4} metalness={0.72} />
        </mesh>
        <mesh position={[0, 0.07, -0.397]}>
          <boxGeometry args={[0.21, 0.22, 0.018]} />
          <meshBasicMaterial color="#d89b50" toneMapped={false} />
        </mesh>
        <mesh castShadow position={[0, -0.24, 0]}>
          <cylinderGeometry args={[0.33, 0.31, 0.12, 20]} />
          <meshStandardMaterial color="#344746" roughness={0.4} metalness={0.75} />
        </mesh>
        <pointLight color="#ffb34e" intensity={0.8} distance={2.2} position={[0, 0.46, 0.38]} />
      </group>
    </RigidBody>
  );
}
