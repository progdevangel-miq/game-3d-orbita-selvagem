export const GAME_CONFIG = {
  arenaHalfSize: 11,
  playerSpeed: 5.4,
  playerAcceleration: 11,
  playerJumpImpulse: 4.8,
  cameraDistance: 7.2,
  cameraHeight: 4.5,
  pickupCount: 6,
} as const;

export const PICKUP_POSITIONS: readonly [number, number, number][] = [
  [-7, 0.9, -6],
  [0, 0.9, -8],
  [7, 0.9, -5],
  [-7, 0.9, 5],
  [1, 0.9, 7],
  [7, 0.9, 5],
];
