// Solmar Bay — cars: physics, traffic, and collision damage.
//
// Damage numbers (mission-4 escape fix, applied here and nowhere else):
//   traffic hit above speed 8  -> 4 car health (was 6), speed halved
//   hard wall hit above speed 10 -> 5 car health (was 8), speed cut to 40%
//   ramming a cop above speed 6 -> 3 of your car's health (was 5),
//     the cop takes 30, with a 1.5 s cooldown between rams.
// A car starts at 100 health and is wrecked at zero. Wall brushes at or
// below the speed thresholds cost nothing, so a careful driver keeps the
// car alive through a long hot escape.

const THREE = window.THREE;

export const CAR_KINDS = {
  sedan: { top: 26, accel: 16, brake: 30, turn: 2.0 },
  sport: { top: 38, accel: 22, brake: 34, turn: 2.3 },
  taxi: { top: 24, accel: 14, brake: 28, turn: 1.9 },
  van: { top: 22, accel: 12, brake: 26, turn: 1.7 },
  cop: { top: 34, accel: 20, brake: 32, turn: 2.1 },
};

export const TRAFFIC_DAMAGE = 4;
export const WALL_DAMAGE = 5;
export const COP_RAM_SELF_DAMAGE = 3;
export const COP_RAM_DAMAGE = 30;

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const CAR_COLORS = {
  sedan: [0x3a6fd8, 0x8a8a8a, 0x4a8a3a, 0xd8d8d0],
  sport: [0xc83232, 0xe8c832, 0x2a5fd8, 0x3a3a40],
  taxi: [0xe8c832],
  van: [0x8a8a8a, 0x5a6a7a],
  cop: [0x222831],
};

export function makeCarMesh(kind, color) {
  const group = new THREE.Group();
  const bodyColor = color !== undefined ? color : CAR_COLORS[kind][0];
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x14141c });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const body = new THREE.Mesh(boxGeo, bodyMat);
  body.scale.set(2.0, 0.9, 4.4);
  body.position.y = 0.65;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(boxGeo, darkMat);
  cabin.scale.set(1.8, 0.7, 2.2);
  cabin.position.set(0, 1.4, -0.2);
  cabin.castShadow = true;
  group.add(cabin);
  if (kind === 'cop') {
    const barMat = new THREE.MeshBasicMaterial({ color: 0x3a5aff });
    const bar = new THREE.Mesh(boxGeo, barMat);
    bar.scale.set(1.2, 0.25, 0.5);
    bar.position.set(0, 1.85, -0.2);
    group.add(bar);
    const stripe = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xd8d8d0 }));
    stripe.scale.set(2.05, 0.3, 4.42);
    stripe.position.y = 0.75;
    group.add(stripe);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x222222 }));
    sign.scale.set(1.0, 0.3, 0.5);
    sign.position.set(0, 1.9, -0.2);
    group.add(sign);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0e0e12 });
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
  }
  return group;
}

// A car in the world. x/z/heading/speed are the physics state; mesh is the
// three.js group that follows it.
export function createCar(scene, kind, x, z, heading, color) {
  const spec = CAR_KINDS[kind] || CAR_KINDS.sedan;
  const mesh = makeCarMesh(kind, color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return {
    kind, spec, mesh, x, z, heading,
    speed: 0, health: 100, maxHealth: 100,
    steer: 0, dead: false, parked: true,
    wallCooldown: 0, trafficCooldown: 0, ramCooldown: 0, copRamCooldown: 0,
  };
}

export function removeCar(scene, car) {
  scene.remove(car.mesh);
  car.dead = true;
}

// Shared car physics: throttle/steer in, collisions out. `world` carries
// colliders, the traffic list, and callbacks for crash sounds and wrecking.
// autoSteer (an absolute heading) overrides the steering input when given;
// autoThrottle true means full throttle. Returns a small report.
export function driveCar(car, dt, input, world) {
  if (car.dead) return { wrecked: false };
  car.wallCooldown = Math.max(0, car.wallCooldown - dt);
  car.trafficCooldown = Math.max(0, car.trafficCooldown - dt);
  car.ramCooldown = Math.max(0, car.ramCooldown - dt);
  car.copRamCooldown = Math.max(0, car.copRamCooldown - dt);

  let steer = input.steer || 0;
  if (input.autoSteer !== null && input.autoSteer !== undefined) {
    steer = Math.max(-1, Math.min(1, wrapAngle(input.autoSteer - car.heading) * 1.6));
  }
  car.steer = steer;
  // Hard steering cannot hold top speed, so the turn radius stays tight
  // enough to make a 90-degree street corner without cutting the block.
  const topEff = car.spec.top * (1 - 0.4 * Math.abs(steer));
  let throttle = input.throttle || 0;
  if (input.autoThrottle) throttle = 1;
  if (throttle > 0) {
    car.speed = Math.min(topEff, car.speed + car.spec.accel * dt);
  } else if (throttle < 0) {
    if (car.speed > 0.5) car.speed = Math.max(0, car.speed - car.spec.brake * dt);
    else car.speed = Math.max(-8, car.speed - car.spec.accel * 0.6 * dt);
  } else {
    car.speed -= car.speed * 0.6 * dt;
    if (Math.abs(car.speed) < 0.05) car.speed = 0;
  }
  const turnAuthority = Math.max(-1, Math.min(1, car.speed / 10));
  car.heading += steer * car.spec.turn * turnAuthority * dt;
  if (car.speed > topEff) car.speed = Math.max(topEff, car.speed - car.spec.accel * dt);

  const dx = Math.sin(car.heading) * car.speed * dt;
  const dz = Math.cos(car.heading) * car.speed * dt;
  const moved = world.slideMove(car.x, car.z, dx, dz, 2.2, world.colliders);
  const hitWall = moved.hit;
  car.x = moved.x;
  car.z = moved.z;
  let wrecked = false;
  if (hitWall) {
    if (Math.abs(car.speed) > 10 && car.wallCooldown <= 0 && !car.invulnerable) {
      car.health -= WALL_DAMAGE;
      car.speed *= 0.4;
      car.wallCooldown = 0.5;
      if (world.onCrash) world.onCrash();
    } else {
      car.speed *= 0.998;
    }
  }
  // Traffic: a hard hit costs health and halves speed; the traffic car
  // is shoved aside so a narrow street never deadlocks.
  if (world.traffic) {
    for (const t of world.traffic) {
      if (t === car || t.dead) continue;
      const ddx = t.x - car.x, ddz = t.z - car.z;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < 4.6 * 4.6) {
        const d = Math.sqrt(d2) || 0.01;
        const push = (4.6 - d) / 2;
        const px = (ddx / d) * push, pz = (ddz / d) * push;
        t.x += px; t.z += pz;
        car.x -= px * 0.4; car.z -= pz * 0.4;
        if (Math.abs(car.speed) > 8 && car.trafficCooldown <= 0 && !car.invulnerable) {
          car.health -= TRAFFIC_DAMAGE;
          car.speed *= 0.5;
          car.trafficCooldown = 0.6;
          if (world.onCrash) world.onCrash();
        }
        t.speed = Math.max(t.speed, 6);
      }
    }
  }
  if (car.health <= 0) {
    car.health = 0;
    wrecked = true;
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  return { wrecked, hitWall };
}

// --- traffic -------------------------------------------------------------

export function spawnTraffic(scene, rng, count, streets) {
  const cars = [];
  const kinds = ['sedan', 'sedan', 'taxi', 'van', 'sport'];
  for (let i = 0; i < count; i += 1) {
    const kind = kinds[i % kinds.length];
    const vertical = rng.chance(0.5);
    const line = rng.pick(streets);
    const along = rng.range(-240, 240);
    const x = vertical ? line + rng.pick([-2.2, 2.2]) : along;
    const z = vertical ? along : line + rng.pick([-2.2, 2.2]);
    const heading = vertical ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    const car = createCar(scene, kind, x, z, heading, undefined);
    car.parked = false;
    car.speed = rng.range(9, 13);
    car.cruise = car.speed;
    car.lane = line;
    car.target = null;
    cars.push(car);
  }
  return cars;
}

function nearestStreetOf(v, streets) {
  let best = streets[0];
  for (const s of streets) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
  return best;
}

// Traffic cruises the grid: steer toward the next intersection, turn there
// sometimes, slow down for the car ahead, and wrap around the map edge.
export function updateTrafficCar(car, dt, streets, playerCar) {
  if (car.dead) return;
  if (!car.target || Math.hypot(car.target.x - car.x, car.target.z - car.z) < 8) {
    const sx = nearestStreetOf(car.x, streets);
    const sz = nearestStreetOf(car.z, streets);
    const eastWest = Math.abs(Math.sin(car.heading)) > 0.7;
    if (eastWest) {
      const dir = Math.sin(car.heading) > 0 ? 1 : -1;
      const crossX = nearestStreetOf(car.x + dir * 24, streets);
      if (Math.abs(car.x - crossX) > 8) {
        car.target = { x: crossX, z: sz }; // drive on to the intersection
      } else if (Math.random() < 0.7) {
        car.target = { x: car.x + dir * 92, z: sz }; // straight on
      } else {
        car.target = { x: crossX, z: sz + (Math.random() < 0.5 ? -92 : 92) }; // turn
      }
    } else {
      const dir = Math.cos(car.heading) > 0 ? 1 : -1;
      const crossZ = nearestStreetOf(car.z + dir * 24, streets);
      if (Math.abs(car.z - crossZ) > 8) {
        car.target = { x: sx, z: crossZ }; // drive on to the intersection
      } else if (Math.random() < 0.7) {
        car.target = { x: sx, z: car.z + dir * 92 }; // straight on
      } else {
        car.target = { x: sx + (Math.random() < 0.5 ? -92 : 92), z: crossZ }; // turn
      }
    }
    car.target.x = Math.max(-250, Math.min(250, car.target.x));
    car.target.z = Math.max(-250, Math.min(250, car.target.z));
  }
  // Slow for the player's car ahead instead of rear-ending it.
  let cruise = car.cruise || 11;
  if (playerCar && !playerCar.dead) {
    const rx = playerCar.x - car.x, rz = playerCar.z - car.z;
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    const along = rx * fx + rz * fz;
    const side = Math.abs(rx * fz - rz * fx);
    if (along > 0 && along < 16 && side < 4) cruise = Math.min(cruise, 4);
  }
  const desired = Math.atan2(car.target.x - car.x, car.target.z - car.z);
  const steer = Math.max(-1, Math.min(1, wrapAngle(desired - car.heading) * 1.8));
  const speedErr = cruise - car.speed;
  car.speed += Math.max(-14 * dt, Math.min(10 * dt, speedErr));
  car.heading += steer * 1.6 * Math.max(0, Math.min(1, car.speed / 10)) * dt;
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  if (car.x < -252) car.x = 252;
  if (car.x > 252) car.x = -252;
  if (car.z < -252) car.z = 252;
  if (car.z > 252) car.z = -252;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
}
