// city.js — the seeded city: street grid, districts, named places, props and collision.
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
  airport: { x: 118, z: 150 },
  terminal: { x: 100, z: 150 },
  runwayNorth: { x: 118, z: 55 },
  runwaySouth: { x: 118, z: 225 },
  hangar: { x: 144, z: 110 },
};

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
  // Airport comes before Casino Row: the overlap x 92..124, z 138..218 is airport land.
  { name: 'Airport', x0: 92, z0: 30, x1: 150, z1: 260, h0: 8, h1: 14, colors: [0xb8b8b0, 0x9ab0b8, 0xd8d0c0] },
  { name: 'Casino Row', x0: -44, z0: 138, x1: 124, z1: 218, h0: 18, h1: 46, colors: [0xd8b45a, 0xc8a04a] },
];

const CLEAR_ZONES = [
  { x: -138, z: 62, r: 13 },
  { x: 190, z: 130, r: 12 },
  { x: 216, z: 196, r: 10 },
  { x: 42, z: -38, r: 13 },
  { x: 104, z: -138, r: 15 },
  { x: -168, z: -148, r: 13 },
  { x: 196, z: -46, r: 15 },
  { x: -38, z: 182, r: 10 },
  { x: -23, z: 122, r: 11 },
  { x: 6, z: 58, r: 9 },
  { x: 168, z: 96, r: 10 },
  { x: 0, z: 168, r: 10 },
  { x: 18, z: 177, r: 26 },
  { x: 32, z: 177, r: 10 },
  { x: 100, z: 150, r: 14 },
  { x: 118, z: 55, r: 10 },
  { x: 118, z: 225, r: 10 },
  { x: 144, z: 110, r: 10 },
  { x: 144, z: 195, r: 10 },
  { x: 100, z: 210, r: 8 },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  }
  return 'Solmar Bay';
}

export function circleHits(x, z, r, colliders) {
  for (const c of colliders) {
    const cx = Math.max(c.x0, Math.min(x, c.x1));
    const cz = Math.max(c.z0, Math.min(z, c.z1));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < r * r) return c;
  }
  return null;
}

export function slideMove(x, z, dx, dz, r, colliders) {
  let hit = false, hitX = false, hitZ = false;
  // Push out of any collider the circle already overlaps.
  for (const c of colliders) {
    const ex0 = c.x0 - r, ex1 = c.x1 + r, ez0 = c.z0 - r, ez1 = c.z1 + r;
    if (x > ex0 && x < ex1 && z > ez0 && z < ez1) {
      const pl = x - ex0, pr = ex1 - x, pt = z - ez0, pb = ez1 - z;
      const m = Math.min(pl, pr, pt, pb);
      if (m === pl) x = ex0;
      else if (m === pr) x = ex1;
      else if (m === pt) z = ez0;
      else z = ez1;
    }
  }
  const nx = x + dx;
  if (circleHits(nx, z, r, colliders)) { hit = true; hitX = true; }
  else x = nx;
  const nz = z + dz;
  if (circleHits(x, nz, r, colliders)) { hit = true; hitZ = true; }
  else z = nz;
  return { x, z, hit, hitX, hitZ };
}

export function nearestStreet(v) {
  let best = STREETS[0];
  for (const s of STREETS) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
  return best;
}

export function textSign(text, w, h, fg = '#ffd76a', bg = '#1a1a22', font = 'bold 42px sans-serif') {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
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
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.signMat = mat;
  return mesh;
}

function inClearZone(x, z, pad) {
  for (const zn of CLEAR_ZONES) {
    const dx = x - zn.x, dz = z - zn.z;
    if (Math.sqrt(dx * dx + dz * dz) < zn.r + pad) return true;
  }
  return false;
}

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];
  const waterColliders = [];
  function addCollider(x0, z0, x1, z1) {
    const c = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) };
    colliders.push(c);
    return c;
  }

  // Ground.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0x8f8a7c })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Roads.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3c3f45 });
  for (const s of STREETS) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(560, 14), roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0.03, s);
    h.receiveShadow = true;
    group.add(h);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(14, 560), roadMat);
    v.rotation.x = -Math.PI / 2;
    v.position.set(s, 0.03, 0);
    v.receiveShadow = true;
    group.add(v);
  }

  // Window texture (unseeded: patterns differ every load).
  const wc = document.createElement('canvas');
  wc.width = 128; wc.height = 128;
  const wg = wc.getContext('2d');
  wg.fillStyle = '#33333d';
  wg.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 6; col++) {
      const lit = Math.random() < 0.3;
      wg.fillStyle = lit ? (Math.random() < 0.6 ? '#ffd27a' : '#9fc4ff') : '#191922';
      wg.fillRect(6 + col * 20, 6 + row * 15, 12, 9);
    }
  }
  const winTex = new THREE.CanvasTexture(wc);
  winTex.wrapS = THREE.RepeatWrapping;
  winTex.wrapT = THREE.RepeatWrapping;
  winTex.repeat.set(2, 2);

  // Buildings, block by block.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const matCache = new Map();
  function matFor(color) {
    if (!matCache.has(color)) {
      matCache.set(color, new THREE.MeshLambertMaterial({ color, map: winTex }));
    }
    return matCache.get(color);
  }
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4640 });
  for (let i = 0; i < STREETS.length - 1; i++) {
    for (let j = 0; j < STREETS.length - 1; j++) {
      const bx0 = STREETS[i] + 7, bx1 = STREETS[i + 1] - 7;
      const bz0 = STREETS[j] + 7, bz1 = STREETS[j + 1] - 7;
      const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
      if (cx > 125 && cx < 256 && cz > 104 && cz < 246) continue; // marina basin
      if (cx > -50 && cx < 130 && cz > 132 && cz < 224) continue; // Casino Row
      if (cx > 92 && cx < 150 && cz > 30 && cz < 260) continue; // Airport
      const dist = DISTRICTS.find(d => cx >= d.x0 && cx < d.x1 && cz >= d.z0 && cz < d.z1);
      if (!dist) continue;
      const two = rng.chance(0.45);
      const plots = two
        ? [{ x0: bx0, x1: cx - 2, z0: bz0, z1: bz1 }, { x0: cx + 2, x1: bx1, z0: bz0, z1: bz1 }]
        : [{ x0: bx0 + 2, x1: bx1 - 2, z0: bz0 + 2, z1: bz1 - 2 }];
      for (const p of plots) {
        const px = (p.x0 + p.x1) / 2, pz = (p.z0 + p.z1) / 2;
        if (inClearZone(px, pz, 0)) continue;
        const w = p.x1 - p.x0, d = p.z1 - p.z0;
        const h = rng.range(dist.h0, dist.h1);
        const color = rng.pick(dist.colors);
        const m = new THREE.Mesh(boxGeo, matFor(color));
        m.scale.set(w, h, d);
        m.position.set(px, h / 2, pz);
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
        const roof = new THREE.Mesh(boxGeo, roofMat);
        roof.scale.set(w + 0.4, 0.4, d + 0.4);
        roof.position.set(px, h + 0.2, pz);
        group.add(roof);
        addCollider(p.x0, p.z0, p.x1, p.z1);
      }
    }
  }

  // Named structures, set back from their rings.
  function namedBox(w, h, d, x, z, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  }
  namedBox(10, 7, 6, -133, 76, 0x7a6a52);
  const gs = textSign("LENA'S GARAGE", 12, 3);
  gs.position.set(-133, 8.2, 72.8);
  group.add(gs);
  namedBox(20, 16, 10, 60, -38, 0x9a938a);
  const bs = textSign('SOLMAR BAY BANK', 16, 3);
  bs.position.set(60, 12, -32.8);
  group.add(bs);
  namedBox(16, 9, 12, -168, -168, 0x5a5a62);
  const cs = textSign("ROOK'S CHOP SHOP", 15, 3);
  cs.position.set(-168, 10.2, -161.8);
  group.add(cs);

  // Palma Park.
  const park = new THREE.Mesh(new THREE.PlaneGeometry(26, 22), new THREE.MeshLambertMaterial({ color: 0x5a8a4a }));
  park.rotation.x = -Math.PI / 2;
  park.position.set(-23, 0.05, 122);
  group.add(park);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 1.2), new THREE.MeshLambertMaterial({ color: 0x6a4a2a }));
  bench.position.set(-25, 0.4, 122);
  group.add(bench);
  addCollider(-27, 121.2, -23, 122.8);

  // Deluxe Auto Lot yard (ground plane only).
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshLambertMaterial({ color: 0x55504a }));
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(104, 0.05, -122);
  group.add(lot);

  // Palms and lamps along streets.
  for (let n = 0; n < 90; n++) {
    const line = rng.pick(STREETS);
    const along = rng.range(-240, 240);
    const vertical = rng.chance(0.5);
    const side = rng.chance(0.5) ? 8.5 : -8.5;
    const px = vertical ? line + side : along;
    const pz = vertical ? along : line + side;
    if (inClearZone(px, pz, 4)) continue;
    if (px > 125 && px < 256 && pz > 104 && pz < 246) continue;
    if (px > -50 && px < 130 && pz > 132 && pz < 224) continue;
    if (rng.chance(0.55)) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 8), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
      trunk.position.set(px, 3.5, pz);
      group.add(trunk);
      const top = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), new THREE.MeshLambertMaterial({ color: 0x3f7a34 }));
      top.scale.y = 0.6;
      top.position.set(px, 7.4, pz);
      group.add(top);
    } else {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 8), new THREE.MeshLambertMaterial({ color: 0x2a2a2e }));
      pole.position.set(px, 3, pz);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
      bulb.position.set(px, 6.2, pz);
      group.add(bulb);
    }
  }

  // Downtown neon signs.
  const neonWords = ['HOTEL', 'BAR', '24H', 'PIZZA', 'CLUB', 'MOTEL'];
  const neonColors = ['#ff5a7a', '#5affd8', '#ffd75a', '#7ab8ff'];
  for (let n = 0; n < 10; n++) {
    const px = rng.range(-80, 80);
    const pz = rng.range(-80, 80);
    if (inClearZone(px, pz, 8)) continue;
    const sign = textSign(rng.pick(neonWords), 10, 2.5, rng.pick(neonColors));
    sign.position.set(px, rng.range(10, 22), pz);
    sign.rotation.y = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    group.add(sign);
  }

  return { group, colliders, waterColliders, addCollider, districtAt, streets: STREETS, places: PLACES, parkedSpots: PARKED_SPOTS };
}
