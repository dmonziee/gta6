// Solmar Bay — Casino Row, the glittering south strip where the finale
// happens. Three casinos face the street at z 177; the vault house and the
// hotel sit across it. Every neon sign breathes: its glow wobbles slowly
// with a sine wave plus a faster smaller wobble, so the signs feel lit
// rather than painted.

const THREE = window.THREE;

function facadeTexture(base, litA, litB) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  // A grid of small windows, five rows by six columns; some lit warm
  // yellow, some blue, most dark.
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const r = Math.random();
      g.fillStyle = r < 0.22 ? litA : r < 0.34 ? litB : '#20202c';
      g.fillRect(14 + col * 40, 18 + row * 46, 24, 28);
    }
  }
  // Faint vertical grime streaks.
  g.fillStyle = 'rgba(0,0,0,0.10)';
  for (let i = 0; i < 12; i += 1) {
    g.fillRect(Math.random() * 256, 0, 3 + Math.random() * 5, 256);
  }
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function neonSign(text, w, h, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 128);
  g.font = 'bold 64px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 26;
  g.fillStyle = color;
  g.fillText(text, 256, 64);
  g.shadowBlur = 8;
  g.fillStyle = '#ffffff';
  g.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.neon = true;
  return mesh;
}

export function buildCasinoRow(scene, rng, city) {
  const group = new THREE.Group();
  scene.add(group);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const lam = (color, map) => new THREE.MeshLambertMaterial({ color, map });
  const neons = [];
  let neonPhase = 0;
  const trackNeon = (mesh) => {
    neons.push({ mat: mesh.material, phase: neonPhase });
    neonPhase += 1.3;
    group.add(mesh);
    return mesh;
  };

  const putBlock = (cx, cz, w, h, d, color, map) => {
    const mesh = new THREE.Mesh(boxGeo, lam(color, map));
    mesh.scale.set(w, h, d);
    mesh.position.set(cx, h / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    city.addCollider(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2);
    return mesh;
  };

  // Light plaza in front of Casino Solmar, with palms and lamps.
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 9),
    new THREE.MeshLambertMaterial({ color: 0xb8b0a0 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(18, 0.06, 167.5);
  plaza.receiveShadow = true;
  group.add(plaza);

  // Casino Solmar: the big one, gold front, at (18, 155).
  const solmarTex = facadeTexture('#c8a04a', '#ffd27a', '#9fc4ff');
  putBlock(18, 155, 30, 24, 16, 0xd8b45a, solmarTex);
  const goldFront = new THREE.Mesh(boxGeo, lam(0xe8c25a));
  goldFront.scale.set(30, 24, 0.6);
  goldFront.position.set(18, 12, 163.1);
  group.add(goldFront);
  // Entrance canopy on two slim columns over a dark double door.
  const canopy = new THREE.Mesh(boxGeo, lam(0x2a2a30));
  canopy.scale.set(10, 0.8, 4);
  canopy.position.set(18, 7.5, 165);
  canopy.castShadow = true;
  group.add(canopy);
  for (const dx of [-4.4, 4.4]) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 7.5, 8),
      lam(0xd8b45a),
    );
    col.position.set(18 + dx, 3.75, 166.4);
    group.add(col);
  }
  const door = new THREE.Mesh(boxGeo, lam(0x14141c));
  door.scale.set(6, 6.5, 0.5);
  door.position.set(18, 3.25, 163.4);
  group.add(door);
  const solmarSign = neonSign('CASINO SOLMAR', 26, 6.5, '#ffd76a');
  solmarSign.position.set(18, 20.5, 163.6);
  trackNeon(solmarSign);
  const slotsSign = neonSign('★ SLOTS ★', 12, 3, '#5aff8a');
  slotsSign.position.set(18, 23.5, 163.6);
  trackNeon(slotsSign);

  // El Dorado, east of Solmar: teal and purple with a pink sign.
  const doradoTex = facadeTexture('#2a8a8a', '#ffd27a', '#9fc4ff');
  putBlock(64, 155, 24, 18, 16, 0x3a9a9a, doradoTex);
  const doradoSign = neonSign('EL DORADO', 18, 4.5, '#ff5ad8');
  doradoSign.position.set(64, 15.5, 163.6);
  trackNeon(doradoSign);

  // The Royale, west of Solmar: crimson with a red sign.
  const royaleTex = facadeTexture('#8a2a2a', '#ffd27a', '#9fc4ff');
  putBlock(-29, 155, 22, 20, 16, 0x9a2a2a, royaleTex);
  const royaleSign = neonSign('ROYALE', 14, 3.5, '#ff4a4a');
  royaleSign.position.set(-29, 17, 163.6);
  trackNeon(royaleSign);

  // The vault house across the street, with a gold dome and a vault door.
  const vaultTex = facadeTexture('#c8a04a', '#ffd27a', '#9fc4ff');
  putBlock(18, 201, 18, 12, 14, 0xd8b45a, vaultTex);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    lam(0xe8c25a),
  );
  dome.position.set(18, 12, 201);
  dome.castShadow = true;
  group.add(dome);
  const vaultDoor = new THREE.Mesh(boxGeo, lam(0x1c1c22));
  vaultDoor.scale.set(5, 7, 0.6);
  vaultDoor.position.set(18, 3.5, 193.8);
  group.add(vaultDoor);
  const vaultSign = neonSign('VAULT', 10, 2.5, '#ffd76a');
  vaultSign.position.set(18, 10.5, 193.6);
  trackNeon(vaultSign);

  // Hotel Marbella, behind the vault house.
  const hotelTex = facadeTexture('#d8d0c0', '#ffd27a', '#9fc4ff');
  putBlock(64, 201, 20, 30, 14, 0xd8d0c0, hotelTex);
  const hotelSign = neonSign('HOTEL MARBELLA', 16, 4, '#7ab8ff');
  hotelSign.position.set(64, 26, 193.6);
  trackNeon(hotelSign);

  // Valet lot east of the vault house: dark asphalt, a booth, four cars.
  const valet = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 24),
    new THREE.MeshLambertMaterial({ color: 0x2e2e34 }),
  );
  valet.rotation.x = -Math.PI / 2;
  valet.position.set(103, 0.05, 202);
  valet.receiveShadow = true;
  group.add(valet);
  const booth = new THREE.Mesh(boxGeo, lam(0x5a5a62));
  booth.scale.set(3, 3, 3);
  booth.position.set(90, 1.5, 194);
  booth.castShadow = true;
  group.add(booth);
  city.addCollider(88.5, 192.5, 91.5, 195.5);
  const valetColors = [0xc83232, 0x2a5fd8, 0xe8c832, 0x3a3a40];
  valetColors.forEach((color, i) => {
    const car = new THREE.Group();
    const body = new THREE.Mesh(boxGeo, lam(color));
    body.scale.set(2, 0.9, 4.4);
    body.position.y = 0.7;
    car.add(body);
    const cabin = new THREE.Mesh(boxGeo, lam(0x1a1a20));
    cabin.scale.set(1.8, 0.7, 2.2);
    cabin.position.set(0, 1.4, -0.2);
    car.add(cabin);
    car.position.set(96 + (i % 2) * 8, 0, 198 + Math.floor(i / 2) * 8);
    group.add(car);
  });

  // Fountain between the vault house and the hotel.
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 0.8, 16),
    lam(0x8a8a90),
  );
  basin.position.set(41, 0.4, 201);
  basin.castShadow = true;
  group.add(basin);
  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 0.3, 16),
    new THREE.MeshLambertMaterial({ color: 0x3a9ad8 }),
  );
  fountainWater.position.set(41, 0.8, 201);
  group.add(fountainWater);
  const jet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.4, 2.2, 8),
    lam(0x8a8a90),
  );
  jet.position.set(41, 1.8, 201);
  group.add(jet);
  city.addCollider(37.6, 197.6, 44.4, 204.4);

  // Gateway arch over the street at z 177, with CASINO ROW on both faces.
  // It stands east of the vault house (x 48), clear of the casino door to
  // vault-house walking line at x 18 — nobody should have to walk through
  // a post to reach the vault.
  for (const pz of [170, 184]) {
    const post = new THREE.Mesh(boxGeo, lam(0x2a2a30));
    post.scale.set(1.6, 9.2, 1.6);
    post.position.set(48, 4.6, pz);
    post.castShadow = true;
    group.add(post);
    city.addCollider(47.2, pz - 0.8, 48.8, pz + 0.8);
  }
  const beam = new THREE.Mesh(boxGeo, lam(0x2a2a30));
  beam.scale.set(2.2, 1.6, 15.6);
  beam.position.set(48, 9.2, 177);
  beam.castShadow = true;
  group.add(beam);
  const archSignE = neonSign('CASINO ROW', 13, 3, '#ffd76a');
  archSignE.position.set(49.3, 9.2, 177);
  archSignE.rotation.y = Math.PI / 2;
  trackNeon(archSignE);
  const archSignW = neonSign('CASINO ROW', 13, 3, '#ffd76a');
  archSignW.position.set(46.7, 9.2, 177);
  archSignW.rotation.y = -Math.PI / 2;
  trackNeon(archSignW);

  // Palms along the back street at z 214.
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 7, 6);
  const trunkMat = lam(0x7a5a3a);
  const topGeo = new THREE.IcosahedronGeometry(2.2, 0);
  const topMat = lam(0x3f7a34);
  for (let x = -40; x <= 120; x += 16) {
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 3.5, 214);
    trunk.castShadow = true;
    group.add(trunk);
    const top = new THREE.Mesh(topGeo, topMat);
    top.scale.set(1, 0.6, 1);
    top.position.set(x, 7.4, 214);
    group.add(top);
  }

  return {
    group,
    door: { x: 18, z: 166 },
    vault: { x: 18, z: 190 },
    update(t) {
      for (const n of neons) {
        n.mat.opacity = 0.72 + 0.2 * Math.sin(t * 2 + n.phase) + 0.06 * Math.sin(t * 7 + n.phase * 2);
      }
    },
  };
}
