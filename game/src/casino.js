// casino.js — Casino Row: three casinos, the vault house, hotel, valet lot and arch.
function facadeTexture(base) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      const r = Math.random();
      g.fillStyle = r < 0.22 ? '#ffd27a' : (r < 0.34 ? '#9fc4ff' : '#20202c');
      g.fillRect(8 + col * 41, 10 + row * 48, 26, 30);
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.1)';
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * 256;
    g.fillRect(x, 0, 3 + Math.random() * 5, 256);
  }
  return new THREE.CanvasTexture(cv);
}

function neonSign(text, w, h, color) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, 512, 128);
  g.font = 'bold 64px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 26;
  g.fillStyle = color;
  g.fillText(text, 256, 66);
  g.shadowBlur = 8;
  g.fillStyle = '#ffffff';
  g.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.neon = true;
  mesh.userData.neonMat = mat;
  return mesh;
}

export function buildCasinoRow(scene, rng, city) {
  const group = new THREE.Group();
  scene.add(group);
  const neons = [];
  let phase = 0;
  function addNeon(text, w, h, color, x, y, z, rotY = 0) {
    const s = neonSign(text, w, h, color);
    s.position.set(x, y, z);
    if (rotY) s.rotation.y = rotY;
    group.add(s);
    neons.push({ mat: s.userData.neonMat, phase });
    phase += 1.3;
    return s;
  }
  function putBlock(w, h, d, x, z, color, base) {
    const tex = facadeTexture(base);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color, map: tex }));
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    city.addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
    return m;
  }

  // Plaza in front of Casino Solmar.
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(40, 9), new THREE.MeshLambertMaterial({ color: 0xb8b0a0 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(18, 0.06, 167.5);
  group.add(plaza);

  // Casino Solmar.
  putBlock(30, 24, 16, 18, 155, 0xd8b45a, '#c8a04a');
  const front = new THREE.Mesh(new THREE.BoxGeometry(30, 24, 0.6), new THREE.MeshLambertMaterial({ color: 0xd8b45a }));
  front.position.set(18, 12, 163.1);
  group.add(front);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, 4), new THREE.MeshLambertMaterial({ color: 0x2a2a30 }));
  canopy.position.set(18, 7.5, 165);
  group.add(canopy);
  for (const cx of [13.6, 22.4]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7.5, 8), new THREE.MeshLambertMaterial({ color: 0xd8b45a }));
    col.position.set(cx, 3.75, 166.4);
    group.add(col);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(6, 6.5, 0.5), new THREE.MeshLambertMaterial({ color: 0x14141c }));
  door.position.set(18, 3.25, 163.4);
  group.add(door);
  addNeon('CASINO SOLMAR', 26, 6.5, '#ffd76a', 18, 20.5, 163.6);
  addNeon('★ SLOTS ★', 12, 3, '#5aff8a', 18, 23.5, 163.6);

  // El Dorado, east.
  putBlock(24, 18, 16, 64, 155, 0x3a9a9a, '#2a8a8a');
  addNeon('EL DORADO', 18, 4.5, '#ff5ad8', 64, 15.5, 163.6);

  // The Royale, west.
  putBlock(22, 20, 16, -29, 155, 0x9a2a2a, '#8a2a2a');
  addNeon('ROYALE', 14, 3.5, '#ff4a4a', -29, 17, 163.6);

  // Vault house across the street.
  putBlock(18, 12, 14, 18, 201, 0xd8b45a, '#c8a04a');
  const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe8c25a }));
  dome.position.set(18, 12, 201);
  group.add(dome);
  const vaultDoor = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 0.6), new THREE.MeshLambertMaterial({ color: 0x1c1c22 }));
  vaultDoor.position.set(18, 3.5, 193.8);
  group.add(vaultDoor);
  addNeon('VAULT', 10, 2.5, '#ffd76a', 18, 10.5, 193.6);

  // Hotel Marbella.
  putBlock(20, 30, 14, 64, 201, 0xd8d0c0, '#d8d0c0');
  addNeon('HOTEL MARBELLA', 16, 4, '#7ab8ff', 64, 26, 193.6);

  // Valet lot.
  const valet = new THREE.Mesh(new THREE.PlaneGeometry(34, 24), new THREE.MeshLambertMaterial({ color: 0x2e2e34 }));
  valet.rotation.x = -Math.PI / 2;
  valet.position.set(103, 0.05, 202);
  group.add(valet);
  const booth = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshLambertMaterial({ color: 0x5a5a62 }));
  booth.position.set(90, 1.5, 194);
  group.add(booth);
  city.addCollider(88.5, 192.5, 91.5, 195.5);
  const valetColors = [0xc83232, 0x2a5fd8, 0xe8c832, 0x3a3a40];
  const valetSpots = [[96, 198], [104, 198], [96, 206], [104, 206]];
  valetSpots.forEach(([vx, vz], i) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.9, 4.4), new THREE.MeshLambertMaterial({ color: valetColors[i] }));
    body.position.set(vx, 0.7, vz);
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.2), new THREE.MeshLambertMaterial({ color: 0x14141c }));
    cabin.position.set(vx, 1.4, vz);
    group.add(cabin);
  });

  // Fountain.
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.8, 20), new THREE.MeshLambertMaterial({ color: 0x8a8a90 }));
  basin.position.set(41, 0.4, 201);
  group.add(basin);
  const fwater = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.3, 20), new THREE.MeshLambertMaterial({ color: 0x3a9ad8 }));
  fwater.position.set(41, 0.8, 201);
  group.add(fwater);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.2, 8), new THREE.MeshLambertMaterial({ color: 0x9fc4ff }));
  jet.position.set(41, 1.8, 201);
  group.add(jet);
  city.addCollider(37.6, 197.6, 44.4, 204.4);

  // Gateway arch at x 48.
  for (const pz of [170, 184]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9.2, 1.6), new THREE.MeshLambertMaterial({ color: 0x2a2a30 }));
    post.position.set(48, 4.6, pz);
    group.add(post);
    city.addCollider(48 - 0.8, pz - 0.8, 48 + 0.8, pz + 0.8);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 15.6), new THREE.MeshLambertMaterial({ color: 0x2a2a30 }));
  beam.position.set(48, 9.2, 177);
  group.add(beam);
  addNeon('CASINO ROW', 13, 3, '#ffd76a', 49.3, 9.2, 177, Math.PI / 2);
  addNeon('CASINO ROW', 13, 3, '#ffd76a', 46.7, 9.2, 177, -Math.PI / 2);

  // Palms along the back street at z 214.
  for (let x = -40; x <= 120; x += 16) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 8), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
    trunk.position.set(x, 3.5, 214);
    group.add(trunk);
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), new THREE.MeshLambertMaterial({ color: 0x3f7a34 }));
    top.scale.y = 0.6;
    top.position.set(x, 7.4, 214);
    group.add(top);
  }

  function update(t) {
    for (const n of neons) {
      n.mat.opacity = 0.72 + 0.2 * Math.sin(t * 2 + n.phase) + 0.06 * Math.sin(t * 7 + n.phase * 2);
    }
  }
  return { group, door: { x: 18, z: 166 }, vault: { x: 18, z: 190 }, update };
}
