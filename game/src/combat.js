// combat.js — Rico on foot, fists and pistol, and guards who shoot back within their leash.
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
  torso.position.set(0, 1.25, 0);
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshLambertMaterial({ color: 0xd8a878 }));
  head.position.set(0, 2.05, 0);
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 10), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  hair.scale.y = 0.6;
  hair.position.set(0, 2.2, 0);
  g.add(hair);
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  for (const lx of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.4), jeans);
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
  get guardCount() { return this.guards.length; }
  guardPositions() {
    return this.guards.map(g => ({ x: g.x, z: g.z }));
  }
  setWeapon(name) {
    if (name === 'pistol' || name === 'fists') this.weapon = name;
  }
  reload() {
    this.ammo = this.magSize;
  }
  spawnGuard(x, z) {
    const mesh = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), new THREE.MeshLambertMaterial({ color: 0x8a2a2a }));
    torso.position.set(0, 1.25, 0);
    mesh.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshLambertMaterial({ color: 0xc89878 }));
    head.position.set(0, 2.05, 0);
    mesh.add(head);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x1e1e24 });
    for (const lx of [-0.22, 0.22]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.4), legMat);
      leg.position.set(lx, 0.45, 0);
      mesh.add(leg);
    }
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const guard = { mesh, x, z, home: { x, z }, health: GUARD_HEALTH, shootTimer: 0.5 + Math.random() * 0.8, heading: 0 };
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
      this.guards = this.guards.filter(g => g !== guard);
      return true;
    }
    return false;
  }
  shootAt(x, z, from) {
    if (this.ammo <= 0) this.reload();
    this.ammo -= 1;
    this.shotTimer = 0.22;
    if (this.ctx.onShoot) this.ctx.onShoot();
    let best = null, bestDist = Infinity;
    for (const g of this.guards) {
      const dTarget = Math.hypot(g.x - x, g.z - z);
      const dShooter = Math.hypot(g.x - from.x, g.z - from.z);
      if (dTarget < 6 && dShooter <= 70 && dTarget < bestDist) { best = g; bestDist = dTarget; }
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
    const fx = Math.sin(heading), fz = Math.cos(heading);
    for (const g of [...this.guards]) {
      const dx = g.x - from.x, dz = g.z - from.z;
      if (Math.hypot(dx, dz) <= 2.4 && dx * fx + dz * fz > 0) {
        this.damageGuard(g, 12);
        return true;
      }
    }
    return false;
  }
  update(dt, player) {
    this.punchTimer = Math.max(0, this.punchTimer - dt);
    this.shotTimer = Math.max(0, this.shotTimer - dt);
    const solids = [...this.city.colliders, ...this.city.waterColliders];
    for (const g of [...this.guards]) {
      const distHome = Math.hypot(player.x - g.home.x, player.z - g.home.z);
      const distGuard = Math.hypot(player.x - g.x, player.z - g.z);
      if (distHome <= GUARD_LEASH) {
        if (distGuard > 4) {
          const dx = player.x - g.x, dz = player.z - g.z;
          const len = Math.hypot(dx, dz) || 1;
          const moved = slideMove(g.x, g.z, dx / len * GUARD_SPEED * dt, dz / len * GUARD_SPEED * dt, 0.8, solids);
          g.x = moved.x; g.z = moved.z;
          g.heading = Math.atan2(dx, dz);
        }
        if (distGuard <= GUARD_SHOOT_RANGE && !player.inCar) {
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
        const dx = g.home.x - g.x, dz = g.home.z - g.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 2) {
          const moved = slideMove(g.x, g.z, dx / dist * 2 * dt, dz / dist * 2 * dt, 0.8, solids);
          g.x = moved.x; g.z = moved.z;
        }
      }
      g.mesh.position.set(g.x, 0, g.z);
      g.mesh.rotation.y = g.heading;
    }
  }
}
