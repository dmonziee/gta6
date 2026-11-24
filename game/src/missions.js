// missions.js — the six jobs. Lena calls with the next one a few seconds after the last pays out.
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
    intro: 'A Comet GT sits in the Deluxe Auto Lot, keys in it, owner nowhere. Take it to Rook at the chop shop. Try not to bring the whole police force. — Lena',
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
    outro: 'Twenty-two hundred. Those rivals will be turning the marina upside down looking for their crate. — Lena',
    steps: [
      { kind: 'goto', x: 216, z: 196, r: 9, text: 'Go to Pier 9' },
      { kind: 'interact', x: 216, z: 196, r: 7, text: 'Grab the shipment crate (E)' },
      { kind: 'deliver', x: 196, z: -46, r: 8, text: 'Carry the crate to Harbor Warehouse 7' },
    ],
  },
  {
    id: 'solmar-job', title: 'The Solmar Job', payout: 3500,
    intro: 'This is the big one — the job the whole debt comes down to. Casino Solmar keeps its weekend take in a vault house on Casino Row. Lift the keycard off the door guard, crack the vault, bring the money home. Tonight the debt ends. — Lena',
    outro: 'Thirty-five hundred, counted twice. The debt is done. Solmar Bay is yours now, Rico. — Lena',
    steps: [
      { kind: 'goto', x: 18, z: 177, r: 9, text: 'Drive to Casino Row' },
      { kind: 'interact', x: 18, z: 166, r: 6, text: 'Lift the vault keycard from the casino guard (E)' },
      { kind: 'interact', x: 18, z: 190, r: 7, text: 'Crack the casino vault (E)', crack: true, crackLabel: 'casino vault', guardX: 18, guardZ: 166, getawayX: 32, getawayZ: 177 },
      { kind: 'goto', x: 32, z: 177, r: 7, text: 'Get to the getaway car' },
      { kind: 'deliverCar', x: -138, z: 62, r: 8, text: "Deliver the take to Lena's Garage" },
    ],
  },
  {
    id: 'airlift', title: 'The Airlift', payout: 4500,
    intro: 'Lena calls: A cargo plane just landed at Solmar Airport with a hold full of cash, and the crew is still on the tarmac. Lift the manifest, crack the hold, and bring it home before the tower calls it in. — Lena',
    outro: 'Forty-five hundred, counted twice. That airport job was the loudest one yet, and it still paid. — Lena',
    steps: [
      { kind: 'goto', x: 100, z: 150, r: 9, text: 'Drive to Solmar Airport' },
      { kind: 'interact', x: 100, z: 150, r: 6, text: 'Lift the cargo manifest from the terminal desk (E)' },
      { kind: 'interact', x: 118, z: 200, r: 7, text: 'Crack the cargo plane hold (E)', crack: true, crackLabel: 'cargo plane hold', guardX: 118, guardZ: 200, getawayX: 100, getawayZ: 168 },
      { kind: 'goto', x: 100, z: 168, r: 7, text: 'Get to the getaway car' },
      { kind: 'deliverCar', x: -138, z: 62, r: 8, text: "Deliver the cargo to Lena's Garage" },
    ],
  },
];

export class MissionRunner {
  constructor(ctx) {
    this.ctx = ctx;
    this.current = -1;
    this.stepIndex = 0;
    this.done = [];
    this.cracking = false;
    this.crackProgress = 0;
    this.nextTimer = 0;
    this.objective = 'Explore Solmar Bay';
    this.marker = null;
  }
  get currentDef() { return this.current >= 0 ? MISSION_DEFS[this.current] : null; }
  get currentId() { return this.currentDef ? this.currentDef.id : null; }
  start(index) {
    if (index < 0 || index >= MISSION_DEFS.length) return false;
    if (this.done.includes(MISSION_DEFS[index].id)) return false;
    this.current = index;
    this.stepIndex = 0;
    this.cracking = false;
    this.crackProgress = 0;
    this.nextTimer = 0;
    if (this.ctx.clearGuards) this.ctx.clearGuards();
    if (this.ctx.onMissionStart) this.ctx.onMissionStart(MISSION_DEFS[index].id);
    const def = MISSION_DEFS[index];
    this.ctx.say(`${def.title} — ${def.intro}`);
    this.refreshObjective();
    return true;
  }
  startByIndex(index) { return this.start(index); }
  startHarborHeist() { return this.start(3); }
  startSolmarJob() { return this.start(4); }
  startNext() {
    for (let i = 0; i < MISSION_DEFS.length; i++) {
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
    const idx = this.current;
    this.current = -1;
    return this.start(idx);
  }
  refreshObjective() {
    if (this.current < 0 || !this.currentDef) {
      this.objective = 'Explore Solmar Bay';
      this.marker = null;
      return;
    }
    const def = this.currentDef;
    if (this.stepIndex >= def.steps.length) {
      this.objective = def.title;
      this.marker = null;
      return;
    }
    const step = def.steps[this.stepIndex];
    this.objective = `${def.title}: ${step.text}`;
    this.marker = { x: step.x, z: step.z };
  }
  interact() {
    if (this.current < 0 || !this.currentDef) return false;
    if (this.cracking) return false;
    const def = this.currentDef;
    const step = def.steps[this.stepIndex];
    if (!step || step.kind !== 'interact') return false;
    const p = this.ctx.player();
    if (p.inCar) return false;
    if (Math.hypot(p.x - step.x, p.z - step.z) > step.r) return false;
    this.runAction(def, this.stepIndex);
    if (step.crack) {
      this.cracking = true;
      this.crackProgress = 0;
      const label = step.crackLabel || 'casino vault';
      this.ctx.toast(`Cracking the ${label} — stay in the ring!`);
      return true;
    }
    this.advance();
    return true;
  }
  runAction(def, stepIndex) {
    if (def.id === 'package' && stepIndex === 1) {
      if (this.ctx.setCrate) this.ctx.setCrate('docks', false);
      this.ctx.toast('Package secured. Get it to Lena.');
    } else if (def.id === 'hot-wheels' && stepIndex === 1) {
      if (this.ctx.spawnMissionCar) this.ctx.spawnMissionCar('sport', 104, -138, -Math.PI / 2, 0xf2c200, true);
      if (this.ctx.addWanted) this.ctx.addWanted(1);
      this.ctx.toast('Stolen Comet GT — the cops are coming!');
      if (this.ctx.alarm) this.ctx.alarm();
    } else if (def.id === 'vault-job' && stepIndex === 1) {
      if (this.ctx.addWanted) this.ctx.addWanted(3);
      if (this.ctx.spawnGuards) this.ctx.spawnGuards(2, 42, -38);
      this.ctx.toast('Bank vault open — three stars!');
      if (this.ctx.alarm) this.ctx.alarm();
    } else if (def.id === 'harbor-heist' && stepIndex === 1) {
      if (this.ctx.setCrate) this.ctx.setCrate('pier', false);
      if (this.ctx.addWanted) this.ctx.addWanted(1);
      if (this.ctx.spawnGuards) this.ctx.spawnGuards(2, 216, 196);
      if (this.ctx.spawnMissionCar) this.ctx.spawnMissionCar('sport', 190, 130, -Math.PI / 2, 0xc83232, false);
      this.ctx.toast('Crate secured — fresh Comet waiting at the docks. Time to disappear.');
      if (this.ctx.alarm) this.ctx.alarm();
    } else if (def.id === 'solmar-job' && stepIndex === 1) {
      if (this.ctx.addWanted) this.ctx.addWanted(1);
      if (this.ctx.spawnGuards) this.ctx.spawnGuards(2, 18, 166);
      this.ctx.toast('The casino guard made you — one star!');
      if (this.ctx.alarm) this.ctx.alarm();
    } else if (def.id === 'airlift' && stepIndex === 1) {
      if (this.ctx.addWanted) this.ctx.addWanted(1);
      if (this.ctx.spawnGuards) this.ctx.spawnGuards(2, 100, 150);
      this.ctx.toast('The airport crew made you — one star!');
      if (this.ctx.alarm) this.ctx.alarm();
    }
  }
  advance() {
    this.stepIndex += 1;
    const def = this.currentDef;
    if (def && this.stepIndex >= def.steps.length) {
      this.complete(def);
    } else {
      this.refreshObjective();
    }
  }
  complete(def) {
    this.ctx.addMoney(def.payout);
    this.ctx.say(def.outro);
    this.ctx.toast(`${def.title} complete — +$${def.payout}`);
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
    if (this.current < 0 || !this.currentDef) {
      if (this.nextTimer > 0) {
        this.nextTimer -= dt;
        if (this.nextTimer <= 0) this.startNext();
      }
      return;
    }
    const def = this.currentDef;
    const step = def.steps[this.stepIndex];
    if (!step) return;
    if (this.cracking) {
      const p = this.ctx.player();
      const dist = Math.hypot(p.x - step.x, p.z - step.z);
      if (!p.inCar && dist <= step.r) {
        this.crackProgress = Math.min(1, this.crackProgress + dt / 5);
      } else {
        this.crackProgress = Math.max(0, this.crackProgress - dt * 2 / 5);
      }
      if (this.crackProgress >= 1 - 1e-6) { // epsilon: 300 steps sum to 0.9999999999999961 in float
        this.crackProgress = 1;
        this.cracking = false;
        if (this.ctx.setWanted) this.ctx.setWanted(4);
        const guardX = step.guardX !== undefined ? step.guardX : step.x;
        const guardZ = step.guardZ !== undefined ? step.guardZ : step.z;
        if (this.ctx.spawnGuards) this.ctx.spawnGuards(2, guardX, guardZ);
        const getawayX = step.getawayX !== undefined ? step.getawayX : 32;
        const getawayZ = step.getawayZ !== undefined ? step.getawayZ : 177;
        if (this.ctx.spawnMissionCar) this.ctx.spawnMissionCar('sport', getawayX, getawayZ, -Math.PI / 2, 0xc83232, false);
        if (def.id === 'airlift') {
          this.ctx.toast('Cargo hold open — four stars! The Comet is outside the terminal.');
        } else {
          this.ctx.toast('Casino vault open — four stars! The Comet is outside.');
        }
        if (this.ctx.alarm) this.ctx.alarm();
        this.advance();
        return;
      }
      if (this.crackProgress <= 0) {
        this.crackProgress = 0;
        this.cracking = false;
        this.ctx.say('Lost the combination — I have to start the crack again. — Rico');
        this.refreshObjective();
        return;
      }
      this.objective = `Cracking the ${step.crackLabel || 'casino vault'} — ${Math.round(this.crackProgress * 100)}%`;
      return;
    }
    const p = this.ctx.player();
    const pos = p.inCar && p.car ? { x: p.car.x, z: p.car.z } : { x: p.x, z: p.z };
    if (step.kind === 'goto' || step.kind === 'deliver') {
      if (Math.hypot(pos.x - step.x, pos.z - step.z) <= step.r) this.advance();
    } else if (step.kind === 'deliverCar') {
      if (p.inCar && Math.hypot(pos.x - step.x, pos.z - step.z) <= step.r) this.advance();
    }
  }
}
