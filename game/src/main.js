// Solmar Bay — entry point and game loop. Builds the world from the seed,
// wires every system to the mission runner, runs the per-frame update in
// small fixed slices (frame delta capped at 250 ms), and exposes the test
// and screenshot interface on window.__solmar.

import { RNG } from './rng.js';
import { AudioSys } from './audio.js';
import { buildCity, districtAt, slideMove, STREETS, PLACES, PARKED_SPOTS } from './city.js';
import { buildMarina } from './marina.js';
import { buildCasinoRow } from './casino.js';
import { MissionRunner } from './missions.js';
import { Activities } from './activities.js';
import { createCar, driveCar, removeCar, spawnTraffic, updateTrafficCar } from './vehicles.js';
import { Police } from './police.js';
import { Combat, makePlayerMesh } from './combat.js';
import { Pedestrians } from './pedestrians.js';
import { HUD } from './hud.js';
import { stageShot } from './shots.js';

const THREE = window.THREE;
const STEP = 1 / 60;
const SAVE_KEY = 'solmar-bay-save-v3';

const params = new URLSearchParams(window.location.search);
const SEED = Number.parseInt(params.get('seed') || '42', 10) || 42;
const SHOT = params.get('shot');

// --- renderer / scene ----------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf7a56b);
scene.fog = new THREE.Fog(0xf7a56b, 180, 520);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 12, 190);

const hemi = new THREE.HemisphereLight(0xffd9a0, 0x4a3a55, 0.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffb45e, 1.35);
sun.position.set(-160, 90, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -280;
sun.shadow.camera.right = 280;
sun.shadow.camera.top = 280;
sun.shadow.camera.bottom = -280;
sun.shadow.camera.far = 700;
scene.add(sun);

// --- world ----------------------------------------------------------------
const rng = new RNG(SEED);
const audio = new AudioSys();
const city = buildCity(scene, rng);
const marina = buildMarina(scene, rng, city);
const casino = buildCasinoRow(scene, rng, city);

// --- state ---------------------------------------------------------------
let screen = 'title'; // title | play | dead
let paused = false;
let money = 0;
let health = 100;
let lastHurtAt = -100;
let time = 0;
let saveTimer = 0;

let playerX = PLACES.spawn.x;
let playerZ = PLACES.spawn.z;
let playerHeading = Math.PI; // facing north, into Downtown
let playerMesh = makePlayerMesh();
playerMesh.position.set(playerX, 0, playerZ);
playerMesh.rotation.y = playerHeading;
scene.add(playerMesh);

let inCar = false;
let car = null; // the car Rico is driving, if any
const parkedCars = [];
const missionCars = [];
for (const spot of PARKED_SPOTS) {
  const colors = { sedan: undefined, taxi: undefined, van: undefined, sport: undefined };
  const c = createCar(scene, spot.kind, spot.x, spot.z, spot.kind === 'sport' ? Math.PI / 2 : 0, colors[spot.kind]);
  c.parked = true;
  parkedCars.push(c);
}
const traffic = spawnTraffic(scene, rng, 14, STREETS);

// Mission crates: the dockside crate (mission 1) and the pier crate (mission 4).
const crateGeo = new THREE.BoxGeometry(2, 2, 2);
const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3a });
const docksCrate = new THREE.Mesh(crateGeo, crateMat);
docksCrate.position.set(190, 1, 130);
docksCrate.castShadow = true;
scene.add(docksCrate);
const pierCrate = new THREE.Mesh(crateGeo, crateMat);
pierCrate.position.set(212, 1, 196);
pierCrate.castShadow = true;
scene.add(pierCrate);
const crateTaken = { docks: false, pier: false };

// The pulsing mission target diamond.
const markerMesh = new THREE.Mesh(
  new THREE.OctahedronGeometry(1.4),
  new THREE.MeshBasicMaterial({ color: 0xffd76a }),
);
markerMesh.visible = false;
scene.add(markerMesh);

// --- systems --------------------------------------------------------------
const hud = new HUD();
const combat = new Combat(scene, city, {
  damagePlayer: (n) => damagePlayer(n),
  onShoot: () => audio.shoot(),
  onGuardShot: () => audio.shoot(),
});
const police = new Police(scene, city, {
  rng,
  onBusted: () => onBusted(),
  onCrash: () => audio.crash(),
});
const pedestrians = new Pedestrians(scene, rng, city);
const activities = new Activities(scene, rng, city, {
  addMoney: (n) => { money += n; },
  toast: (m) => hud.toast(m),
  chime: () => audio.chime(),
});

function playerSnapshot() {
  return { x: playerX, z: playerZ, inCar, car };
}

const missions = new MissionRunner({
  player: playerSnapshot,
  say: (t) => hud.say(t),
  toast: (m) => hud.toast(m),
  addMoney: (n) => { money += n; },
  addWanted: (n) => police.addWanted(n),
  setWanted: (n) => police.setWanted(n),
  spawnGuards: (n, x, z) => {
    for (let i = 0; i < n; i += 1) {
      combat.spawnGuard(x + (i === 0 ? -3 : 3), z + (i === 0 ? 2 : -2));
    }
  },
  clearGuards: () => combat.clearGuards(),
  spawnMissionCar: (kind, x, z, heading, color, enter) => {
    const c = createCar(scene, kind, x, z, heading, color);
    c.parked = true;
    missionCars.push(c);
    if (enter) enterCar(c);
    return c;
  },
  setCrate: (name, visible) => { crateTaken[name] = !visible; },
  onMissionStart: (id) => {
    if (id === 'package') crateTaken.docks = false;
    if (id === 'harbor-heist') crateTaken.pier = false;
  },
  alarm: () => audio.alarm(),
  save: () => saveGame(),
  onComplete: () => {},
});

// --- helpers --------------------------------------------------------------
function damagePlayer(n) {
  if (screen !== 'play' || health <= 0) return;
  health -= n;
  lastHurtAt = time;
  if (health <= 0) {
    health = 0;
    die();
  }
}

function die() {
  screen = 'dead';
  if (inCar) exitCar(true);
  hud.showDead();
  hud.toast('WASTED — retry costs 10% of your cash.');
}

function onBusted() {
  money = Math.floor(money * 0.85);
  police.setWanted(0);
  police.clear();
  teleportTo(PLACES.garage.x, PLACES.garage.z, Math.PI);
  hud.toast('Busted! The cops took 15% of your cash.');
}

function teleportTo(x, z, heading) {
  playerX = x;
  playerZ = z;
  if (heading !== undefined) playerHeading = heading;
  if (inCar && car) {
    car.x = x;
    car.z = z;
    if (heading !== undefined) car.heading = heading;
    car.mesh.position.set(x, 0, z);
    car.mesh.rotation.y = car.heading;
  }
  playerMesh.position.set(playerX, 0, playerZ);
  playerMesh.rotation.y = playerHeading;
}

function enterCar(c) {
  if (!c || c.dead) return false;
  car = c;
  inCar = true;
  c.parked = false;
  c.health = 100; // climbing back into a parked car rebuilds it fresh
  c.speed = 0;
  playerX = c.x;
  playerZ = c.z;
  playerHeading = c.heading;
  playerMesh.visible = false;
  return true;
}

function exitCar(silent) {
  if (!inCar || !car) return;
  const c = car;
  c.parked = true;
  playerX = c.x + Math.cos(c.heading) * 2.6;
  playerZ = c.z - Math.sin(c.heading) * 2.6;
  const fixed = slideMove(playerX, playerZ, 0, 0, 0.8, city.colliders.concat(city.waterColliders));
  playerX = fixed.x;
  playerZ = fixed.z;
  playerHeading = c.heading;
  playerMesh.visible = true;
  playerMesh.position.set(playerX, 0, playerZ);
  playerMesh.rotation.y = playerHeading;
  inCar = false;
  car = null;
  if (!silent) hud.toast('Out of the car.');
}

function nearestEnterableCar(maxDist) {
  let best = null, bestD = maxDist;
  for (const c of [...parkedCars, ...missionCars]) {
    if (c.dead) continue;
    const d = Math.hypot(c.x - playerX, c.z - playerZ);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

function enterNearestCar() {
  if (inCar) return true;
  const c = nearestEnterableCar(7);
  if (!c) return false;
  return enterCar(c);
}

function wreckPlayerCar() {
  if (!car) return;
  const c = car;
  hud.toast('Your car is wrecked!');
  audio.crash();
  removeCar(scene, c);
  const ix = parkedCars.indexOf(c);
  if (ix >= 0) parkedCars.splice(ix, 1);
  const jx = missionCars.indexOf(c);
  if (jx >= 0) missionCars.splice(jx, 1);
  playerX = c.x;
  playerZ = c.z;
  playerHeading = c.heading;
  playerMesh.visible = true;
  playerMesh.position.set(playerX, 0, playerZ);
  playerMesh.rotation.y = playerHeading;
  inCar = false;
  car = null;
}

// --- save / load ----------------------------------------------------------
function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money, health,
      done: missions.done,
      packages: activities.foundIndices(),
      pos: { x: playerX, z: playerZ },
    }));
  } catch { /* storage unavailable */ }
}

function loadSaveData() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function applySave(data) {
  money = data.money || 0;
  health = data.health !== undefined ? data.health : 100;
  missions.loadFromSave(data.done || []);
  activities.loadFound(data.packages || []);
  if (data.pos) teleportTo(data.pos.x, data.pos.z, Math.PI);
}

function resetWorld() {
  money = 0;
  health = 100;
  lastHurtAt = -100;
  police.setWanted(0);
  police.clear();
  combat.clearGuards();
  combat.setWeapon('fists');
  combat.ammo = 12;
  missions.loadFromSave([]);
  missions.current = -1;
  missions.nextTimer = 0;
  activities.fare = null;
  for (const pkg of activities.packages) {
    pkg.found = false;
    if (pkg.mesh) pkg.mesh.visible = true;
  }
  if (inCar) exitCar(true);
  teleportTo(PLACES.spawn.x, PLACES.spawn.z, Math.PI);
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

function newGame() {
  resetWorld();
  screen = 'play';
  hud.hideTitle();
  hud.hideDead();
  missions.start(0);
}

function continueGame() {
  const data = loadSaveData();
  if (!data) { newGame(); return; }
  resetWorld();
  applySave(data);
  screen = 'play';
  hud.hideTitle();
  hud.hideDead();
  missions.startNext();
}

// --- input ------------------------------------------------------------------
const keys = new Set();
let camYaw = 0;
let camPitch = 0.38;
let camDist = 15;
let camDragTimer = 0;
let camMode = 'follow'; // follow | fixed
let camFixed = null;
let autoDrive = { forward: false, steerTo: null };
let dragging = false;
let dragMoved = 0;
let lastPointerX = 0;
let lastPointerY = 0;

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  audio.ensure();
  if (e.code === 'KeyM') {
    audio.setMuted(!audio.muted);
    hud.toast(audio.muted ? 'Sound muted.' : 'Sound on.');
    return;
  }
  if (screen !== 'play') return;
  if (e.code === 'KeyP') {
    paused = !paused;
    hud.showPause(paused);
    return;
  }
  if (paused) return;
  if (e.code === 'KeyE') {
    if (inCar) exitCar();
    else if (!missions.interact()) enterNearestCar();
  } else if (e.code === 'KeyF') {
    if (!inCar) combat.punch({ x: playerX, z: playerZ }, playerHeading);
  } else if (e.code === 'Digit1') {
    combat.setWeapon('fists');
  } else if (e.code === 'Digit2') {
    combat.setWeapon('pistol');
  } else if (e.code === 'KeyR') {
    combat.reload();
    hud.toast('Reloaded.');
  } else if (e.code === 'KeyT') {
    activities.startTaxi({ x: playerX, z: playerZ });
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  dragMoved = 0;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
  audio.ensure();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastPointerX;
  const dy = e.clientY - lastPointerY;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
  dragMoved += Math.abs(dx) + Math.abs(dy);
  camYaw -= dx * 0.004;
  camPitch = Math.max(0.12, Math.min(1.1, camPitch + dy * 0.003));
  camDragTimer = 2.5;
  camMode = 'follow';
});
canvas.addEventListener('pointerup', (e) => {
  dragging = false;
  if (dragMoved < 6 && screen === 'play' && !paused && !inCar && combat.weapon === 'pistol') {
    // Click to shoot: raycast through the screen centre onto the ground.
    const ray = new THREE.Raycaster();
    ray.setFromCamera({ x: 0, y: 0 }, camera);
    const t = -ray.ray.origin.y / ray.ray.direction.y;
    if (t > 0) {
      const px = ray.ray.origin.x + ray.ray.direction.x * t;
      const pz = ray.ray.origin.z + ray.ray.direction.z * t;
      combat.shootAt(px, pz, { x: playerX, z: playerZ });
      pedestrians.scatter();
    }
  }
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  camDist = Math.max(8, Math.min(30, camDist * (1 + e.deltaY * 0.001)));
}, { passive: false });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- per-step update --------------------------------------------------------
function step(dt) {
  time += dt;
  if (screen !== 'play' || paused) return;

  // Health regen: 4 per second after 12 seconds without being hurt.
  if (health > 0 && health < 100 && time - lastHurtAt > 12) {
    health = Math.min(100, health + 4 * dt);
  }

  // Player: on foot or behind the wheel.
  if (inCar && car) {
    const autoActive = autoDrive.forward || autoDrive.steerTo !== null;
    const throttle = autoActive
      ? (autoDrive.forward ? 1 : (keys.has('KeyS') || keys.has('ArrowDown') ? -1 : 0))
      : ((keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0));
    const steer = autoActive
      ? 0
      : ((keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0));
    const report = driveCar(car, dt, {
      throttle,
      steer,
      autoSteer: autoActive ? autoDrive.steerTo : null,
      autoThrottle: autoActive ? autoDrive.forward : false,
    }, {
      colliders: city.colliders,
      traffic,
      slideMove,
      onCrash: () => audio.crash(),
    });
    playerX = car.x;
    playerZ = car.z;
    playerHeading = car.heading;
    if (report.wrecked) wreckPlayerCar();
    audio.engine(Math.abs(car ? car.speed : 0) / 38, true);
  } else {
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = run ? 10 : 6;
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
    const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let mx = 0, mz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) { mx += fx; mz += fz; }
    if (keys.has('KeyS') || keys.has('ArrowDown')) { mx -= fx; mz -= fz; }
    if (keys.has('KeyD') || keys.has('ArrowRight')) { mx += rx; mz += rz; }
    if (keys.has('KeyA') || keys.has('ArrowLeft')) { mx -= rx; mz -= rz; }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len; mz /= len;
      playerHeading = Math.atan2(mx, mz);
      const moved = slideMove(
        playerX, playerZ, mx * speed * dt, mz * speed * dt, 0.8,
        city.colliders.concat(city.waterColliders),
      );
      playerX = moved.x;
      playerZ = moved.z;
    }
    playerMesh.position.set(playerX, 0, playerZ);
    playerMesh.rotation.y = playerHeading;
    audio.engine(0, false);
  }

  for (const t of traffic) updateTrafficCar(t, dt, STREETS, inCar ? car : null);
  police.update(dt, { x: playerX, z: playerZ, inCar, car });
  combat.update(dt, { x: playerX, z: playerZ, inCar });
  pedestrians.update(dt, { x: playerX, z: playerZ }, police.wanted);
  missions.update(dt);
  activities.update(dt, { x: playerX, z: playerZ, inCar, car });

  // Mission crates show while their job is on the grab step.
  const mid = missions.currentId;
  docksCrate.visible = mid === 'package' && missions.stepIndex <= 1 && !crateTaken.docks;
  pierCrate.visible = mid === 'harbor-heist' && missions.stepIndex <= 1 && !crateTaken.pier;

  // The pulsing target diamond: mission target first, taxi fare second.
  const target = missions.marker
    || (activities.fare ? (activities.fare.state === 'toPickup' ? activities.fare.pickup : activities.fare.dropoff) : null);
  if (target) {
    markerMesh.visible = true;
    markerMesh.position.set(target.x, 2.2 + Math.sin(time * 3) * 0.4, target.z);
    markerMesh.rotation.y = time * 2;
  } else {
    markerMesh.visible = false;
  }

  marina.update(time);
  casino.update(time);

  saveTimer += dt;
  if (saveTimer > 30) {
    saveTimer = 0;
    saveGame();
  }
}

// --- camera -----------------------------------------------------------------
function updateCamera(dt) {
  camDragTimer = Math.max(0, camDragTimer - dt);
  const target = { x: playerX, z: playerZ };
  if (camMode === 'fixed' && camFixed) {
    camera.position.set(camFixed.px, camFixed.py, camFixed.pz);
    camera.lookAt(camFixed.tx, camFixed.ty, camFixed.tz);
    return;
  }
  if (inCar && car && camDragTimer <= 0) {
    const desired = car.heading + Math.PI;
    let diff = desired - camYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    camYaw += diff * Math.min(1, dt * 2.5);
  }
  const dist = inCar ? camDist + 4 : camDist;
  const lookX = -Math.sin(camYaw), lookZ = -Math.cos(camYaw);
  const px = target.x + Math.sin(camYaw) * dist * Math.cos(camPitch);
  const pz = target.z + Math.cos(camYaw) * dist * Math.cos(camPitch);
  const py = 2 + dist * Math.sin(camPitch);
  camera.position.set(px, py, pz);
  camera.lookAt(target.x + lookX * 2, 2.5, target.z + lookZ * 2);
}

// --- HUD snapshot -----------------------------------------------------------
function hudState() {
  return {
    money, health, wanted: police.wanted,
    objective: missions.objective,
    inCar, carHealth: car ? car.health : null,
    carSpeed: car ? car.speed : 0,
    district: districtAt(playerX, playerZ),
    heading: playerHeading,
    pos: { x: playerX, z: playerZ },
    marker: missions.marker,
    fare: activities.fare,
    packages: activities.packagePositions(),
    cops: police.cops.map((c) => ({ x: c.car.x, z: c.car.z })),
    guardPos: combat.guardPositions(),
    trafficPos: traffic.filter((t) => !t.dead).map((t) => ({ x: t.x, z: t.z })),
  };
}

// --- main loop ---------------------------------------------------------------
let last = performance.now();
let acc = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now;
  if (screen === 'play' && !paused) {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 20) {
      step(STEP);
      acc -= STEP;
      n += 1;
    }
    if (n === 20) acc = 0;
  }
  updateCamera(dt);
  if (screen === 'play') hud.update(dt, hudState());
  renderer.render(scene, camera);
}

// --- title screen wiring -----------------------------------------------------
const newGameBtn = document.getElementById('newGameBtn');
if (newGameBtn) newGameBtn.addEventListener('click', () => { audio.ensure(); newGame(); });
const continueBtn = document.getElementById('continueBtn');
if (continueBtn) continueBtn.addEventListener('click', () => { audio.ensure(); continueGame(); });
const retryBtn = document.getElementById('retryBtn');
if (retryBtn) retryBtn.addEventListener('click', () => {
  money = Math.floor(money * 0.9);
  health = 100;
  police.setWanted(0);
  police.clear();
  combat.clearGuards();
  teleportTo(PLACES.garage.x, PLACES.garage.z, Math.PI);
  missions.restartCurrent();
  screen = 'play';
  hud.hideDead();
});

// --- test and screenshot interface ------------------------------------------
const api = {
  get state() {
    return {
      screen, mission: missions.currentId, money: Math.floor(money),
      health: Math.round(health), wanted: police.wanted,
      guards: combat.guardCount, guardPos: combat.guardPositions(),
      inCar, carHealth: car ? car.health : null,
      carPos: car ? { x: car.x, z: car.z } : null,
      carHeading: car ? car.heading : 0,
      carSpeed: car ? car.speed : 0,
      pos: { x: playerX, z: playerZ },
      trafficPos: traffic.filter((t) => !t.dead).map((t) => ({ x: t.x, z: t.z })),
      objective: missions.objective,
      done: [...missions.done],
      fare: activities.fare ? {
        pay: activities.fare.pay,
        pickup: { ...activities.fare.pickup },
        dropoff: { ...activities.fare.dropoff },
        state: activities.fare.state,
      } : null,
      packages: activities.foundCount,
      cops: police.cops.map((c) => ({ x: c.car.x, z: c.car.z })),
      traffic: traffic.filter((t) => !t.dead).length,
      peds: pedestrians.count,
    };
  },
  start: () => newGame(),
  startMission: (i) => {
    if (screen !== 'play') {
      screen = 'play';
      hud.hideTitle();
      hud.hideDead();
    }
    return missions.start(i);
  },
  startFreeRoam: () => {
    missions.current = -1;
    missions.stepIndex = 0;
    missions.cracking = false;
    missions.nextTimer = 0;
    missions.objective = 'Explore Solmar Bay';
    missions.marker = null;
    combat.clearGuards();
  },
  interact: () => missions.interact(),
  enterNearestCar: () => enterNearestCar(),
  exitCar: () => { exitCar(); return true; },
  setAutoDrive: (forward, steerTo) => { autoDrive = { forward: !!forward, steerTo: steerTo === null ? null : steerTo }; },
  setCameraYaw: (yaw) => { camYaw = yaw; camMode = 'follow'; camDragTimer = 0; },
  setCamera: (yaw, pitch, dist) => {
    camYaw = yaw;
    if (pitch !== undefined) camPitch = pitch;
    if (dist !== undefined) camDist = dist;
    camMode = 'follow';
  },
  setCameraFollow: (yaw) => { camYaw = yaw; camMode = 'follow'; },
  setCameraFixed: (px, py, pz, tx, ty, tz) => {
    camFixed = { px, py, pz, tx, ty, tz };
    camMode = 'fixed';
  },
  setWeapon: (name) => combat.setWeapon(name),
  shootAt: (x, z) => combat.shootAt(x, z, { x: playerX, z: playerZ }),
  startTaxi: () => activities.startTaxi({ x: playerX, z: playerZ }),
  save: () => saveGame(),
  teleport: (x, z, heading) => teleportTo(x, z, heading),
  spawnPlayerCar: (kind, x, z, heading, color) => {
    const c = createCar(scene, kind, x, z, heading, color);
    c.parked = true;
    missionCars.push(c);
    enterCar(c);
    return true;
  },
  setWanted: (n) => police.setWanted(n),
  spawnGuards: (n) => {
    for (let i = 0; i < n; i += 1) {
      combat.spawnGuard(playerX + 6 + i * 3, playerZ + 4);
    }
  },
  spawnCopAt: (x, z) => {
    const c = createCar(scene, 'cop', x, z, Math.PI / 2, undefined);
    c.parked = false;
    c.invulnerable = true;
    c.health = 100;
    c.stuckTimer = 0;
    c.lastX = x;
    c.lastZ = z;
    c.ramPlayerCooldown = 0;
    police.cops.push({ car: c, bust: 0 });
    return true;
  },
  carState: () => (car ? { x: car.x, z: car.z, heading: car.heading, speed: car.speed } : null),
  step: (dt) => step(dt || STEP),
  reset: () => { resetWorld(); },
};

window.__solmar = api;

// --- boot ---------------------------------------------------------------------
if (SHOT) {
  screen = 'play';
  hud.hideTitle();
  hud.hideDead();
  stageShot(SHOT, api);
} else {
  hud.showTitle(!!loadSaveData());
}
requestAnimationFrame(animate);
