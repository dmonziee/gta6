// Cars: the models, the traffic that fills the streets, and the driving the
// player actually feels. Traffic cars follow the street grid, turn at
// intersections, and brake for the car ahead; the player's car accelerates,
// steers, slides on collisions and takes damage on hard hits.

const THREE = window.THREE;

export const CAR_KINDS = {
  sedan: { topSpeed: 26, accel: 14, color: 0x8a97a8 },
  sport: { topSpeed: 38, accel: 20, color: 0xc23a2e },
  taxi: { topSpeed: 28, accel: 15, color: 0xe8b400 },
  truck: { topSpeed: 20, accel: 10, color: 0x5a6a7a },
  police: { topSpeed: 34, accel: 19, color: 0x1a2a3a },
  van: { topSpeed: 24, accel: 12, color: 0x7a8a9a },
};

const PAINTS = [0x8a97a8, 0xc23a2e, 0x2e6ab0, 0x3a8a4a, 0xd8d4c8, 0x6a4a8a, 0x3a3a3a, 0xe86a2a];

// A low-poly car with a body, cabin, four wheels, headlights and tail lights.
// kind 'police' adds a light bar; 'taxi' adds a roof sign.
export function createCarMesh(kind, paint) {
  const spec = CAR_KINDS[kind] || CAR_KINDS.sedan;
  const color = paint ?? spec.color;
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x141414 });

  const bodyLen = kind === 'truck' ? 7.4 : kind === 'van' ? 6.4 : 4.6;
  const bodyWid = kind === 'truck' ? 2.6 : 2.1;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyLen, 0.85, bodyWid), bodyMat);
  body.position.y = 0.62;
  car.add(body);

  if (kind === 'truck') {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 2.4), bodyMat);
    cab.position.set(2.6, 1.7, 0);
    car.add(cab);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 2.4), new THREE.MeshLambertMaterial({ color: 0x4a4a4a }));
    bed.position.set(-1.2, 1.4, 0);
    car.add(bed);
  } else {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(bodyLen * 0.5, 0.75, bodyWid * 0.88), glassMat);
    cabin.position.set(kind === 'sport' ? -0.2 : -0.3, 1.35, 0);
    car.add(cabin);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(bodyLen * 0.42, 0.12, bodyWid * 0.8), bodyMat);
    roof.position.set(kind === 'sport' ? -0.2 : -0.3, 1.78, 0);
    car.add(roof);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheels = [];
  for (const [wx, wz] of [[1.5, 1.0], [1.5, -1.0], [-1.5, 1.0], [-1.5, -1.0]]) {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx * (bodyLen / 4.6), 0.42, wz * (bodyWid / 2.1));
    car.add(wheel);
    wheels.push(wheel);
  }

  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const hz of [-0.6, 0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.4), headMat);
    head.position.set(bodyLen / 2 + 0.02, 0.65, hz);
    car.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const tz of [-0.6, 0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.4), tailMat);
    tail.position.set(-bodyLen / 2 - 0.02, 0.65, tz);
    car.add(tail);
  }

  if (kind === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 1.2), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.set(-0.2, 1.95, 0);
    car.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.6), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    bar2.position.set(-0.2, 1.95, 0.62);
    car.add(bar2);
    car.userData.lightBar = [bar, bar2];
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.5), new THREE.MeshBasicMaterial({ color: 0xffe95a }));
    sign.position.set(-0.3, 1.95, 0);
    car.add(sign);
  }

  car.userData.wheels = wheels;
  car.userData.bodyLen = bodyLen;
  car.userData.bodyWid = bodyWid;
  return car;
}

// --- traffic --------------------------------------------------------------

// Street grid lines, shared with the city's painted ground.
function gridLines() {
  const lines = [];
  for (let i = 0; i <= 10; i += 1) lines.push(-260 + 23 + i * 46);
  return lines;
}

// A traffic car: drives along a street, picks a random turn at each
// intersection, brakes when something is right ahead.
export function spawnTraffic(rng, city, count) {
  const lines = gridLines();
  const cars = [];
  const kinds = ['sedan', 'sedan', 'taxi', 'van', 'truck', 'sport'];
  for (let i = 0; i < count; i += 1) {
    const kind = rng.pick(kinds);
    const mesh = createCarMesh(kind, rng.pick(PAINTS));
    const alongStreet = rng.chance(0.5);
    const line = rng.pick(lines);
    const other = rng.range(-230, 230);
    const x = alongStreet ? other : line + (rng.chance(0.5) ? 3.4 : -3.4);
    const z = alongStreet ? line + (rng.chance(0.5) ? 3.4 : -3.4) : other;
    mesh.position.set(x, 0, z);
    const heading = alongStreet ? (z % 2 === 0 ? 0 : Math.PI) : (x % 2 === 0 ? Math.PI / 2 : -Math.PI / 2);
    const car = {
      mesh,
      kind,
      heading: rng.chance(0.5) ? heading : heading + Math.PI,
      speed: rng.range(6, 11),
      cruise: rng.range(7, 12),
      state: 'drive',
      wait: 0,
      blockedTime: 0,
      length: mesh.userData.bodyLen,
    };
    mesh.rotation.y = -car.heading;
    cars.push(car);
  }
  return cars;
}

function nearestStreetLine(v) {
  const lines = gridLines();
  let best = lines[0];
  for (const l of lines) if (Math.abs(l - v) < Math.abs(best - v)) best = l;
  return best;
}

export function updateTraffic(cars, dt, city, playerCar, rng) {
  const lines = gridLines();
  for (const car of cars) {
    if (car.state === 'wait') {
      car.wait -= dt;
      if (car.wait <= 0) car.state = 'drive';
      continue;
    }
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    // Brake if a car (or the player) is close ahead.
    let blocked = false;
    const px = car.mesh.position.x + fx * 8;
    const pz = car.mesh.position.z + fz * 8;
    for (const other of cars) {
      if (other === car) continue;
      const dx = other.mesh.position.x - px;
      const dz = other.mesh.position.z - pz;
      if (dx * dx + dz * dz < 30) { blocked = true; break; }
    }
    if (!blocked && playerCar) {
      const dx = playerCar.mesh.position.x - px;
      const dz = playerCar.mesh.position.z - pz;
      if (dx * dx + dz * dz < 30) blocked = true;
    }
    if (blocked) {
      car.blockedTime += dt;
      // Stuck behind something for seconds: pull a U-turn and find another
      // street instead of sitting in a queue forever.
      if (car.blockedTime > 3) {
        car.blockedTime = 0;
        car.heading += Math.PI;
        car.speed = 2;
      }
    } else {
      car.blockedTime = 0;
    }
    const target = blocked ? 0 : car.cruise;
    car.speed += Math.max(-14 * dt, Math.min(8 * dt, target - car.speed));
    const step = car.speed * dt;
    let nx = car.mesh.position.x + fx * step;
    let nz = car.mesh.position.z + fz * step;
    // At an intersection, maybe turn onto the crossing street.
    const nearX = nearestStreetLine(nx);
    const nearZ = nearestStreetLine(nz);
    const atX = Math.abs(nx - nearX) < 2.5;
    const atZ = Math.abs(nz - nearZ) < 2.5;
    if ((atX || atZ) && car.speed > 2 && rng.chance(0.012)) {
      const turn = rng.pick([-Math.PI / 2, Math.PI / 2]);
      car.heading += turn;
      // Snap onto the new street's lane.
      if (atX && Math.abs(Math.sin(car.heading)) > 0.5) nz = nearZ + 3.4 * Math.sign(Math.cos(car.heading) || 1);
      if (atZ && Math.abs(Math.cos(car.heading)) > 0.5) nx = nearX + 3.4 * Math.sign(Math.sin(car.heading) || 1);
    }
    // Keep inside the map: bounce off the edge by turning around.
    if (nx < -248 || nx > 248 || nz < -248 || nz > 248) {
      car.heading += Math.PI;
      nx = Math.max(-248, Math.min(248, nx));
      nz = Math.max(-248, Math.min(248, nz));
    }
    car.mesh.position.x = nx;
    car.mesh.position.z = nz;
    car.mesh.rotation.y = -car.heading;
    // Wheels spin with speed.
    for (const w of car.mesh.userData.wheels) w.rotation.z -= (car.speed * dt) / 0.42;
    // Occasionally pause at an intersection like a real driver.
    if ((atX || atZ) && rng.chance(0.001)) {
      car.state = 'wait';
      car.wait = rng.range(1, 2.5);
    }
  }
}

// --- player driving -------------------------------------------------------

export function createPlayerCar(kind, paint) {
  const mesh = createCarMesh(kind, paint);
  return {
    mesh,
    kind,
    heading: 0,
    speed: 0,
    health: 100,
    steer: 0,
  };
}

// Arcade driving: W/S throttle and brake/reverse, A/D steer (stronger at low
// speed), collisions slide along buildings and bounce off other cars.
export function updatePlayerCar(car, input, dt, city, traffic) {
  const spec = CAR_KINDS[car.kind] || CAR_KINDS.sedan;
  const forward = input.forward ? 1 : input.back ? -1 : 0;
  // A fractional steer (from the autopilot) drives the wheels directly;
  // keyboard input is binary left/right.
  const steerInput = input.steer !== null && input.steer !== undefined
    ? input.steer
    : (input.left ? 1 : 0) - (input.right ? 1 : 0);
  car.steer += (steerInput - car.steer) * Math.min(1, dt * 8);
  const dir = car.speed >= 0 ? 1 : -1;
  // A car that is steering with the throttle down can still turn at parking
  // speed: without a floor, a car pinned against a wall at speed ~0 can
  // never turn away from it (every blocked step also cuts its speed).
  const turnRate = (input.forward || input.back)
    ? Math.max(Math.min(1, Math.abs(car.speed) / 8), 0.3)
    : Math.min(1, Math.abs(car.speed) / 8);
  car.heading += car.steer * dir * turnRate * 2.4 * dt;
  if (forward !== 0) {
    car.speed += forward * spec.accel * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 9 * dt);
  }
  if (!input.forward && !input.back) car.speed *= Math.max(0, 1 - dt * 0.4);
  // Cornering aid: a hard-steering car cannot hold top speed, so its turn
  // radius stays tight enough to make a 90° street corner without cutting
  // through the building on the inside of the turn.
  const speedCap = Math.abs(car.steer) > 0.7 ? 12 : spec.topSpeed;
  car.speed = Math.max(-12, Math.min(speedCap, car.speed));

  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  const step = car.speed * dt;
  const r = 2.2;
  const before = { x: car.mesh.position.x, z: car.mesh.position.z };
  city.slideMove(car.mesh.position, fx * step, fz * step, r);
  // Bounce off traffic cars — and shove them out of the way, so a head-on
  // meeting in a narrow street never deadlocks: the player's car pushes the
  // traffic car forward instead of both sitting nose to nose forever.
  for (const other of traffic) {
    const dx = other.mesh.position.x - car.mesh.position.x;
    const dz = other.mesh.position.z - car.mesh.position.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < 16 && d2 > 0.01) {
      const d = Math.sqrt(d2);
      const push = (4 - d) / 2;
      car.mesh.position.x -= (dx / d) * push;
      car.mesh.position.z -= (dz / d) * push;
      other.mesh.position.x += (dx / d) * push * 0.9;
      other.mesh.position.z += (dz / d) * push * 0.9;
      if (Math.abs(car.speed) > 8) {
        car.health -= 6;
        car.speed *= 0.55;
      } else {
        car.speed *= 0.85;
      }
    }
  }
  const moved = Math.hypot(car.mesh.position.x - before.x, car.mesh.position.z - before.z);
  if (Math.abs(step) > 0.05 && moved < Math.abs(step) * 0.25) {
    // Hard wall hit.
    if (Math.abs(car.speed) > 10) car.health -= 8;
    car.speed *= 0.4;
  }
  car.mesh.rotation.y = -car.heading;
  for (const w of car.mesh.userData.wheels) {
    w.rotation.z -= (car.speed * dt) / 0.42;
    w.rotation.y = 0;
  }
  return Math.abs(car.speed);
}
