// Solmar Bay — the four staged screenshots. Each scene plays the real game
// forward from a fresh world for a fixed number of steps, steered by the
// game's own autopilot, so every frame is what a short stretch of real play
// looks like and the same seed always gives the same frame.
//
//   chase   — a police chase: mission 1, Rico at (0, 130) facing east in a
//             blue sedan, three stars, seven seconds east along the Marina
//             Docks street, cops pulled in behind, camera flipped to look
//             back west so the cruisers are visible behind him.
//   drive   — a red sports car driving east on a street, free roam.
//   marina  — Rico on foot at the end of Pier 9, facing west, standing.
//   finale  — the Solmar job: Rico at Casino Solmar's door, four stars.

const STEP = 1 / 60;

export function stageShot(name, G) {
  if (name === 'chase') {
    G.startMission(0);
    G.teleport(0, 130, Math.PI / 2);
    G.spawnPlayerCar('sedan', 0, 130, Math.PI / 2, 0x2a5fd8);
    G.setWanted(3);
    G.setCameraFollow(Math.PI / 2 + Math.PI);
    G.setAutoDrive(true, Math.PI / 2);
    for (let i = 0; i < 420; i += 1) G.step(STEP); // seven seconds east
    G.setAutoDrive(false, null);
    // Pull the pursuing cruisers in behind the car for the frame.
    const c = G.carState();
    if (c) {
      G.spawnCopAt(c.x - 16, c.z + 3);
      G.spawnCopAt(c.x - 26, c.z - 3);
      // Flip the camera: east of the car, looking back west at the chase.
      G.setCameraFixed(c.x + 20, 7, c.z, c.x - 14, 2, c.z);
    }
    return true;
  }
  if (name === 'drive') {
    G.startFreeRoam();
    G.teleport(60, 85, Math.PI / 2);
    G.spawnPlayerCar('sport', 60, 85, Math.PI / 2, 0xd81f2a);
    G.setCameraFollow(Math.PI / 2 + Math.PI);
    G.setAutoDrive(true, Math.PI / 2);
    for (let i = 0; i < 270; i += 1) G.step(STEP); // four and a half seconds
    G.setAutoDrive(false, null);
    return true;
  }
  if (name === 'marina') {
    G.startFreeRoam();
    G.teleport(210, 196, -Math.PI / 2);
    G.setCameraFixed(222, 5.5, 196, 188, 2, 196);
    for (let i = 0; i < 90; i += 1) G.step(STEP); // stand still, 1.5 seconds
    return true;
  }
  if (name === 'finale') {
    G.startMission(4);
    G.teleport(24, 168, Math.PI);
    G.setWanted(4);
    G.setCameraFixed(24, 6, 184, 18, 5, 155);
    for (let i = 0; i < 30; i += 1) G.step(STEP);
    return true;
  }
  return false;
}
