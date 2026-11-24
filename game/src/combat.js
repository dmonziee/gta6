// combat.js — Rico on foot, fists and pistol, and the rival guards who shoot
// back. A guard only chases and only shoots while Rico is within 45 units of
// its home post; breaking away past the leash makes it hold its ground.
import { slideMove } from './city.js';

export const GUARD_LEASH = 45;
export const GUARD_HEALTH = 50;
export const GUARD_SPEED = 3.6;
export const GUARD_SHOOT_RANGE = 32;
export const GUARD_SHOT_DELAY = 1.5;
export const GUARD_SHOT_DAMAGE = 8;

export function makePlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x2a4a6a });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), jacket);
  torso.position.y = 1.25;
  g.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 14, 12),
    new THREE.MeshLambertMaterial({ color: 0xd8a878 }),
  );
  head.position.y = 2.05;
  g.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.33, 14, 12),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  hair.scale.y = 0.6;
  hair.position.y = 2.2;
  g.add(hair);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  for (const lx of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.4), legMat);
    leg.position.set(lx, 0.45, 0);
    g.add(leg);
  }
  for (const ax of [-0.528, 0.528]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.9, 0.3), jacket);
    arm.position.set(ax, 1.25, 0);
    g.add(arm);
  }
  return g;
}

export class Combat {
  constructor(scene, city, ctx) {
    this.scene = scene;
    this.city = city;
    this.ctx = ctx;
    this.guards = [];
    this.weapon = 'fists';
    this.ammo = 12;
    this.magSize = 12;
    this.punchTimer = 0;
    this.shotTimer = 0;
  }

  get guardCount() {
    return this.guards.length;
  }
  guardPositions() {
    return this.guards.map((g) => ({ x: g.x, z: g.z }));
  }
  setWeapon(name) {
    if (name === 'pistol' || name === 'fists') this.weapon = name;
  }
  reload() {
    this.ammo = this.magSize;
  }
  spawnGuard(x, z) {
    const g = new THREE.Group();
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.1, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x8a2a2a }),
    );
    torso.position.y = 1.25;
    g.add(torso);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 14, 12),
      new THREE.MeshLambertMaterial({ color: 0xc89878 }),
    );
    head.position.y = 2.05;
    g.add(head);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x1e1e24 });
    for (const lx of [-0.22, 0.22]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.4), legMat);
      leg.position.set(lx, 0.45, 0);
      g.add(leg);
    }
    g.position.set(x, 0, z);
    this.scene.add(g);
    const guard = {
      mesh: g,
      x,
      z,
      home: { x, z },
      health: GUARD_HEALTH,
      shootTimer: 0.5 + Math.random() * 0.8,
      heading: 0,
    };
    this.guards.push(guard);
    return guard;
  }
  clearGuards() {
    for (const g of this.guards) this.scene.remove(g.mesh);
    this.guards = [];
  }
  damageGuard(guard, amount) {
    guard.health -= amount;
    if (guard.health <= 0) {
      this.scene.remove(guard.mesh);
      const i = this.guards.indexOf(guard);
      if (i >= 0) this.guards.splice(i, 1);
      return true;
    }
    return false;
  }
  shootAt(x, z, from) {
    if (this.ammo <= 0) this.reload();
    this.ammo -= 1;
    this.shotTimer = 0.22;
    if (this.ctx.onShoot) this.ctx.onShoot();
    let best = null;
    let bestD = 6;
    for (const g of this.guards) {
      const d = Math.hypot(g.x - x, g.z - z);
      if (d < bestD && Math.hypot(g.x - from.x, g.z - from.z) <= 70) {
        bestD = d;
        best = g;
      }
    }
    if (best) {
      this.damageGuard(best, 26);
      return true;
    }
    return false;
  }
  punch(from, heading) {
    if (this.punchTimer > 0) return false;
    this.punchTimer = 0.38;
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    for (const g of this.guards) {
      const dx = g.x - from.x;
      const dz = g.z - from.z;
      if (Math.hypot(dx, dz) < 2.4 && dx * fx + dz * fz > 0) {
        this.damageGuard(g, 12);
        return true;
      }
    }
    return false;
  }
  update(dt, player) {
    this.punchTimer = Math.max(0, this.punchTimer - dt);
    this.shotTimer = Math.max(0, this.shotTimer - dt);
    const colliders = this.city.colliders.concat(this.city.waterColliders);
    for (const g of this.guards.slice()) {
      const homeDist = Math.hypot(player.x - g.home.x, player.z - g.home.z);
      const dist = Math.hypot(player.x - g.x, player.z - g.z);
      if (homeDist <= GUARD_LEASH) {
        if (dist > 4) {
          const nx = (player.x - g.x) / dist;
          const nz = (player.z - g.z) / dist;
          const res = slideMove(g.x, g.z, nx * GUARD_SPEED * dt, nz * GUARD_SPEED * dt, 0.8, colliders);
          g.x = res.x;
          g.z = res.z;
          g.heading = Math.atan2(player.x - g.x, player.z - g.z);
        }
        if (dist <= GUARD_SHOOT_RANGE && !player.inCar) {
          g.shootTimer -= dt;
          if (g.shootTimer <= 0) {
            g.shootTimer = GUARD_SHOT_DELAY;
            if (this.ctx.damagePlayer) this.ctx.damagePlayer(GUARD_SHOT_DAMAGE);
            if (this.ctx.onGuardShot) this.ctx.onGuardShot();
          }
        } else {
          g.shootTimer = Math.max(g.shootTimer, 0.3);
        }
      } else {
        const hd = Math.hypot(g.home.x - g.x, g.home.z - g.z);
        if (hd > 2) {
          const nx = (g.home.x - g.x) / hd;
          const nz = (g.home.z - g.z) / hd;
          const res = slideMove(g.x, g.z, nx * 2 * dt, nz * 2 * dt, 0.8, colliders);
          g.x = res.x;
          g.z = res.z;
        }
        g.shootTimer = Math.max(g.shootTimer, 0.3);
      }
      g.mesh.position.set(g.x, 0, g.z);
      g.mesh.rotation.y = g.heading;
    }
  }
}
