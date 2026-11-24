// vehicles.js — cars: physics, traffic, and collision damage. A car starts at
// 100 health and is wrecked at zero. Wall brushes at or below the speed
// thresholds cost nothing, so a careful driver keeps the car alive.

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

const KIND_COLORS = {
  sedan: [0x3a6fd8, 0x8a8a8a, 0x4a8a3a, 0xd8d8d0],
  sport: [0xc83232, 0xe8c832, 0x2a5fd8, 0x3a3a40],
  taxi: [0xe8c832],
  van: [0x8a8a8a, 0x5a6a7a],
  cop: [0x222831],
};

export function makeCarMesh(kind, colour) {
  const palette = KIND_COLORS[kind] || KIND_COLORS.sedan;
  const bodyColor = colour !== undefined ? colour : palette[0];
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.9, 4.4),
    new THREE.MeshLambertMaterial({ color: bodyColor }),
  );
  body.position.y = 0.65;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x14141c }),
  );
  cabin.position.set(0, 1.4, -0.2);
  cabin.castShadow = true;
  g.add(cabin);
  if (kind === 'cop') {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x3a5aff }),
    );
    bar.position.set(0, 1.85, -0.2);
    g.add(bar);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.05, 0.3, 4.42),
      new THREE.MeshLambertMaterial({ color: 0xd8d8d0 }),
    );
    stripe.position.y = 0.75;
    g.add(stripe);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.3, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x222222 }),
    );
    sign.position.set(0, 1.9, -0.2);
    g.add(sign);
  }
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0e0e12 });
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    g.add(wheel);
  }
  return g;
}

export function createCar(scene, kind, x, z, heading, colour) {
  const spec = CAR_KINDS[kind] || CAR_KINDS.sedan;
  const mesh = makeCarMesh(kind, colour);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return {
    kind,
    spec,
    mesh,
    x,
    z,
    heading,
    speed: 0,
    health: 100,
    maxHealth: 100,
    steer: 0,
    dead: false,
    parked: true,
    wallCooldown: 0,
    trafficCooldown: 0,
    ramCooldown: 0,
    copRamCooldown: 0,
  };
}

export function removeCar(scene, car) {
  scene.remove(car.mesh);
  car.dead = true;
}

export function driveCar(car, dt, input, world) {
  if (car.dead) return { wrecked: false, hitWall: false };
  if (car.health <= 0) {
    car.health = 0;
    return { wrecked: true, hitWall: false };
  }
  car.wallCooldown = Math.max(0, car.wallCooldown - dt);
  car.trafficCooldown = Math.max(0, car.trafficCooldown - dt);
  car.ramCooldown = Math.max(0, car.ramCooldown - dt);
  car.copRamCooldown = Math.max(0, car.copRamCooldown - dt);

  let steer;
  if (input.autoSteer !== null && input.autoSteer !== undefined) {
    steer = Math.max(-1, Math.min(1, wrapAngle(input.autoSteer - car.heading) * 1.6));
  } else {
    steer = input.steer || 0;
  }
  car.steer = steer;
  const spec = car.spec;
  const effTop = spec.top * (1 - 0.4 * Math.abs(steer));

  let throttle = input.throttle || 0;
  if (input.autoThrottle) throttle = 1;
  if (throttle > 0) {
    car.speed = Math.min(effTop, car.speed + spec.accel * dt);
  } else if (throttle < 0) {
    if (car.speed > 0) {
      car.speed = Math.max(0, car.speed - spec.brake * dt);
    } else {
      car.speed = Math.max(-8, car.speed - spec.accel * 0.6 * dt);
    }
  } else {
    car.speed *= Math.max(0, 1 - 0.6 * dt);
    if (Math.abs(car.speed) < 0.05) car.speed = 0;
  }
  const turnAuthority = Math.max(-1, Math.min(1, car.speed / 10));
  car.heading += steer * spec.turn * turnAuthority * dt;
  if (car.speed > effTop) {
    car.speed = Math.max(effTop, car.speed - spec.accel * dt);
  }

  const dx = Math.sin(car.heading) * car.speed * dt;
  const dz = Math.cos(car.heading) * car.speed * dt;
  const res = world.slideMove(car.x, car.z, dx, dz, 2.2, world.colliders);
  car.x = res.x;
  car.z = res.z;
  let hitWall = false;
  if (res.hit) {
    hitWall = true;
    if (Math.abs(car.speed) > 10 && car.wallCooldown <= 0 && !car.invulnerable) {
      car.health -= WALL_DAMAGE;
      car.speed *= 0.4;
      car.wallCooldown = 0.5;
      if (world.onCrash) world.onCrash();
    } else {
      car.speed *= 0.998;
    }
  }

  if (world.traffic) {
    for (const other of world.traffic) {
      if (other === car || other.dead) continue;
      const ox = other.x - car.x;
      const oz = other.z - car.z;
      const dist = Math.hypot(ox, oz);
      if (dist < 4.6 && dist > 0.001) {
        const overlap = 4.6 - dist;
        const nx = ox / dist;
        const nz = oz / dist;
        other.x += nx * (overlap / 2);
        other.z += nz * (overlap / 2);
        car.x -= nx * (overlap / 2) * 0.4;
        car.z -= nz * (overlap / 2) * 0.4;
        if (other.speed < 6) other.speed = 6;
        if (Math.abs(car.speed) > 8 && car.trafficCooldown <= 0 && !car.invulnerable) {
          car.health -= TRAFFIC_DAMAGE;
          car.speed *= 0.5;
          car.trafficCooldown = 0.6;
          if (world.onCrash) world.onCrash();
        }
      }
    }
  }

  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  if (car.health <= 0) {
    car.health = 0;
    return { wrecked: true, hitWall };
  }
  return { wrecked: false, hitWall };
}

export function spawnTraffic(scene, rng, count, streets) {
  const kinds = ['sedan', 'sedan', 'taxi', 'van', 'sport'];
  const cars = [];
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    const line = rng.pick(streets);
    const along = rng.range(-240, 240);
    const side = rng.chance(0.5) ? 2.2 : -2.2;
    const vertical = rng.chance(0.5);
    const x = vertical ? line + side : along;
    const z = vertical ? along : line + side;
    const heading = vertical
      ? (rng.chance(0.5) ? 0 : Math.PI)
      : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    const car = createCar(scene, kind, x, z, heading);
    car.parked = false;
    car.speed = rng.range(9, 13);
    car.cruise = car.speed;
    car.lane = line;
    car.target = null;
    cars.push(car);
  }
  return cars;
}

function nearestLine(v, streets) {
  let best = streets[0];
  let bestD = Math.abs(v - best);
  for (const s of streets) {
    const d = Math.abs(v - s);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export function updateTrafficCar(car, dt, streets, playerCar) {
  if (car.dead) return;
  if (!car.target || Math.hypot(car.target.x - car.x, car.target.z - car.z) < 8) {
    const eastWest = Math.abs(Math.sin(car.heading)) > 0.7;
    if (eastWest) {
      const laneZ = nearestLine(car.z, streets);
      const dir = Math.sign(Math.sin(car.heading)) || 1;
      const crossingX = nearestLine(car.x + dir * 24, streets);
      const distToCrossing = Math.abs(crossingX - car.x);
      if (distToCrossing > 8) {
        car.target = { x: crossingX, z: laneZ };
      } else if (Math.random() < 0.7) {
        car.target = { x: car.x + dir * 92, z: laneZ };
      } else {
        car.target = { x: crossingX, z: laneZ + (Math.random() < 0.5 ? 92 : -92) };
      }
    } else {
      const laneX = nearestLine(car.x, streets);
      const dir = Math.sign(Math.cos(car.heading)) || 1;
      const crossingZ = nearestLine(car.z + dir * 24, streets);
      const distToCrossing = Math.abs(crossingZ - car.z);
      if (distToCrossing > 8) {
        car.target = { x: laneX, z: crossingZ };
      } else if (Math.random() < 0.7) {
        car.target = { x: laneX, z: car.z + dir * 92 };
      } else {
        car.target = { x: laneX + (Math.random() < 0.5 ? 92 : -92), z: crossingZ };
      }
    }
    car.target.x = Math.max(-250, Math.min(250, car.target.x));
    car.target.z = Math.max(-250, Math.min(250, car.target.z));
  }

  let cruise = car.cruise;
  if (playerCar && !playerCar.dead) {
    const dx = playerCar.x - car.x;
    const dz = playerCar.z - car.z;
    const along = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
    const side = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
    if (along > 0 && along < 16 && side < 4) cruise = Math.min(cruise, 4);
  }
  const desired = Math.atan2(car.target.x - car.x, car.target.z - car.z);
  const steer = Math.max(-1, Math.min(1, wrapAngle(desired - car.heading) * 1.8));
  if (car.speed < cruise) {
    car.speed = Math.min(cruise, car.speed + 10 * dt);
  } else {
    car.speed = Math.max(cruise, car.speed - 14 * dt);
  }
  car.heading += steer * 1.6 * Math.max(0, Math.min(1, car.speed / 10)) * dt;
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  if (car.x > 252) car.x = -252;
  else if (car.x < -252) car.x = 252;
  if (car.z > 252) car.z = -252;
  else if (car.z < -252) car.z = 252;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
}
