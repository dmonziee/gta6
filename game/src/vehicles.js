// vehicles.js — cars: physics, traffic, and collision damage.
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
  const bodyColor = colour !== undefined && colour !== null ? colour : palette[0];
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 4.4), new THREE.MeshLambertMaterial({ color: bodyColor }));
  body.position.set(0, 0.65, 0);
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.2), new THREE.MeshLambertMaterial({ color: 0x14141c }));
  cabin.position.set(0, 1.4, -0.2);
  cabin.castShadow = true;
  group.add(cabin);
  if (kind === 'cop') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0x3a5aff }));
    bar.position.set(0, 1.85, -0.2);
    group.add(bar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.3, 4.42), new THREE.MeshLambertMaterial({ color: 0xd8d8d0 }));
    stripe.position.set(0, 0.75, 0);
    group.add(stripe);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    sign.position.set(0, 1.9, -0.2);
    group.add(sign);
  }
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0e0e12 });
  for (const wx of [-0.95, 0.95]) {
    for (const wz of [-1.45, 1.45]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.42, wz);
      group.add(wheel);
    }
  }
  return group;
}

export function createCar(scene, kind, x, z, heading, colour) {
  const spec = CAR_KINDS[kind] || CAR_KINDS.sedan;
  const mesh = makeCarMesh(kind, colour);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return {
    kind, spec, mesh, x, z, heading,
    speed: 0, health: 100, maxHealth: 100, steer: 0, dead: false, parked: true,
    wallCooldown: 0, trafficCooldown: 0, ramCooldown: 0, copRamCooldown: 0,
  };
}

export function removeCar(scene, car) {
  if (!car) return;
  scene.remove(car.mesh);
  car.dead = true;
}

export function driveCar(car, dt, input, world) {
  if (car.dead) return { wrecked: false, hitWall: false };
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
  const topEff = car.spec.top * (1 - 0.4 * Math.abs(steer));
  let throttle = input.throttle || 0;
  if (input.autoThrottle) throttle = 1;

  if (throttle > 0) {
    car.speed = Math.min(topEff, car.speed + car.spec.accel * dt);
  } else if (throttle < 0) {
    if (car.speed > 0) car.speed = Math.max(0, car.speed - car.spec.brake * dt);
    else car.speed = Math.max(-8, car.speed - car.spec.accel * 0.6 * dt);
  } else {
    car.speed -= car.speed * 0.6 * dt;
    if (Math.abs(car.speed) < 0.05) car.speed = 0;
  }
  const turnAuth = Math.max(-1, Math.min(1, car.speed / 10));
  car.heading += steer * car.spec.turn * turnAuth * dt;
  if (car.speed > topEff) car.speed = Math.max(topEff, car.speed - car.spec.accel * dt);

  const dx = Math.sin(car.heading) * car.speed * dt;
  const dz = Math.cos(car.heading) * car.speed * dt;
  const moved = world.slideMove(car.x, car.z, dx, dz, 2.2, world.colliders);
  car.x = moved.x;
  car.z = moved.z;
  let hitWall = false;
  if (moved.hit) {
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

  // Traffic contact.
  if (world.traffic) {
    for (const other of world.traffic) {
      if (other === car || other.dead) continue;
      const ox = car.x - other.x, oz = car.z - other.z;
      const dist = Math.sqrt(ox * ox + oz * oz);
      if (dist < 4.6 && dist > 0.001) {
        const overlap = 4.6 - dist;
        const nx = ox / dist, nz = oz / dist;
        other.x -= nx * overlap * 0.5;
        other.z -= nz * overlap * 0.5;
        car.x += nx * overlap * 0.2;
        car.z += nz * overlap * 0.2;
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

  let wrecked = false;
  if (car.health <= 0) {
    car.health = 0;
    wrecked = true;
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  return { wrecked, hitWall };
}

const TRAFFIC_KINDS = ['sedan', 'sedan', 'taxi', 'van', 'sport'];

export function spawnTraffic(scene, rng, count, streets) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const kind = TRAFFIC_KINDS[i % TRAFFIC_KINDS.length];
    const line = rng.pick(streets);
    const along = rng.range(-240, 240);
    const vertical = rng.chance(0.5);
    const side = rng.chance(0.5) ? 2.2 : -2.2;
    const x = vertical ? line + side : along;
    const z = vertical ? along : line + side;
    const heading = vertical ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
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

export function updateTrafficCar(car, dt, streets, playerCar) {
  if (car.dead) return;
  if (!car.target || Math.hypot(car.target.x - car.x, car.target.z - car.z) < 8) {
    let nx = car.x, nz = car.z;
    const eastWest = Math.abs(Math.sin(car.heading)) > 0.7;
    if (eastWest) {
      const dir = Math.sign(Math.sin(car.heading)) || 1;
      let cross = null;
      for (const s of streets) {
        if (dir > 0 && s > car.x + 24) { cross = s; break; }
        if (dir < 0 && s < car.x - 24) cross = s;
      }
      if (cross === null) cross = dir > 0 ? 250 : -250;
      if (Math.abs(cross - car.x) > 8) {
        nx = cross; nz = car.z;
      } else if (Math.random() < 0.7) {
        nx = car.x + dir * 92; nz = car.z;
      } else {
        nx = cross; nz = car.z + (Math.random() < 0.5 ? 92 : -92);
      }
    } else {
      const dir = Math.sign(Math.cos(car.heading)) || 1;
      let cross = null;
      for (const s of streets) {
        if (dir > 0 && s > car.z + 24) { cross = s; break; }
        if (dir < 0 && s < car.z - 24) cross = s;
      }
      if (cross === null) cross = dir > 0 ? 250 : -250;
      if (Math.abs(cross - car.z) > 8) {
        nx = car.x; nz = cross;
      } else if (Math.random() < 0.7) {
        nx = car.x; nz = car.z + dir * 92;
      } else {
        nx = car.x + (Math.random() < 0.5 ? 92 : -92); nz = cross;
      }
    }
    car.target = { x: Math.max(-250, Math.min(250, nx)), z: Math.max(-250, Math.min(250, nz)) };
  }
  let cruise = car.cruise;
  if (playerCar && !playerCar.dead) {
    const dx = playerCar.x - car.x, dz = playerCar.z - car.z;
    const ahead = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
    const side = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
    if (ahead > 0 && ahead < 16 && side < 4) cruise = Math.min(cruise, 4);
  }
  const desired = Math.atan2(car.target.x - car.x, car.target.z - car.z);
  const steer = Math.max(-1, Math.min(1, wrapAngle(desired - car.heading) * 1.8));
  if (car.speed < cruise) car.speed = Math.min(cruise, car.speed + 10 * dt);
  else if (car.speed > cruise) car.speed = Math.max(cruise, car.speed - 14 * dt);
  const auth = Math.max(0, Math.min(1, car.speed / 10));
  car.heading += steer * 1.6 * auth * dt;
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  if (car.x > 252) car.x = -252;
  if (car.x < -252) car.x = 252;
  if (car.z > 252) car.z = -252;
  if (car.z < -252) car.z = 252;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
}
