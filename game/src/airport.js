// airport.js — Solmar Airport in the eastern free strip: a north-south runway,
// terminal, two hangars, control tower, windsock and runway lights.
import { textSign } from './city.js';

export function buildAirport(scene, rng, city) {
  const group = new THREE.Group();
  scene.add(group);
  const addCollider = city.addCollider;

  // Runway: centreline x 118, z 55..225, 16 wide. No collider, so cars and
  // feet can cross and drive on it.
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 170),
    new THREE.MeshLambertMaterial({ color: 0x2e2e34 }),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(118, 0.04, 140);
  group.add(runway);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8d8d0 });
  for (let z = 60; z <= 220; z += 10) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1, 4), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(118, 0.05, z);
    group.add(dash);
  }
  for (const z of [58, 222]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(14, 2), dashMat);
    bar.rotation.x = -Math.PI / 2;
    bar.position.set(118, 0.05, z);
    group.add(bar);
  }
  // Runway edge lights.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffd76a });
  for (const lx of [110, 126]) {
    for (let z = 55; z <= 225; z += 20) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), lightMat);
      light.position.set(lx, 0.3, z);
      group.add(light);
    }
  }

  // Terminal, between the street at x 85 and the runway west edge.
  const terminal = new THREE.Mesh(
    new THREE.BoxGeometry(16, 12, 14),
    new THREE.MeshLambertMaterial({ color: 0xd8d0c0 }),
  );
  terminal.position.set(100, 6, 150);
  terminal.castShadow = true;
  terminal.receiveShadow = true;
  group.add(terminal);
  addCollider(92, 143, 108, 157);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a4a6a }),
  );
  glass.position.set(100, 6, 157.2);
  glass.rotation.y = Math.PI / 2;
  group.add(glass);
  const sign = textSign('SOLMAR AIRPORT', 14, 3);
  sign.position.set(100, 13, 157.4);
  sign.rotation.y = Math.PI / 2;
  group.add(sign);
  // Apron joining the terminal to the runway.
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 20),
    new THREE.MeshLambertMaterial({ color: 0xb8b0a0 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(109, 0.05, 150);
  group.add(apron);

  // Two hangars east of the street at x 131.
  const hangarDefs = [
    { x: 144, z: 110, label: 'HANGAR 1' },
    { x: 144, z: 195, label: 'HANGAR 2' },
  ];
  for (const hd of hangarDefs) {
    const hangar = new THREE.Mesh(
      new THREE.BoxGeometry(12, 9, 12),
      new THREE.MeshLambertMaterial({ color: 0x8a8a90 }),
    );
    hangar.position.set(hd.x, 4.5, hd.z);
    hangar.castShadow = true;
    hangar.receiveShadow = true;
    group.add(hangar);
    addCollider(hd.x - 6, hd.z - 6, hd.x + 6, hd.z + 6);
    const hsign = textSign(hd.label, 10, 2.5);
    hsign.position.set(hd.x - 6.2, 5, hd.z);
    hsign.rotation.y = -Math.PI / 2;
    group.add(hsign);
  }

  // Control tower.
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(6, 26, 6),
    new THREE.MeshLambertMaterial({ color: 0x9ab0b8 }),
  );
  shaft.position.set(100, 13, 210);
  shaft.castShadow = true;
  group.add(shaft);
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(8, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a4a6a }),
  );
  cab.position.set(100, 28, 210);
  group.add(cab);
  addCollider(97, 207, 103, 213);

  // Windsock at the north end of the runway.
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 6, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2e }),
  );
  pole.position.set(126, 3, 60);
  group.add(pole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 2.4, 12),
    new THREE.MeshLambertMaterial({ color: 0xff7a2a }),
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(126, 6.2, 60);
  group.add(sock);

  // Palms along the west edge of the district.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const topMat = new THREE.MeshLambertMaterial({ color: 0x3f7a34 });
  for (let z = 50; z <= 240; z += 24) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 8), trunkMat);
    trunk.position.set(94, 3.5, z);
    group.add(trunk);
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), topMat);
    top.scale.y = 0.6;
    top.position.set(94, 7.4, z);
    group.add(top);
  }

  function update(t) {
    sock.rotation.y = Math.sin(t * 0.5);
  }

  return { group, update };
}
