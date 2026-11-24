import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { MathUtils, Vector3 } from 'three';
import { GAME_CONFIG } from './config';
import { useGameStore } from './gameStore';
import {
  CharacterRig,
  createCharacterAnimationState,
  createCharacterRigRefs,
  updateCharacterAnimation,
  type CharacterAnimationState,
  type CharacterRigRefs,
} from './CharacterRig';

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
  const rigRefsRef = useRef<CharacterRigRefs | null>(null);
  if (!rigRefsRef.current) rigRefsRef.current = createCharacterRigRefs();
  const rigRefs = rigRefsRef.current;
  const animationStateRef = useRef<CharacterAnimationState | null>(null);
  if (!animationStateRef.current) animationStateRef.current = createCharacterAnimationState();
  const animationState = animationStateRef.current;
  const jumpQueued = useRef(false);
  const gamepadJumpWasPressed = useRef(false);
  const wasGrounded = useRef(true);
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
    const nextVelocityX = velocity.x + (direction.x * GAME_CONFIG.playerSpeed - velocity.x) * blend;
    const nextVelocityZ = velocity.z + (direction.z * GAME_CONFIG.playerSpeed - velocity.z) * blend;
    rigidBody.setLinvel({
      x: nextVelocityX,
      y: velocity.y,
      z: nextVelocityZ,
    }, true);

    if (active && (jumpQueued.current || virtualJumpQueued)) {
      if (position.y < 0.96) rigidBody.applyImpulse({ x: 0, y: GAME_CONFIG.playerJumpImpulse, z: 0 }, true);
      jumpQueued.current = false;
      virtualJumpQueued = false;
    }

    let turn = 0;
    const avatar = rigRefs.avatar.current;
    if (avatar && direction.lengthSq() > 0.01) {
      const targetRotation = Math.atan2(direction.x, direction.z);
      const rotationDelta = Math.atan2(
        Math.sin(targetRotation - avatar.rotation.y),
        Math.cos(targetRotation - avatar.rotation.y),
      );
      avatar.rotation.y += rotationDelta * Math.min(1, delta * 12);
      turn = MathUtils.clamp(rotationDelta / Math.max(delta, 0.001), -5, 5);
    }

    const grounded = position.y <= 0.96 && velocity.y <= 0.25;
    const landed = grounded && !wasGrounded.current;
    wasGrounded.current = grounded;
    updateCharacterAnimation(rigRefs, animationState, {
      speed: active ? Math.hypot(nextVelocityX, nextVelocityZ) : 0,
      verticalSpeed: active ? velocity.y : 0,
      grounded: active ? grounded : true,
      landed: active && landed,
      turn,
    }, delta);

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
      <group ref={rigRefs.avatar} position={[0, -0.12, 0]}>
        <CharacterRig refs={rigRefs} />
      </group>
    </RigidBody>
  );
}
