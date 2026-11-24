// activities.js — taxi fares and hidden packages. Press T and a passenger waits
// on a street corner nearby; ten hidden packages are stashed around the city.
// (Fourteen packages since the airport and Ocean Drive additions.)
const STREETS = [-237, -191, -145, -99, -53, -7, 39, 85, 131, 177, 223];

function nearestStreet(v) {
  let best = STREETS[0];
  let bestD = Math.abs(v - best);
  for (const s of STREETS) {
    const d = Math.abs(v - s);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export const PACKAGE_SPOTS = [
  { x: 216, z: 196, name: 'the end of Pier 9' },
  { x: -23, z: 122, name: 'the Palma Park bench' },
  { x: -162, z: -142, name: "near Rook's Chop Shop" },
  { x: 98, z: -132, name: 'the Deluxe Auto Lot fence' },
  { x: 48, z: -32, name: 'the bank side alley' },
  { x: -133.5, z: 71, name: "Lena's Garage steps" },
  { x: 190, z: -40, name: 'the Warehouse 7 door' },
  { x: 10, z: 62, name: 'the Central Taxi Stand' },
  { x: 155, z: 116, name: 'under the dock crane' },
  { x: -34, z: 186, name: 'the Solmar General steps' },
  { x: 100, z: 210, name: 'the control tower base' },
  { x: 138, z: 195, name: 'the south hangar door' },
  { x: 55, z: 258, name: 'the end of the Ocean Drive pier' },
  { x: 10, z: 248, name: 'the lifeguard tower' },
];

export class Activities {
  constructor(scene, rng, city, ctx) {
    this.scene = scene;
    this.rng = rng;
    this.city = city;
    this.ctx = ctx;
    this.fare = null;
    this.packages = PACKAGE_SPOTS.map((s, i) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 0.9),
        new THREE.MeshBasicMaterial({ color: 0x3aff7a }),
      );
      mesh.position.set(s.x, 1.2, s.z);
      scene.add(mesh);
      return { index: i, x: s.x, z: s.z, name: s.name, found: false, mesh };
    });
  }

  get foundCount() {
    return this.packages.filter((p) => p.found).length;
  }
  foundIndices() {
    return this.packages.filter((p) => p.found).map((p) => p.index);
  }
  loadFound(indices) {
    for (const p of this.packages) {
      if (indices.includes(p.index)) {
        p.found = true;
        p.mesh.visible = false;
      }
    }
  }
  resetPackages() {
    for (const p of this.packages) {
      p.found = false;
      p.mesh.visible = true;
    }
  }
  clearFare() {
    this.fare = null;
  }
  packagePositions() {
    return this.packages.filter((p) => !p.found).map((p) => ({ x: p.x, z: p.z }));
  }

  _pickPoint(from, minD, maxD) {
    const rng = this.rng;
    for (let tries = 0; tries < 20; tries++) {
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(minD, maxD);
      let x = nearestStreet(from.x + Math.sin(a) * d);
      let z = nearestStreet(from.z + Math.cos(a) * d);
      if (x >= 170 && x <= 250 && z >= 110 && z <= 240) x = 160;
      if (Math.hypot(x - from.x, z - from.z) >= minD * 0.7) return { x, z };
    }
    return { x: nearestStreet(from.x) + 40, z: nearestStreet(from.z) };
  }

  startTaxi(player) {
    if (this.fare) return false;
    const pickup = this._pickPoint(player, 25, 60);
    const dropoff = this._pickPoint(pickup, 40, 110);
    const pay = 40 + this.rng.int(0, 80);
    this.fare = { pickup, dropoff, pay, state: 'toPickup', timeLeft: 150 };
    this.ctx.toast('Taxi fare: pick up the passenger ($' + pay + ')');
    return true;
  }

  update(dt, player) {
    const t = performance.now() / 1000;
    for (const p of this.packages) {
      if (p.found) continue;
      p.mesh.position.y = 1.2 + 0.25 * Math.sin(t * 2 + p.index);
      p.mesh.rotation.y = t * 1.5 + p.index;
      if (!player.inCar && Math.hypot(player.x - p.x, player.z - p.z) < 3) {
        p.found = true;
        p.mesh.visible = false;
        this.ctx.addMoney(100);
        this.ctx.toast('Hidden package found (+$100) (' + p.name + ')');
        if (this.ctx.chime) this.ctx.chime();
      }
    }
    if (!this.fare) return;
    this.fare.timeLeft -= dt;
    if (this.fare.timeLeft <= 0) {
      this.fare = null;
      this.ctx.toast('The taxi passenger gave up and walked away.');
      return;
    }
    const pos = player.inCar && player.car
      ? { x: player.car.x, z: player.car.z }
      : { x: player.x, z: player.z };
    if (this.fare.state === 'toPickup') {
      if (Math.hypot(pos.x - this.fare.pickup.x, pos.z - this.fare.pickup.z) < 6) {
        this.fare.state = 'toDropoff';
        this.ctx.toast('Passenger aboard, take them to the marker.');
      }
    } else if (player.inCar) {
      if (Math.hypot(pos.x - this.fare.dropoff.x, pos.z - this.fare.dropoff.z) < 7) {
        const pay = this.fare.pay;
        this.fare = null;
        this.ctx.addMoney(pay);
        this.ctx.toast('Fare complete (+$' + pay + ')');
        if (this.ctx.chime) this.ctx.chime();
      }
    }
  }
}
