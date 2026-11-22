// The four screenshot scenes behind `?shot=chase|drive|marina|mission`.
// Each one plays the real game forward from a fresh world for a fixed number
// of steps, steered by a simple autopilot, so the frame is what a short game
// really looks like — and the same seed always gives the same frame. The
// cover (chase) shows a police pursuit with wanted stars, the minimap and a
// mission objective all on the HUD at once.

import { PLACES } from './city.js';

const STEP = 1 / 60;

function driveForward(game, dt, seconds, steerTo) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    game.shotInput.forward = true;
    game.shotInput.steerTo = steerTo;
    game.stepShot(STEP);
  }
  game.shotInput.forward = false;
}

function standStill(game, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) game.stepShot(STEP);
}

// Set `game` to the named scene and leave it painted and ready. Returns the
// scene name for the HUD caption.
export function stageShot(name, game) {
  game.resetWorld();
  if (name === 'drive') {
    // Sports car at speed on a long East End street, traffic around. The
    // car starts ON the street (z=85), not inside a block: a block start
    // pins it against a building and the camera clips into the facade.
    game.teleportPlayer(60, 85, Math.PI / 2);
    game.spawnPlayerCar('sport', 0xc23a2e);
    game.setCameraShot(Math.PI / 2, 0.32, 11);
    game.startFreeRoam();
    driveForward(game, STEP, 4.5, Math.PI / 2);
    return 'drive';
  }
  if (name === 'marina') {
    // On foot at the end of Pier 9: boats, containers, cranes, sunset water.
    game.teleportPlayer(210, 196, -Math.PI / 2);
    game.setCameraShot(-Math.PI / 2, 0.22, 9);
    game.startFreeRoam();
    standStill(game, 1.5);
    return 'marina';
  }
  if (name === 'mission') {
    // Harbor Heist in progress: the crate on Pier 9, rival guards closing in.
    game.startMission(3, 1);
    game.teleportPlayer(224, 188, -0.64);
    game.setCameraShot(-0.64, 0.3, 12);
    game.spawnGuardsNear(PLACES.pierEnd.x - 8, PLACES.pierEnd.z - 6, 2);
    game.setWanted(2);
    standStill(game, 1.2);
    return 'mission';
  }
  // Default: the cover. A police chase through Downtown with three stars,
  // the mission objective on screen and the minimap lit up. The car flees
  // EAST along Marina Docks street (z=131) — a real street, so it stays at
  // speed instead of pinning against a block building the way a northward
  // run did. After the drive the camera swings in front of the car and
  // looks back west, so the pursuing cop cars are in the frame behind it
  // (a chase camera behind the car would leave them behind the lens).
  game.startMission(0, 0);
  game.teleportPlayer(0, 130, Math.PI / 2);
  game.spawnPlayerCar('sedan', 0x2e6ab0);
  game.setWanted(3);
  game.setCameraShot(Math.PI / 2, 0.3, 12);
  driveForward(game, STEP, 7, Math.PI / 2);
  // The chase outruns the cops (the sedan is faster than a cruiser), so
  // pull them in behind the car for the frame — they are the pursuit.
  game.pullCopsNear();
  // Flip the camera after the drive (no steps after it: updateCamera would
  // ease the angle back behind the car on every step).
  game.setCameraShot((3 * Math.PI) / 2, 0.3, 13);
  return 'chase';
}
