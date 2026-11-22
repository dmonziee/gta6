// Solmar Bay — boot, the one game loop, input, camera, screens and save/load.
// Everything the other modules build gets wired together here: the city, the
// marina, traffic, pedestrians, police, combat, Lena's missions and the side
// activities. The game runs in fixed 1/60 s steps so `?seed=N` replays the
// same world, and `?shot=<scene>&seed=N` stages one of the four screenshot
// scenes instead of the title screen.

import { createRng } from './rng.js';
import { createAudio } from './audio.js';
import { buildCity, PLACES, PARKED_SPOTS, districtAt } from './city.js';
import { buildMarinaDistrict } from './marina.js';
import {
  createCarMesh, spawnTraffic, updateTraffic, createPlayerCar, updatePlayerCar,
} from './vehicles.js';
import { spawnPedestrians, updatePedestrians, nearestPed, createPersonMesh } from './pedestrians.js';
import { createPolice } from './police.js';
import { createCombat, createPlayerMesh, WEAPONS } from './combat.js';
import { createMissionRunner, MISSION_DEFS } from './missions.js';
import { createActivities, PACKAGE_SPOTS } from './activities.js';
import { createHud } from './hud.js';
import { stageShot } from './shots.js';

const THREE = window.THREE;
const STEP = 1 / 60;
const SAVE_KEY = 'solmar-bay-save-v1';
const START_MINUTES = 724; // 12:04, golden hour over the bay

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

// --- game state ------------------------------------------------------------
const G = {
  seed,
  rng: createRng(seed),
  scene: null,
  camera: null,
  renderer: null,
  city: null,
  marina: null,
  hud: null,
  audio: createAudio(),
  police: null,
  combat: null,
  missions: null,
  activities: null,
  traffic: [],
  peds: [],
  guards: [],
  parked: [],
  player: null,
  playerCar: null,
  missionCar: null,
  screen: 'title', // title | play | pause | dead | shot
  money: 0,
  clockMinutes: START_MINUTES,
  elapsed: 0,
  cameraYaw: 0,
  cameraPitch: 0.32,
  cameraDist: 11,
  keys: {},
  mouseDown: false,
  dragging: false,
  lastDragX: 0,
  lastDragY: 0,
  weapon: 'fists',
  ammo: 12,
  markerTarget: null,
  taxiTarget: null,
  vaultArmed: false,
  saveTimer: 0,
  stepTimer: 0,
  danger: null,
  shotInput: { forward: false, steerTo: null },
  now: 0,
};

function makePlayer() {
  return {
    mesh: createPlayerMesh(),
    x: PLACES.spawn.x,
    z: PLACES.spawn.z,
    y: 0,
    heading: PLACES.spawn.heading,
    health: 100,
    dead: false,
    lastHurtAt: -100,
    walkPhase: 0,
    moving: false,
  };
}

// --- world construction ----------------------------------------------------

function clearDynamic() {
  if (!G.scene) return;
  for (const car of G.traffic) G.scene.remove(car.mesh);
  for (const ped of G.peds) G.scene.remove(ped.mesh);
  for (const guard of G.guards) G.scene.remove(guard.mesh);
  for (const car of G.parked) G.scene.remove(car.mesh);
  if (G.playerCar) G.scene.remove(G.playerCar.mesh);
  if (G.missionCar && G.missionCar !== G.playerCar) G.scene.remove(G.missionCar.mesh);
  if (G.player) G.scene.remove(G.player.mesh);
  G.police.removeAll(G.scene);
  G.traffic = [];
  G.peds = [];
  G.guards = [];
  G.parked = [];
  G.playerCar = null;
  G.missionCar = null;
}

function buildDynamic() {
  G.rng = createRng(G.seed);
  G.traffic = spawnTraffic(G.rng, G.city, 16);
  for (const car of G.traffic) G.scene.add(car.mesh);
  G.peds = spawnPedestrians(G.rng, G.city, 26);
  for (const ped of G.peds) G.scene.add(ped.mesh);
  // Parked cars worth stealing, at fixed spots around the map.
  for (const spot of PARKED_SPOTS) {
    const mesh = createCarMesh(spot.kind);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = G.rng.range(0, Math.PI * 2);
    G.scene.add(mesh);
    G.parked.push({ mesh, kind: spot.kind, heading: -mesh.rotation.y });
  }
  G.player = makePlayer();
  G.scene.add(G.player.mesh);
  G.player.mesh.position.set(G.player.x, 0, G.player.z);
  G.player.mesh.rotation.y = -G.player.heading;
}

function buildMarker() {
  // A beacon of light plus a floating diamond over the current objective.
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2.4, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd21c, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 30;
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.4),
    new THREE.MeshBasicMaterial({ color: 0xffd21c }),
  );
  diamond.position.y = 7;
  group.add(beam, diamond);
  group.visible = false;
  G.scene.add(group);
  return { group, diamond };
}

let marker = null;

function boot() {
  const canvasHolder = document.getElementById('game');
  G.renderer = new THREE.WebGLRenderer({ antialias: true });
  G.renderer.setSize(window.innerWidth, window.innerHeight);
  G.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  canvasHolder.appendChild(G.renderer.domElement);

  G.scene = new THREE.Scene();
  G.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);

  G.city = buildCity(G.scene, G.rng);
  G.marina = buildMarinaDistrict(G.scene, G.rng, G.city);
  marker = buildMarker();
  G.police = createPolice(G.rng, G.city);
  G.combat = createCombat(G.scene, {
    onCrime: (amount, kind) => {
      G.police.addHeat(amount);
      G.danger = { x: G.player.x, z: G.player.z, active: true };
      window.setTimeout(() => { G.danger = null; }, 2500);
    },
    onCopShot: (cop, damage) => {
      G.police.damageCop(cop, damage);
    },
  });
  G.missions = createMissionRunner(G);
  G.activities = createActivities(G);
  G.hud = createHud();
  buildDynamic();

  window.addEventListener('resize', () => {
    G.camera.aspect = window.innerWidth / window.innerHeight;
    G.camera.updateProjectionMatrix();
    G.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  if (shotName) {
    G.screen = 'shot';
    document.getElementById('title').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    stageShot(shotName, shotApi);
    let painted = 0;
    const paint = () => {
      updateCamera(0);
      G.renderer.render(G.scene, G.camera);
      painted += 1;
      if (painted < 3) requestAnimationFrame(paint);
      else window.__shotReady = true;
    };
    requestAnimationFrame(paint);
    return;
  }

  document.getElementById('playBtn').addEventListener('click', () => startGame(false));
  document.getElementById('continueBtn').addEventListener('click', () => startGame(true));
  document.getElementById('resumeBtn').addEventListener('click', () => resumeGame());
  document.getElementById('retryBtn').addEventListener('click', () => retryAfterDeath());
  updateContinueButton();
  bindInput();
  G.hud.setHint('WASD move · mouse drag camera · E enter/exit car · F punch · Click shoot · 1 fists / 2 pistol · P pause');
  requestAnimationFrame(frame);
}

// --- the world API the mission runner, activities and shots use ------------

function setMarker(target) {
  G.markerTarget = target;
  marker.group.visible = !!target;
  if (target) marker.group.position.set(target.x, 0, target.z);
}

G.onDialogue = (name, text) => G.hud.showDialogue(name, text);
// The Mission panel already shows the current objective; toasting it too
// would print the same line twice on the HUD.
G.onObjective = () => {};
G.onPayout = (amount) => {
  G.money += amount;
  G.audio.cash();
  G.hud.showToast(`+$${amount.toLocaleString('en-US')}`);
};
G.onMissionComplete = () => {
  G.audio.missionDone();
};
G.onAlarm = (stars, text) => {
  G.police.addHeat(stars * 100);
  G.audio.alarm();
  G.hud.showToast(text);
};
G.setMarker = setMarker;
G.setTaxiMarker = (target) => { G.taxiTarget = target; };
G.playerPos = () => {
  // Missions, fares and markers track the vehicle when the player is driving:
  // the on-foot position goes stale the moment they get in a car.
  if (G.playerCar) {
    return { x: G.playerCar.mesh.position.x, z: G.playerCar.mesh.position.z };
  }
  return { x: G.player.x, z: G.player.z };
};
G.inMissionCar = () => !!G.playerCar && G.playerCar === G.missionCar;
G.saveGame = () => saveGame();
G.showCrate = (show) => {
  G.marina.crate.visible = show;
  G.marina.crateGlow.visible = show;
};
G.armVault = () => { G.vaultArmed = true; };
G.spawnGuards = (x, z, count) => spawnGuards(x, z, count);
G.placeMissionCar = (kind, x, z, label) => {
  if (G.missionCar) return;
  const car = createPlayerCar(kind);
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = 0.6;
  car.heading = -0.6;
  car.label = label;
  G.scene.add(car.mesh);
  G.missionCar = car;
  G.parked.push({ mesh: car.mesh, kind, heading: car.heading, mission: true });
};
G.tryEnterMissionCar = () => {
  if (!G.missionCar) return;
  enterCar(G.missionCar, true);
};

function spawnGuards(x, z, count) {
  for (let i = 0; i < count; i += 1) {
    const mesh = createPersonMesh(G.rng);
    // Rival crew: red shirts, dark jeans.
    mesh.children.forEach((child) => {
      if (child.material && child.material.color && child.geometry.parameters && child.geometry.parameters.width === 0.72) {
        child.material = new THREE.MeshLambertMaterial({ color: 0xa32a2a });
      }
    });
    mesh.position.set(x + G.rng.range(-4, 4), 0, z + G.rng.range(-4, 4));
    G.scene.add(mesh);
    G.guards.push({ mesh, health: 50, heading: 0, shootTimer: G.rng.range(0.5, 1.5), walkPhase: 0 });
  }
  G.hud.showToast('Rival crew! They are armed — take them down or run.');
}

// --- input -----------------------------------------------------------------

function bindInput() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') {
      G.audio.setMuted(!G.audio.isMuted());
      return;
    }
    G.keys[e.code] = true;
    if (G.screen !== 'play') return;
    if (e.code === 'KeyP') { pauseGame(); return; }
    if (e.code === 'KeyE') { onInteract(); return; }
    if (e.code === 'KeyF') { punch(); return; }
    if (e.code === 'Digit1') { setWeapon('fists'); return; }
    if (e.code === 'Digit2') { setWeapon('pistol'); return; }
    if (e.code === 'KeyR') { reload(); return; }
    if (e.code === 'KeyT') {
      if (G.activities.toggleTaxi(G.rng)) G.hud.showToast('Taxi fare started — pick up the passenger!');
      return;
    }
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
  const canvas = G.renderer.domElement;
  canvas.addEventListener('mousedown', (e) => {
    G.audio.unlock();
    if (G.screen !== 'play') return;
    if (e.button === 0) G.mouseDown = true;
    G.dragging = true;
    G.lastDragX = e.clientX;
    G.lastDragY = e.clientY;
  });
  window.addEventListener('mouseup', () => {
    G.mouseDown = false;
    G.dragging = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!G.dragging || G.screen !== 'play') return;
    const dx = e.clientX - G.lastDragX;
    const dy = e.clientY - G.lastDragY;
    G.lastDragX = e.clientX;
    G.lastDragY = e.clientY;
    G.cameraYaw += dx * 0.005;
    G.cameraPitch = Math.max(0.08, Math.min(0.9, G.cameraPitch + dy * 0.003));
  });
  canvas.addEventListener('wheel', (e) => {
    G.cameraDist = Math.max(6, Math.min(18, G.cameraDist + Math.sign(e.deltaY)));
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === 'play') pauseGame();
  });
}

function inputState() {
  const k = G.keys;
  let forward = !!(k.KeyW || k.ArrowUp);
  let back = !!(k.KeyS || k.ArrowDown);
  let left = !!(k.KeyA || k.ArrowLeft);
  let right = !!(k.KeyD || k.ArrowRight);
  let steer = null;
  if (G.shotInput.forward) {
    forward = true;
    // Steering by heading only makes sense in a car. On foot the camera
    // already aims the player (driveTo points it at the target), and
    // strafing from the same signal would make the player weave.
    if (G.playerCar && G.shotInput.steerTo !== null && G.shotInput.steerTo !== undefined) {
      const heading = G.playerCar.heading;
      let diff = G.shotInput.steerTo - heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      // Proportional steering: a gentle correction for a small error, full
      // lock only for a big one. Binary left/right would weave the car
      // across the whole street at speed.
      steer = Math.max(-1, Math.min(1, diff * 1.5));
    }
  }
  return { forward, back, left, right, run: !!k.ShiftLeft || !!k.ShiftRight, steer };
}

// --- screens ---------------------------------------------------------------

function updateContinueButton() {
  const btn = document.getElementById('continueBtn');
  try {
    btn.style.display = window.localStorage.getItem(SAVE_KEY) ? 'block' : 'none';
  } catch {
    btn.style.display = 'none';
  }
}

function startGame(continueSave) {
  G.audio.unlock();
  G.audio.startMusic();
  document.getElementById('title').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  if (continueSave) loadGame();
  else {
    resetWorld();
    G.missions.startNext();
  }
  G.screen = 'play';
}

function pauseGame() {
  if (G.screen !== 'play') return;
  G.screen = 'pause';
  document.getElementById('pause').style.display = 'flex';
  saveGame();
}

function resumeGame() {
  document.getElementById('pause').style.display = 'none';
  G.screen = 'play';
}

function retryAfterDeath() {
  document.getElementById('dead').style.display = 'none';
  G.player.health = 100;
  G.player.dead = false;
  G.money = Math.floor(G.money * 0.9);
  G.player.x = PLACES.hospital.x;
  G.player.z = PLACES.hospital.z;
  G.player.heading = Math.PI;
  G.player.mesh.position.set(G.player.x, 0, G.player.z);
  G.police.clear();
  G.police.removeAll(G.scene);
  if (G.missions.active) {
    const id = G.missions.active.id;
    const idx = MISSION_DEFS.findIndex((m) => m.id === id);
    if (idx >= 0) G.missions.startMission(idx);
  }
  G.screen = 'play';
  G.audio.startMusic();
  G.hud.showDialogue('Lena', 'You look terrible. Get back out there — the jobs will not wait.');
}

// --- weapons & interaction -------------------------------------------------

function setWeapon(name) {
  G.weapon = name;
  G.player.mesh.userData.gun.visible = name === 'pistol';
  G.hud.showToast(name === 'pistol' ? 'Pistol out' : 'Fists');
}

function reload() {
  if (G.weapon !== 'pistol') return;
  G.ammo = WEAPONS.pistol.ammo;
  G.audio.pickup();
}

function punch() {
  if (G.playerCar) return;
  G.audio.punch();
  const report = G.combat.fire(G.player, 'fists', G.camera, [...G.peds, ...G.guards], G.police.cops, G.traffic, G.now);
  if (report.hit) G.hud.showToast('You landed a hit.');
}

function tryShoot() {
  if (G.playerCar || G.weapon !== 'pistol') return;
  if (G.ammo <= 0) {
    reload();
    return;
  }
  G.ammo -= 1;
  G.audio.shoot();
  const report = G.combat.fire(G.player, 'pistol', G.camera, [...G.peds, ...G.guards], G.police.cops, G.traffic, G.now);
  if (report.hit === 'ped') G.hud.showToast('Bystander down — the cops will hear about this.');
  if (report.hit === 'cop') G.hud.showToast('You shot a cop! Lose them, fast!');
}

function nearestEnterableCar(maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  const consider = (car, parked) => {
    const dx = car.mesh.position.x - G.player.x;
    const dz = car.mesh.position.z - G.player.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD) {
      bestD = d2;
      best = { car, parked };
    }
  };
  for (const car of G.traffic) consider(car, false);
  for (const entry of G.parked) consider(entry, true);
  return best;
}

function enterCar(car, isMission = false) {
  // Remove from whichever list it lived in.
  G.traffic = G.traffic.filter((c) => c !== car && c.mesh !== car.mesh);
  const parkedEntry = G.parked.find((p) => p.mesh === car.mesh);
  if (parkedEntry) G.parked = G.parked.filter((p) => p !== parkedEntry);
  const pc = car.speed !== undefined && car.mesh.userData.bodyLen ? car : null;
  if (pc && pc !== G.missionCar) {
    // A traffic/parked car becomes the player's car.
    G.playerCar = {
      mesh: car.mesh,
      kind: car.kind || 'sedan',
      heading: car.heading ?? 0,
      speed: 0,
      health: 100,
      steer: 0,
      label: car.label,
    };
  } else if (car === G.missionCar) {
    G.playerCar = car;
    G.playerCar.speed = 0;
    G.playerCar.steer = 0;
  } else {
    G.playerCar = createPlayerCar(car.kind || 'sedan');
    G.playerCar.mesh = car.mesh;
    G.playerCar.heading = car.heading ?? 0;
  }
  G.player.mesh.visible = false;
  if (!isMission) G.police.addHeat(40);
  G.audio.engineStart();
  G.hud.showToast(G.playerCar.label ? `You took the ${G.playerCar.label}` : 'You stole the car');
}

function exitCar() {
  if (!G.playerCar) return;
  const car = G.playerCar;
  const side = car.heading + Math.PI / 2;
  G.player.x = car.mesh.position.x + Math.sin(side) * 3.2;
  G.player.z = car.mesh.position.z + Math.cos(side) * 3.2;
  G.player.heading = car.heading;
  G.player.mesh.visible = true;
  G.player.mesh.position.set(G.player.x, 0, G.player.z);
  G.player.mesh.rotation.y = -G.player.heading;
  if (car !== G.missionCar) {
    G.parked.push({ mesh: car.mesh, kind: car.kind, heading: car.heading });
  } else {
    // The mission car stays enterable: park it as the mission car so the
    // player can get back in and finish the delivery.
    G.parked.push({ mesh: car.mesh, kind: car.kind, heading: car.heading, mission: true });
  }
  G.playerCar = null;
  G.audio.setEngine(false, 0);
}

function onInteract() {
  if (G.playerCar) {
    exitCar();
    return;
  }
  if (G.missions.interact()) return;
  const near = nearestEnterableCar(4.5);
  if (near) {
    // The mission car always enters through its own path, so the runner can
    // tell a stolen Comet GT from any other car.
    if (G.missionCar && near.car.mesh === G.missionCar.mesh) G.tryEnterMissionCar();
    else enterCar(near.car, false);
  }
}

// --- save / load -----------------------------------------------------------

function saveGame() {
  try {
    const data = {
      money: G.money,
      health: G.player.health,
      weapon: G.weapon,
      ammo: G.ammo,
      clockMinutes: G.clockMinutes,
      missionsDone: [...G.missions.done],
      packagesFound: [...G.activities.packagesFound],
      player: { x: G.player.x, z: G.player.z, heading: G.player.heading },
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be off: the save then lasts this visit only.
  }
}

function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    resetWorld();
    G.money = data.money || 0;
    G.player.health = data.health ?? 100;
    G.weapon = data.weapon || 'fists';
    G.ammo = data.ammo ?? 12;
    G.clockMinutes = data.clockMinutes || START_MINUTES;
    G.missions.loadDone(data.missionsDone || []);
    G.activities.loadPackages(data.packagesFound || []);
    if (data.player) {
      G.player.x = data.player.x;
      G.player.z = data.player.z;
      G.player.heading = data.player.heading ?? Math.PI;
      G.player.mesh.position.set(G.player.x, 0, G.player.z);
      G.player.mesh.rotation.y = -G.player.heading;
    }
    G.missions.startNext();
    G.hud.showDialogue('Lena', 'Welcome back, Rico. The city kept your seat warm.');
  } catch {
    // A corrupt save starts fresh.
    resetWorld();
    G.missions.startNext();
  }
}

function resetWorld() {
  clearDynamic();
  buildDynamic();
  G.money = 0;
  G.clockMinutes = START_MINUTES;
  G.elapsed = 0;
  G.weapon = 'fists';
  G.ammo = 12;
  G.vaultArmed = false;
  G.markerTarget = null;
  marker.group.visible = false;
  G.police.clear();
  G.missions = createMissionRunner(G);
  G.activities = createActivities(G);
  G.marina.crate.visible = false;
  G.marina.crateGlow.visible = false;
  G.cameraYaw = 0;
  G.cameraPitch = 0.32;
  G.cameraDist = 11;
}

// --- camera ----------------------------------------------------------------

function updateCamera(dt) {
  const target = G.playerCar
    ? { x: G.playerCar.mesh.position.x, z: G.playerCar.mesh.position.z, heading: G.playerCar.heading }
    : { x: G.player.x, z: G.player.z, heading: G.player.heading };
  if (G.screen === 'title') {
    const t = G.elapsed * 0.05;
    G.camera.position.set(Math.cos(t) * 190, 110, Math.sin(t) * 190);
    G.camera.lookAt(0, 20, 0);
    return;
  }
  if (G.playerCar) {
    // Ease the camera behind the car.
    let want = target.heading + Math.PI;
    let diff = want - G.cameraYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    G.cameraYaw += diff * Math.min(1, dt * 2.2);
  }
  const cp = Math.cos(G.cameraPitch);
  const cx = target.x + Math.sin(G.cameraYaw) * cp * G.cameraDist;
  const cz = target.z + Math.cos(G.cameraYaw) * cp * G.cameraDist;
  const cy = Math.sin(G.cameraPitch) * G.cameraDist + 2.5;
  G.camera.position.set(cx, cy, cz);
  G.camera.lookAt(target.x, 2.2, target.z);
}

// --- per-frame update ------------------------------------------------------

function updatePlayerOnFoot(dt, input) {
  const lookX = -Math.sin(G.cameraYaw);
  const lookZ = -Math.cos(G.cameraYaw);
  const rightX = -lookZ;
  const rightZ = lookX;
  let mx = lookX * ((input.forward ? 1 : 0) - (input.back ? 1 : 0)) + rightX * ((input.right ? 1 : 0) - (input.left ? 1 : 0));
  let mz = lookZ * ((input.forward ? 1 : 0) - (input.back ? 1 : 0)) + rightZ * ((input.right ? 1 : 0) - (input.left ? 1 : 0));
  const len = Math.hypot(mx, mz);
  G.player.moving = len > 0.1;
  if (G.player.moving) {
    mx /= len;
    mz /= len;
    const speed = input.run ? 9.5 : 5.2;
    const wantHeading = Math.atan2(mx, mz);
    let diff = wantHeading - G.player.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    G.player.heading += Math.max(-8 * dt, Math.min(8 * dt, diff));
    G.city.slideMove(G.player, mx * speed * dt, mz * speed * dt, 0.7);
    G.player.walkPhase += dt * speed * 1.6;
    const swing = Math.sin(G.player.walkPhase) * 0.55;
    const u = G.player.mesh.userData;
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.8;
    u.armR.rotation.x = swing * 0.8;
    G.stepTimer -= dt;
    if (G.stepTimer <= 0) {
      G.stepTimer = input.run ? 0.28 : 0.42;
      G.audio.step();
    }
  } else {
    const u = G.player.mesh.userData;
    u.legL.rotation.x *= 0.85;
    u.legR.rotation.x *= 0.85;
    u.armL.rotation.x *= 0.85;
    u.armR.rotation.x *= 0.85;
  }
  G.player.mesh.position.set(G.player.x, 0, G.player.z);
  G.player.mesh.rotation.y = -G.player.heading;
}

function updateGuards(dt) {
  for (const guard of G.guards) {
    if (guard.health <= 0) continue;
    const dx = G.player.x - guard.mesh.position.x;
    const dz = G.player.z - guard.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    guard.heading = Math.atan2(dx, dz);
    if (dist > 4) {
      G.city.slideMove(guard.mesh.position, (dx / dist) * 3.6 * dt, (dz / dist) * 3.6 * dt, 0.6);
      guard.walkPhase += dt * 5;
      const swing = Math.sin(guard.walkPhase) * 0.5;
      guard.mesh.userData.legL.rotation.x = swing;
      guard.mesh.userData.legR.rotation.x = -swing;
    }
    guard.mesh.rotation.y = -guard.heading;
    guard.shootTimer -= dt;
    if (dist < 32 && guard.shootTimer <= 0) {
      guard.shootTimer = 1.5;
      G.audio.shoot();
      const from = new THREE.Vector3(guard.mesh.position.x, 1.6, guard.mesh.position.z);
      const to = new THREE.Vector3(G.player.x, 1.4, G.player.z);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([from, to]),
        new THREE.LineBasicMaterial({ color: 0xff6a5a, transparent: true, opacity: 0.8 }),
      );
      G.scene.add(line);
      window.setTimeout(() => {
        G.scene.remove(line);
        line.geometry.dispose();
      }, 120);
      if (!G.playerCar && !G.player.dead) {
        const died = G.combat.hurtPlayer(G.player, 6, G.now);
        if (died) onPlayerDeath();
      }
    }
  }
}

function onPlayerDeath() {
  G.screen = 'dead';
  G.audio.busted();
  G.audio.stopMusic();
  document.getElementById('dead').style.display = 'flex';
}

function update(dt) {
  G.now += dt;
  G.elapsed += dt;
  G.clockMinutes += dt * 0.1;
  const input = inputState();

  // Player.
  if (G.playerCar) {
    const speed = updatePlayerCar(G.playerCar, input, dt, G.city, G.traffic);
    G.audio.setEngine(true, Math.abs(speed) / 38);
    // Ramming a cop car.
    const cop = G.police.touchingCop(G.playerCar.mesh.position.x, G.playerCar.mesh.position.z, 4.2);
    if (cop && Math.abs(G.playerCar.speed) > 6 && G.now - (G.lastRamAt || -10) > 1.5) {
      G.lastRamAt = G.now;
      G.police.damageCop(cop, 30);
      G.playerCar.health -= 5;
      G.playerCar.speed *= 0.5;
      G.audio.crash();
      G.hud.showToast('You rammed a cop car!');
    }
    if (G.playerCar.health <= 0) {
      G.audio.crash();
      G.scene.remove(G.playerCar.mesh);
      G.playerCar = null;
      G.player.mesh.visible = true;
      G.hud.showToast('Your car is wrecked!');
    }
  } else {
    updatePlayerOnFoot(dt, input);
    G.audio.setEngine(false, 0);
    if (G.mouseDown) tryShoot();
  }
  G.combat.update(dt, G.now);

  // World life.
  updateTraffic(G.traffic, dt, G.city, G.playerCar, G.rng);
  updatePedestrians(G.peds, dt, G.city, G.rng, G.danger);
  updateGuards(dt);
  G.marina.update(dt);

  // Wanted & police.
  const busted = G.police.update(dt, G.scene, G.player, !!G.playerCar, G.audio);
  if (busted === 'busted') {
    G.audio.busted();
    G.money = Math.floor(G.money * 0.85);
    G.player.x = PLACES.garage.x;
    G.player.z = PLACES.garage.z;
    G.player.mesh.position.set(G.player.x, 0, G.player.z);
    G.police.clear();
    G.police.removeAll(G.scene);
    G.hud.showDialogue('Lena', 'Busted? I bailed you out. That came out of your cut, Rico.');
    saveGame();
  }

  // Missions, activities, packages.
  G.missions.update(dt);
  // A few seconds after one job ends, Lena calls with the next one.
  if (!G.missions.active && G.missions.done.size > 0 && G.missions.done.size < MISSION_DEFS.length && G.screen === 'play') {
    G.nextMissionTimer = (G.nextMissionTimer || 0) + dt;
    if (G.nextMissionTimer > 5) {
      G.nextMissionTimer = 0;
      G.missions.startNext();
    }
  } else {
    G.nextMissionTimer = 0;
  }
  const where = G.playerPos();
  G.activities.update(dt, where, !!G.playerCar);
  if (!G.playerCar) G.activities.collectPackages({ x: G.player.x, z: G.player.z });

  // Health regen after a quiet spell.
  if (!G.player.dead && G.now - G.player.lastHurtAt > 12 && G.player.health < 100) {
    G.player.health = Math.min(100, G.player.health + 4 * dt);
  }

  // Marker beacon animation.
  if (marker.group.visible) {
    marker.diamond.rotation.y += dt * 2;
    marker.diamond.position.y = 7 + Math.sin(G.now * 2.5) * 0.7;
  }

  // Autosave.
  G.saveTimer += dt;
  if (G.saveTimer > 20) {
    G.saveTimer = 0;
    saveGame();
  }

  // HUD.
  const state = {
    money: G.money,
    health: G.player.health,
    weaponName: WEAPONS[G.weapon].name,
    weapon: G.weapon,
    ammo: G.ammo,
    objective: G.missions.objectiveText(),
    wanted: G.police.wanted,
    clockMinutes: G.clockMinutes,
    speedKmh: G.playerCar ? Math.abs(G.playerCar.speed) * 3.6 : 0,
    inCar: !!G.playerCar,
    carHealth: G.playerCar ? G.playerCar.health : 0,
    district: districtAt(G.player.x, G.player.z),
    packagesFound: G.activities.packagesFound.size,
    packagesTotal: PACKAGE_SPOTS.length,
    showCrosshair: !G.playerCar && G.weapon === 'pistol',
    colliders: G.city.colliders,
    packages: PACKAGE_SPOTS.map((p, i) => ({ x: p.x, z: p.z, found: G.activities.packagesFound.has(i) })),
    taxiTarget: G.taxiTarget,
    missionCar: G.missionCar && G.missionCar !== G.playerCar
      ? { x: G.missionCar.mesh.position.x, z: G.missionCar.mesh.position.z }
      : null,
    cops: G.police.cops.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
    objectiveTarget: G.markerTarget,
    player: { x: G.player.x, z: G.player.z, heading: G.player.heading },
    now: G.now,
  };
  G.hud.update(state);
  updateCamera(dt);
}

let lastTime = 0;
let accumulator = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dtMs = Math.min(250, now - (lastTime || now));
  lastTime = now;
  if (G.screen === 'play') {
    accumulator += dtMs / 1000;
    let guard = 0;
    while (accumulator >= STEP && guard < 8) {
      update(STEP);
      accumulator -= STEP;
      guard += 1;
    }
    if (guard >= 8) accumulator = 0;
  } else if (G.screen === 'title') {
    G.elapsed += dtMs / 1000;
    G.marina.update(dtMs / 1000);
    updateCamera(dtMs / 1000);
  }
  G.renderer.render(G.scene, G.camera);
}

// --- shot mode & debug API -------------------------------------------------

const shotApi = {
  resetWorld,
  shotInput: G.shotInput,
  teleportPlayer(x, z, heading) {
    if (G.playerCar) exitCar();
    G.player.x = x;
    G.player.z = z;
    G.player.heading = heading;
    G.player.mesh.position.set(x, 0, z);
    G.player.mesh.rotation.y = -heading;
  },
  spawnPlayerCar(kind, paint) {
    const car = createPlayerCar(kind, paint);
    car.mesh.position.set(G.player.x, 0, G.player.z);
    car.heading = G.player.heading;
    car.mesh.rotation.y = -car.heading;
    G.scene.add(car.mesh);
    G.playerCar = car;
    G.player.mesh.visible = false;
  },
  setWanted(level) {
    G.police.setWanted(level);
  },
  startMission(index, step) {
    G.missions.startMission(index);
    // Walk the runner forward through the requested steps by the real path:
    // stand on each step's target so the proximity check fires, and press E
    // for interact steps. Only used to stage the mission screenshot.
    for (let s = 0; s < step; s += 1) {
      const cur = G.missions.active;
      if (!cur) break;
      const st = cur.steps[s];
      if (!st) break;
      shotApi.teleportPlayer(st.target.x, st.target.z, G.player.heading);
      G.missions.update(STEP);
      if (G.missions.active && G.missions.active.steps[s] && G.missions.active.steps[s].kind === 'interact') {
        G.missions.interact();
      }
    }
  },
  startFreeRoam() {
    // No active mission: the objective line shows free-roam text.
  },
  spawnGuardsNear(x, z, count) {
    spawnGuards(x, z, count);
  },
  pullCopsNear() {
    if (G.playerCar) {
      G.police.pullCopsNear(
        G.playerCar.mesh.position.x,
        G.playerCar.mesh.position.z,
        G.playerCar.heading,
      );
    }
  },
  setCameraShot(lookHeading, pitch, dist) {
    G.cameraYaw = lookHeading + Math.PI;
    G.cameraPitch = pitch;
    G.cameraDist = dist;
  },
  stepShot(dt) {
    update(dt);
  },
};

// Test & debug handle: the same code paths the player uses, driven by script
// so headless playthroughs can verify every mission end to end.
window.__solmar = {
  get state() {
    return {
      money: G.money,
      health: G.player.health,
      wanted: G.police.wanted,
      mission: G.missions.active ? G.missions.active.id : null,
      objective: G.missions.objectiveText(),
      done: [...G.missions.done],
      packages: G.activities.packagesFound.size,
      fare: G.activities.fare,
      inCar: !!G.playerCar,
      carHealth: G.playerCar ? G.playerCar.health : null,
      carPos: G.playerCar ? { x: G.playerCar.mesh.position.x, z: G.playerCar.mesh.position.z } : null,
      pos: { x: G.player.x, z: G.player.z },
      cops: G.police.cops.length,
      traffic: G.traffic.length,
      peds: G.peds.filter((p) => p.health > 0).length,
      guards: G.guards.filter((g) => g.health > 0).length,
      screen: G.screen,
    };
  },
  start: () => startGame(false),
  teleport: (x, z) => shotApi.teleportPlayer(x, z, G.player.heading),
  setHeading: (h) => { G.player.heading = h; },
  setCameraYaw: (y) => { G.cameraYaw = y; },
  startMission: (i) => G.missions.startMission(i),
  setWanted: (n) => G.police.setWanted(n),
  interact: () => onInteract(),
  enterNearestCar: () => {
    const n = nearestEnterableCar(6);
    if (!n) return false;
    if (G.missionCar && n.car.mesh === G.missionCar.mesh) G.tryEnterMissionCar();
    else enterCar(n.car, false);
    return true;
  },
  exitCar: () => exitCar(),
  setWeapon: (w) => setWeapon(w),
  shootAt: (x, z) => {
    // Aim the camera at a point, then fire the pistol for real.
    const target = new THREE.Vector3(x, 1.4, z);
    G.camera.lookAt(target);
    G.camera.updateMatrixWorld();
    const before = G.ammo;
    G.ammo = Math.max(G.ammo, 1);
    tryShoot();
    G.ammo = before;
  },
  punch: () => punch(),
  startTaxi: () => G.activities.toggleTaxi(G.rng),
  setMoney: (m) => { G.money = m; },
  save: () => saveGame(),
  load: () => loadGame(),
  keys: G.keys,
  shotInput: G.shotInput,
  carDebug() {
    if (!G.playerCar) return null;
    return {
      speed: G.playerCar.speed,
      heading: G.playerCar.heading,
      steer: G.playerCar.steer,
      x: G.playerCar.mesh.position.x,
      z: G.playerCar.mesh.position.z,
      health: G.playerCar.health,
    };
  },
  collidersNear(x, z, r) {
    return G.city.colliders
      .filter((c) => Math.abs(c.x - x) < r + c.hw && Math.abs(c.z - z) < r + c.hd)
      .map((c) => ({ x: c.x, z: c.z, hw: c.hw, hd: c.hd }));
  },
  // Drive the player (on foot or in a car) toward a point using the real
  // input path. Resolves when within `radius` or after `timeoutMs`.
  driveTo(x, z, radius = 5, timeoutMs = 60000) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => {
        const px = G.playerCar ? G.playerCar.mesh.position.x : G.player.x;
        const pz = G.playerCar ? G.playerCar.mesh.position.z : G.player.z;
        const dx = x - px;
        const dz = z - pz;
        if (Math.hypot(dx, dz) < radius || performance.now() - t0 > timeoutMs) {
          G.shotInput.forward = false;
          G.shotInput.steerTo = null;
          resolve(Math.hypot(dx, dz));
          return;
        }
        const want = Math.atan2(dx, dz);
        G.shotInput.forward = true;
        G.shotInput.steerTo = want;
        if (!G.playerCar) {
          // On foot the camera leads: point the camera at the target.
          G.cameraYaw = want + Math.PI;
        } else {
          // In a car, coast into a sharp turn instead of barrelling through
          // the corner: the cornering aid then keeps the arc on the street.
          let diff = want - G.playerCar.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          if (Math.abs(diff) > 0.7 && Math.abs(G.playerCar.speed) > 10) G.shotInput.forward = false;
          // Brake for the corner: shed speed as the waypoint gets close, so
          // the car arrives slow enough to turn inside the intersection.
          if (Math.hypot(dx, dz) < 20 && Math.abs(G.playerCar.speed) > 12) G.shotInput.forward = false;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  },
};

boot();
