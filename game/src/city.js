// Solmar Bay itself: a sun-soaked grid city on a bay, built fresh from a seed.
// Streets run on a regular pitch, buildings fill the blocks between them, and
// four districts give the map its character — Downtown towers in the middle,
// Old Town's low warm blocks in the west, Northside mid-rises, and the marina
// strip in the south-east (built by marina.js). The module also owns the named
// places every mission and activity navigates to, and the collision helpers
// everything on foot or on wheels moves through.

const THREE = window.THREE;

export const CITY_HALF = 260;
export const STREET_PITCH = 46;
export const STREET_WIDTH = 14;

// Where the story happens. All coordinates are world x/z on the ground plane.
export const PLACES = {
  spawn: { x: 0, z: 168, heading: Math.PI }, // open street, facing north into Downtown
  garage: { x: -138, z: 62, label: "Lena's Garage" },
  docks: { x: 190, z: 130, label: 'Marina Docks' },
  pierEnd: { x: 216, z: 196, label: 'Pier 9' },
  bank: { x: 42, z: -38, label: 'Solmar Bay Bank' },
  carLot: { x: 104, z: -138, label: 'Deluxe Auto Lot' },
  chopShop: { x: -168, z: -148, label: "Rook's Chop Shop" },
  warehouse: { x: 196, z: -46, label: 'Harbor Warehouse 7' },
  hospital: { x: -38, z: 182, label: 'Solmar General' },
  park: { x: -23, z: 122, label: 'Palma Park' },
  taxiStand: { x: 6, z: 58, label: 'Central Taxi Stand' },
  marinaGate: { x: 168, z: 96, label: 'Marina Gate' },
};

const DISTRICTS = [
  { name: 'Downtown', x0: -92, z0: -92, x1: 92, z1: 92, minH: 26, maxH: 88, warm: 0.35 },
  { name: 'Old Town', x0: -260, z0: -260, x1: -92, z1: 260, minH: 8, maxH: 20, warm: 0.8 },
  { name: 'Northside', x0: -92, z0: -260, x1: 260, z1: -92, minH: 14, maxH: 34, warm: 0.5 },
  { name: 'East End', x0: 92, z0: -92, x1: 260, z1: 30, minH: 12, maxH: 30, warm: 0.6 },
  { name: 'Marina', x0: 150, z0: 30, x1: 260, z1: 260, minH: 6, maxH: 12, warm: 0.7 },
];

// Parked cars worth stealing, at fixed spots around the map. Each one sits
// at the kerb of a street (a lane offset from a street line), never inside a
// block — a car parked in a courtyard would be a trap to drive out of.
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

// Points the city keeps clear of buildings: every named place plus every
// parked car, so a job target or a car to steal is never inside a wall.
const CLEAR_POINTS = [...Object.values(PLACES), ...PARKED_SPOTS];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  }
  return 'Solmar Bay';
}

// --- canvas textures -------------------------------------------------------

function facadeTexture(rng, base, warm) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  // subtle vertical grime
  for (let i = 0; i < 24; i += 1) {
    g.fillStyle = `rgba(0,0,0,${0.03 + rng.next() * 0.05})`;
    g.fillRect(rng.range(0, 120), 0, rng.range(2, 8), 256);
  }
  const cols = 5;
  const rows = 11;
  for (let r = 0; r < rows; r += 1) {
    for (let col = 0; col < cols; col += 1) {
      const lit = rng.next() < (warm ? 0.42 : 0.22);
      const shade = rng.next();
      g.fillStyle = lit
        ? (shade < 0.6 ? '#ffd98a' : shade < 0.85 ? '#9fd8ff' : '#fff3c4')
        : (shade < 0.5 ? '#1d2733' : '#2a3542');
      g.fillRect(10 + col * 23, 12 + r * 22, 15, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signTexture(text, color, bg) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 64);
  g.strokeStyle = color;
  g.lineWidth = 4;
  g.strokeRect(4, 4, 248, 56);
  g.fillStyle = color;
  g.font = 'bold 34px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function groundTexture() {
  const S = 2048;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  const toPx = (v) => ((v + CITY_HALF) / (CITY_HALF * 2)) * S;
  // sidewalk base
  g.fillStyle = '#9a8d7c';
  g.fillRect(0, 0, S, S);
  // marina apron
  g.fillStyle = '#8d8578';
  g.fillRect(toPx(150), toPx(30), toPx(260) - toPx(150), toPx(260) - toPx(30));
  // park grass
  g.fillStyle = '#5d8a4a';
  g.fillRect(toPx(-46), toPx(99), toPx(0) - toPx(-46), toPx(145) - toPx(99));
  // streets
  g.fillStyle = '#33383f';
  for (let i = 0; i <= 10; i += 1) {
    const line = -CITY_HALF + 23 + i * STREET_PITCH;
    const w = (STREET_WIDTH / (CITY_HALF * 2)) * S;
    g.fillRect(toPx(line) - w / 2, 0, w, S);
    g.fillRect(0, toPx(line) - w / 2, S, w);
  }
  // lane dashes
  g.fillStyle = '#e8c33a';
  for (let i = 0; i <= 10; i += 1) {
    const line = -CITY_HALF + 23 + i * STREET_PITCH;
    for (let d = -CITY_HALF + 10; d < CITY_HALF; d += 24) {
      g.fillRect(toPx(d), toPx(line) - 1.5, 12, 3);
      g.fillRect(toPx(line) - 1.5, toPx(d), 3, 12);
    }
  }
  // crosswalks at downtown intersections
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (const ix of [-69, -23, 23, 69]) {
    for (const iz of [-69, -23, 23, 69]) {
      for (let s = -3; s <= 3; s += 1) {
        g.fillRect(toPx(ix + s * 3) - 2, toPx(iz - 9), 4, 18);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// --- sky ------------------------------------------------------------------

function buildSky(scene) {
  const geo = new THREE.SphereGeometry(900, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x2e4a7a) },
      mid: { value: new THREE.Color(0xff8e5a) },
      low: { value: new THREE.Color(0xffc98a) },
      sunDir: { value: new THREE.Vector3(-0.55, 0.18, -0.35).normalize() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 sunDir;
      void main() {
        float h = clamp(vDir.y, -0.05, 1.0);
        vec3 col = mix(low, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, top, smoothstep(0.18, 0.65, h));
        float sun = max(dot(normalize(vDir), sunDir), 0.0);
        col += vec3(1.0, 0.75, 0.45) * pow(sun, 220.0) * 1.6;
        col += vec3(1.0, 0.55, 0.25) * pow(sun, 8.0) * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.renderOrder = -10;
  scene.add(sky);
}

// --- main build -----------------------------------------------------------

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];

  // Warm sunset light: low amber sun + soft blue-ish fill.
  scene.fog = new THREE.Fog(0xf2a56b, 150, 760);
  const sun = new THREE.DirectionalLight(0xffb36b, 1.55);
  sun.position.set(-220, 130, -140);
  sun.castShadow = false;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x8fb4ff, 0x7a5a44, 0.95));
  buildSky(scene);

  // Ground with painted streets.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_HALF * 2, CITY_HALF * 2),
    new THREE.MeshLambertMaterial({ map: groundTexture() }),
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Facade materials.
  const facadeBases = ['#b8a88f', '#9aa5b1', '#c4b49a', '#8f9aa8', '#b59a7d', '#a8b8a0', '#c9a3a3'];
  const facades = facadeBases.map((base, i) => {
    const tex = facadeTexture(rng, base, i % 2 === 0);
    return new THREE.MeshLambertMaterial({ map: tex });
  });
  const roofMats = ['#5a5148', '#6b5a52', '#4a4f57', '#7a6a5a', '#3f4a4a'].map(
    (c) => new THREE.MeshLambertMaterial({ color: c }),
  );
  const signDefs = [
    ['HOTEL LUNA', '#ffd76a', '#232a33'],
    ['BAR SOL', '#ff7a5a', '#1d2126'],
    ['CASINO', '#7dffb0', '#20242e'],
    ['24H TACOS', '#ffe9a8', '#3a2418'],
    ['CINE MAR', '#9fd8ff', '#1a2030'],
    ['PIER 9', '#ffd76a', '#14303a'],
    ['SOLMAR', '#ff9a5a', '#22262e'],
  ];

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  let signCount = 0;

  // Blocks: grid cells between streets. Skip the marina strip and the park.
  for (let gx = 0; gx < 10; gx += 1) {
    for (let gz = 0; gz < 10; gz += 1) {
      const bx0 = -CITY_HALF + 23 + gx * STREET_PITCH + STREET_WIDTH / 2 + 2;
      const bz0 = -CITY_HALF + 23 + gz * STREET_PITCH + STREET_WIDTH / 2 + 2;
      const cx = bx0 + (STREET_PITCH - STREET_WIDTH) / 2;
      const cz = bz0 + (STREET_PITCH - STREET_WIDTH) / 2;
      // Marina strip: left to marina.js.
      if (cx > 140 && cz > 20) continue;
      // Palma Park block.
      if (gx === 4 && gz === 7) {
        addPark(group, cx, cz, rng);
        continue;
      }
      const district = DISTRICTS.find(
        (d) => cx >= d.x0 && cx < d.x1 && cz >= d.z0 && cz < d.z1,
      ) || DISTRICTS[0];
      // 1–2 buildings per block.
      const count = rng.chance(0.35) ? 2 : 1;
      for (let b = 0; b < count; b += 1) {
        const w = rng.range(12, 26);
        const d = rng.range(12, 26);
        const h = rng.range(district.minH, district.maxH);
        const ox = count === 2 ? (b === 0 ? -8 : 8) : 0;
        const oz = count === 2 ? (b === 0 ? 6 : -6) : 0;
        let x = cx + ox + rng.range(-3, 3);
        let z = cz + oz + rng.range(-3, 3);
        // Keep every named place clear: no building may cover a mission
        // target, a spawn or a package spot's approach.
        const nearPlace = CLEAR_POINTS.some(
          (p) => Math.abs(p.x - x) < w / 2 + 7 && Math.abs(p.z - z) < d / 2 + 7,
        );
        if (nearPlace) continue;
        // Keep the building inside its own block so streets stay drivable:
        // clamp the centre so no face crosses the block edge (the street
        // starts 30 units past the block's start).
        x = Math.max(bx0 + w / 2, Math.min(bx0 + 30 - w / 2, x));
        z = Math.max(bz0 + d / 2, Math.min(bz0 + 30 - d / 2, z));
        const facade = facades[Math.floor(rng.next() * facades.length)];
        const roof = roofMats[Math.floor(rng.next() * roofMats.length)];
        const mesh = new THREE.Mesh(boxGeo, [facade, facade, roof, roof, facade, facade]);
        mesh.scale.set(w, h, d);
        mesh.position.set(x, h / 2, z);
        group.add(mesh);
        colliders.push({ x, z, hw: w / 2, hd: d / 2 });
        // Rooftop clutter: AC box / water tank on taller roofs.
        if (h > 24 && rng.chance(0.6)) {
          const clutter = new THREE.Mesh(
            boxGeo,
            new THREE.MeshLambertMaterial({ color: rng.pick(['#6a6a6a', '#8a7a5a', '#4a5a6a']) }),
          );
          clutter.scale.set(rng.range(3, 6), rng.range(2, 4), rng.range(3, 6));
          clutter.position.set(x + rng.range(-4, 4), h + clutter.scale.y / 2, z + rng.range(-4, 4));
          group.add(clutter);
        }
        // Neon sign on some downtown / east-end faces.
        if ((district.name === 'Downtown' || district.name === 'East End') && rng.chance(0.30) && signCount < 14) {
          const [text, color, bg] = signDefs[signCount % signDefs.length];
          signCount += 1;
          const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 3),
            new THREE.MeshBasicMaterial({ map: signTexture(text, color, bg) }),
          );
          sign.position.set(x, Math.min(h - 2, 14), z + d / 2 + 0.15);
          group.add(sign);
        }
      }
    }
  }

  addStreetProps(group, rng, colliders);

  // Named-place markers on the ground: a painted ring so the player can see
  // where a job happens even before the beacon appears.
  const ringGeo = new THREE.RingGeometry(2.2, 3.0, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd21c, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  for (const key of ['garage', 'docks', 'bank', 'carLot', 'chopShop', 'warehouse', 'hospital']) {
    const p = PLACES[key];
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.06, p.z);
    group.add(ring);
  }

  return {
    group,
    colliders,
    places: PLACES,
    districtAt,
    addCollider(box) {
      colliders.push(box);
    },
    // True when a circle at (x,z) with radius r overlaps any solid box.
    hitsSolid(x, z, r) {
      for (let i = 0; i < colliders.length; i += 1) {
        const c = colliders[i];
        if (Math.abs(x - c.x) < c.hw + r && Math.abs(z - c.z) < c.hd + r) return true;
      }
      const b = CITY_HALF - 2;
      return x < -b || x > b || z < -b || z > b;
    },
    // Move a circle, sliding along walls: try x, then z.
    slideMove(pos, dx, dz, r) {
      if (!this.hitsSolid(pos.x + dx, pos.z, r)) pos.x += dx;
      if (!this.hitsSolid(pos.x, pos.z + dz, r)) pos.z += dz;
    },
    update() {
      // The city is static; the marina animates its own water.
    },
  };
}

function addPark(group, cx, cz, rng) {
  const THREE_ = THREE;
  // A few palms and a bench cluster in Palma Park.
  for (let i = 0; i < 6; i += 1) {
    const px = cx + rng.range(-12, 12);
    const pz = cz + rng.range(-12, 12);
    const trunk = new THREE_.Mesh(
      new THREE_.CylinderGeometry(0.35, 0.5, 7, 6),
      new THREE_.MeshLambertMaterial({ color: 0x7a5a38 }),
    );
    trunk.position.set(px, 3.5, pz);
    group.add(trunk);
    const crown = new THREE_.Mesh(
      new THREE_.ConeGeometry(3.2, 4.5, 7),
      new THREE_.MeshLambertMaterial({ color: 0x3f7a34 }),
    );
    crown.position.set(px, 8.6, pz);
    group.add(crown);
  }
  const bench = new THREE_.Mesh(
    new THREE_.BoxGeometry(4, 1, 1.4),
    new THREE_.MeshLambertMaterial({ color: 0x8a6a42 }),
  );
  bench.position.set(cx, 0.5, cz);
  group.add(bench);
}

function addStreetProps(group, rng, colliders) {
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2c3138 });
  const lampGlow = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const palmTrunk = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  const palmLeaf = new THREE.MeshLambertMaterial({ color: 0x4a8a3a });
  // Street lamps at downtown intersections, palms along Old Town streets.
  for (let i = 0; i <= 10; i += 1) {
    for (let j = 0; j <= 10; j += 1) {
      const x = -CITY_HALF + 23 + i * STREET_PITCH;
      const z = -CITY_HALF + 23 + j * STREET_PITCH;
      if (Math.abs(x) < 92 && Math.abs(z) < 92 && rng.chance(0.5)) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 6), lampMat);
        pole.position.set(x + 8.5, 3.5, z + 8.5);
        group.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampGlow);
        bulb.position.set(x + 8.5, 7.1, z + 8.5);
        group.add(bulb);
      }
      if (x < -92 && rng.chance(0.16)) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 6, 6), palmTrunk);
        trunk.position.set(x + 9, 3, z + 9);
        group.add(trunk);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.6, 7), palmLeaf);
        crown.position.set(x + 9, 7.4, z + 9);
        group.add(crown);
      }
    }
  }
}
