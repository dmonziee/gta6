// The Solmar Bay police: the wanted system and the cops who enforce it.
// Crimes raise heat; heat decays when the player is out of sight and quiet.
// Cops spawn at the map edge, chase in cars (or on foot at low speed), ram the
// player's car, and bust the player if they stay close on foot for long
// enough. Lose them and the stars cool off one at a time.

import { createCarMesh } from './vehicles.js';

const THREE = window.THREE;

export const WANTED_DECAY_SECONDS = 9;

export function createPolice(rng, city) {
  const cops = [];
  let wanted = 0;
  let heat = 0; // 0..100 inside the current star level
  let coolTimer = 0;
  let bustedTimer = 0;

  function addHeat(amount) {
    heat += amount;
    while (heat >= 100 && wanted < 5) {
      heat -= 100;
      wanted += 1;
    }
    if (wanted === 5) heat = Math.min(heat, 99);
  }

  function spawnCop(scene, nearX, nearZ) {
    const mesh = createCarMesh('police');
    // Spawn on a street near the player, but not on top of them.
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(45, 70);
    let x = nearX + Math.cos(angle) * dist;
    let z = nearZ + Math.sin(angle) * dist;
    x = Math.max(-245, Math.min(245, x));
    z = Math.max(-245, Math.min(245, z));
    if (city.hitsSolid(x, z, 2)) {
      x = Math.round(x / 46) * 46;
      z = Math.round(z / 46) * 46;
    }
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const cop = {
      mesh,
      heading: Math.atan2(nearX - x, nearZ - z),
      speed: 0,
      state: 'chase',
      sirenPhase: rng.range(0, 1),
      health: 100,
    };
    cops.push(cop);
    return cop;
  }

  function removeCop(scene, cop) {
    scene.remove(cop.mesh);
    const i = cops.indexOf(cop);
    if (i >= 0) cops.splice(i, 1);
  }

  return {
    get wanted() {
      return wanted;
    },
    get cops() {
      return cops;
    },
    addHeat,
    setWanted(level) {
      wanted = Math.max(0, Math.min(5, level));
      heat = 0;
    },
    clear() {
      wanted = 0;
      heat = 0;
      coolTimer = 0;
    },
    // Staging only (screenshots): pull every cop car to just behind a point,
    // facing the given heading, so a chase frame shows the pursuit.
    pullCopsNear(x, z, heading) {
      cops.forEach((cop, i) => {
        const back = 14 + i * 7;
        const side = (i - 1) * 5;
        const fx = Math.sin(heading);
        const fz = Math.cos(heading);
        cop.mesh.position.set(
          x - fx * back + fz * side,
          0,
          z - fz * back - fx * side,
        );
        cop.heading = heading;
        cop.speed = 18;
      });
    },
    // Called every frame. Returns 'busted' when the player is caught on foot.
    update(dt, scene, player, playerInCar, audio) {
      // Keep cop count matched to wanted level (0..5 cops, one per star).
      const want = wanted;
      while (cops.length < want) spawnCop(scene, player.x, player.z);
      while (cops.length > want) removeCop(scene, cops[cops.length - 1]);

      let nearestCopDist = Infinity;
      for (const cop of cops) {
        const dx = player.x - cop.mesh.position.x;
        const dz = player.z - cop.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        nearestCopDist = Math.min(nearestCopDist, dist);
        cop.sirenPhase += dt * 2;
        const bar = cop.mesh.userData.lightBar;
        if (bar) {
          const on = Math.sin(cop.sirenPhase * Math.PI * 2) > 0;
          bar[0].material.color.setHex(on ? 0xff2222 : 0x661111);
          bar[1].material.color.setHex(on ? 0x111166 : 0x2244ff);
        }
        // Chase: steer toward the player, faster with more stars.
        const wantHeading = Math.atan2(dx, dz);
        let diff = wantHeading - cop.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        const topSpeed = 16 + wanted * 3.2;
        const target = dist > 6 ? topSpeed : topSpeed * 0.4;
        cop.speed += Math.max(-16 * dt, Math.min(10 * dt, target - cop.speed));
        const step = cop.speed * dt;
        const nx = cop.mesh.position.x + Math.sin(cop.heading) * step;
        const nz = cop.mesh.position.z + Math.cos(cop.heading) * step;
        if (!city.hitsSolid(nx, nz, 2.2)) {
          cop.mesh.position.x = nx;
          cop.mesh.position.z = nz;
        } else {
          // Stuck on a building: reverse out and swing around.
          cop.heading += Math.PI * 0.7;
          cop.speed *= 0.3;
        }
        cop.mesh.rotation.y = -cop.heading;
        for (const w of cop.mesh.userData.wheels) w.rotation.z -= (cop.speed * dt) / 0.42;
      }

      // Busted: a cop stays within arm's reach of the player on foot.
      if (wanted > 0 && !playerInCar && nearestCopDist < 3.2) {
        bustedTimer += dt;
        if (bustedTimer > 2.2) {
          bustedTimer = 0;
          return 'busted';
        }
      } else {
        bustedTimer = Math.max(0, bustedTimer - dt * 2);
      }

      // Cool off: when no cop can see the player, stars drop one at a time.
      if (wanted > 0) {
        const seen = nearestCopDist < 55;
        if (!seen) {
          coolTimer += dt;
          if (coolTimer > WANTED_DECAY_SECONDS) {
            coolTimer = 0;
            wanted -= 1;
            heat = 0;
          }
        } else {
          coolTimer = 0;
        }
      }
      return null;
    },
    // Called when the player rams a cop car hard: the cop takes damage and
    // the chase gets hotter.
    damageCop(cop, amount) {
      cop.health -= amount;
      if (cop.health <= 0) {
        cop.health = 100;
        addHeat(35);
      }
    },
    // A cop car the player is touching (for the driving ram check).
    touchingCop(x, z, radius) {
      for (const cop of cops) {
        const dx = cop.mesh.position.x - x;
        const dz = cop.mesh.position.z - z;
        if (dx * dx + dz * dz < radius * radius) return cop;
      }
      return null;
    },
    removeAll(scene) {
      while (cops.length) removeCop(scene, cops[0]);
    },
  };
}
