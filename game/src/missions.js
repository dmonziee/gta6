// Lena Cruz's jobs — the story spine of Solmar Bay. Four missions, each one
// bigger than the last, each a chain of steps: go somewhere, do something,
// get away. The runner below owns the state machine; the world object it is
// given (built by main.js) supplies the verbs: dialogue, spawning guards and
// cars, wanted heat, payouts and saving.

import { PLACES } from './city.js';

// Step kinds:
//   goto      — walk or drive into the target ring
//   interact  — stand in the ring and press E
//   deliver   — reach the ring (on foot, unless requireCar)
//   deliverCar— reach the ring while driving the mission car
export const MISSION_DEFS = [
  {
    id: 'package',
    title: 'The Package',
    pay: 500,
    intro: "Rico. You owe me one job, and it starts now. Pick up the package at the Marina Docks and bring it to my garage. No cops, no questions.",
    complete: 'Clean run, Rico. The debt just got smaller — and the jobs just got bigger.',
    steps: [
      { kind: 'goto', text: 'Pick up the package at the Marina Docks', target: PLACES.docks, radius: 7 },
      { kind: 'interact', text: 'Grab the package from the dockside crate', target: PLACES.docks, radius: 6, label: 'package' },
      { kind: 'deliver', text: "Bring the package to Lena's Garage", target: PLACES.garage, radius: 7 },
    ],
  },
  {
    id: 'hot-wheels',
    title: 'Hot Wheels',
    pay: 900,
    intro: 'A Comet GT is sitting in the Deluxe Auto Lot, keys in it, owner nowhere. Take it. Bring it to Rook at the chop shop. Try not to bring the whole police force with you.',
    complete: "Rook says the Comet is clean and worth every cent. You're getting good at this, Rico.",
    steps: [
      { kind: 'goto', text: 'Get to the Deluxe Auto Lot', target: PLACES.carLot, radius: 8 },
      { kind: 'interact', text: 'Steal the Comet GT (press E by the car)', target: PLACES.carLot, radius: 6, label: 'comet' },
      { kind: 'deliverCar', text: "Deliver the Comet GT to Rook's Chop Shop", target: PLACES.chopShop, radius: 8 },
    ],
  },
  {
    id: 'vault-job',
    title: 'The Vault Job',
    pay: 1500,
    intro: 'Solmar Bay Bank keeps its morning cash behind a side vault door. Crack it, grab the bag, and get out before the whole city is looking for you.',
    complete: 'Fifteen hundred, counted twice. The bank will change its locks. We will change our plans.',
    steps: [
      { kind: 'goto', text: 'Get to Solmar Bay Bank', target: PLACES.bank, radius: 8 },
      { kind: 'interact', text: 'Crack the vault door (press E)', target: PLACES.bank, radius: 7, label: 'vault' },
      { kind: 'deliver', text: "Escape the heat — get to Lena's Garage", target: PLACES.garage, radius: 7 },
    ],
  },
  {
    id: 'harbor-heist',
    title: 'Harbor Heist',
    pay: 2200,
    intro: "A rival crew's boat shipment just landed on Pier 9 — one crate, full of cash, guarded by their boys. Take it from them, Rico. Take it to Warehouse 7, and the debt is done.",
    complete: 'Twenty-two hundred. The rivals will be looking for their crate. Let them look — the debt is paid, Rico. You are free.',
    steps: [
      { kind: 'goto', text: 'Get to Pier 9 at the Marina', target: PLACES.pierEnd, radius: 9 },
      { kind: 'interact', text: 'Grab the shipment crate (press E)', target: PLACES.pierEnd, radius: 7, label: 'crate' },
      { kind: 'deliver', text: 'Carry the crate to Harbor Warehouse 7', target: PLACES.warehouse, radius: 8 },
    ],
  },
];

export function createMissionRunner(world) {
  let missionIndex = -1; // -1: none started
  let stepIndex = 0;
  let active = null;
  let done = new Set();
  let crateCarried = false;
  let interactReady = false;

  function currentDef() {
    return active;
  }

  function objectiveText() {
    if (!active) {
      if (done.size >= MISSION_DEFS.length) return 'All jobs done — Solmar Bay is yours, Rico.';
      if (done.size > 0) return 'Lena has another job for you — hang tight…';
      return 'Welcome to Solmar Bay';
    }
    const step = active.steps[stepIndex];
    return step ? step.text : '';
  }

  function startMission(index) {
    missionIndex = index;
    stepIndex = 0;
    active = MISSION_DEFS[index];
    crateCarried = false;
    world.onDialogue('Lena', active.intro);
    world.onObjective(active.steps[0].text);
    if (active.id === 'hot-wheels') world.placeMissionCar('sport', PLACES.carLot.x + 4, PLACES.carLot.z, 'Comet GT');
    if (active.id === 'harbor-heist') world.showCrate(true);
    world.setMarker(active.steps[0].target);
  }

  function startNext() {
    for (let i = 0; i < MISSION_DEFS.length; i += 1) {
      if (!done.has(MISSION_DEFS[i].id)) {
        startMission(i);
        return true;
      }
    }
    return false;
  }

  function advance() {
    stepIndex += 1;
    if (stepIndex >= active.steps.length) {
      completeMission();
      return;
    }
    const step = active.steps[stepIndex];
    world.onObjective(step.text);
    world.setMarker(step.target);
    // Step-specific set-up.
    if (step.label === 'vault') world.armVault();
    if (step.label === 'crate') world.showCrate(true);
  }

  function completeMission() {
    const finished = active;
    done.add(finished.id);
    world.onPayout(finished.pay);
    world.onDialogue('Lena', finished.complete);
    world.onMissionComplete(finished);
    active = null;
    missionIndex = -1;
    stepIndex = 0;
    world.setMarker(null);
    world.showCrate(false);
    world.saveGame();
  }

  function nearStepTarget(radius) {
    const step = active.steps[stepIndex];
    const p = world.playerPos();
    const dx = p.x - step.target.x;
    const dz = p.z - step.target.z;
    return dx * dx + dz * dz < radius * radius;
  }

  function update(dt) {
    if (!active) return;
    const step = active.steps[stepIndex];
    if (!step) return;
    if (step.kind === 'goto' || step.kind === 'deliver') {
      if (nearStepTarget(step.radius)) advance();
    } else if (step.kind === 'deliverCar') {
      if (world.inMissionCar() && nearStepTarget(step.radius)) advance();
    } else if (step.kind === 'interact') {
      interactReady = nearStepTarget(step.radius);
      if (step.label === 'comet') {
        // Stealing the car also counts as the interaction when the player
        // gets in it.
        if (world.inMissionCar()) {
          world.onAlarm(1, 'You stole the Comet GT — the lot called it in!');
          advance();
        }
      }
    }
  }

  // E pressed: resolve the current interact step, if the player is in range.
  function interact() {
    if (!active) return false;
    const step = active.steps[stepIndex];
    if (!step || step.kind !== 'interact' || !interactReady) return false;
    if (step.label === 'package') {
      world.onDialogue('Rico', 'Got it. Small package, big trouble, probably.');
      advance();
      return true;
    }
    if (step.label === 'comet') {
      world.tryEnterMissionCar();
      return true;
    }
    if (step.label === 'vault') {
      world.onAlarm(3, 'Vault alarm! The whole city heard that!');
      world.spawnGuards(PLACES.bank.x + 6, PLACES.bank.z + 4, 2);
      advance();
      return true;
    }
    if (step.label === 'crate') {
      crateCarried = true;
      world.showCrate(false);
      world.onAlarm(2, "The rival crew saw you take the crate!");
      world.spawnGuards(PLACES.pierEnd.x - 8, PLACES.pierEnd.z - 6, 2);
      world.onDialogue('Rico', 'Crate secured. Time to disappear.');
      advance();
      return true;
    }
    return false;
  }

  return {
    get active() {
      return active;
    },
    get done() {
      return done;
    },
    get crateCarried() {
      return crateCarried;
    },
    get interactReady() {
      return interactReady;
    },
    objectiveText,
    startNext,
    startMission,
    update,
    interact,
    loadDone(ids) {
      done = new Set(ids);
    },
    // For the harbor heist: the crate rides with the player once grabbed.
    startHarborHeist() {
      const i = MISSION_DEFS.findIndex((m) => m.id === 'harbor-heist');
      if (i >= 0 && !done.has('harbor-heist')) startMission(i);
    },
  };
}
