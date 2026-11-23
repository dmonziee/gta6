// Solmar Bay — the wanted system and the police. Heat runs 0 to 5 stars:
// crimes raise it, quiet time cools it. Cops chase in cruisers, ram the
// player's car, and bust the player on foot if they stay close. Getting
// busted costs 15% of the cash and sends Rico back to Lena's Garage.

import { createCar, driveCar, removeCar, wrapAngle, COP_RAM_SELF_DAMAGE, COP_RAM_DAMAGE } from './vehicles.js';
import { slideMove } from './city.js';

export class Police {
  constructor(scene, city, ctx) {
    this.scene = scene;
    this.city = city;
    this.ctx = ctx; // { onBusted, onCrash, playerCar, rng }
    this.wanted = 0;
    this.cops = [];
    this.spawnTimer = 0;
    this.quietTimer = 0;
    this.decayTimer = 0;
    this.bustTimer = 0;
  }

  get count() {
    return this.cops.length;
  }

  setWanted(n) {
    this.wanted = Math.max(0, Math.min(5, Math.round(n)));
    this.quietTimer = 0;
    this.decayTimer = 0;
  }

  addWanted(n) {
    this.setWanted(this.wanted + n);
  }

  clear() {
    for (const cop of this.cops) removeCar(this.scene, cop.car);
    this.cops = [];
    this.bustTimer = 0;
  }

  spawnCopNear(x, z) {
    const rng = this.ctx.rng;
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(30, 48);
    let cx = x + Math.sin(angle) * dist;
    let cz = z + Math.cos(angle) * dist;
    cx = Math.max(-250, Math.min(250, cx));
    cz = Math.max(-250, Math.min(250, cz));
    const car = createCar(this.scene, 'cop', cx, cz, rng.range(0, Math.PI * 2), undefined);
    car.parked = false;
    car.invulnerable = true; // cop health only falls to the player's rams
    car.health = 100;
    car.stuckTimer = 0;
    car.lastX = cx;
    car.lastZ = cz;
    car.ramPlayerCooldown = 0;
    this.cops.push({ car, bust: 0 });
    return car;
  }

  update(dt, player) {
    // player: { x, z, inCar, car }
    const targetCount = this.wanted === 0 ? 0 : Math.min(this.wanted, 4);
    this.spawnTimer -= dt;
    if (this.cops.length < targetCount && this.spawnTimer <= 0) {
      this.spawnCopNear(player.x, player.z);
      this.spawnTimer = 2;
    }
    // Heat cools when nobody is near and nothing has happened lately.
    let nearest = Infinity;
    for (const c of this.cops) {
      nearest = Math.min(nearest, Math.hypot(c.car.x - player.x, c.car.z - player.z));
    }
    if (this.wanted > 0 && nearest > 45) {
      this.quietTimer += dt;
      if (this.quietTimer > 15) {
        this.decayTimer += dt;
        if (this.decayTimer > 12) {
          this.decayTimer = 0;
          this.wanted -= 1;
        }
      }
    } else {
      this.quietTimer = 0;
      this.decayTimer = 0;
    }
    if (this.wanted === 0 && this.cops.length > 0) {
      // The heat is off: the cruisers peel away.
      for (const c of this.cops) removeCar(this.scene, c.car);
      this.cops = [];
    }

    const world = {
      colliders: this.city.colliders,
      traffic: null,
      slideMove,
      onCrash: this.ctx.onCrash,
    };
    const copTop = 18 + 2 * this.wanted;
    // Iterate a snapshot: a bust mid-loop clears the live list, and the
    // loop must not trip over the entries that vanished with it.
    for (const entry of [...this.cops]) {
      if (!this.cops.includes(entry)) continue;
      const cop = entry.car;
      if (cop.dead || cop.health <= 0) {
        removeCar(this.scene, cop);
        this.cops = this.cops.filter((c) => c !== entry);
        continue;
      }
      cop.ramPlayerCooldown = Math.max(0, (cop.ramPlayerCooldown || 0) - dt);
      const desired = Math.atan2(player.x - cop.x, player.z - cop.z);
      cop.spec = { ...cop.spec, top: Math.min(28, copTop) };
      const report = driveCar(cop, dt, { throttle: 1, steer: 0, autoSteer: desired }, world);
      if (report.wrecked) {
        removeCar(this.scene, cop);
        this.cops = this.cops.filter((c) => c !== entry);
        continue;
      }
      // A stuck cruiser repositions onto a street near the player.
      if (Math.hypot(cop.x - cop.lastX, cop.z - cop.lastZ) < 0.5) cop.stuckTimer += dt;
      else cop.stuckTimer = 0;
      cop.lastX = cop.x;
      cop.lastZ = cop.z;
      if (cop.stuckTimer > 4) {
        cop.stuckTimer = 0;
        const a = Math.random() * Math.PI * 2;
        cop.x = Math.max(-250, Math.min(250, player.x + Math.sin(a) * 36));
        cop.z = Math.max(-250, Math.min(250, player.z + Math.cos(a) * 36));
        cop.speed = 0;
      }
      const pCar = player.inCar ? player.car : null;
      if (pCar && !pCar.dead) {
        const d = Math.hypot(cop.x - pCar.x, cop.z - pCar.z);
        if (d < 5) {
          if (Math.abs(pCar.speed) > 6 && pCar.ramCooldown <= 0) {
            // The player rammed the cruiser: it takes 30, the player's
            // car takes a little of its own back.
            cop.health -= COP_RAM_DAMAGE;
            pCar.health -= COP_RAM_SELF_DAMAGE;
            pCar.speed *= 0.7;
            pCar.ramCooldown = 2.5;
            if (this.ctx.onCrash) this.ctx.onCrash();
          } else if (Math.abs(cop.speed) > 6 && cop.ramPlayerCooldown <= 0) {
            pCar.health -= 1;
            cop.ramPlayerCooldown = 1.5;
            cop.speed *= 0.5;
            if (this.ctx.onCrash) this.ctx.onCrash();
          }
        }
      }
      // Busting: on foot, a cruiser parked on top of Rico for two seconds.
      if (!player.inCar && this.wanted > 0) {
        const d = Math.hypot(cop.x - player.x, cop.z - player.z);
        if (d < 3.2) {
          entry.bust += dt;
          if (entry.bust > 2) {
            entry.bust = 0;
            if (this.ctx.onBusted) this.ctx.onBusted();
          }
        } else {
          entry.bust = 0;
        }
      }
    }
  }
}
