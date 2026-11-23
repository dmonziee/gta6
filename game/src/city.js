// Solmar Bay — the seeded city builder. A regular street grid, six
// districts with their own building heights and colours, named places,
// parked cars worth stealing, street props, and the collision boxes plus
// the slide-along-wall movement helper everything else walks and drives on.
//
// Coordinates: north is -z, east is +x. The map runs -260..260 on both axes.

const THREE = window.THREE;

export const STREETS = [-237, -191, -145, -99, -53, -7, 39, 85, 131, 177, 223];

export const PLACES = {
  spawn: { x: 0, z: 168 },
  garage: { x: -138, z: 62 },
  docks: { x: 190, z: 130 },
  pierEnd: { x: 216, z: 196 },
  bank: { x: 42, z: -38 },
  carLot: { x: 104, z: -138 },
  chopShop: { x: -168, z: -148 },
  warehouse: { x: 196, z: -46 },
  hospital: { x: -38, z: 182 },
  park: { x: -23, z: 122 },
  taxiStand: { x: 6, z: 58 },
  marinaGate: { x: 168, z: 96 },
  casinoRow: { x: 18, z: 177 },
  casinoDoor: { x: 18, z: 166 },
  casinoVault: { x: 18, z: 190 },
  getaway: { x: 32, z: 177 },
};

// Parked cars worth stealing. Every spot sits on a street lane, never
// inside a block, so a car can always be driven away from it.
export const PARKED_SPOTS = [
  { x: -138.5, z: 70, kind: 'sedan' },
  { x: -0.5, z: 58, kind: 'taxi' },
  { x: 50, z: -46.5, kind: 'sport' },
  { x: -30, z: 183.5, kind: 'van' },
  { x: -10, z: 137.5, kind: 'sedan' },
  { x: 183.5, z: 88, kind: 'sedan' },
  { x: -138.5, z: -140, kind: 'sport' },
  { x: 30, z: 45.5, kind: 'sedan' },
];

export const DISTRICTS = [
  { name: 'Downtown', x0: -92, z0: -92, x1: 92, z1: 92, h0: 26, h1: 88, colors: [0x8a7f70, 0x6f7f8a, 0x9a8a6a, 0x7a6a8a, 0x5f6f7f] },
  { name: 'Old Town', x0: -260, z0: -260, x1: -92, z1: 260, h0: 8, h1: 20, colors: [0xc2a878, 0xb08a6a, 0xa89080, 0xc2b49a] },
  { name: 'Northside', x0: -92, z0: -260, x1: 260, z1: -92, h0: 14, h1: 34, colors: [0x7f8a7a, 0x8a7f6a, 0x6a7f8a, 0x9a9a8a] },
  { name: 'East End', x0: 92, z0: -92, x1: 260, z1: 30, h0: 12, h1: 30, colors: [0x8a6a6a, 0x7a7a6a, 0x9a8a7a, 0x6a6a7a] },
  { name: 'Marina', x0: 150, z0: 30, x1: 260, z1: 260, h0: 6, h1: 12, colors: [0xd8c8a8, 0xc8b89a, 0xe0d0b0] },
  { name: 'Casino Row', x0: -44, z0: 138, x1: 124, z1: 218, h0: 18, h1: 46, colors: [0xd8b45a, 0xc8a04a] },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  }
  return 'Solmar Bay';
}

// Open ground around every named place: the city builder never puts a
// building here, so every mission ring stays reachable on foot and by car.
const CLEAR_ZONES = [
  { x: -138, z: 62, r: 13 }, { x: 190, z: 130, r: 12 }, { x: 216, z: 196, r: 10 },
  { x: 42, z: -38, r: 13 }, { x: 104, z: -138, r: 15 }, { x: -168, z: -148, r: 13 },
  { x: 196, z: -46, r: 15 }, { x: -38, z: 182, r: 10 }, { x: -23, z: 122, r: 11 },
  { x: 6, z: 58, r: 9 }, { x: 168, z: 96, r: 10 }, { x: 0, z: 168, r: 10 },
  { x: 18, z: 177, r: 26 }, { x: 32, z: 177, r: 10 },
];

function inClearZone(x, z, pad) {
  for (const cz of CLEAR_ZONES) {
    const dx = x - cz.x, dz = z - cz.z;
    if (dx * dx + dz * dz < (cz.r + pad) * (cz.r + pad)) return true;
  }
  return false;
}

// --- collision helpers ---------------------------------------------------

export function circleHits(x, z, r, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.x0, Math.min(x, c.x1));
    const nz = Math.max(c.z0, Math.min(z, c.z1));
    const dx = x - nx, dz = z - nz;
    if (dx * dx + dz * dz < r * r) return c;
  }
  return null;
}

// Move a circle by (dx, dz), trying x then z so it slides along walls
// instead of sticking to them. If the circle already overlaps a wall — a
// car parked too close to one, say — it is pushed out to the nearest clear
// spot first, so it can never sit pinned inside a collision pocket.
// Returns the new position and what it hit.
export function slideMove(x, z, dx, dz, r, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.x0, Math.min(x, c.x1));
    const nz = Math.max(c.z0, Math.min(z, c.z1));
    const ox = x - nx, oz = z - nz;
    if (ox * ox + oz * oz < r * r) {
      // Overlapping: push out along the smallest penetration direction.
      const left = x - (c.x0 - r), right = (c.x1 + r) - x;
      const top = z - (c.z0 - r), bottom = (c.z1 + r) - z;
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = c.x0 - r;
      else if (m === right) x = c.x1 + r;
      else if (m === top) z = c.z0 - r;
      else z = c.z1 + r;
    }
  }
  let hitX = false, hitZ = false;
  const nx = x + dx;
  if (!circleHits(nx, z, r, colliders)) x = nx;
  else hitX = true;
  const nz = z + dz;
  if (!circleHits(x, nz, r, colliders)) z = nz;
  else hitZ = true;
  return { x, z, hit: hitX || hitZ, hitX, hitZ };
}

export function nearestStreet(v) {
  let best = STREETS[0];
  for (const s of STREETS) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
  return best;
}

// --- canvas textures -----------------------------------------------------

function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#33333d';
  g.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const lit = Math.random() < 0.3;
      g.fillStyle = lit ? (Math.random() < 0.6 ? '#ffd27a' : '#9fc4ff') : '#191922';
      g.fillRect(8 + col * 20, 8 + row * 15, 12, 9);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

// A flat sign with text, for shop fronts and named buildings.
export function textSign(text, w, h, fg = '#ffd76a', bg = '#1a1a22', font = 'bold 42px sans-serif') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = fg;
  g.lineWidth = 6;
  g.strokeRect(4, 4, 504, 120);
  g.fillStyle = fg;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.signMat = mat;
  return mesh;
}

// --- the builder ---------------------------------------------------------

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];      // solid: buildings, walls, fountains — everything
  const waterColliders = []; // the bay: blocks feet, never cars (see marina.js)
  const addCollider = (x0, z0, x1, z1) => {
    const c = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) };
    colliders.push(c);
    return c;
  };

  // Ground and roads.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0x8f8a7c }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3c3f45 });
  const roadGeoH = new THREE.PlaneGeometry(560, 14);
  const roadGeoV = new THREE.PlaneGeometry(14, 560);
  for (const s of STREETS) {
    const rh = new THREE.Mesh(roadGeoH, roadMat);
    rh.rotation.x = -Math.PI / 2;
    rh.position.set(0, 0.03, s);
    rh.receiveShadow = true;
    group.add(rh);
    const rv = new THREE.Mesh(roadGeoV, roadMat);
    rv.rotation.x = -Math.PI / 2;
    rv.position.set(s, 0.03, 0);
    rv.receiveShadow = true;
    group.add(rv);
  }

  const winTex = windowTexture();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const matCache = new Map();
  const matFor = (color) => {
    if (!matCache.has(color)) {
      matCache.set(color, new THREE.MeshLambertMaterial({ color, map: winTex }));
    }
    return matCache.get(color);
  };

  const putBuilding = (cx, cz, w, h, d, color) => {
    const mesh = new THREE.Mesh(boxGeo, matFor(color));
    mesh.scale.set(w, h, d);
    mesh.position.set(cx, h / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    // A flat roof cap so the stretched window texture never shows on top.
    const cap = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x4a4640 }));
    cap.scale.set(w + 0.4, 0.4, d + 0.4);
    cap.position.set(cx, h + 0.2, cz);
    group.add(cap);
    addCollider(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2);
    return mesh;
  };

  // Fill the blocks, skipping the marina basin, Casino Row (their own
  // builders own those rectangles) and the clear zones around named places.
  for (let i = 0; i < STREETS.length - 1; i += 1) {
    for (let j = 0; j < STREETS.length - 1; j += 1) {
      const bx0 = STREETS[i] + 7, bx1 = STREETS[i + 1] - 7;
      const bz0 = STREETS[j] + 7, bz1 = STREETS[j + 1] - 7;
      const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
      if (cx > 125 && cx < 256 && cz > 104 && cz < 246) continue; // marina basin and its west shore — the piers' land approach stays open
      if (cx > -50 && cx < 130 && cz > 132 && cz < 224) continue; // Casino Row
      let district = null;
      for (const d of DISTRICTS) {
        if (cx >= d.x0 && cx < d.x1 && cz >= d.z0 && cz < d.z1) { district = d; break; }
      }
      if (!district) continue;
      const bw = bx1 - bx0, bd = bz1 - bz0;
      const spots = rng.chance(0.45)
        ? [{ x: cx - bw / 4, z: cz, w: bw / 2 - 2, d: bd - 4 }, { x: cx + bw / 4, z: cz, w: bw / 2 - 2, d: bd - 4 }]
        : [{ x: cx, z: cz, w: bw - 4, d: bd - 4 }];
      for (const s of spots) {
        if (inClearZone(s.x, s.z, Math.max(s.w, s.d) / 2 + 2)) continue;
        const h = rng.range(district.h0, district.h1);
        putBuilding(s.x, s.z, s.w, h, s.d, rng.pick(district.colors));
      }
    }
  }

  // Named structures, each set back from its ring so the ring stays open.
  const garage = putBuilding(-133, 76, 10, 7, 6, 0x7a6a52);
  const garageSign = textSign("LENA'S GARAGE", 12, 3, '#ffd76a', '#2a2118');
  garageSign.position.set(-133, 8.2, 72.8);
  group.add(garageSign);
  const bank = putBuilding(60, -38, 20, 16, 10, 0x9a938a);
  const bankSign = textSign('SOLMAR BAY BANK', 16, 3, '#e8e0c8', '#3a3a44');
  bankSign.position.set(60, 12, -32.8);
  group.add(bankSign);
  const chop = putBuilding(-168, -168, 16, 9, 12, 0x5a5a62);
  const chopSign = textSign("ROOK'S CHOP SHOP", 15, 3, '#ff9a5a', '#1e1e24');
  chopSign.position.set(-168, 10.2, -161.8);
  group.add(chopSign);

  // Palma Park: a green square, a bench, and a few palms.
  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 22),
    new THREE.MeshLambertMaterial({ color: 0x5a8a4a }),
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(-23, 0.05, 122);
  park.receiveShadow = true;
  group.add(park);
  const bench = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x6a4a2a }));
  bench.scale.set(4, 0.8, 1.2);
  bench.position.set(-25, 0.4, 122);
  bench.castShadow = true;
  group.add(bench);
  addCollider(-27, 121.2, -23, 122.8);

  // Deluxe Auto Lot: a fenced yard with a few show cars.
  const lotMat = new THREE.MeshLambertMaterial({ color: 0x55504a });
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), lotMat);
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(104, 0.05, -122);
  lot.receiveShadow = true;
  group.add(lot);

  // Palms and lamps along the streets.
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 7, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const palmTopGeo = new THREE.IcosahedronGeometry(2.2, 0);
  const palmTopMat = new THREE.MeshLambertMaterial({ color: 0x3f7a34 });
  const lampPoleGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 6);
  const lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2e });
  const lampBulbGeo = new THREE.SphereGeometry(0.5, 8, 6);
  const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let n = 0; n < 90; n += 1) {
    const along = rng.pick(STREETS);
    const across = rng.range(-240, 240);
    const vertical = rng.chance(0.5);
    const px = vertical ? along + (rng.chance(0.5) ? 8.5 : -8.5) : across;
    const pz = vertical ? across : along + (rng.chance(0.5) ? 8.5 : -8.5);
    if (inClearZone(px, pz, 4)) continue;
    if (px > 164 && px < 256 && pz > 104 && pz < 246) continue;
    if (px > -50 && px < 130 && pz > 132 && pz < 224) continue;
    if (rng.chance(0.55)) {
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(px, 3.5, pz);
      trunk.castShadow = true;
      group.add(trunk);
      const top = new THREE.Mesh(palmTopGeo, palmTopMat);
      top.scale.set(1, 0.6, 1);
      top.position.set(px, 7.4, pz);
      top.castShadow = true;
      group.add(top);
    } else {
      const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
      pole.position.set(px, 3, pz);
      group.add(pole);
      const bulb = new THREE.Mesh(lampBulbGeo, lampBulbMat);
      bulb.position.set(px, 6.2, pz);
      group.add(bulb);
    }
  }

  // A few downtown neon signs for the sunset glow.
  const neonWords = ['HOTEL', 'BAR', '24H', 'PIZZA', 'CLUB', 'MOTEL'];
  for (let n = 0; n < 10; n += 1) {
    const x = rng.range(-80, 80);
    const z = rng.range(-80, 80);
    if (inClearZone(x, z, 8)) continue;
    const sign = textSign(rng.pick(neonWords), 10, 2.5, rng.pick(['#ff5a7a', '#5affd8', '#ffd75a', '#7ab8ff']), '#14141c');
    sign.position.set(x, rng.range(10, 22), z);
    sign.rotation.y = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    group.add(sign);
  }

  return { group, colliders, waterColliders, addCollider, districtAt, streets: STREETS, places: PLACES, parkedSpots: PARKED_SPOTS };
}
