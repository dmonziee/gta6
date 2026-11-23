// Solmar Bay — the Marina district. Open water, two wooden piers, bobbing
// boats, stacked containers, dock cranes, Harbor Warehouse 7, and the
// concrete causeway that joins Pier 1 back to the street grid.
//
// The bay is fenced for feet, not for cars: the water colliders below stop
// a walker from strolling into the sea, but a car may cross the short
// causeway from the pier to the shore road — that is the only way the
// mission-4 escape car gets off the docks, and it is why the escape works.

const THREE = window.THREE;

export function buildMarina(scene, rng, city) {
  const group = new THREE.Group();
  scene.add(group);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const lam = (color) => new THREE.MeshLambertMaterial({ color });

  // The basin: a big plane just above the ground that shimmers.
  const waterMat = new THREE.MeshLambertMaterial({
    color: 0x2a7fa8, transparent: true, opacity: 0.92,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 130), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(210, 0.15, 175);
  group.add(water);

  // Two piers at z 130 and z 196: 52 long, 9 wide, with edge posts.
  const deckMat = lam(0x8a6a42);
  const postGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.6, 6);
  const postMat = lam(0x5a4028);
  for (const pz of [130, 196]) {
    const deck = new THREE.Mesh(boxGeo, deckMat);
    deck.scale.set(52, 0.6, 9);
    deck.position.set(194, 0.3, pz);
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);
    for (let x = 170; x <= 218; x += 6) {
      for (const dz of [-4.2, 4.2]) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(x, 1.1, pz + dz);
        group.add(post);
      }
    }
  }

  // The causeway: a concrete apron joining Pier 1's north edge to the
  // shore road at x 177, so cars (and feet) can leave the pier northwards.
  const causeway = new THREE.Mesh(boxGeo, lam(0x9a958c));
  causeway.scale.set(14, 0.5, 26);
  causeway.position.set(177, 0.2, 118);
  causeway.receiveShadow = true;
  group.add(causeway);

  // Six boats bobbing beside the piers.
  const boats = [];
  const hullMat = lam(0xd8d8d0);
  const hullMat2 = lam(0x3a6a8a);
  const cabinMat = lam(0x2a2a30);
  const boatSpots = [
    [182, 121], [200, 121], [212, 139], [182, 188], [200, 205], [214, 188],
  ];
  for (let i = 0; i < boatSpots.length; i += 1) {
    const [bx, bz] = boatSpots[i];
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(boxGeo, i % 2 ? hullMat2 : hullMat);
    hull.scale.set(3, 1.2, 8);
    hull.position.y = 0.4;
    hull.castShadow = true;
    boat.add(hull);
    const cabin = new THREE.Mesh(boxGeo, cabinMat);
    cabin.scale.set(2, 1.4, 3);
    cabin.position.set(0, 1.5, -0.5);
    boat.add(cabin);
    boat.position.set(bx, 0.2, bz);
    boat.rotation.y = rng.chance(0.5) ? 0 : Math.PI;
    group.add(boat);
    boats.push({ mesh: boat, phase: rng.range(0, Math.PI * 2) });
  }

  // Stacked shipping containers on the quays.
  const containerColors = [0xb8322a, 0x2a6ab8, 0x3a8a4a, 0xc8a02a, 0x7a4a8a];
  const containerSpots = [
    [158, 210, 2], [162, 222, 1], [156, 228, 3], [200, 100, 2], [220, 100, 1], [240, 102, 2],
  ];
  let ci = 0;
  for (const [cx, cz, stack] of containerSpots) {
    for (let level = 0; level < stack; level += 1) {
      const c = new THREE.Mesh(boxGeo, lam(containerColors[(ci + level) % containerColors.length]));
      ci += 1;
      c.scale.set(8, 2.6, 2.6);
      c.position.set(cx, 1.3 + level * 2.6, cz);
      c.castShadow = true;
      group.add(c);
      if (level === 0) city.addCollider(cx - 4, cz - 1.3, cx + 4, cz + 1.3);
    }
  }

  // Two dock cranes on the quays, clear of the streets and the pier paths.
  for (const [cx, cz] of [[155, 112], [155, 225]]) {
    const tower = new THREE.Mesh(boxGeo, lam(0xc8a02a));
    tower.scale.set(3, 22, 3);
    tower.position.set(cx, 11, cz);
    tower.castShadow = true;
    group.add(tower);
    const jib = new THREE.Mesh(boxGeo, lam(0xc8a02a));
    jib.scale.set(2, 2, 26);
    jib.position.set(cx, 21, cz + 6);
    jib.castShadow = true;
    group.add(jib);
    city.addCollider(cx - 1.5, cz - 1.5, cx + 1.5, cz + 1.5);
  }

  // Harbor Warehouse 7, set back east so its yard at (196, -46) stays open.
  const wh = new THREE.Mesh(boxGeo, lam(0x8a7a5a));
  wh.scale.set(24, 14, 20);
  wh.position.set(208, 7, -30);
  wh.castShadow = true;
  wh.receiveShadow = true;
  group.add(wh);
  const whRoof = new THREE.Mesh(boxGeo, lam(0x4a4640));
  whRoof.scale.set(25, 0.8, 21);
  whRoof.position.set(208, 14.4, -30);
  group.add(whRoof);
  city.addCollider(196, -40, 220, -20);
  const whSign = document.createElement('canvas');
  whSign.width = 512; whSign.height = 128;
  const wg = whSign.getContext('2d');
  wg.fillStyle = '#2a2a22'; wg.fillRect(0, 0, 512, 128);
  wg.fillStyle = '#ffd76a'; wg.font = 'bold 56px sans-serif';
  wg.textAlign = 'center'; wg.textBaseline = 'middle';
  wg.fillText('WAREHOUSE 7', 256, 66);
  const whSignMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 4.5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(whSign) }),
  );
  whSignMesh.position.set(208, 10, -40.2);
  whSignMesh.rotation.y = Math.PI;
  group.add(whSignMesh);

  // Marina Gate posts at the north-west corner of the basin.
  for (const dz of [-4, 4]) {
    const post = new THREE.Mesh(boxGeo, lam(0x3a3a44));
    post.scale.set(1.2, 8, 1.2);
    post.position.set(168, 4, 96 + dz);
    group.add(post);
  }

  // Water colliders: feet only. North strip leaves the causeway open;
  // the strips between the piers and past the pier ends are fully closed.
  city.waterColliders.push(
    { x0: 184, z0: 110, x1: 220, z1: 125.5 },
    { x0: 170, z0: 134.5, x1: 220, z1: 191.5 },
    { x0: 170, z0: 200.5, x1: 220, z1: 240 },
    { x0: 220, z0: 110, x1: 250, z1: 240 },
  );

  return {
    group,
    water,
    update(t) {
      waterMat.opacity = 0.88 + 0.04 * Math.sin(t * 0.8);
      water.position.y = 0.15 + 0.05 * Math.sin(t * 0.6);
      for (const b of boats) {
        b.mesh.position.y = 0.2 + 0.14 * Math.sin(t * 0.9 + b.phase);
        b.mesh.rotation.z = 0.02 * Math.sin(t * 0.7 + b.phase);
      }
    },
  };
}
