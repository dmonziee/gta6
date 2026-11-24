// missions.js — the seven jobs. Lena calls with the next one a few seconds after
// the last pays out. Each mission is a list of steps; the HUD shows the current
// step and a pulsing yellow diamond marks the target.

export const MISSION_DEFS = [
  {
    id: 'package',
    title: 'The Package',
    payout: 500,
    intro: "Rico, you owe me one job. Pick up the package at the Marina Docks and bring it to my garage. No cops, no questions. — Lena",
    outro: "Debt's a little smaller, jobs are a little bigger. — Lena",
    steps: [
      { kind: 'goto', x: 190, z: 130, r: 7, text: 'Go to the Marina Docks' },
      { kind: 'interact', x: 190, z: 130, r: 6, text: 'Grab the package from the dockside crate (E)' },
      { kind: 'deliver', x: -138, z: 62, r: 7, text: "Deliver the package to Lena's Garage" },
    ],
  },
  {
    id: 'hot-wheels',
    title: 'Hot Wheels',
    payout: 900,
    intro: 'A Comet GT sits in the Deluxe Auto Lot, keys in it, owner nowhere. Take it to Rook at the chop shop. Try not to bring the whole police force. — Lena',
    outro: 'Clean Comet, worth every cent. — Rook',
    steps: [
      { kind: 'goto', x: 104, z: -138, r: 8, text: 'Go to the Deluxe Auto Lot' },
      { kind: 'interact', x: 104, z: -138, r: 6, text: 'Steal the Comet GT (E)' },
      { kind: 'deliverCar', x: -168, z: -148, r: 8, text: "Deliver the Comet GT to Rook's Chop Shop" },
    ],
  },
  {
    id: 'vault-job',
    title: 'The Vault Job',
    payout: 1500,
    intro: 'The bank keeps its morning cash behind a side vault door. Crack it, grab the bag, and get out before the whole city is looking. — Lena',
    outro: 'Fifteen hundred, counted twice. The bank will be changing its locks. — Lena',
    steps: [
      { kind: 'goto', x: 42, z: -38, r: 8, text: 'Go to Solmar Bay Bank' },
      { kind: 'interact', x: 42, z: -38, r: 7, text: 'Crack the vault door (E)' },
      { kind: 'deliver', x: -138, z: 62, r: 7, text: "Escape to Lena's Garage" },
    ],
  },
  {
    id: 'harbor-heist',
    title: 'Harbor Heist',
    payout: 2200,
    intro: "A rival crew's boat shipment just landed on Pier 9. One crate, full of cash, guarded by their boys. Take it to Warehouse 7. — Lena",
    outro: 'Twenty-two hundred. Those rivals will be turning the marina upside down looking for their crate. — Lena',
    steps: [
      { kind: 'goto', x: 216, z: 196, r: 9, text: 'Go to Pier 9' },
      { kind: 'interact', x: 216, z: 196, r: 7, text: 'Grab the shipment crate (E)' },
      { kind: 'deliver', x: 196, z: -46, r: 8, text: 'Carry the crate to Harbor Warehouse 7' },
    ],
  },
  {
    id: 'solmar-job',
    title: 'The Solmar Job',
    payout: 3500,
    intro: 'This is the big one — the job the whole debt comes down to. Casino Solmar keeps its weekend take in a vault house on Casino Row. Lift the keycard off the door guard, crack the vault, bring the money home. Tonight the debt ends. — Lena',
    outro: 'Thirty-five hundred, counted twice. The debt is done. Solmar Bay is yours now, Rico. — Lena',
    steps: [
      { kind: 'goto', x: 18, z: 177, r: 9, text: 'Drive to Casino Row' },
      { kind: 'interact', x: 18, z: 166, r: 6, text: 'Lift the vault keycard from the casino guard (E)' },
      { kind: 'interact', x: 18, z: 190, r: 7, text: 'Crack the casino vault (E)', crack: true },
      { kind: 'goto', x: 32, z: 177, r: 7, text: 'Get to the getaway car' },
      { kind: 'deliverCar', x: -138, z: 62, r: 8, text: "Deliver the take to Lena's Garage" },
    ],
  },
  {
    id: 'airlift',
    title: 'The Airlift',
    payout: 4500,
    intro: 'A cargo plane just landed at Solmar Airport with a hold full of cash, and the crew is still on the tarmac. Lift the manifest, crack the hold, and bring it home before the tower calls it in. — Lena',
    outro: 'Forty-five hundred, counted twice. That airport job was the loudest one yet, and it still paid. — Lena',
    steps: [
      { kind: 'goto', x: 100, z: 150, r: 9, text: 'Drive to Solmar Airport' },
      { kind: 'interact', x: 100, z: 150, r: 6, text: 'Lift the cargo manifest from the terminal desk (E)' },
      { kind: 'interact', x: 118, z: 200, r: 7, text: 'Crack the cargo plane hold (E)', crack: true },
      { kind: 'goto', x: 100, z: 168, r: 7, text: 'Get to the getaway car' },
      { kind: 'deliverCar', x: -138, z: 62, r: 8, text: 'Deliver the cargo to Lena\'s Garage' },
    ],
  },
  {
    id: 'ocean-drive',
    title: 'The Ocean Drive Job',
    payout: 5500,
    intro: 'The Ocean Palms hotel keeps its weekend take in a drop safe at the end of the pier, and the desk keeps the ledger. Lift the ledger, crack the safe, and bring it all home — and Rico, the whole beach will be watching. — Lena',
    outro: 'Fifty-five hundred, counted twice. Seven jobs, and the debt is long gone — Solmar Bay is yours, Rico. — Lena',
    steps: [
      { kind: 'goto', x: 16, z: 223, r: 9, text: 'Drive to Ocean Drive' },
      { kind: 'interact', x: 16, z: 234, r: 6, text: 'Lift the hotel ledger from the Ocean Palms desk (E)' },
      { kind: 'interact', x: 55, z: 258, r: 7, text: 'Crack the pier-end drop safe (E)', crack: true },
      { kind: 'goto', x: 6, z: 223, r: 7, text: 'Get to the getaway car' },
      { kind: 'deliverCar', x: -138, z: 62, r: 8, text: "Deliver the ledger to Lena's Garage" },
    ],
  },
];

// Crack completion side effects, by mission id. The five-second hold, the drain
// rate and the failure dialogue are identical for all three crack missions.
const CRACK_TABLE = {
  'solmar-job': {
    label: 'Cracking the casino vault',
    wanted: 4,
    guardAt: { x: 18, z: 166 },
    carAt: { x: 32, z: 177 },
    carColour: 0xc83232,
    toast: 'Casino vault open — four stars! The Comet is outside.',
  },
  airlift: {
    label: 'Cracking the cargo hold',
    wanted: 4,
    guardAt: { x: 118, z: 200 },
    carAt: { x: 100, z: 168 },
    carColour: 0xc83232,
    toast: 'Cargo hold open — four stars! The Comet is outside the terminal.',
  },
  'ocean-drive': {
    label: 'Cracking the pier-end drop safe',
    wanted: 5,
    guardAt: { x: 55, z: 258 },
    carAt: { x: 6, z: 223 },
    carColour: 0xf2c200,
    toast: 'Drop safe open — five stars! The Comet is on Ocean Drive.',
  },
};

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

  get currentDef() {
    return this.current >= 0 ? MISSION_DEFS[this.current] : null;
  }
  get currentId() {
    return this.currentDef ? this.currentDef.id : null;
  }

  start(index) {
    if (index < 0 || index >= MISSION_DEFS.length) return false;
    const def = MISSION_DEFS[index];
    if (this.done.includes(def.id)) return false;
    this.current = index;
    this.stepIndex = 0;
    this.cracking = false;
    this.crackProgress = 0;
    this.nextTimer = 0;
    if (this.ctx.clearGuards) this.ctx.clearGuards();
    if (this.ctx.onMissionStart) this.ctx.onMissionStart(def.id);
    this.ctx.say(def.title + ' — ' + def.intro);
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
  startAirlift() {
    return this.start(5);
  }
  startOceanDrive() {
    return this.start(6);
  }
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
    const ids = Array.isArray(doneIds) ? doneIds : (doneIds && doneIds.done) || [];
    this.done = ids.slice();
    this.current = -1;
    this.stepIndex = 0;
    this.cracking = false;
    this.crackProgress = 0;
    this.objective = 'Explore Solmar Bay';
    this.marker = null;
  }
  restartCurrent() {
    if (this.current < 0) return false;
    const i = this.current;
    this.current = -1;
    return this.start(i);
  }
  refreshObjective() {
    if (this.current < 0) {
      this.objective = 'Explore Solmar Bay';
      this.marker = null;
      return;
    }
    const def = this.currentDef;
    const step = def.steps[this.stepIndex];
    if (!step) {
      this.objective = def.title;
      this.marker = null;
      return;
    }
    this.objective = def.title + ': ' + step.text;
    this.marker = { x: step.x, z: step.z };
  }
  interact() {
    if (this.current < 0) return false;
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
      const entry = CRACK_TABLE[def.id];
      const label = entry ? entry.label : 'Cracking the vault';
      this.ctx.toast(label + ' — stay in the ring!');
      return true;
    }
    this.advance();
    return true;
  }
  runAction(def, stepIndex) {
    const ctx = this.ctx;
    const alarm = () => { if (ctx.alarm) ctx.alarm(); };
    if (def.id === 'package' && stepIndex === 1) {
      ctx.setCrate('docks', false);
      ctx.toast('Package secured. Get it to Lena.');
    } else if (def.id === 'hot-wheels' && stepIndex === 1) {
      ctx.spawnMissionCar('sport', 104, -138, -Math.PI / 2, 0xf2c200, true);
      ctx.addWanted(1);
      ctx.toast('Stolen Comet GT — the cops are coming!');
      alarm();
    } else if (def.id === 'vault-job' && stepIndex === 1) {
      ctx.addWanted(3);
      ctx.spawnGuards(2, 42, -38);
      ctx.toast('Bank vault open — three stars!');
      alarm();
    } else if (def.id === 'harbor-heist' && stepIndex === 1) {
      ctx.setCrate('pier', false);
      ctx.addWanted(1);
      ctx.spawnGuards(2, 216, 196);
      ctx.spawnMissionCar('sport', 190, 130, -Math.PI / 2, 0xc83232, false);
      ctx.toast('Crate secured — fresh Comet waiting at the docks. Time to disappear.');
      alarm();
    } else if (def.id === 'solmar-job' && stepIndex === 1) {
      ctx.addWanted(1);
      ctx.spawnGuards(2, 18, 166);
      ctx.toast('The casino guard made you — one star!');
      alarm();
    } else if (def.id === 'airlift' && stepIndex === 1) {
      ctx.addWanted(1);
      ctx.spawnGuards(2, 100, 150);
      ctx.toast('The airport crew made you — one star!');
      alarm();
    } else if (def.id === 'ocean-drive' && stepIndex === 1) {
      ctx.addWanted(1);
      ctx.spawnGuards(2, 16, 234);
      ctx.toast('The hotel crew made you — one star!');
      alarm();
    }
  }
  advance() {
    this.stepIndex++;
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
    this.ctx.toast(def.title + ' complete — +$' + def.payout);
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
    if (this.cracking) {
      const d = Math.hypot(p.x - step.x, p.z - step.z);
      if (!p.inCar && d <= step.r) {
        this.crackProgress += dt / 5;
      } else {
        this.crackProgress -= (dt * 2) / 5;
      }
      if (this.crackProgress >= 1) {
        this.crackProgress = 1;
        this.cracking = false;
        const entry = CRACK_TABLE[def.id];
        if (entry) {
          this.ctx.setWanted(entry.wanted);
          this.ctx.spawnGuards(2, entry.guardAt.x, entry.guardAt.z);
          this.ctx.spawnMissionCar('sport', entry.carAt.x, entry.carAt.z, -Math.PI / 2, entry.carColour, false);
          this.ctx.toast(entry.toast);
          if (this.ctx.alarm) this.ctx.alarm();
        }
        this.advance();
      } else if (this.crackProgress <= 0) {
        this.crackProgress = 0;
        this.cracking = false;
        this.ctx.say('Lost the combination — I have to start the crack again. — Rico');
        this.refreshObjective();
      } else {
        const entry = CRACK_TABLE[def.id];
        const label = entry ? entry.label : 'Cracking the vault';
        this.objective = label + ' — ' + Math.round(this.crackProgress * 100) + '%';
      }
      return;
    }
    if (step.kind === 'goto' || step.kind === 'deliver') {
      const pos = p.inCar && p.car ? { x: p.car.x, z: p.car.z } : { x: p.x, z: p.z };
      if (Math.hypot(pos.x - step.x, pos.z - step.z) <= step.r) this.advance();
    } else if (step.kind === 'deliverCar') {
      if (p.inCar && p.car) {
        if (Math.hypot(p.car.x - step.x, p.car.z - step.z) <= step.r) this.advance();
      }
    }
  }
}
