// police.js — the wanted system and the police who chase, ram and bust.
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
  get count() { return this.cops.length; }
  setWanted(n) {
    this.wanted = Math.max(0, Math.min(5, Math.round(n)));
    this.quietTimer = 0;
    this.decayTimer = 0;
  }
  addWanted(n) {
    this.setWanted(this.wanted + n);
  }
  clear() {
    for (const c of this.cops) removeCar(this.scene, c.car);
    this.cops = [];
    this.bustTimer = 0;
  }
  spawnCopNear(x, z) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 18;
    const cx = Math.max(-250, Math.min(250, x + Math.sin(angle) * dist));
    const cz = Math.max(-250, Math.min(250, z + Math.cos(angle) * dist));
    const car = createCar(this.scene, 'cop', cx, cz, Math.random() * Math.PI * 2);
    car.parked = false;
    car.invulnerable = true;
    car.health = 100;
    car.stuckTimer = 0;
    car.lastX = cx;
    car.lastZ = cz;
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
    // Heat decay: only when every cop is far away.
    let nearest = Infinity;
    for (const c of this.cops) {
      const d = Math.hypot(c.car.x - player.x, c.car.z - player.z);
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
      for (const c of this.cops) removeCar(this.scene, c.car);
      this.cops = [];
    }

    for (const entry of [...this.cops]) {
      const car = entry.car;
      if (car.dead || car.health <= 0) {
        removeCar(this.scene, car);
        this.cops = this.cops.filter(c => c !== entry);
        continue;
      }
      car.ramPlayerCooldown = Math.max(0, (car.ramPlayerCooldown || 0) - dt);
      const desired = Math.atan2(player.x - car.x, player.z - car.z);
      car.spec = { ...car.spec, top: Math.min(28, 18 + 2 * this.wanted) };
      const res = driveCar(car, dt, { throttle: 1, steer: 0, autoSteer: desired, autoThrottle: true }, {
        colliders: this.city.colliders,
        traffic: null,
        slideMove,
        onCrash: this.ctx.onCrash,
      });
      if (res.wrecked) {
        removeCar(this.scene, car);
        this.cops = this.cops.filter(c => c !== entry);
        continue;
      }
      // Stuck detection: a cop whose position barely changes is wedged against
      // a wall. Threshold is per fixed step (1/60s): a freely driving cop at
      // 3 u/s already moves 0.05/step, while a wedged one moves ~0. (A 0.5
      // threshold would fire constantly — even a cop at top speed 28 moves
      // only 0.47/step — rubber-banding every cop to the player every 4s
      // and making wanted decay impossible.)
      const moved = Math.hypot(car.x - car.lastX, car.z - car.lastZ);
      if (moved < 0.05) car.stuckTimer += dt;
      else car.stuckTimer = 0;
      car.lastX = car.x;
      car.lastZ = car.z;
      if (car.stuckTimer > 4) {
        car.stuckTimer = 0;
        const angle = Math.random() * Math.PI * 2;
        car.x = Math.max(-250, Math.min(250, player.x + Math.sin(angle) * 36));
        car.z = Math.max(-250, Math.min(250, player.z + Math.cos(angle) * 36));
        car.speed = 0;
      }
      // Ramming.
      if (player.inCar && player.car && !player.car.dead) {
        const d = Math.hypot(car.x - player.car.x, car.z - player.car.z);
        if (d < 5) {
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
      }
      // Busting, on foot only.
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
