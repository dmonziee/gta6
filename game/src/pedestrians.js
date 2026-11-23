// Solmar Bay — pedestrians. Sidewalk walkers who stroll the grid and
// scatter when trouble starts: a wanted level, a gunshot, or a car
// bearing down on them sends them running for the nearest corner.

const THREE = window.THREE;

import { slideMove } from './city.js';

function makePedMesh(color) {
  const group = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const shirt = new THREE.MeshLambertMaterial({ color });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd8a878 });
  const torso = new THREE.Mesh(boxGeo, shirt);
  torso.scale.set(0.8, 1.0, 0.45);
  torso.position.y = 1.2;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skin);
  head.position.y = 1.95;
  group.add(head);
  for (const dx of [-0.2, 0.2]) {
    const leg = new THREE.Mesh(boxGeo, pants);
    leg.scale.set(0.3, 0.85, 0.35);
    leg.position.set(dx, 0.42, 0);
    group.add(leg);
  }
  return group;
}

export class Pedestrians {
  constructor(scene, rng, city) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.peds = [];
    this.scatterTimer = 0;
    const colors = [0xc85a5a, 0x5a8ac8, 0x5ac88a, 0xc8b85a, 0x8a5ac8, 0xd8d8d0];
    for (let i = 0; i < 24; i += 1) {
      const mesh = makePedMesh(colors[i % colors.length]);
      const street = rng.pick(city.streets || []);
      const along = rng.range(-240, 240);
      const vertical = rng.chance(0.5);
      const x = vertical ? street + rng.pick([-5.5, 5.5]) : along;
      const z = vertical ? along : street + rng.pick([-5.5, 5.5]);
      mesh.position.set(x, 0, z);
      scene.add(mesh);
      this.peds.push({
        mesh, x, z,
        heading: rng.range(0, Math.PI * 2),
        speed: rng.range(1.2, 2),
        panic: 0,
        turnTimer: rng.range(2, 8),
      });
    }
  }

  get count() {
    return this.peds.length;
  }

  scatter() {
    this.scatterTimer = 3;
  }

  update(dt, player, wanted) {
    this.scatterTimer = Math.max(0, this.scatterTimer - dt);
    for (const p of this.peds) {
      const dPlayer = Math.hypot(player.x - p.x, player.z - p.z);
      if (wanted > 0 || this.scatterTimer > 0 || dPlayer < 6) {
        // Run away from the trouble.
        p.panic = Math.max(p.panic, 2);
        p.heading = Math.atan2(p.x - player.x, p.z - player.z);
      }
      if (p.panic > 0) {
        p.panic -= dt;
        p.speed = 5.5;
      } else {
        p.speed = 1.6;
        p.turnTimer -= dt;
        if (p.turnTimer <= 0) {
          p.turnTimer = this.rng.range(3, 9);
          p.heading += this.rng.pick([-Math.PI / 2, Math.PI / 2, 0, Math.PI]);
        }
      }
      const dx = Math.sin(p.heading) * p.speed * dt;
      const dz = Math.cos(p.heading) * p.speed * dt;
      const moved = slideMove(
        p.x, p.z, dx, dz, 0.6,
        this.city.colliders.concat(this.city.waterColliders),
      );
      if (moved.hit) p.heading += Math.PI / 2;
      p.x = Math.max(-255, Math.min(255, moved.x));
      p.z = Math.max(-255, Math.min(255, moved.z));
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
    }
  }
}
