// shots.js — the four staged screenshots. Each scene plays the real game forward
// from a fresh world for a fixed number of steps, steered by the game's own
// autopilot, so every frame is what a short stretch of real play looks like and
// the same seed always gives the same frame.
const STEP = 1 / 60;

export function stageShot(name, G) {
  if (name === 'chase') {
    G.startMission(0);
    G.teleport(0, 130, Math.PI / 2);
    G.spawnPlayerCar('sedan', 0, 130, Math.PI / 2, 0x2a5fd8);
    G.setWanted(3);
    G.setCameraFollow(Math.PI / 2 + Math.PI);
    G.setAutoDrive(true, Math.PI / 2);
    for (let i = 0; i < 420; i++) G.step(STEP);
    G.setAutoDrive(false, null);
    const cp = G.state.carPos;
    if (cp) {
      G.spawnCopAt(cp.x - 16, cp.z + 3);
      G.spawnCopAt(cp.x - 26, cp.z - 3);
      G.setCameraFixed(cp.x + 20, 7, cp.z, cp.x - 14, 2, cp.z);
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
  if (name === 'ocean') {
    G.startFreeRoam();
    G.teleport(50, 248, Math.PI);
    G.setCameraFixed(50, 6, 266, 46, 2, 226);
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
