// police.js — the wanted system and the police. Heat runs 0 to 5 stars: crimes
// raise it, quiet time cools it. Cops chase in cruisers, ram the player's car,
// and bust the player on foot if they stay close.
import { createCar, driveCar, removeCar, wrapAngle, COP_RAM_SELF_DAMAGE, COP_RAM_DAMAGE } from './vehicles.js';
import { slideMove } from './city.js';

export class Police {
  constructor(scene, city, ctx) {
    this.scene = scene;
    this.city = city;
    this.ctx = ctx;
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
    for (const e of this.cops) removeCar(this.scene, e.car);
    this.cops = [];
    this.bustTimer = 0;
  }
  _remove(entry) {
    removeCar(this.scene, entry.car);
    const i = this.cops.indexOf(entry);
    if (i >= 0) this.cops.splice(i, 1);
  }
  spawnCopNear(x, z) {
    const a = this.ctx.rng.range(0, Math.PI * 2);
    const d = this.ctx.rng.range(30, 48);
    const nx = Math.max(-250, Math.min(250, x + Math.sin(a) * d));
    const nz = Math.max(-250, Math.min(250, z + Math.cos(a) * d));
    const car = createCar(this.scene, 'cop', nx, nz, this.ctx.rng.range(0, Math.PI * 2));
    car.parked = false;
    car.invulnerable = true;
    car.health = 100;
    car.stuckTimer = 0;
    car.lastX = nx;
    car.lastZ = nz;
    car.ramPlayerCooldown = 0;
    const entry = { car, bust: 0 };
    this.cops.push(entry);
    return car;
  }

  update(dt, player) {
    const target = this.wanted === 0 ? 0 : Math.min(this.wanted, 4);
    this.spawnTimer -= dt;
    if (this.cops.length < target && this.spawnTimer <= 0) {
      this.spawnCopNear(player.x, player.z);
      this.spawnTimer = 2;
    }

    // Heat decay: only when the nearest cop is far away.
    let nearest = Infinity;
    for (const e of this.cops) {
      const d = Math.hypot(e.car.x - player.x, e.car.z - player.z);
      if (d < nearest) nearest = d;
    }
    if (this.wanted > 0 && nearest > 45) {
      this.quietTimer += dt;
      if (this.quietTimer > 15) {
        this.decayTimer += dt;
        if (this.decayTimer >= 12) {
          this.decayTimer = 0;
          this.setWanted(this.wanted - 1);
        }
      }
    } else {
      this.quietTimer = 0;
      this.decayTimer = 0;
    }
    if (this.wanted === 0 && this.cops.length > 0) {
      this.clear();
      return;
    }

    for (const entry of this.cops.slice()) {
      const car = entry.car;
      if (car.dead || car.health <= 0) {
        this._remove(entry);
        continue;
      }
      car.ramPlayerCooldown = Math.max(0, car.ramPlayerCooldown - dt);
      const desired = Math.atan2(player.x - car.x, player.z - car.z);
      // Spread copy: the shared CAR_KINDS.cop table is never mutated.
      car.spec = { ...car.spec, top: Math.min(28, 18 + 2 * this.wanted) };
      const res = driveCar(
        car,
        dt,
        { throttle: 1, steer: 0, autoSteer: desired, autoThrottle: true },
        { colliders: this.city.colliders, traffic: null, slideMove, onCrash: this.ctx.onCrash },
      );
      if (res.wrecked) {
        this._remove(entry);
        continue;
      }
      // Stuck detection: less than 0.05 units moved since the last frame.
      const moved = Math.hypot(car.x - car.lastX, car.z - car.lastZ);
      if (moved < 0.05) car.stuckTimer += dt;
      else car.stuckTimer = 0;
      car.lastX = car.x;
      car.lastZ = car.z;
      if (car.stuckTimer > 4) {
        car.stuckTimer = 0;
        const a = Math.random() * Math.PI * 2;
        car.x = Math.max(-250, Math.min(250, player.x + Math.sin(a) * 36));
        car.z = Math.max(-250, Math.min(250, player.z + Math.cos(a) * 36));
        car.speed = 0;
        car.lastX = car.x;
        car.lastZ = car.z;
        car.mesh.position.set(car.x, 0, car.z);
      }
      // Ramming.
      if (player.inCar && player.car && !player.car.dead &&
          Math.hypot(car.x - player.car.x, car.z - player.car.z) < 5) {
        if (Math.abs(player.car.speed) > 6 && player.car.ramCooldown <= 0) {
          car.health -= COP_RAM_DAMAGE;
          player.car.health -= COP_RAM_SELF_DAMAGE;
          player.car.speed *= 0.7;
          player.car.ramCooldown = 2.5;
          if (this.ctx.onCrash) this.ctx.onCrash();
        } else if (car.speed > 6 && car.ramPlayerCooldown <= 0) {
          player.car.health -= 1;
          car.ramPlayerCooldown = 1.5;
          car.speed *= 0.5;
          if (this.ctx.onCrash) this.ctx.onCrash();
        }
      }
      // Busting: on foot, a cop within 3.2 units for 2 continuous seconds.
      if (!player.inCar && this.wanted > 0) {
        const d = Math.hypot(car.x - player.x, car.z - player.z);
        if (d < 3.2) {
          entry.bust += dt;
          if (entry.bust > 2) {
            entry.bust = 0;
            if (this.ctx.onBusted) this.ctx.onBusted();
          }
        } else {
          entry.bust = 0;
        }
      } else {
        entry.bust = 0;
      }
    }
  }
}
