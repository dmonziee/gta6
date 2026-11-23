// Solmar Bay — the five jobs. Lena calls with the next one a few seconds
// after the last pays out. Each mission is a list of steps:
//
//   goto       — walk or drive into the ring
//   interact   — stand in the ring and press E
//   deliver    — reach the ring, on foot or behind the wheel
//   deliverCar — reach the ring while driving
//
// The HUD always shows the current step, and a pulsing yellow diamond
// marks the target. Completing a mission pays out, plays Lena's closing
// line, autosaves, and the next job starts shortly after.

export const MISSION_DEFS = [
  {
    id: 'package', title: 'The Package', payout: 500,
    intro: "Rico, you owe me one job. Pick up the package at the Marina Docks and bring it to my garage. No cops, no questions. — Lena",
    outro: "Debt's a little smaller, jobs are a little bigger. — Lena",
    steps: [
      { kind: 'goto', x: 190, z: 130, r: 7, text: 'Go to the Marina Docks' },
      { kind: 'interact', x: 190, z: 130, r: 6, text: 'Grab the package from the dockside crate (E)' },
      { kind: 'deliver', x: -138, z: 62, r: 7, text: "Deliver the package to Lena's Garage" },
    ],
  },
  {
    id: 'hot-wheels', title: 'Hot Wheels', payout: 900,
    intro: "A Comet GT sits in the Deluxe Auto Lot, keys in it, owner nowhere. Take it to Rook at the chop shop. Try not to bring the whole police force. — Lena",
    outro: 'Clean Comet, worth every cent. — Rook',
    steps: [
      { kind: 'goto', x: 104, z: -138, r: 8, text: 'Go to the Deluxe Auto Lot' },
      { kind: 'interact', x: 104, z: -138, r: 6, text: 'Steal the Comet GT (E)' },
      { kind: 'deliverCar', x: -168, z: -148, r: 8, text: "Deliver the Comet GT to Rook's Chop Shop" },
    ],
  },
  {
    id: 'vault-job', title: 'The Vault Job', payout: 1500,
    intro: 'The bank keeps its morning cash behind a side vault door. Crack it, grab the bag, and get out before the whole city is looking. — Lena',
    outro: 'Fifteen hundred, counted twice. The bank will be changing its locks. — Lena',
    steps: [
      { kind: 'goto', x: 42, z: -38, r: 8, text: 'Go to Solmar Bay Bank' },
      { kind: 'interact', x: 42, z: -38, r: 7, text: 'Crack the vault door (E)' },
      { kind: 'deliver', x: -138, z: 62, r: 7, text: "Escape to Lena's Garage" },
    ],
  },
  {
    id: 'harbor-heist', title: 'Harbor Heist', payout: 2200,
    intro: "A rival crew's boat shipment just landed on Pier 9. One crate, full of cash, guarded by their boys. Take it to Warehouse 7. — Lena",
    outro: "Twenty-two hundred. Those rivals will be turning the marina upside down looking for their crate. — Lena",
    steps: [
      { kind: 'goto', x: 216, z: 196, r: 9, text: 'Go to Pier 9' },
      { kind: 'interact', x: 216, z: 196, r: 7, text: 'Grab the shipment crate (E)' },
      { kind: 'deliver', x: 196, z: -46, r: 8, text: 'Carry the crate to Harbor Warehouse 7' },
    ],
  },
  {
    id: 'solmar-job', title: 'The Solmar Job', payout: 3500,
    intro: "This is the big one — the job the whole debt comes down to. Casino Solmar keeps its weekend take in a vault house on Casino Row. Lift the keycard off the door guard, crack the vault, bring the money home. Tonight the debt ends. — Lena",
    outro: "Thirty-five hundred, counted twice. The debt is done. Solmar Bay is yours now, Rico. — Lena",
    steps: [
      { kind: 'goto', x: 18, z: 177, r: 9, text: 'Drive to Casino Row' },
      { kind: 'interact', x: 18, z: 166, r: 6, text: 'Lift the vault keycard from the casino guard (E)' },
      { kind: 'interact', x: 18, z: 190, r: 7, text: 'Crack the casino vault (E)', crack: true },
      { kind: 'goto', x: 32, z: 177, r: 7, text: 'Get to the getaway car' },
      { kind: 'deliverCar', x: -138, z: 62, r: 8, text: "Deliver the take to Lena's Garage" },
    ],
  },
];

export class MissionRunner {
  // ctx wires the runner to the world: say, toast, addMoney, addWanted,
  // setWanted, spawnGuards, spawnMissionCar, enterCar, setCrate, save,
  // onComplete(id), and a live player() snapshot.
  constructor(ctx) {
    this.ctx = ctx;
    this.current = -1;      // index into MISSION_DEFS, or -1 for free roam
    this.stepIndex = 0;
    this.done = [];
    this.cracking = false;
    this.crackProgress = 0;
    this.nextTimer = 0;     // counts down to the next job after a payout
    this.objective = 'Explore Solmar Bay';
    this.marker = null;
  }

  get currentDef() {
    return this.current >= 0 ? MISSION_DEFS[this.current] : null;
  }

  get currentId() {
    return this.currentDef ? this.currentDef.id : null;
  }

  start(index) {
    if (index < 0 || index >= MISSION_DEFS.length) return false;
    const def = MISSION_DEFS[index];
    if (this.done.includes(def.id)) return false; // never restart a done job
    this.current = index;
    this.stepIndex = 0;
    this.cracking = false;
    this.crackProgress = 0;
    this.nextTimer = 0;
    if (this.ctx.clearGuards) this.ctx.clearGuards();
    if (this.ctx.onMissionStart) this.ctx.onMissionStart(def.id);
    if (this.ctx.say) this.ctx.say(`${def.title}: ${def.intro}`);
    this.refreshObjective();
    return true;
  }

  startByIndex(index) {
    return this.start(index);
  }

  startHarborHeist() {
    return this.start(3);
  }

  startSolmarJob() {
    return this.start(4);
  }

  startNext() {
    for (let i = 0; i < MISSION_DEFS.length; i += 1) {
      if (!this.done.includes(MISSION_DEFS[i].id)) return this.start(i);
    }
    this.current = -1;
    this.objective = 'All jobs done — Solmar Bay is yours. Free roam!';
    this.marker = null;
    return false;
  }

  loadFromSave(doneIds) {
    const list = Array.isArray(doneIds) ? doneIds : (doneIds && doneIds.done) || [];
    this.done = [...list];
    this.current = -1;
    this.stepIndex = 0;
    this.cracking = false;
    this.objective = 'Explore Solmar Bay';
    this.marker = null;
  }

  restartCurrent() {
    if (this.current < 0) return false;
    const index = this.current;
    this.current = -1;
    return this.start(index);
  }

  refreshObjective() {
    const def = this.currentDef;
    if (!def) {
      this.objective = 'Explore Solmar Bay';
      this.marker = null;
      return;
    }
    const step = def.steps[this.stepIndex];
    if (!step) {
      this.objective = def.title;
      this.marker = null;
      return;
    }
    this.objective = `${def.title}: ${step.text}`;
    this.marker = { x: step.x, z: step.z };
  }

  // E pressed (or the test hook): run the current interact step's action.
  interact() {
    const def = this.currentDef;
    if (!def || this.cracking) return false;
    const step = def.steps[this.stepIndex];
    if (!step || step.kind !== 'interact') return false;
    const p = this.ctx.player();
    if (p.inCar) return false;
    if (Math.hypot(p.x - step.x, p.z - step.z) > step.r) return false;
    this.runAction(def, this.stepIndex);
    if (step.crack) {
      // The crack runs on a timer; the step only advances when it finishes.
      this.cracking = true;
      this.crackProgress = 0;
      if (this.ctx.toast) this.ctx.toast('Cracking the casino vault — stay in the ring!');
      return true;
    }
    this.advance();
    return true;
  }

  runAction(def, stepIndex) {
    const ctx = this.ctx;
    if (def.id === 'package' && stepIndex === 1) {
      if (ctx.setCrate) ctx.setCrate('docks', false);
      if (ctx.toast) ctx.toast('Package secured. Get it to Lena.');
    }
    if (def.id === 'hot-wheels' && stepIndex === 1) {
      if (ctx.spawnMissionCar) ctx.spawnMissionCar('sport', 104, -138, -Math.PI / 2, 0xf2c200, true);
      if (ctx.addWanted) ctx.addWanted(1);
      if (ctx.toast) ctx.toast('Stolen Comet GT — the cops are coming!');
      if (ctx.alarm) ctx.alarm();
    }
    if (def.id === 'vault-job' && stepIndex === 1) {
      if (ctx.addWanted) ctx.addWanted(3);
      if (ctx.spawnGuards) ctx.spawnGuards(2, 42, -38);
      if (ctx.toast) ctx.toast('Bank vault open — three stars!');
      if (ctx.alarm) ctx.alarm();
    }
    if (def.id === 'harbor-heist' && stepIndex === 1) {
      if (ctx.setCrate) ctx.setCrate('pier', false);
      if (ctx.addWanted) ctx.addWanted(1);
      if (ctx.spawnGuards) ctx.spawnGuards(2, 216, 196);
      if (ctx.spawnMissionCar) ctx.spawnMissionCar('sport', 190, 130, -Math.PI / 2, 0xc83232, false);
      if (ctx.toast) ctx.toast('Crate secured — fresh Comet waiting at the docks. Time to disappear.');
      if (ctx.alarm) ctx.alarm();
    }
    if (def.id === 'solmar-job' && stepIndex === 1) {
      if (ctx.addWanted) ctx.addWanted(1);
      if (ctx.spawnGuards) ctx.spawnGuards(2, 18, 166);
      if (ctx.toast) ctx.toast('The casino guard made you — one star!');
      if (ctx.alarm) ctx.alarm();
    }
  }

  advance() {
    const def = this.currentDef;
    if (!def) return;
    this.stepIndex += 1;
    if (this.stepIndex >= def.steps.length) {
      this.complete(def);
      return;
    }
    this.refreshObjective();
  }

  complete(def) {
    if (this.ctx.addMoney) this.ctx.addMoney(def.payout);
    if (this.ctx.say) this.ctx.say(def.outro);
    if (this.ctx.toast) this.ctx.toast(`${def.title} complete — +$${def.payout}`);
    if (!this.done.includes(def.id)) this.done.push(def.id);
    if (this.ctx.clearGuards) this.ctx.clearGuards();
    this.current = -1;
    this.stepIndex = 0;
    this.cracking = false;
    this.objective = 'Job done — Lena will call with the next one soon.';
    this.marker = null;
    this.nextTimer = 3;
    if (this.ctx.save) this.ctx.save();
    if (this.ctx.onComplete) this.ctx.onComplete(def.id);
  }

  update(dt) {
    if (this.current < 0) {
      if (this.nextTimer > 0) {
        this.nextTimer -= dt;
        if (this.nextTimer <= 0) this.startNext();
      }
      return;
    }
    const def = this.currentDef;
    const step = def.steps[this.stepIndex];
    if (!step) return;
    const p = this.ctx.player();
    const pos = p.inCar && p.car ? { x: p.car.x, z: p.car.z } : { x: p.x, z: p.z };

    if (this.cracking) {
      // The vault crack: a five-second hold inside the ring. Step out and
      // the held progress drains twice as fast; lose it all and the crack
      // is gone — start again.
      const d = Math.hypot(p.x - step.x, p.z - step.z);
      if (!p.inCar && d <= step.r) this.crackProgress += dt / 5;
      else this.crackProgress -= (dt * 2) / 5;
      if (this.crackProgress >= 1) {
        this.crackProgress = 1;
        this.cracking = false;
        if (this.ctx.setWanted) this.ctx.setWanted(4);
        if (this.ctx.spawnGuards) this.ctx.spawnGuards(2, 18, 166);
        if (this.ctx.spawnMissionCar) this.ctx.spawnMissionCar('sport', 32, 177, -Math.PI / 2, 0xc83232, false);
        if (this.ctx.toast) this.ctx.toast('Casino vault open — four stars! The Comet is outside.');
        if (this.ctx.alarm) this.ctx.alarm();
        this.advance();
        return;
      }
      if (this.crackProgress <= 0) {
        this.crackProgress = 0;
        this.cracking = false;
        if (this.ctx.say) this.ctx.say('Lost the combination — I have to start the crack again. — Rico');
        this.refreshObjective();
        return;
      }
      this.objective = `Cracking the casino vault — ${Math.round(this.crackProgress * 100)}%`;
      return;
    }

    if (step.kind === 'goto' || step.kind === 'deliver') {
      if (Math.hypot(pos.x - step.x, pos.z - step.z) <= step.r) this.advance();
    } else if (step.kind === 'deliverCar') {
      if (p.inCar && Math.hypot(pos.x - step.x, pos.z - step.z) <= step.r) this.advance();
    }
    // 'interact' steps only advance through interact().
  }
}
