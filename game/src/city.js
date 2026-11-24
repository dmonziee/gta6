// city.js — the seeded city builder: street grid, eight districts, named places,
// parked cars, props, and the collision boxes plus the slide-along-wall helper.

export const STREETS = [-237, -191, -145, -99, -53, -7, 39, 85, 131, 177, 223];

export const PLACES = {
  spawn: { x: 0, z: 168 },
  garage: { x: -138, z: 62 },
  docks: { x: 190, z: 130 },
  pierEnd: { x: 55, z: 258 },
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
  oceanDrive: { x: 16, z: 223 },
  beach: { x: 55, z: 250 },
  hotelRow: { x: 16, z: 234 },
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

// District order matters where rectangles overlap: the Airport entry sits before
// Casino Row so the overlap region x 92..124, z 138..218 is airport land, not casino
// land. Ocean Drive shares only edges with its neighbours, so its order is inert.
export const DISTRICTS = [
  { name: 'Downtown', x0: -92, z0: -92, x1: 92, z1: 92, h0: 26, h1: 88, colors: [0x8a7f70, 0x6f7f8a, 0x9a8a6a, 0x7a6a8a, 0x5f6f7f] },
  { name: 'Old Town', x0: -260, z0: -260, x1: -92, z1: 260, h0: 8, h1: 20, colors: [0xc2a878, 0xb08a6a, 0xa89080, 0xc2b49a] },
  { name: 'Northside', x0: -92, z0: -260, x1: 260, z1: -92, h0: 14, h1: 34, colors: [0x7f8a7a, 0x8a7f6a, 0x6a7f8a, 0x9a9a8a] },
  { name: 'East End', x0: 92, z0: -92, x1: 260, z1: 30, h0: 12, h1: 30, colors: [0x8a6a6a, 0x7a7a6a, 0x9a8a7a, 0x6a6a7a] },
  { name: 'Marina', x0: 150, z0: 30, x1: 260, z1: 260, h0: 6, h1: 12, colors: [0xd8c8a8, 0xc8b89a, 0xe0d0b0] },
  { name: 'Airport', x0: 92, z0: 30, x1: 150, z1: 260, h0: 8, h1: 14, colors: [0xb8b8b0, 0x9ab0b8, 0xd8d0c0] },
  { name: 'Casino Row', x0: -44, z0: 138, x1: 124, z1: 218, h0: 18, h1: 46, colors: [0xd8b45a, 0xc8a04a] },
  { name: 'Ocean Drive', x0: -44, z0: 218, x1: 92, z1: 260, h0: 6, h1: 12, colors: [0xe8a0b0, 0x7ab8b0, 0xe8d8b0] },
];

// Open ground around every named place, where no building ever goes.
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
  { x: 16, z: 234, r: 12 },
  { x: 55, z: 244, r: 8 },
  { x: 10, z: 248, r: 6 },
];

function inClearZone(x, z, pad) {
  for (const c of CLEAR_ZONES) {
    if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return true;
  }
  return false;
}

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
  // Push out of any collider the circle already overlaps, along the smallest
  // penetration direction, so nothing sits pinned inside a collision pocket.
  for (const c of colliders) {
    const cx = Math.max(c.x0, Math.min(x, c.x1));
    const cz = Math.max(c.z0, Math.min(z, c.z1));
    const ddx = x - cx;
    const ddz = z - cz;
    if (ddx * ddx + ddz * ddz < r * r) {
      const pl = x - (c.x0 - r);
      const pr = c.x1 + r - x;
      const pt = z - (c.z0 - r);
      const pb = c.z1 + r - z;
      const m = Math.min(pl, pr, pt, pb);
      if (m === pl) x = c.x0 - r;
      else if (m === pr) x = c.x1 + r;
      else if (m === pt) z = c.z0 - r;
      else z = c.z1 + r;
    }
  }
  let hitX = false;
  let hitZ = false;
  if (!circleHits(x + dx, z, r, colliders)) {
    x += dx;
  } else {
    hitX = true;
  }
  if (!circleHits(x, z + dz, r, colliders)) {
    z += dz;
  } else {
    hitZ = true;
  }
  return { x, z, hit: hitX || hitZ, hitX, hitZ };
}

export function nearestStreet(v) {
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

function toCss(c) {
  if (typeof c === 'string') return c;
  return '#' + c.toString(16).padStart(6, '0');
}

export function textSign(text, w, h, fg = 0xffd76a, bg = 0x1a1a22, font = 'bold 42px sans-serif') {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = toCss(bg);
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = toCss(fg);
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = toCss(fg);
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.signMat = mat;
  return mesh;
}

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];
  const waterColliders = [];
  function addCollider(x0, z0, x1, z1) {
    const c = {
      x0: Math.min(x0, x1),
      z0: Math.min(z0, z1),
      x1: Math.max(x0, x1),
      z1: Math.max(z0, z1),
    };
    colliders.push(c);
    return c;
  }

  // Ground.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0x8f8a7c }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Roads along every street line, both directions.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3c3f45 });
  for (const s of STREETS) {
    const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(560, 14), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.03, s);
    hRoad.receiveShadow = true;
    group.add(hRoad);
    const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(14, 560), roadMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(s, 0.03, 0);
    vRoad.receiveShadow = true;
    group.add(vRoad);
  }

  // Window texture (unseeded Math.random, so patterns differ on every load).
  const winCv = document.createElement('canvas');
  winCv.width = 128;
  winCv.height = 128;
  const wctx = winCv.getContext('2d');
  wctx.fillStyle = '#33333d';
  wctx.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 6; col++) {
      let c = '#191922';
      if (Math.random() < 0.3) c = Math.random() < 0.6 ? '#ffd27a' : '#9fc4ff';
      wctx.fillStyle = c;
      wctx.fillRect(4 + col * 21, 4 + row * 16, 14, 10);
    }
  }
  const winTex = new THREE.CanvasTexture(winCv);
  winTex.wrapS = THREE.RepeatWrapping;
  winTex.wrapT = THREE.RepeatWrapping;
  winTex.repeat.set(2, 2);

  // Buildings, one or two per block, in the district of the block centre.
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4640 });
  const matCache = new Map();
  function buildingMat(color) {
    if (!matCache.has(color)) {
      matCache.set(color, new THREE.MeshLambertMaterial({ color, map: winTex }));
    }
    return matCache.get(color);
  }
  for (let i = 0; i < STREETS.length - 1; i++) {
    for (let j = 0; j < STREETS.length - 1; j++) {
      const bx0 = STREETS[i] + 7;
      const bx1 = STREETS[i + 1] - 7;
      const bz0 = STREETS[j] + 7;
      const bz1 = STREETS[j + 1] - 7;
      const cx = (bx0 + bx1) / 2;
      const cz = (bz0 + bz1) / 2;
      if (cx > 125 && cx < 256 && cz > 104 && cz < 246) continue; // marina basin
      if (cx > -50 && cx < 130 && cz > 132 && cz < 224) continue; // Casino Row
      if (cx > 92 && cx < 150 && cz > 30 && cz < 260) continue; // Airport
      if (cx > -44 && cx < 92 && cz > 218 && cz < 260) continue; // Ocean Drive
      let district = null;
      for (const d of DISTRICTS) {
        if (cx >= d.x0 && cx < d.x1 && cz >= d.z0 && cz < d.z1) {
          district = d;
          break;
        }
      }
      if (!district) continue;
      const bw = bx1 - bx0;
      const bd = bz1 - bz0;
      const spots = [];
      if (rng.chance(0.45)) {
        spots.push({ x: cx - bw / 4, z: cz, w: bw / 2 - 4, d: bd - 4 });
        spots.push({ x: cx + bw / 4, z: cz, w: bw / 2 - 4, d: bd - 4 });
      } else {
        spots.push({ x: cx, z: cz, w: bw - 4, d: bd - 4 });
      }
      for (const s of spots) {
        if (inClearZone(s.x, s.z, 0)) continue;
        const h = rng.range(district.h0, district.h1);
        const color = rng.pick(district.colors);
        const mesh = new THREE.Mesh(unitBox, buildingMat(color));
        mesh.scale.set(s.w, h, s.d);
        mesh.position.set(s.x, h / 2, s.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        const roof = new THREE.Mesh(unitBox, roofMat);
        roof.scale.set(s.w + 0.4, 0.4, s.d + 0.4);
        roof.position.set(s.x, h + 0.2, s.z);
        group.add(roof);
        addCollider(s.x - s.w / 2, s.z - s.d / 2, s.x + s.w / 2, s.z + s.d / 2);
      }
    }
  }

  // Named structures, set back from their rings so the rings stay open.
  function namedBox(w, h, d, x, z, color) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color }),
    );
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  }
  namedBox(10, 7, 6, -133, 76, 0x7a6a52);
  const garageSign = textSign("LENA'S GARAGE", 12, 3);
  garageSign.position.set(-133, 8.2, 72.8);
  garageSign.rotation.y = Math.PI;
  group.add(garageSign);
  namedBox(20, 16, 10, 60, -38, 0x9a938a);
  const bankSign = textSign('SOLMAR BAY BANK', 16, 3);
  bankSign.position.set(60, 12, -32.8);
  group.add(bankSign);
  namedBox(16, 9, 12, -168, -168, 0x5a5a62);
  const chopSign = textSign("ROOK'S CHOP SHOP", 15, 3);
  chopSign.position.set(-168, 10.2, -161.8);
  group.add(chopSign);

  // Palma Park.
  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 22),
    new THREE.MeshLambertMaterial({ color: 0x5a8a4a }),
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(-23, 0.05, 122);
  group.add(park);
  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.8, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x6a4a2a }),
  );
  bench.position.set(-25, 0.4, 122);
  group.add(bench);
  addCollider(-27, 121.2, -23, 122.8);

  // Deluxe Auto Lot yard (ground plane only, no fence meshes or colliders).
  const lot = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshLambertMaterial({ color: 0x55504a }),
  );
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(104, 0.05, -122);
  group.add(lot);

  // Palms and lamps along the streets.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const topMat = new THREE.MeshLambertMaterial({ color: 0x3f7a34 });
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2e });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let n = 0; n < 90; n++) {
    const line = rng.pick(STREETS);
    const along = rng.range(-240, 240);
    const side = rng.chance(0.5) ? 8.5 : -8.5;
    const vertical = rng.chance(0.5);
    const x = vertical ? line + side : along;
    const z = vertical ? along : line + side;
    if (inClearZone(x, z, 4)) continue;
    if (x > 125 && x < 256 && z > 104 && z < 246) continue; // marina basin
    if (x > -50 && x < 130 && z > 132 && z < 224) continue; // Casino Row
    if (x > 92 && x < 150 && z > 30 && z < 260) continue; // Airport
    if (x > -44 && x < 92 && z > 218 && z < 260) continue; // Ocean Drive
    if (rng.chance(0.55)) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 8), trunkMat);
      trunk.position.set(x, 3.5, z);
      group.add(trunk);
      const top = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), topMat);
      top.scale.y = 0.6;
      top.position.set(x, 7.4, z);
      group.add(top);
    } else {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 8), poleMat);
      pole.position.set(x, 3, z);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), bulbMat);
      bulb.position.set(x, 6.2, z);
      group.add(bulb);
    }
  }

  // Downtown neon signs.
  const neonWords = ['HOTEL', 'BAR', '24H', 'PIZZA', 'CLUB', 'MOTEL'];
  const neonColors = [0xff5a7a, 0x5affd8, 0xffd75a, 0x7ab8ff];
  for (let n = 0; n < 10; n++) {
    const x = rng.range(-80, 80);
    const z = rng.range(-80, 80);
    if (inClearZone(x, z, 8)) continue;
    const sign = textSign(rng.pick(neonWords), 10, 2.5, rng.pick(neonColors), 0x1a1a22);
    sign.position.set(x, rng.range(10, 22), z);
    sign.rotation.y = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    group.add(sign);
  }

  return {
    group,
    colliders,
    waterColliders,
    addCollider,
    districtAt,
    streets: STREETS,
    places: PLACES,
    parkedSpots: PARKED_SPOTS,
  };
}
