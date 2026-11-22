// Pedestrians: the people who make Solmar Bay feel alive. They stroll the
// sidewalks, cross streets at corners, scatter when a gun goes off or a police
// siren gets close, and — when the player picks a fight — some of them fight
// back.

const THREE = window.THREE;

const SHIRTS = [0xd8e4e8, 0xe86a5a, 0x5a8ad8, 0xe8c33a, 0x8a5ad8, 0x4a9a6a, 0xd88a3a, 0x9a9a9a];
const SKINS = [0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf0c8a0, 0xa86a42];

// A blocky person: legs, torso, arms, head. Limbs swing while walking.
export function createPersonMesh(rng) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: rng.pick(SHIRTS) });
  const skin = new THREE.MeshLambertMaterial({ color: rng.pick(SKINS) });
  const pants = new THREE.MeshLambertMaterial({ color: rng.pick([0x2a3a5a, 0x3a3a3a, 0x5a4a3a, 0x6a2a2a]) });

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), pants);
  legL.position.set(-0.17, 0.43, 0);
  const legR = legL.clone();
  legR.position.x = 0.17;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.85, 0.4), shirt);
  torso.position.y = 1.28;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), shirt);
  armL.position.set(-0.48, 1.3, 0);
  const armR = armL.clone();
  armR.position.x = 0.48;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.95;
  // Hair cap on some pedestrians.
  if (rng.chance(0.6)) {
    const hair = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.16, 0.46),
      new THREE.MeshLambertMaterial({ color: rng.pick([0x1a1a1a, 0x4a2a12, 0x8a8a8a, 0xd8b25a]) }),
    );
    hair.position.y = 2.18;
    g.add(hair);
  }
  g.add(legL, legR, torso, armL, armR, head);
  g.userData = { legL, legR, armL, armR, torso };
  return g;
}

export function spawnPedestrians(rng, city, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = createPersonMesh(rng);
    let x = rng.range(-230, 230);
    let z = rng.range(-230, 230);
    // Prefer sidewalks: nudge onto a street edge rather than inside a block.
    if (city.hitsSolid(x, z, 1)) {
      x = Math.round(x / 46) * 46 + 9;
      z = Math.round(z / 46) * 46 + 9;
    }
    mesh.position.set(x, 0, z);
    peds.push({
      mesh,
      heading: rng.range(0, Math.PI * 2),
      speed: rng.range(1.2, 2.2),
      walkPhase: rng.range(0, Math.PI * 2),
      state: 'stroll',
      fear: 0,
      health: 30,
      targetX: x,
      targetZ: z,
      retarget: rng.range(2, 8),
      fighting: false,
    });
  }
  return peds;
}

function pickStrollTarget(ped, rng, city) {
  for (let tries = 0; tries < 6; tries += 1) {
    const x = ped.mesh.position.x + rng.range(-50, 50);
    const z = ped.mesh.position.z + rng.range(-50, 50);
    if (!city.hitsSolid(x, z, 1) && Math.abs(x) < 245 && Math.abs(z) < 245) {
      ped.targetX = x;
      ped.targetZ = z;
      return;
    }
  }
  ped.targetX = ped.mesh.position.x;
  ped.targetZ = ped.mesh.position.z;
}

export function updatePedestrians(peds, dt, city, rng, danger) {
  for (const ped of peds) {
    if (ped.health <= 0) continue; // down — stays down until respawned by main
    const pos = ped.mesh.position;
    // Fear: gunshots and nearby sirens make people run away from the danger.
    if (danger && danger.active) {
      const dx = pos.x - danger.x;
      const dz = pos.z - danger.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 900) {
        ped.state = 'flee';
        ped.fear = 3;
        ped.targetX = pos.x + (dx / Math.max(1, Math.sqrt(d2))) * 60;
        ped.targetZ = pos.z + (dz / Math.max(1, Math.sqrt(d2))) * 60;
      }
    }
    if (ped.fear > 0) {
      ped.fear -= dt;
      if (ped.fear <= 0 && ped.state === 'flee') ped.state = 'stroll';
    }
    if (ped.state === 'stroll') {
      ped.retarget -= dt;
      const dx = ped.targetX - pos.x;
      const dz = ped.targetZ - pos.z;
      if (dx * dx + dz * dz < 4 || ped.retarget <= 0) {
        pickStrollTarget(ped, rng, city);
        ped.retarget = rng.range(4, 10);
      }
    }
    const dx = ped.targetX - pos.x;
    const dz = ped.targetZ - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.5) {
      const want = Math.atan2(dx, dz);
      let diff = want - ped.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ped.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
      const speed = ped.state === 'flee' ? ped.speed * 2.6 : ped.speed;
      city.slideMove(pos, Math.sin(ped.heading) * speed * dt, Math.cos(ped.heading) * speed * dt, 0.6);
      ped.walkPhase += dt * speed * 4;
      const swing = Math.sin(ped.walkPhase) * (ped.state === 'flee' ? 0.7 : 0.45);
      ped.mesh.userData.legL.rotation.x = swing;
      ped.mesh.userData.legR.rotation.x = -swing;
      ped.mesh.userData.armL.rotation.x = -swing * 0.8;
      ped.mesh.userData.armR.rotation.x = swing * 0.8;
    } else {
      ped.mesh.userData.legL.rotation.x *= 0.9;
      ped.mesh.userData.legR.rotation.x *= 0.9;
      ped.mesh.userData.armL.rotation.x *= 0.9;
      ped.mesh.userData.armR.rotation.x *= 0.9;
    }
    ped.mesh.rotation.y = -ped.heading;
  }
}

// Find the nearest living pedestrian to a point.
export function nearestPed(peds, x, z, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const ped of peds) {
    if (ped.health <= 0) continue;
    const dx = ped.mesh.position.x - x;
    const dz = ped.mesh.position.z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD) {
      bestD = d2;
      best = ped;
    }
  }
  return best;
}
