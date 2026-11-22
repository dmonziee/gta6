// Combat: Rico himself, his fists and his pistol, and the damage model.
// Shooting is a hitscan ray from the camera through the crosshair; punching
// is a short-range arc in front of the player. Hitting a bystander or a cop
// is a crime — the police module hears about it through the callback.

const THREE = window.THREE;

export const WEAPONS = {
  fists: { name: 'Fists', damage: 12, range: 2.4, rate: 0.38, ammo: Infinity },
  pistol: { name: 'Pistol', damage: 26, range: 70, rate: 0.22, ammo: 12 },
};

// Rico: orange shirt, dark jeans, the wheelman of Solmar Bay.
export function createPlayerMesh() {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: 0xe86a1a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2a3a5a });

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.28), jeans);
  legL.position.set(-0.18, 0.45, 0);
  const legR = legL.clone();
  legR.position.x = 0.18;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.9, 0.44), shirt);
  torso.position.y = 1.35;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), shirt);
  armL.position.set(-0.52, 1.38, 0);
  const armR = armL.clone();
  armR.position.x = 0.52;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skin);
  head.position.y = 2.02;
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.48), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  hair.position.y = 2.26;
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.5), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  gun.position.set(0.52, 1.15, 0.25);
  gun.visible = false;
  g.add(legL, legR, torso, armL, armR, head, hair, gun);
  g.userData = { legL, legR, armL, armR, torso, gun };
  return g;
}

export function createCombat(scene, callbacks) {
  const raycaster = new THREE.Raycaster();
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe95a, transparent: true, opacity: 0.9 });
  let cooldown = 0;
  let tracers = [];
  let flashUntil = 0;

  function addTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, tracerMat);
    scene.add(line);
    tracers.push({ line, life: 0.12 });
  }

  function shootableMeshes(peds, cops, traffic) {
    const meshes = [];
    for (const ped of peds) {
      if (ped.health > 0) meshes.push({ mesh: ped.mesh, kind: 'ped', ref: ped });
    }
    for (const cop of cops) meshes.push({ mesh: cop.mesh, kind: 'cop', ref: cop });
    for (const car of traffic) meshes.push({ mesh: car.mesh, kind: 'car', ref: car });
    return meshes;
  }

  return {
    get cooldown() {
      return cooldown;
    },
    update(dt, now) {
      cooldown = Math.max(0, cooldown - dt);
      for (let i = tracers.length - 1; i >= 0; i -= 1) {
        tracers[i].life -= dt;
        if (tracers[i].life <= 0) {
          scene.remove(tracers[i].line);
          tracers[i].line.geometry.dispose();
          tracers.splice(i, 1);
        }
      }
    },
    // Fire the current weapon. Returns a report of what happened.
    fire(player, weapon, camera, peds, cops, traffic, now) {
      if (cooldown > 0) return { fired: false };
      const spec = WEAPONS[weapon];
      if (!spec) return { fired: false };
      cooldown = spec.rate;
      const origin = new THREE.Vector3(player.x, player.y + 1.6, player.z);
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      if (weapon === 'fists') {
        // Punch: anything living within range and roughly in front.
        const fx = Math.sin(player.heading);
        const fz = Math.cos(player.heading);
        let hit = null;
        for (const ped of peds) {
          if (ped.health <= 0) continue;
          const dx = ped.mesh.position.x - player.x;
          const dz = ped.mesh.position.z - player.z;
          const d = Math.hypot(dx, dz);
          if (d < spec.range && (dx * fx + dz * fz) / Math.max(d, 0.01) > 0.3) {
            hit = { kind: 'ped', ref: ped };
            break;
          }
        }
        if (hit) {
          hit.ref.health -= spec.damage;
          if (hit.ref.health <= 0) {
            hit.ref.mesh.rotation.x = -Math.PI / 2;
            hit.ref.mesh.position.y = 0.4;
          }
          callbacks.onCrime(25, 'assault');
          return { fired: true, hit: 'ped', target: hit.ref };
        }
        return { fired: true, hit: null };
      }
      // Pistol: hitscan against people, cops and cars.
      raycaster.set(origin, dir);
      raycaster.far = spec.range;
      const targets = shootableMeshes(peds, cops, traffic);
      const meshes = targets.map((t) => t.mesh);
      // Raycast against children too (car bodies are groups).
      const hits = raycaster.intersectObjects(meshes, true);
      const end = origin.clone().add(dir.clone().multiplyScalar(spec.range));
      if (hits.length) {
        const hitPoint = hits[0].point;
        addTracer(origin, hitPoint);
        let obj = hits[0].object;
        while (obj.parent && obj.parent !== scene) obj = obj.parent;
        const target = targets.find((t) => t.mesh === obj);
        if (target) {
          if (target.kind === 'ped') {
            target.ref.health -= spec.damage;
            if (target.ref.health <= 0) {
              target.ref.mesh.rotation.x = -Math.PI / 2;
              target.ref.mesh.position.y = 0.4;
            }
            callbacks.onCrime(45, 'shooting');
            return { fired: true, hit: 'ped', target: target.ref, point: hitPoint };
          }
          if (target.kind === 'cop') {
            callbacks.onCrime(50, 'shooting a cop');
            callbacks.onCopShot(target.ref, spec.damage);
            return { fired: true, hit: 'cop', target: target.ref, point: hitPoint };
          }
          if (target.kind === 'car') {
            return { fired: true, hit: 'car', target: target.ref, point: hitPoint };
          }
        }
        return { fired: true, hit: 'wall', point: hitPoint };
      }
      addTracer(origin, end);
      callbacks.onCrime(8, 'discharging a weapon');
      return { fired: true, hit: null };
    },
    // Damage the player; returns true when the player just died.
    hurtPlayer(player, amount, now) {
      if (player.dead) return false;
      player.health -= amount;
      player.lastHurtAt = now;
      if (player.health <= 0) {
        player.health = 0;
        player.dead = true;
        return true;
      }
      return false;
    },
  };
}
