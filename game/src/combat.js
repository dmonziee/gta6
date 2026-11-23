// Solmar Bay — combat: Rico on foot, fists and pistol, and the rival
// guards who shoot back.
//
// The guard engagement leash: a guard remembers the spot where it spawned.
// It only chases and only shoots while Rico is within 45 units of that
// home post. Break away past 45 and the guard holds its ground instead of
// gunning Rico down across the whole map — that is what makes the long
// walk back down Pier 9 survivable.

const THREE = window.THREE;

import { slideMove } from './city.js';

export const GUARD_LEASH = 45;
export const GUARD_HEALTH = 50;
export const GUARD_SPEED = 3.6;
export const GUARD_SHOOT_RANGE = 32;
export const GUARD_SHOT_DELAY = 1.5;
export const GUARD_SHOT_DAMAGE = 8;

export function makePlayerMesh() {
  const group = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const jacket = new THREE.MeshLambertMaterial({ color: 0x2a4a6a });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd8a878 });
  const torso = new THREE.Mesh(boxGeo, jacket);
  torso.scale.set(0.9, 1.1, 0.5);
  torso.position.y = 1.25;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skin);
  head.position.y = 2.05;
  head.castShadow = true;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 8), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  hair.scale.set(1, 0.6, 1);
  hair.position.y = 2.2;
  group.add(hair);
  for (const dx of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(boxGeo, jeans);
    leg.scale.set(0.32, 0.9, 0.4);
    leg.position.set(dx, 0.45, 0);
    group.add(leg);
    const arm = new THREE.Mesh(boxGeo, jacket);
    arm.scale.set(0.24, 0.9, 0.3);
    arm.position.set(dx * 2.4, 1.25, 0);
    group.add(arm);
  }
  return group;
}

function makeGuardMesh() {
  const group = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const shirt = new THREE.MeshLambertMaterial({ color: 0x8a2a2a });
  const pants = new THREE.MeshLambertMaterial({ color: 0x1e1e24 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc89878 });
  const torso = new THREE.Mesh(boxGeo, shirt);
  torso.scale.set(0.9, 1.1, 0.5);
  torso.position.y = 1.25;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skin);
  head.position.y = 2.05;
  group.add(head);
  for (const dx of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(boxGeo, pants);
    leg.scale.set(0.32, 0.9, 0.4);
    leg.position.set(dx, 0.45, 0);
    group.add(leg);
  }
  return group;
}

export class Combat {
  constructor(scene, city, ctx) {
    this.scene = scene;
    this.city = city;
    this.ctx = ctx; // { damagePlayer, onShoot }
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
    const mesh = makeGuardMesh();
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const guard = {
      mesh, x, z, home: { x, z }, health: GUARD_HEALTH,
      shootTimer: 0.5 + Math.random() * 0.8, heading: 0,
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
      this.guards = this.guards.filter((g) => g !== guard);
      return true;
    }
    return false;
  }

  // Shoot at a ground point: the nearest guard close to that point and
  // within pistol range takes a 26-damage hit. Auto-reloads on empty.
  shootAt(x, z, from) {
    if (this.ammo <= 0) this.reload();
    this.ammo -= 1;
    this.shotTimer = 0.22;
    if (this.ctx.onShoot) this.ctx.onShoot();
    let best = null, bestD = 6;
    for (const g of this.guards) {
      const dTarget = Math.hypot(g.x - x, g.z - z);
      const dFrom = Math.hypot(g.x - from.x, g.z - from.z);
      if (dTarget < bestD && dFrom <= 70) { best = g; bestD = dTarget; }
    }
    if (best) {
      this.damageGuard(best, 26);
      return true;
    }
    return false;
  }

  // A punch: 12 damage to the nearest guard (or cop on foot) in reach.
  punch(from, heading) {
    if (this.punchTimer > 0) return false;
    this.punchTimer = 0.38;
    const fx = Math.sin(heading), fz = Math.cos(heading);
    for (const g of this.guards) {
      const dx = g.x - from.x, dz = g.z - from.z;
      const d = Math.hypot(dx, dz);
      if (d < 2.4 && (dx * fx + dz * fz) > 0) {
        this.damageGuard(g, 12);
        return true;
      }
    }
    return false;
  }

  update(dt, player) {
    this.punchTimer = Math.max(0, this.punchTimer - dt);
    this.shotTimer = Math.max(0, this.shotTimer - dt);
    for (const g of [...this.guards]) {
      const dHome = Math.hypot(player.x - g.home.x, player.z - g.home.z);
      const dPlayer = Math.hypot(player.x - g.x, player.z - g.z);
      if (dHome <= GUARD_LEASH) {
        // Inside the leash: close in, and shoot inside 32 units — but only
        // at Rico on foot. A guard holds fire on a moving car: the cops
        // are the threat on a hot escape, not a foot soldier's pistol.
        if (dPlayer > 4) {
          const nx = g.x + ((player.x - g.x) / dPlayer) * GUARD_SPEED * dt;
          const nz = g.z + ((player.z - g.z) / dPlayer) * GUARD_SPEED * dt;
          const moved = slideMove(g.x, g.z, nx - g.x, nz - g.z, 0.8, this.city.colliders.concat(this.city.waterColliders));
          g.x = moved.x;
          g.z = moved.z;
          g.heading = Math.atan2(player.x - g.x, player.z - g.z);
        }
        if (dPlayer <= GUARD_SHOOT_RANGE && !player.inCar) {
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
        // Outside the leash: hold ground, drift back toward the post.
        const dBack = Math.hypot(g.home.x - g.x, g.home.z - g.z);
        if (dBack > 2) {
          const nx = g.x + ((g.home.x - g.x) / dBack) * 2 * dt;
          const nz = g.z + ((g.home.z - g.z) / dBack) * 2 * dt;
          const moved = slideMove(g.x, g.z, nx - g.x, nz - g.z, 0.8, this.city.colliders.concat(this.city.waterColliders));
          g.x = moved.x;
          g.z = moved.z;
        }
      }
      g.mesh.position.set(g.x, 0, g.z);
      g.mesh.rotation.y = g.heading;
    }
  }
}
