// main.js — entry point: builds the world, wires every system, runs the loop, exposes __solmar.
import { RNG } from './rng.js';
import { AudioSys } from './audio.js';
import { buildCity, districtAt, slideMove, STREETS, PLACES, PARKED_SPOTS } from './city.js';
import { buildMarina } from './marina.js';
import { buildCasinoRow } from './casino.js';
import { buildAirport } from './airport.js';
import { MissionRunner } from './missions.js';
import { Activities } from './activities.js';
import { createCar, driveCar, removeCar, spawnTraffic, updateTrafficCar } from './vehicles.js';
import { Police } from './police.js';
import { Combat, makePlayerMesh } from './combat.js';
import { Pedestrians } from './pedestrians.js';
import { HUD } from './hud.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const SAVE_KEY = 'solmar-bay-save-v3';
const params = new URLSearchParams(window.location.search);
const seed = parseInt(params.get('seed'), 10);
const SEED = Number.isNaN(seed) ? 42 : seed;
const shotName = params.get('shot');

// Renderer and scene.
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

// World construction, in order.
const rng = new RNG(SEED);
const audio = new AudioSys();
const city = buildCity(scene, rng);
const marina = buildMarina(scene, rng, city);
const casino = buildCasinoRow(scene, rng, city);
const airport = buildAirport(scene, rng, city);

// Game state.
let screen = 'title';
let paused = false;
let money = 0;
let health = 100;
let lastHurtAt = -100;
let time = 0;
let saveTimer = 0;

let playerX = PLACES.spawn.x;
let playerZ = PLACES.spawn.z;
let playerHeading = Math.PI;
const playerMesh = makePlayerMesh();
playerMesh.position.set(playerX, 0, playerZ);
playerMesh.rotation.y = playerHeading;
scene.add(playerMesh);
let inCar = false;
let car = null;

const parkedCars = PARKED_SPOTS.map(s => {
  const c = createCar(scene, s.kind, s.x, s.z, s.kind === 'sport' ? Math.PI / 2 : 0, undefined);
  c.parked = true;
  return c;
});
const missionCars = [];
const traffic = spawnTraffic(scene, rng, 14, STREETS);

const docksCrate = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshLambertMaterial({ color: 0x8a6a3a }));
docksCrate.position.set(190, 1, 130);
docksCrate.castShadow = true;
scene.add(docksCrate);
const pierCrate = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshLambertMaterial({ color: 0x8a6a3a }));
pierCrate.position.set(212, 1, 196);
pierCrate.castShadow = true;
scene.add(pierCrate);
const crateTaken = { docks: false, pier: false };

const markerMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.4), new THREE.MeshBasicMaterial({ color: 0xffd76a }));
markerMesh.visible = false;
scene.add(markerMesh);

const hud = new HUD();
const combat = new Combat(scene, city, {
  damagePlayer: n => damagePlayer(n),
  onShoot: () => audio.shoot(),
  onGuardShot: () => audio.shoot(),
});
const police = new Police(scene, city, {
  rng,
  onBusted: () => onBusted(),
  onCrash: () => audio.crash(),
});
const peds = new Pedestrians(scene, rng, city);
const activities = new Activities(scene, rng, city, {
  addMoney: n => { money += n; },
  toast: m => hud.toast(m),
  chime: () => audio.chime(),
});
const missions = new MissionRunner({
  player: () => ({ x: playerX, z: playerZ, inCar, car }),
  say: t => hud.say(t),
  toast: m => hud.toast(m),
  addMoney: n => { money += n; },
  addWanted: n => police.addWanted(n),
  setWanted: n => police.setWanted(n),
  spawnGuards: (n, x, z) => spawnGuards(n, x, z),
  spawnMissionCar: (kind, x, z, heading, colour, enter) => spawnMissionCar(kind, x, z, heading, colour, enter),
  enterCar: c => enterCar(c),
  setCrate: (name, visible) => { crateTaken[name] = !visible; },
  save: () => saveGame(),
  onComplete: () => {},
  clearGuards: () => combat.clearGuards(),
  onMissionStart: id => {
    if (id === 'package') crateTaken.docks = false;
    if (id === 'harbor-heist') crateTaken.pier = false;
  },
  alarm: () => audio.alarm(),
});

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
  if (heading !== undefined && heading !== null) playerHeading = heading;
  if (inCar && car) {
    car.x = x; car.z = z;
    if (heading !== undefined && heading !== null) car.heading = heading;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
  }
  playerMesh.position.set(playerX, 0, playerZ);
  playerMesh.rotation.y = playerHeading;
}
function spawnGuards(n, x, z) {
  for (let i = 0; i < n; i++) {
    const ox = i === 0 ? -3 : 3;
    const oz = i === 0 ? 2 : -2;
    combat.spawnGuard(x + ox, z + oz);
  }
}
function spawnMissionCar(kind, x, z, heading, colour, enter) {
  const c = createCar(scene, kind, x, z, heading, colour);
  c.parked = true;
  missionCars.push(c);
  if (enter) enterCar(c);
  return c;
}
function enterCar(c) {
  if (!c || c.dead) return false;
  car = c;
  inCar = true;
  c.parked = false;
  c.health = 100;
  c.speed = 0;
  playerX = c.x;
  playerZ = c.z;
  playerHeading = c.heading;
  playerMesh.visible = false;
  return true;
}
function exitCar(silent) {
  if (!inCar || !car) return;
  car.parked = true;
  playerX = car.x + Math.cos(car.heading) * 2.6;
  playerZ = car.z - Math.sin(car.heading) * 2.6;
  const pushed = slideMove(playerX, playerZ, 0, 0, 0.8, [...city.colliders, ...city.waterColliders]);
  playerX = pushed.x;
  playerZ = pushed.z;
  playerHeading = car.heading;
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
  const wrecked = car;
  hud.toast('Your car is wrecked!');
  audio.crash();
  removeCar(scene, wrecked);
  const pi = parkedCars.indexOf(wrecked);
  if (pi >= 0) parkedCars.splice(pi, 1);
  const mi = missionCars.indexOf(wrecked);
  if (mi >= 0) missionCars.splice(mi, 1);
  playerX = wrecked.x;
  playerZ = wrecked.z;
  playerHeading = wrecked.heading;
  playerMesh.visible = true;
  playerMesh.position.set(playerX, 0, playerZ);
  playerMesh.rotation.y = playerHeading;
  inCar = false;
  car = null;
}

// Save and load.
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money, health, done: [...missions.done], packages: activities.foundIndices(), pos: { x: playerX, z: playerZ },
    }));
  } catch (e) {}
}
function loadSaveData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
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
  missions.nextTimer = 0;
  activities.fare = null;
  for (const p of activities.packages) { p.found = false; p.mesh.visible = true; }
  if (inCar) exitCar(true);
  teleportTo(PLACES.spawn.x, PLACES.spawn.z, Math.PI);
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
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

// Input.
const keys = new Set();
let camYaw = 0, camPitch = 0.38, camDist = 15, camDragTimer = 0;
let camMode = 'follow', camFixed = null;
const autoDrive = { forward: false, steerTo: null };
let dragging = false, dragMoved = 0, lastPX = 0, lastPY = 0;

window.addEventListener('keydown', e => {
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
    if (inCar) exitCar(false);
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
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

renderer.domElement.addEventListener('pointerdown', e => {
  dragging = true;
  dragMoved = 0;
  lastPX = e.clientX;
  lastPY = e.clientY;
  audio.ensure();
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - lastPX;
  const dy = e.clientY - lastPY;
  lastPX = e.clientX;
  lastPY = e.clientY;
  camYaw -= dx * 0.004;
  camPitch = Math.max(0.12, Math.min(1.1, camPitch + dy * 0.003));
  dragMoved += Math.abs(dx) + Math.abs(dy);
  camDragTimer = 2.5;
  camMode = 'follow';
});
renderer.domElement.addEventListener('pointerup', e => {
  dragging = false;
  if (dragMoved < 6 && screen === 'play' && !paused && !inCar && combat.weapon === 'pistol') {
    const ray = new THREE.Raycaster();
    ray.setFromCamera({ x: 0, y: 0 }, camera);
    const t = -ray.ray.origin.y / ray.ray.direction.y;
    if (t > 0) {
      const gx = ray.ray.origin.x + ray.ray.direction.x * t;
      const gz = ray.ray.origin.z + ray.ray.direction.z * t;
      combat.shootAt(gx, gz, { x: playerX, z: playerZ });
      peds.scatter();
    }
  }
});
renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault();
  camDist = Math.max(8, Math.min(30, camDist * (1 + e.deltaY * 0.001)));
}, { passive: false });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Per-step update.
function step(dt) {
  time += dt;
  if (screen !== 'play' || paused) return;
  if (health > 0 && health < 100 && time - lastHurtAt > 12) {
    health = Math.min(100, health + 4 * dt);
  }
  if (inCar && car) {
    let throttle = 0, steer = 0;
    if (autoDrive.forward) {
      throttle = 1;
    } else {
      if (keys.has('KeyW') || keys.has('ArrowUp')) throttle = 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) throttle = -1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) steer = 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) steer = -1;
    }
    const autoSteer = autoDrive.forward && autoDrive.steerTo !== null && autoDrive.steerTo !== undefined ? autoDrive.steerTo : null;
    const res = driveCar(car, dt, { throttle, steer, autoSteer, autoThrottle: autoDrive.forward }, {
      colliders: city.colliders,
      traffic,
      slideMove,
      onCrash: () => audio.crash(),
    });
    playerX = car.x;
    playerZ = car.z;
    playerHeading = car.heading;
    if (res.wrecked) wreckPlayerCar();
    audio.engine(Math.abs(car ? car.speed : 0) / 38, true);
  } else {
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = running ? 10 : 6;
    const fwdX = -Math.sin(camYaw), fwdZ = -Math.cos(camYaw);
    const rightX = Math.cos(camYaw), rightZ = -Math.sin(camYaw);
    let mx = 0, mz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) { mx += fwdX; mz += fwdZ; }
    if (keys.has('KeyS') || keys.has('ArrowDown')) { mx -= fwdX; mz -= fwdZ; }
    if (keys.has('KeyA') || keys.has('ArrowLeft')) { mx -= rightX; mz -= rightZ; }
    if (keys.has('KeyD') || keys.has('ArrowRight')) { mx += rightX; mz += rightZ; }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len; mz /= len;
      playerHeading = Math.atan2(mx, mz);
      const moved = slideMove(playerX, playerZ, mx * speed * dt, mz * speed * dt, 0.8, [...city.colliders, ...city.waterColliders]);
      playerX = moved.x;
      playerZ = moved.z;
    }
    playerMesh.position.set(playerX, 0, playerZ);
    playerMesh.rotation.y = playerHeading;
    audio.engine(0, false);
  }
  for (const t of traffic) updateTrafficCar(t, dt, STREETS, car);
  police.update(dt, { x: playerX, z: playerZ, inCar, car });
  combat.update(dt, { x: playerX, z: playerZ, inCar });
  peds.update(dt, { x: playerX, z: playerZ }, police.wanted);
  missions.update(dt);
  activities.update(dt, { x: playerX, z: playerZ, inCar, car });

  // Crates: visible only while their mission is active at step 0 or 1 and not taken.
  docksCrate.visible = missions.currentId === 'package' && missions.stepIndex <= 1 && !crateTaken.docks;
  pierCrate.visible = missions.currentId === 'harbor-heist' && missions.stepIndex <= 1 && !crateTaken.pier;

  // Target marker: mission marker first, else the taxi fare target.
  let target = missions.marker;
  if (!target && activities.fare) {
    target = activities.fare.state === 'toPickup' ? activities.fare.pickup : activities.fare.dropoff;
  }
  if (target) {
    markerMesh.visible = true;
    markerMesh.position.set(target.x, 2.2 + Math.sin(time * 3) * 0.4, target.z);
    markerMesh.rotation.y = time * 2;
  } else {
    markerMesh.visible = false;
  }
  marina.update(time);
  casino.update(time);
  airport.update(time);

  saveTimer += dt;
  if (saveTimer >= 30) {
    saveTimer = 0;
    saveGame();
  }
}

function updateCamera(dt) {
  camDragTimer = Math.max(0, camDragTimer - dt);
  if (camMode === 'fixed' && camFixed) {
    camera.position.set(camFixed.px, camFixed.py, camFixed.pz);
    camera.lookAt(camFixed.tx, camFixed.ty, camFixed.tz);
    return;
  }
  if (inCar && camDragTimer <= 0) {
    const target = car.heading + Math.PI;
    let diff = target - camYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    camYaw += diff * Math.min(1, dt * 2.5);
  }
  const dist = camDist + (inCar ? 4 : 0);
  const cx = playerX + Math.sin(camYaw) * dist * Math.cos(camPitch);
  const cz = playerZ + Math.cos(camYaw) * dist * Math.cos(camPitch);
  const cy = 2 + dist * Math.sin(camPitch);
  camera.position.set(cx, cy, cz);
  const lookX = playerX - Math.sin(camYaw) * 2;
  const lookZ = playerZ - Math.cos(camYaw) * 2;
  camera.lookAt(lookX, 2.5, lookZ);
}

function hudState() {
  return {
    money, health, wanted: police.wanted, objective: missions.objective, inCar,
    carHealth: car ? car.health : null,
    carSpeed: car ? car.speed : 0,
    district: districtAt(playerX, playerZ),
    heading: playerHeading,
    pos: { x: playerX, z: playerZ },
    carPos: car ? { x: car.x, z: car.z } : null,
    marker: missions.marker,
    fare: activities.fare,
    packages: activities.packagePositions(),
    cops: police.cops.map(c => ({ x: c.car.x, z: c.car.z })),
    guards: combat.guardCount,
    guardPos: combat.guardPositions(),
    trafficPos: traffic.filter(t => !t.dead).map(t => ({ x: t.x, z: t.z })),
    streets: STREETS,
  };
}

// Test and screenshot interface.
const api = {
  get state() {
    return {
      screen, mission: missions.currentId, money: Math.floor(money), health: Math.round(health),
      wanted: police.wanted, guards: combat.guardCount, guardPos: combat.guardPositions(),
      inCar, carHealth: car ? car.health : null,
      carPos: car ? { x: car.x, z: car.z } : null,
      carHeading: car ? car.heading : null,
      carSpeed: car ? car.speed : 0,
      pos: { x: playerX, z: playerZ },
      trafficPos: traffic.filter(t => !t.dead).map(t => ({ x: t.x, z: t.z })),
      objective: missions.objective, done: [...missions.done],
      fare: activities.fare ? { pay: activities.fare.pay, pickup: activities.fare.pickup, dropoff: activities.fare.dropoff, state: activities.fare.state } : null,
      packages: activities.foundCount,
      cops: police.count,
      traffic: traffic.filter(t => !t.dead).length,
      peds: peds.count,
    };
  },
  start: () => newGame(),
  startMission: i => {
    screen = 'play';
    hud.hideTitle();
    hud.hideDead();
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
  exitCar: () => { exitCar(false); return true; },
  setAutoDrive: (forward, steerTo) => { autoDrive.forward = !!forward; autoDrive.steerTo = steerTo === null ? null : steerTo; },
  setCameraYaw: yaw => { camYaw = yaw; camMode = 'follow'; camDragTimer = 0; },
  setCamera: (yaw, pitch, dist) => {
    camYaw = yaw;
    if (pitch !== undefined) camPitch = pitch;
    if (dist !== undefined) camDist = dist;
    camMode = 'follow';
  },
  setCameraFollow: yaw => { camYaw = yaw; camMode = 'follow'; },
  setCameraFixed: (px, py, pz, tx, ty, tz) => {
    camFixed = { px, py, pz, tx, ty, tz };
    camMode = 'fixed';
  },
  setWeapon: name => combat.setWeapon(name),
  shootAt: (x, z) => combat.shootAt(x, z, { x: playerX, z: playerZ }),
  startTaxi: () => activities.startTaxi({ x: playerX, z: playerZ }),
  save: () => saveGame(),
  teleport: (x, z, heading) => teleportTo(x, z, heading),
  spawnPlayerCar: (kind, x, z, heading, colour) => {
    const c = createCar(scene, kind, x, z, heading, colour);
    c.parked = true;
    missionCars.push(c);
    return enterCar(c);
  },
  setWanted: n => police.setWanted(n),
  spawnGuards: n => {
    for (let i = 0; i < n; i++) combat.spawnGuard(playerX + 6 + i * 3, playerZ + 4);
  },
  spawnCopAt: (x, z) => {
    const c = createCar(scene, 'cop', x, z, Math.PI / 2);
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
  carState: () => car ? { x: car.x, z: car.z, heading: car.heading, speed: car.speed } : null,
  step: (dt = STEP) => step(dt),
  reset: () => resetWorld(),
};
window.__solmar = api;

// Title wiring.
if (hud.el.newGameBtn) hud.el.newGameBtn.addEventListener('click', () => { audio.ensure(); newGame(); });
if (hud.el.continueBtn) hud.el.continueBtn.addEventListener('click', () => { audio.ensure(); continueGame(); });
if (hud.el.retryBtn) hud.el.retryBtn.addEventListener('click', () => {
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

// Boot.
if (shotName) {
  screen = 'play';
  hud.hideTitle();
  hud.hideDead();
  stageShot(shotName, api);
} else {
  hud.showTitle(!!loadSaveData());
}

// Main loop.
let lastNow = performance.now();
let acc = 0;
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const frameDt = Math.min(0.25, (now - lastNow) / 1000);
  lastNow = now;
  if (screen === 'play' && !paused) {
    acc += frameDt;
    let steps = 0;
    while (acc >= STEP && steps < 20) {
      step(STEP);
      acc -= STEP;
      steps += 1;
    }
    if (steps >= 20) acc = 0;
  }
  updateCamera(frameDt);
  if (screen === 'play') hud.update(frameDt, hudState());
  renderer.render(scene, camera);
}
animate();
