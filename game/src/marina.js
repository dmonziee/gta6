// marina.js — the south-east waterfront: bay, piers, boats, containers, cranes, Warehouse 7.
export function buildMarina(scene, rng, city) {
  const group = new THREE.Group();
  scene.add(group);
  const boats = [];
  let waterMat = null;

  // The basin.
  waterMat = new THREE.MeshLambertMaterial({ color: 0x2a7fa8, transparent: true, opacity: 0.92 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 130), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(210, 0.15, 175);
  group.add(water);

  // Two piers.
  for (const pz of [130, 196]) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(52, 0.6, 9), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
    deck.position.set(194, 0.3, pz);
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);
    for (let x = 170; x <= 218; x += 6) {
      for (const dz of [-4.2, 4.2]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.6, 8), new THREE.MeshLambertMaterial({ color: 0x5a4028 }));
        post.position.set(x, 1.1, pz + dz);
        group.add(post);
      }
    }
  }

  // Causeway joining Pier 1 north to the shore road.
  const causeway = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 26), new THREE.MeshLambertMaterial({ color: 0x9a958c }));
  causeway.position.set(177, 0.2, 118);
  causeway.receiveShadow = true;
  group.add(causeway);

  // Six bobbing boats.
  const boatSpots = [[182, 121], [200, 121], [212, 139], [182, 188], [200, 205], [214, 188]];
  for (let i = 0; i < boatSpots.length; i++) {
    const [bx, bz] = boatSpots[i];
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 8), new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? 0xd8d8d0 : 0x3a6a8a }));
    hull.position.set(0, 0.4, 0);
    boat.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 3), new THREE.MeshLambertMaterial({ color: 0x2a2a30 }));
    cabin.position.set(0, 1.5, -0.5);
    boat.add(cabin);
    boat.position.set(bx, 0.2, bz);
    boat.rotation.y = rng.chance(0.5) ? 0 : Math.PI;
    group.add(boat);
    boats.push({ mesh: boat, phase: rng.range(0, Math.PI * 2) });
  }

  // Stacked containers on the quays.
  const contColors = [0xb8322a, 0x2a6ab8, 0x3a8a4a, 0xc8a02a, 0x7a4a8a];
  const contSpots = [
    { x: 158, z: 210, stack: 2 }, { x: 162, z: 222, stack: 1 }, { x: 156, z: 228, stack: 3 },
    { x: 200, z: 100, stack: 2 }, { x: 220, z: 100, stack: 1 }, { x: 240, z: 102, stack: 2 },
  ];
  contSpots.forEach((spot, si) => {
    for (let level = 0; level < spot.stack; level++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(8, 2.6, 2.6), new THREE.MeshLambertMaterial({ color: contColors[(si + level) % contColors.length] }));
      c.position.set(spot.x, 1.3 + level * 2.6, spot.z);
      c.castShadow = true;
      group.add(c);
    }
    city.addCollider(spot.x - 4, spot.z - 1.3, spot.x + 4, spot.z + 1.3);
  });

  // Two dock cranes.
  for (const [cx, cz] of [[155, 112], [155, 225]]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 22, 3), new THREE.MeshLambertMaterial({ color: 0xc8a02a }));
    tower.position.set(cx, 11, cz);
    tower.castShadow = true;
    group.add(tower);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 26), new THREE.MeshLambertMaterial({ color: 0xc8a02a }));
    jib.position.set(cx, 21, cz + 6);
    group.add(jib);
    city.addCollider(cx - 1.5, cz - 1.5, cx + 1.5, cz + 1.5);
  }

  // Harbor Warehouse 7.
  const wh = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 20), new THREE.MeshLambertMaterial({ color: 0x8a7a5a }));
  wh.position.set(208, 7, -30);
  wh.castShadow = true;
  group.add(wh);
  const whRoof = new THREE.Mesh(new THREE.BoxGeometry(25, 0.8, 21), new THREE.MeshLambertMaterial({ color: 0x4a4640 }));
  whRoof.position.set(208, 14.4, -30);
  group.add(whRoof);
  city.addCollider(196, -40, 220, -20);
  const wcv = document.createElement('canvas');
  wcv.width = 512; wcv.height = 128;
  const wg = wcv.getContext('2d');
  wg.fillStyle = '#2a2a22';
  wg.fillRect(0, 0, 512, 128);
  wg.fillStyle = '#ffd76a';
  wg.font = 'bold 56px sans-serif';
  wg.textAlign = 'center';
  wg.textBaseline = 'middle';
  wg.fillText('WAREHOUSE 7', 256, 66);
  const wtex = new THREE.CanvasTexture(wcv);
  const wsign = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.5), new THREE.MeshBasicMaterial({ map: wtex, transparent: true }));
  wsign.position.set(208, 10, -40.2);
  wsign.rotation.y = Math.PI;
  group.add(wsign);

  // Marina Gate posts.
  for (const gz of [92, 100]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8, 1.2), new THREE.MeshLambertMaterial({ color: 0x3a3a44 }));
    post.position.set(168, 4, gz);
    group.add(post);
  }

  // Water colliders — feet only, never cars. The causeway gap stays open.
  city.waterColliders.push(
    { x0: 184, z0: 110, x1: 220, z1: 125.5 },
    { x0: 170, z0: 134.5, x1: 220, z1: 191.5 },
    { x0: 170, z0: 200.5, x1: 220, z1: 240 },
    { x0: 220, z0: 110, x1: 250, z1: 240 },
  );

  function update(t) {
    if (waterMat) waterMat.opacity = 0.88 + 0.04 * Math.sin(t * 0.8);
    water.position.y = 0.15 + 0.05 * Math.sin(t * 0.6);
    for (const b of boats) {
      b.mesh.position.y = 0.2 + 0.14 * Math.sin(t * 0.9 + b.phase);
      b.mesh.rotation.z = 0.02 * Math.sin(t * 0.7 + b.phase);
    }
  }
  return { group, water, update };
}
