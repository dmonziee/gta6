// Solmar Bay — life around the jobs: taxi fares and hidden packages.
//
// Taxi: press T (or the test hook) and a passenger waits on a street
// corner nearby — never in the marina basin. Pick them up, drive them to
// their destination before the meter runs out, and the fare pays between
// $40 and $120. Ten hidden packages are stashed around the city, each
// worth $100, marked with green blips on the minimap.

const THREE = window.THREE;

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
];

function inBasin(x, z) {
  return x >= 170 && x <= 250 && z >= 110 && z <= 240;
}

export class Activities {
  constructor(scene, rng, city, ctx) {
    this.scene = scene;
    this.rng = rng;
    this.city = city;
    this.ctx = ctx; // { addMoney, toast, chime }
    this.fare = null;
    this.packages = PACKAGE_SPOTS.map((spot, i) => ({ ...spot, index: i, found: false, mesh: null }));
    const boxGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const mat = new THREE.MeshBasicMaterial({ color: 0x3aff7a });
    for (const pkg of this.packages) {
      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.position.set(pkg.x, 1.2, pkg.z);
      scene.add(mesh);
      pkg.mesh = mesh;
    }
  }

  get foundCount() {
    return this.packages.filter((p) => p.found).length;
  }

  foundIndices() {
    return this.packages.filter((p) => p.found).map((p) => p.index);
  }

  loadFound(indices) {
    for (const pkg of this.packages) {
      if (indices.includes(pkg.index)) {
        pkg.found = true;
        if (pkg.mesh) pkg.mesh.visible = false;
      }
    }
  }

  packagePositions() {
    return this.packages.filter((p) => !p.found).map((p) => ({ x: p.x, z: p.z }));
  }

  startTaxi(player) {
    if (this.fare) return false;
    const streets = this.city.streets;
    const nearStreet = (v) => {
      let best = streets[0];
      for (const s of streets) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
      return best;
    };
    const pickStreetPoint = (cx, cz, minD, maxD) => {
      for (let tries = 0; tries < 20; tries += 1) {
        const a = this.rng.range(0, Math.PI * 2);
        const d = this.rng.range(minD, maxD);
        let x = cx + Math.sin(a) * d;
        let z = cz + Math.cos(a) * d;
        // Snap onto the nearest street corner, and never into the basin.
        x = nearStreet(x);
        z = nearStreet(z);
        if (inBasin(x, z)) x = 160;
        if (Math.hypot(x - cx, z - cz) < minD * 0.7) continue;
        return { x, z };
      }
      return { x: nearStreet(cx + 40), z: nearStreet(cz) };
    };
    const pickup = pickStreetPoint(player.x, player.z, 25, 60);
    const dropoff = pickStreetPoint(pickup.x, pickup.z, 40, 110);
    const pay = 40 + this.rng.int(0, 80);
    this.fare = { pickup, dropoff, pay, state: 'toPickup', timeLeft: 150 };
    if (this.ctx.toast) this.ctx.toast(`Taxi fare: pick up the passenger ($${pay})`);
    return true;
  }

  update(dt, player) {
    // Packages bob and spin until collected.
    const t = performance.now() / 1000;
    for (const pkg of this.packages) {
      if (pkg.found || !pkg.mesh) continue;
      pkg.mesh.position.y = 1.2 + 0.25 * Math.sin(t * 2 + pkg.index);
      pkg.mesh.rotation.y = t * 1.5 + pkg.index;
      const d = Math.hypot(player.x - pkg.x, player.z - pkg.z);
      // Walking over one collects it — driving past in a car does not.
      if (!player.inCar && d < 3) {
        pkg.found = true;
        pkg.mesh.visible = false;
        if (this.ctx.addMoney) this.ctx.addMoney(100);
        if (this.ctx.toast) this.ctx.toast(`Hidden package found — +$100 (${pkg.name})`);
        if (this.ctx.chime) this.ctx.chime();
      }
    }
    if (!this.fare) return;
    this.fare.timeLeft -= dt;
    if (this.fare.timeLeft <= 0) {
      this.fare = null;
      if (this.ctx.toast) this.ctx.toast('The taxi passenger gave up and walked away.');
      return;
    }
    const pos = player.inCar && player.car ? { x: player.car.x, z: player.car.z } : { x: player.x, z: player.z };
    if (this.fare.state === 'toPickup') {
      if (Math.hypot(pos.x - this.fare.pickup.x, pos.z - this.fare.pickup.z) < 6) {
        this.fare.state = 'toDropoff';
        if (this.ctx.toast) this.ctx.toast('Passenger aboard — take them to the marker.');
      }
    } else if (player.inCar) {
      if (Math.hypot(pos.x - this.fare.dropoff.x, pos.z - this.fare.dropoff.z) < 7) {
        const pay = this.fare.pay;
        this.fare = null;
        if (this.ctx.addMoney) this.ctx.addMoney(pay);
        if (this.ctx.toast) this.ctx.toast(`Fare complete — +$${pay}`);
        if (this.ctx.chime) this.ctx.chime();
      }
    }
  }
}
