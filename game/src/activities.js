// activities.js — taxi fares and hidden packages, life around the jobs.
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
];

export class Activities {
  constructor(scene, rng, city, ctx) {
    this.scene = scene;
    this.rng = rng;
    this.city = city;
    this.ctx = ctx;
    this.fare = null;
    this.packages = PACKAGE_SPOTS.map((spot, index) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0x3aff7a }));
      mesh.position.set(spot.x, 1.2, spot.z);
      scene.add(mesh);
      return { index, x: spot.x, z: spot.z, name: spot.name, found: false, mesh };
    });
  }
  get foundCount() {
    return this.packages.filter(p => p.found).length;
  }
  foundIndices() {
    return this.packages.filter(p => p.found).map(p => p.index);
  }
  loadFound(indices) {
    for (const i of indices || []) {
      const p = this.packages[i];
      if (p) { p.found = true; p.mesh.visible = false; }
    }
  }
  packagePositions() {
    return this.packages.filter(p => !p.found).map(p => ({ x: p.x, z: p.z }));
  }
  pickStreetPoint(from, minDist, maxDist) {
    let px = from.x, pz = from.z;
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = this.rng.range(0, Math.PI * 2);
      const dist = this.rng.range(minDist, maxDist);
      const rawX = from.x + Math.sin(angle) * dist;
      const rawZ = from.z + Math.cos(angle) * dist;
      px = this.nearestStreet(rawX);
      pz = this.nearestStreet(rawZ);
      if (px > 170 && px < 250 && pz > 110 && pz < 240) px = 160;
      const d = Math.hypot(px - from.x, pz - from.z);
      if (d >= minDist * 0.7) return { x: px, z: pz };
    }
    return { x: this.nearestStreet(from.x) + 40, z: this.nearestStreet(from.z) };
  }
  nearestStreet(v) {
    let best = this.city.streets[0];
    for (const s of this.city.streets) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
    return best;
  }
  startTaxi(player) {
    if (this.fare) return false;
    const pickup = this.pickStreetPoint(player, 25, 60);
    const dropoff = this.pickStreetPoint(pickup, 40, 110);
    const pay = 40 + this.rng.int(0, 80);
    this.fare = { pickup, dropoff, pay, state: 'toPickup', timeLeft: 150 };
    this.ctx.toast(`Taxi fare: pick up the passenger ($${pay})`);
    return true;
  }
  update(dt, player) {
    const time = performance.now() / 1000;
    for (const p of this.packages) {
      if (p.found) continue;
      p.mesh.position.y = 1.2 + 0.25 * Math.sin(time * 2 + p.index);
      p.mesh.rotation.y = time * 1.5 + p.index;
      if (!player.inCar && Math.hypot(player.x - p.x, player.z - p.z) < 3) {
        p.found = true;
        p.mesh.visible = false;
        this.ctx.addMoney(100);
        this.ctx.toast(`Hidden package found +$100 (${p.name})`);
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
    const pos = player.inCar && player.car ? { x: player.car.x, z: player.car.z } : { x: player.x, z: player.z };
    if (this.fare.state === 'toPickup') {
      if (Math.hypot(pos.x - this.fare.pickup.x, pos.z - this.fare.pickup.z) < 6) {
        this.fare.state = 'toDropoff';
        this.ctx.toast('Passenger aboard — take them to the marker.');
      }
    } else if (player.inCar && Math.hypot(pos.x - this.fare.dropoff.x, pos.z - this.fare.dropoff.z) < 7) {
      const pay = this.fare.pay;
      this.fare = null;
      this.ctx.addMoney(pay);
      this.ctx.toast(`Fare complete +$${pay}`);
      if (this.ctx.chime) this.ctx.chime();
    }
  }
}
