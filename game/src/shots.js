// shots.js — the four staged screenshots, played forward from a fresh world.
const STEP = 1 / 60;

export function stageShot(name, G) {
  if (name === 'chase') {
    G.startMission(0);
    G.teleport(0, 130, Math.PI / 2);
    G.spawnPlayerCar('sedan', 0, 130, Math.PI / 2, 0x2a5fd8);
    G.setWanted(3);
    G.setCamera(Math.PI / 2 + Math.PI, 0.38, 15);
    G.setAutoDrive(true, Math.PI / 2);
    for (let i = 0; i < 420; i++) G.step(STEP);
    G.setAutoDrive(false, null);
    const car = G.carState();
    if (car) {
      G.spawnCopAt(car.x - 16, car.z + 3);
      G.spawnCopAt(car.x - 26, car.z - 3);
      G.setCameraFixed(car.x + 20, 7, car.z, car.x - 14, 2, car.z);
    }
    return true;
  }
  if (name === 'airport') {
    G.startFreeRoam();
    G.teleport(108, 160, Math.PI / 2);
    G.setCameraFixed(88, 7, 182, 118, 3, 140);
    for (let i = 0; i < 90; i++) G.step(STEP);
    return true;
  }
  if (name === 'marina') {
    G.startFreeRoam();
    G.teleport(210, 196, -Math.PI / 2);
    G.setCameraFixed(222, 5.5, 196, 188, 2, 196);
    for (let i = 0; i < 90; i++) G.step(STEP);
    return true;
  }
  if (name === 'finale') {
    G.startMission(4);
    G.teleport(24, 168, Math.PI);
    G.setWanted(4);
    G.setCameraFixed(24, 6, 184, 18, 5, 155);
    for (let i = 0; i < 30; i++) G.step(STEP);
    return true;
  }
  return false;
}
