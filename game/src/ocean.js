// ocean.js — Ocean Drive: a beachfront boulevard, three neon art-deco hotels,
// boardwalk, sand, the sea at the map edge, a pier and a lifeguard tower.
export function buildOcean(scene, rng, city) {
  const group = new THREE.Group();
  scene.add(group);
  const addCollider = city.addCollider;
  const neons = [];

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

  // Beachfront hotels on the south side of the drive, facing north onto it.
  const hotels = [
    { x: -30, color: 0xe8a0b0, label: 'THE COLONY', neon: 0xff5ad8 },
    { x: 16, color: 0x7ab8b0, label: 'OCEAN PALMS', neon: 0x5affd8 },
    { x: 62, color: 0xe8d8b0, label: 'SEASIDE', neon: 0xffd76a },
  ];
  for (const hd of hotels) {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(12, 10, 8),
      new THREE.MeshLambertMaterial({ color: hd.color }),
    );
    block.position.set(hd.x, 5, 234);
    block.castShadow = true;
    block.receiveShadow = true;
    group.add(block);
    addCollider(hd.x - 6, 230, hd.x + 6, 238);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 6),
      new THREE.MeshLambertMaterial({ color: 0x2a4a6a }),
    );
    glass.position.set(hd.x, 5, 229.9);
    glass.rotation.y = Math.PI;
    group.add(glass);
    const sign = neonSign(hd.label, 12, 3, hd.neon);
    sign.position.set(hd.x, 11, 229.8);
    sign.rotation.y = Math.PI;
    group.add(sign);
  }

  // Boardwalk along the south side of the drive.
  const boardwalk = new THREE.Mesh(
    new THREE.PlaneGeometry(136, 4),
    new THREE.MeshLambertMaterial({ color: 0x8a6a42 }),
  );
  boardwalk.rotation.x = -Math.PI / 2;
  boardwalk.position.set(24, 0.05, 240);
  group.add(boardwalk);

  // Sand from z 242 to z 260.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(136, 18),
    new THREE.MeshLambertMaterial({ color: 0xd8c89a }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(24, 0.05, 251);
  group.add(sand);

  // The sea at the map edge, z 250..260.
  const waterMat = new THREE.MeshLambertMaterial({
    color: 0x2a7fa8,
    transparent: true,
    opacity: 0.92,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(136, 10), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(24, 0.15, 255);
  group.add(water);

  // Water colliders leave the pier strip (x 52..58) open, like the marina.
  city.waterColliders.push(
    { x0: -44, z0: 250, x1: 52, z1: 260 },
    { x0: 58, z0: 250, x1: 92, z1: 260 },
  );

  // Pier from the sand at z 242 out to z 260.
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.6, 18),
    new THREE.MeshLambertMaterial({ color: 0x8a6a42 }),
  );
  deck.position.set(55, 0.3, 251);
  group.add(deck);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x5a4028 });
  for (const px of [52.5, 57.5]) {
    for (let z = 244; z <= 258; z += 7) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.6, 8), postMat);
      post.position.set(px, 1.1, z);
      group.add(post);
    }
  }

  // Lifeguard tower at 10, 248.
  const legMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d0 });
  for (const [lx, lz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.5, 8), legMat);
    leg.position.set(10 + lx, 1.25, 248 + lz);
    group.add(leg);
  }
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.5, 3),
    new THREE.MeshLambertMaterial({ color: 0xd8d8d0 }),
  );
  platform.position.set(10, 2.5, 248);
  group.add(platform);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.3, 3.4),
    new THREE.MeshLambertMaterial({ color: 0xd8d8d0 }),
  );
  roof.position.set(10, 4.4, 248);
  group.add(roof);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.15, 0.6),
    new THREE.MeshLambertMaterial({ color: 0xc83232 }),
  );
  stripe.position.set(10, 4.55, 248);
  group.add(stripe);
  addCollider(8.5, 246.5, 11.5, 249.5);

  // Beach umbrellas on the sand (none sits on a beach-access road).
  const umbrellaColors = [0xc83232, 0xe8c832, 0x2a5fd8];
  const umbrellaSpots = [
    [-30, 246],
    [-20, 252],
    [20, 248],
    [70, 250],
    [72, 246],
  ];
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d0 });
  for (let i = 0; i < umbrellaSpots.length; i++) {
    const [ux, uz] = umbrellaSpots[i];
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 8), poleMat);
    pole.position.set(ux, 1.1, uz);
    group.add(pole);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.8, 1, 12),
      new THREE.MeshLambertMaterial({ color: umbrellaColors[i % umbrellaColors.length] }),
    );
    cone.position.set(ux, 2.7, uz);
    group.add(cone);
  }

  // Palms along the sand edge at z 244.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const topMat = new THREE.MeshLambertMaterial({ color: 0x3f7a34 });
  for (const px of [-36, -20, 12, 28, 60, 76]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 8), trunkMat);
    trunk.position.set(px, 3.5, 244);
    group.add(trunk);
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), topMat);
    top.scale.y = 0.6;
    top.position.set(px, 7.4, 244);
    group.add(top);
  }

  function update(t) {
    for (const n of neons) {
      n.mat.opacity = 0.72 + 0.2 * Math.sin(t * 2 + n.phase) + 0.06 * Math.sin(t * 7 + n.phase * 2);
    }
    waterMat.opacity = 0.88 + 0.04 * Math.sin(t * 0.8);
    water.position.y = 0.15 + 0.05 * Math.sin(t * 0.6);
  }

  return { group, update };
}
