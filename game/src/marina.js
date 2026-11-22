// The Marina — Solmar Bay's south-east waterfront. A basin of open water, two
// wooden piers with moored boats, stacked shipping containers, dock cranes and
// the Harbor Warehouse. Mission 1 picks up here, mission 4's heist happens
// here, and the hidden-package hunt sends players to the end of Pier 9.

const THREE = window.THREE;

export function buildMarinaDistrict(scene, rng, city) {
  const group = new THREE.Group();
  scene.add(group);

  // Water basin: a big plane that sits just above the ground, animated by a
  // slow sine shimmer in update(). The basin is x 170–250, z 110–240; the
  // piers cross it on walkable decks, and the strips of open water between
  // them are blocked by invisible colliders so nobody strolls into the bay.
  const waterMat = new THREE.MeshLambertMaterial({
    color: 0x2a6a8a,
    transparent: true,
    opacity: 0.92,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 130), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(210, 0.25, 175);
  group.add(water);
  // Open-water strips (between the piers) and the water past each pier end.
  city.addCollider({ x: 210, z: 117.75, hw: 40, hd: 7.75 });
  city.addCollider({ x: 210, z: 163, hw: 40, hd: 28.5 });
  city.addCollider({ x: 210, z: 220.25, hw: 40, hd: 19.75 });
  city.addCollider({ x: 236, z: 130, hw: 14, hd: 4.5 });
  city.addCollider({ x: 236, z: 196, hw: 14, hd: 4.5 });

  const wood = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  const woodDark = new THREE.MeshLambertMaterial({ color: 0x6b4f30 });
  const steel = new THREE.MeshLambertMaterial({ color: 0x4a5560 });
  const rust = new THREE.MeshLambertMaterial({ color: 0x9a5a34 });

  // Two piers reaching into the basin. The deck is a thin slab the player
  // walks on; the posts are decoration.
  const piers = [];
  for (const pz of [130, 196]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(52, 0.3, 9), wood);
    pier.position.set(196, 0.15, pz);
    group.add(pier);
    // Pier edge posts.
    for (let i = 0; i < 6; i += 1) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 6), woodDark);
      post.position.set(174 + i * 9, 1.2, pz + (i % 2 === 0 ? 4.6 : -4.6));
      group.add(post);
    }
    piers.push({ x: 196, z: pz });
  }

  // Moored boats: hull, cabin, mast. They bob gently in update().
  const boats = [];
  const boatColors = [0xe8e4da, 0x3a6a9a, 0xd8b25a, 0x9a3a3a, 0x4a8a6a];
  for (let i = 0; i < 6; i += 1) {
    const bx = 176 + (i % 3) * 24;
    const bz = i < 3 ? 112 : 214;
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(11, 2.2, 4),
      new THREE.MeshLambertMaterial({ color: boatColors[i % boatColors.length] }),
    );
    hull.position.y = 0.8;
    boat.add(hull);
    const bow = new THREE.Mesh(
      new THREE.ConeGeometry(2, 4, 4),
      new THREE.MeshLambertMaterial({ color: boatColors[i % boatColors.length] }),
    );
    bow.rotation.z = -Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(7.2, 0.8, 0);
    boat.add(bow);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 2, 3),
      new THREE.MeshLambertMaterial({ color: 0xf0ece0 }),
    );
    cabin.position.set(-1, 2.8, 0);
    boat.add(cabin);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), steel);
    mast.position.set(0.5, 5.5, 0);
    boat.add(mast);
    boat.position.set(bx, 0.3, bz);
    boat.rotation.y = (i % 2 === 0 ? 0 : Math.PI) + rng.range(-0.2, 0.2);
    group.add(boat);
    boats.push(boat);
  }

  // Container yard on the north edge of the marina. The spots sit inside
  // the blocks either side of the dock road (x 184–216 and x 230–258, z
  // 46–78), never on a street: the old yard straddled street x=177 and
  // walled it off, so no car could drive north past z=54. The cranes stand
  // between the rows. Boxes stay axis-aligned so each mesh matches its
  // collider exactly.
  const containerColors = [0xb03a2e, 0x2e6ab0, 0x3a8a4a, 0xd8a03a, 0x7a4a8a, 0x9a6a3a];
  const containers = [];
  const containerSpots = [
    { x: 192, z: 52 }, { x: 206, z: 52 },
    { x: 192, z: 72 }, { x: 206, z: 72 },
    { x: 238, z: 52 }, { x: 250, z: 52 },
    { x: 238, z: 62 }, { x: 250, z: 62 },
    { x: 238, z: 72 }, { x: 250, z: 72 },
  ];
  for (let i = 0; i < containerSpots.length; i += 1) {
    const { x: cx, z: cz } = containerSpots[i];
    const stack = i % 4 === 0 ? 2 : 1;
    for (let s = 0; s < stack; s += 1) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(12, 2.8, 3.2),
        new THREE.MeshLambertMaterial({ color: containerColors[(i + s) % containerColors.length] }),
      );
      box.position.set(cx, 1.4 + s * 2.8, cz);
      group.add(box);
    }
    containers.push({ x: cx, z: cz });
    city.addCollider({ x: cx, z: cz, hw: 6.2, hd: 2 });
  }

  // Two dock cranes over the yard.
  for (const cx of [170, 210]) {
    const crane = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.5, 26, 2.5), rust);
    tower.position.y = 13;
    crane.add(tower);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(22, 1.6, 1.6), steel);
    jib.position.set(8, 25, 0);
    crane.add(jib);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 8, 4), steel);
    cable.position.set(16, 21, 0);
    crane.add(cable);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshLambertMaterial({ color: 0xd8a03a }));
    hook.position.set(16, 16.5, 0);
    crane.add(hook);
    crane.position.set(cx, 0, 62);
    group.add(crane);
    city.addCollider({ x: cx, z: 62, hw: 1.6, hd: 1.6 });
  }

  // Harbor Warehouse 7 — mission 4's drop-off, a big shed with a lit door.
  const shed = new THREE.Mesh(
    new THREE.BoxGeometry(26, 9, 16),
    new THREE.MeshLambertMaterial({ color: 0x7a6a58 }),
  );
  shed.position.set(196, 4.5, -58);
  group.add(shed);
  city.addCollider({ x: 196, z: -58, hw: 13, hd: 8 });
  const doorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 5),
    new THREE.MeshBasicMaterial({ color: 0xffd76a }),
  );
  doorGlow.position.set(196, 2.6, -49.8);
  group.add(doorGlow);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(27, 1, 17),
    new THREE.MeshLambertMaterial({ color: 0x4a4038 }),
  );
  roof.position.set(196, 9.4, -58);
  group.add(roof);

  // The shipment crate for the harbor heist — a bright crate on Pier 9's end.
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.4, 2.4),
    new THREE.MeshLambertMaterial({ color: 0xffd21c }),
  );
  crate.position.set(218, 1.5, 196);
  group.add(crate);
  const crateGlow = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 2.7, 2.7),
    new THREE.MeshBasicMaterial({ color: 0xffd21c, transparent: true, opacity: 0.18 }),
  );
  crateGlow.position.copy(crate.position);
  group.add(crateGlow);

  let time = 0;
  return {
    group,
    piers,
    boats,
    containers,
    crate,
    crateGlow,
    water,
    update(dt) {
      time += dt;
      waterMat.opacity = 0.88 + Math.sin(time * 0.8) * 0.04;
      for (let i = 0; i < boats.length; i += 1) {
        boats[i].position.y = 0.3 + Math.sin(time * 0.9 + i * 1.7) * 0.12;
        boats[i].rotation.z = Math.sin(time * 0.6 + i) * 0.02;
      }
      crateGlow.scale.setScalar(1 + Math.sin(time * 3) * 0.08);
    },
  };
}
