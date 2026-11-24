import { createRef, type RefObject } from 'react';
import { Euler, MathUtils, Quaternion, type Group } from 'three';
import { GAME_CONFIG } from './config';

type RigRef = RefObject<Group | null>;

export type CharacterRigRefs = {
  avatar: RigRef;
  torso: RigRef;
  head: RigRef;
  leftShoulder: RigRef;
  rightShoulder: RigRef;
  leftElbow: RigRef;
  rightElbow: RigRef;
  leftHand: RigRef;
  rightHand: RigRef;
  leftHip: RigRef;
  rightHip: RigRef;
  leftFoot: RigRef;
  rightFoot: RigRef;
};

export type CharacterMotion = {
  speed: number;
  verticalSpeed: number;
  grounded: boolean;
  landed: boolean;
  turn: number;
};

export type CharacterAnimationState = {
  idleTime: number;
  gaitPhase: number;
  gaitWeight: number;
  landingWeight: number;
};

export function createCharacterAnimationState(): CharacterAnimationState {
  return { idleTime: 0, gaitPhase: 0, gaitWeight: 0, landingWeight: 0 };
}

export function createCharacterRigRefs(): CharacterRigRefs {
  return {
    avatar: createRef<Group>(),
    torso: createRef<Group>(),
    head: createRef<Group>(),
    leftShoulder: createRef<Group>(),
    rightShoulder: createRef<Group>(),
    leftElbow: createRef<Group>(),
    rightElbow: createRef<Group>(),
    leftHand: createRef<Group>(),
    rightHand: createRef<Group>(),
    leftHip: createRef<Group>(),
    rightHip: createRef<Group>(),
    leftFoot: createRef<Group>(),
    rightFoot: createRef<Group>(),
  };
}

const targetEuler = new Euler();
const targetQuaternion = new Quaternion();

function slerpRotation(node: Group | null, x: number, y: number, z: number, delta: number, response = 14): void {
  if (!node) return;
  targetEuler.set(x, y, z, 'XYZ');
  targetQuaternion.setFromEuler(targetEuler);
  node.quaternion.slerp(targetQuaternion, 1 - Math.exp(-response * delta));
}

export function updateCharacterAnimation(
  refs: CharacterRigRefs,
  state: CharacterAnimationState,
  motion: CharacterMotion,
  delta: number,
): void {
  state.idleTime += delta;
  const speedRatio = MathUtils.clamp(motion.speed / GAME_CONFIG.playerSpeed, 0, 1);
  state.gaitWeight = MathUtils.damp(state.gaitWeight, speedRatio, 11, delta);
  const runWeight = MathUtils.smoothstep(speedRatio, 0.35, 0.95);
  const gaitRate = MathUtils.lerp(1.9, 2.9, runWeight);
  state.gaitPhase += motion.speed * gaitRate * delta;

  state.landingWeight = motion.landed
    ? 1
    : MathUtils.damp(state.landingWeight, 0, motion.grounded ? 10 : 4, delta);

  const jumpWeight = motion.grounded ? 0 : 1;
  const walkCycle = state.gaitPhase;
  const stride = Math.sin(walkCycle) * state.gaitWeight;
  const oppositeStride = Math.sin(walkCycle + Math.PI) * state.gaitWeight;
  const bodyBounce = Math.abs(Math.sin(walkCycle * 1.8)) * state.gaitWeight;
  const idleBreath = Math.sin(state.idleTime * 2.25);
  const leanAmount = MathUtils.clamp(motion.turn * 0.18, -0.42, 0.42);

  const torso = refs.torso.current;
  if (torso) {
    torso.position.y = MathUtils.damp(
      torso.position.y,
      0.08 + idleBreath * 0.015 + bodyBounce * 0.055 - state.landingWeight * 0.12,
      14,
      delta,
    );
  }

  slerpRotation(
    refs.torso.current,
    -0.08 * state.gaitWeight - jumpWeight * 0.2 + state.landingWeight * 0.32 + Math.sin(walkCycle) * 0.08 * state.gaitWeight,
    motion.turn * 0.08,
    leanAmount + Math.sin(walkCycle * 1.2) * 0.12 * state.gaitWeight,
    delta,
    11,
  );

  const armSwing = MathUtils.lerp(0.42, 1.25, runWeight);
  const armOpen = jumpWeight * 0.32;
  const leftArmWave = Math.sin(walkCycle + Math.PI) * armSwing * state.gaitWeight;
  const rightArmWave = Math.sin(walkCycle) * armSwing * state.gaitWeight;
  const idleArm = Math.sin(state.idleTime * 1.8) * 0.08 * (1 - state.gaitWeight);

  slerpRotation(
    refs.leftShoulder.current,
    leftArmWave - jumpWeight * 0.25 + idleArm,
    0,
    -0.24 - armOpen + leanAmount * 0.22,
    delta,
    13,
  );
  slerpRotation(
    refs.rightShoulder.current,
    rightArmWave - jumpWeight * 0.25 - idleArm,
    0,
    0.24 + armOpen - leanAmount * 0.22,
    delta,
    13,
  );
  slerpRotation(refs.leftElbow.current, 0.34 + Math.max(0, leftArmWave) * 0.72 + jumpWeight * 0.5, 0, 0.18, delta, 15);
  slerpRotation(refs.rightElbow.current, 0.34 + Math.max(0, rightArmWave) * 0.72 + jumpWeight * 0.5, 0, -0.18, delta, 15);
  slerpRotation(
    refs.leftHand.current,
    Math.sin(state.idleTime * 3.1 + 0.6) * 0.14 + leftArmWave * 0.3,
    0,
    Math.sin(state.idleTime * 2.1) * 0.1,
    delta,
    18,
  );
  slerpRotation(
    refs.rightHand.current,
    Math.sin(state.idleTime * 3.1 + 2.2) * 0.14 + rightArmWave * 0.3,
    0,
    Math.sin(state.idleTime * 2.1 + 1.1) * 0.1,
    delta,
    18,
  );

  const legSwing = MathUtils.lerp(0.45, 1.15, runWeight);
  const legLift = Math.abs(Math.cos(walkCycle)) * 0.64 * state.gaitWeight;

  slerpRotation(refs.leftHip.current, stride * legSwing - jumpWeight * 0.68 + state.landingWeight * 0.36, 0, 0.18, delta, 14);
  slerpRotation(refs.rightHip.current, oppositeStride * legSwing - jumpWeight * 0.68 + state.landingWeight * 0.36, 0, -0.18, delta, 14);
  slerpRotation(refs.leftFoot.current, -legLift * 0.92 + jumpWeight * 0.3 - state.landingWeight * 0.32, 0, 0.12, delta, 17);
  slerpRotation(refs.rightFoot.current, -legLift * 0.92 + jumpWeight * 0.3 - state.landingWeight * 0.32, 0, -0.12, delta, 17);

  const head = refs.head.current;
  if (head) {
    head.position.y = MathUtils.damp(head.position.y, 0.56 + idleBreath * 0.013 + bodyBounce * 0.025, 12, delta);
  }

  slerpRotation(
    refs.head.current,
    Math.sin(state.idleTime * 1.35) * 0.06 + jumpWeight * 0.1,
    motion.turn * 0.08 + Math.sin(state.idleTime * 0.55) * 0.08,
    -motion.turn * 0.05 + Math.sin(state.idleTime * 0.95) * 0.05,
    delta,
    9,
  );
}

export function CharacterRig({ refs }: { refs: CharacterRigRefs }) {
  return (
    <>
      <group ref={refs.torso} position={[0, 0.08, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.29, 0.4, 8, 14]} />
          <meshStandardMaterial color="#d2ddd1" roughness={0.34} metalness={0.3} />
        </mesh>
        <mesh castShadow position={[0, 0.14, 0.29]}>
          <boxGeometry args={[0.31, 0.3, 0.065]} />
          <meshStandardMaterial color="#425451" roughness={0.28} metalness={0.66} />
        </mesh>
        <mesh position={[0, 0.17, 0.33]}>
          <boxGeometry args={[0.19, 0.045, 0.015]} />
          <meshBasicMaterial color="#ffb34e" toneMapped={false} />
        </mesh>
        <mesh castShadow position={[0, -0.32, 0]}>
          <cylinderGeometry args={[0.33, 0.31, 0.12, 20]} />
          <meshStandardMaterial color="#344746" roughness={0.4} metalness={0.75} />
        </mesh>
        <mesh castShadow position={[0, -0.04, -0.29]}>
          <boxGeometry args={[0.38, 0.46, 0.2]} />
          <meshStandardMaterial color="#44534f" roughness={0.4} metalness={0.72} />
        </mesh>
        <mesh position={[0, -0.01, -0.397]}>
          <boxGeometry args={[0.21, 0.22, 0.018]} />
          <meshBasicMaterial color="#d89b50" toneMapped={false} />
        </mesh>

        {[-1, 1].map((side) => {
          const left = side === -1;
          const shoulderRef = left ? refs.leftShoulder : refs.rightShoulder;
          const elbowRef = left ? refs.leftElbow : refs.rightElbow;
          const handRef = left ? refs.leftHand : refs.rightHand;
          return (
            <group key={side} ref={shoulderRef} position={[side * 0.35, 0.16, 0]}>
              <mesh castShadow position={[0, 0, 0]}>
                <sphereGeometry args={[0.17, 16, 12]} />
                <meshStandardMaterial color="#526360" roughness={0.36} metalness={0.72} />
              </mesh>
              <mesh castShadow position={[side * 0.04, -0.27, 0.025]} rotation={[0, 0, side * 0.08]}>
                <capsuleGeometry args={[0.105, 0.28, 5, 10]} />
                <meshStandardMaterial color="#c5d0c7" roughness={0.38} metalness={0.3} />
              </mesh>
              <group ref={elbowRef} position={[side * 0.05, -0.51, 0.05]}>
                <group ref={handRef}>
                  <mesh castShadow>
                    <sphereGeometry args={[0.105, 14, 10]} />
                    <meshStandardMaterial color="#384847" roughness={0.42} metalness={0.66} />
                  </mesh>
                </group>
              </group>
            </group>
          );
        })}
      </group>

      <group ref={refs.head} position={[0, 0.56, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.23, 24, 18]} />
          <meshStandardMaterial color="#e5e9d9" roughness={0.25} metalness={0.24} />
        </mesh>
        <mesh position={[0, -0.01, 0.195]}>
          <sphereGeometry args={[0.2, 20, 12]} />
          <meshStandardMaterial color="#203538" roughness={0.18} metalness={0.72} />
        </mesh>
        <mesh position={[0, 0, 0.235]}>
          <boxGeometry args={[0.2, 0.018, 0.018]} />
          <meshBasicMaterial color="#66e7cf" toneMapped={false} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} castShadow position={[side * 0.23, 0, 0]}>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshStandardMaterial color="#bf8a48" roughness={0.3} metalness={0.75} />
          </mesh>
        ))}
      </group>

      {[-1, 1].map((side) => {
        const left = side === -1;
        const hipRef = left ? refs.leftHip : refs.rightHip;
        const footRef = left ? refs.leftFoot : refs.rightFoot;
        return (
          <group key={side} ref={hipRef} position={[side * 0.14, -0.34, 0]}>
            <mesh castShadow position={[0, -0.04, 0]}>
              <capsuleGeometry args={[0.105, 0.22, 5, 10]} />
              <meshStandardMaterial color="#87968b" roughness={0.43} metalness={0.38} />
            </mesh>
            <group ref={footRef} position={[0, -0.19, 0.055]}>
              <mesh castShadow>
                <boxGeometry args={[0.24, 0.13, 0.34]} />
                <meshStandardMaterial color="#344341" roughness={0.4} metalness={0.7} />
              </mesh>
            </group>
          </group>
        );
      })}
      <pointLight color="#ffb34e" intensity={0.8} distance={2.2} position={[0, 0.46, 0.38]} />
    </>
  );
}