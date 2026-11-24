// casino.js — Casino Row: three casinos facing the street, the vault house and
// hotel across it, valet lot, fountain and gateway arch. Every neon sign breathes.
export function buildCasinoRow(scene, rng, city) {
  const group = new THREE.Group();
  scene.add(group);
  const addCollider = city.addCollider;
  const neons = [];

  function facadeTexture(base) {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 256;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#' + base.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 6; col++) {
        const r = Math.random();
        let c = '#20202c';
        if (r < 0.22) c = '#ffd27a';
        else if (r < 0.34) c = '#9fc4ff';
        ctx.fillStyle = c;
        ctx.fillRect(6 + col * 42, 8 + row * 51, 28, 34);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let i = 0; i < 12; i++) {
      const w = 3 + Math.random() * 5;
      const x = Math.random() * 256;
      ctx.fillRect(x, 0, w, 256);
    }
    const tex = new THREE.CanvasTexture(cv);
    return tex;
  }

  function neonSign(text, w, h, color) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 128;
    const ctx = cv.getContext('2d');
    const css = '#' + color.toString(16).padStart(6, '0');
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = css;
    ctx.shadowBlur = 26;
    ctx.fillStyle = css;
    ctx.fillText(text, 256, 66);
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 256, 66);
    const tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.userData.neon = true;
    neons.push({ mat, phase: neons.length * 1.3 });
    return mesh;
  }

  function putBlock(x, z, w, h, d, color, facadeBase) {
    const mat = facadeBase !== undefined
      ? new THREE.MeshLambertMaterial({ map: facadeTexture(facadeBase) })
      : new THREE.MeshLambertMaterial({ color });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
    return m;
  }

  function flatBox(w, h, d, x, y, z, color, basic) {
    const mat = basic
      ? new THREE.MeshBasicMaterial({ color })
      : new THREE.MeshLambertMaterial({ color });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }

  // Light plaza in front of Casino Solmar.
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 9),
    new THREE.MeshLambertMaterial({ color: 0xb8b0a0 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(18, 0.06, 167.5);
  group.add(plaza);

  // Casino Solmar, the big one.
  putBlock(18, 155, 30, 24, 16, 0xd8b45a, 0xc8a04a);
  flatBox(30, 24, 0.6, 18, 12, 163.1, 0xd8b45a);
  flatBox(10, 0.8, 4, 18, 7.5, 165, 0x2a2a30);
  const colMat = new THREE.MeshLambertMaterial({ color: 0xd8b45a });
  for (const cx of [13.6, 22.4]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7.5, 10), colMat);
    col.position.set(cx, 3.75, 166.4);
    group.add(col);
  }
  flatBox(6, 6.5, 0.5, 18, 3.25, 163.4, 0x14141c);
  const solmarSign = neonSign('CASINO SOLMAR', 26, 6.5, 0xffd76a);
  solmarSign.position.set(18, 20.5, 163.6);
  group.add(solmarSign);
  const slotsSign = neonSign('★ SLOTS ★', 12, 3, 0x5aff8a);
  slotsSign.position.set(18, 23.5, 163.6);
  group.add(slotsSign);

  // El Dorado, east of Solmar.
  putBlock(64, 155, 24, 18, 16, 0x3a9a9a, 0x2a8a8a);
  const doradoSign = neonSign('EL DORADO', 18, 4.5, 0xff5ad8);
  doradoSign.position.set(64, 15.5, 163.6);
  group.add(doradoSign);

  // The Royale, west of Solmar.
  putBlock(-29, 155, 22, 20, 16, 0x9a2a2a, 0x8a2a2a);
  const royaleSign = neonSign('ROYALE', 14, 3.5, 0xff4a4a);
  royaleSign.position.set(-29, 17, 163.6);
  group.add(royaleSign);

  // The vault house across the street.
  putBlock(18, 201, 18, 12, 14, 0xd8b45a, 0xc8a04a);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xe8c25a }),
  );
  dome.position.set(18, 12, 201);
  group.add(dome);
  flatBox(5, 7, 0.6, 18, 3.5, 193.8, 0x1c1c22);
  const vaultSign = neonSign('VAULT', 10, 2.5, 0xffd76a);
  vaultSign.position.set(18, 10.5, 193.6);
  group.add(vaultSign);

  // Hotel Marbella, behind the vault house.
  putBlock(64, 201, 20, 30, 14, 0xd8d0c0, 0xd8d0c0);
  const hotelSign = neonSign('HOTEL MARBELLA', 16, 4, 0x7ab8ff);
  hotelSign.position.set(64, 26, 193.6);
  group.add(hotelSign);

  // Valet lot east of the vault house.
  const valet = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 24),
    new THREE.MeshLambertMaterial({ color: 0x2e2e34 }),
  );
  valet.rotation.x = -Math.PI / 2;
  valet.position.set(103, 0.05, 202);
  group.add(valet);
  flatBox(3, 3, 3, 90, 1.5, 194, 0x5a5a62);
  addCollider(88.5, 192.5, 91.5, 195.5);
  const valetColors = [0xc83232, 0x2a5fd8, 0xe8c832, 0x3a3a40];
  const valetSpots = [[96, 198], [104, 198], [96, 206], [104, 206]];
  for (let i = 0; i < valetSpots.length; i++) {
    const [vx, vz] = valetSpots[i];
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.9, 4.4),
      new THREE.MeshLambertMaterial({ color: valetColors[i] }),
    );
    body.position.set(vx, 0.7, vz);
    group.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.7, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x14141c }),
    );
    cabin.position.set(vx, 1.4, vz);
    group.add(cabin);
  }

  // Fountain between the vault house and the hotel.
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 0.8, 20),
    new THREE.MeshLambertMaterial({ color: 0x8a8a90 }),
  );
  basin.position.set(41, 0.4, 201);
  group.add(basin);
  const fwater = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 0.3, 20),
    new THREE.MeshLambertMaterial({ color: 0x3a9ad8 }),
  );
  fwater.position.set(41, 0.8, 201);
  group.add(fwater);
  const jet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.4, 2.2, 10),
    new THREE.MeshLambertMaterial({ color: 0x8a8a90 }),
  );
  jet.position.set(41, 1.8, 201);
  group.add(jet);
  addCollider(37.6, 197.6, 44.4, 204.4);

  // Gateway arch over the street at z 177, east of the vault house.
  for (const pz of [170, 184]) {
    flatBox(1.6, 9.2, 1.6, 48, 4.6, pz, 0x2a2a30);
    addCollider(48 - 0.8, pz - 0.8, 48 + 0.8, pz + 0.8);
  }
  flatBox(2.2, 1.6, 15.6, 48, 9.2, 177, 0x2a2a30);
  const archEast = neonSign('CASINO ROW', 13, 3, 0xffd76a);
  archEast.position.set(49.3, 9.2, 177);
  archEast.rotation.y = Math.PI / 2;
  group.add(archEast);
  const archWest = neonSign('CASINO ROW', 13, 3, 0xffd76a);
  archWest.position.set(46.7, 9.2, 177);
  archWest.rotation.y = -Math.PI / 2;
  group.add(archWest);

  // Palms along the back street at z 214.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const topMat = new THREE.MeshLambertMaterial({ color: 0x3f7a34 });
  for (let x = -40; x <= 120; x += 16) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 8), trunkMat);
    trunk.position.set(x, 3.5, 214);
    group.add(trunk);
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), topMat);
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
