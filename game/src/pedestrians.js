// pedestrians.js — sidewalk walkers who stroll the grid and scatter when trouble
// starts: a wanted level, a gunshot, or a car bearing down on them sends them
// running for the nearest corner.
import { slideMove } from './city.js';

const STREETS = [-237, -191, -145, -99, -53, -7, 39, 85, 131, 177, 223];
const SHIRTS = [0xc85a5a, 0x5a8ac8, 0x5ac88a, 0xc8b85a, 0x8a5ac8, 0xd8d8d0];

function makePedMesh(color) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.0, 0.45),
    new THREE.MeshLambertMaterial({ color }),
  );
  torso.position.y = 1.2;
  g.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xd8a878 }),
  );
  head.position.y = 1.95;
  g.add(head);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  for (const lx of [-0.2, 0.2]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 0.35), legMat);
    leg.position.set(lx, 0.42, 0);
    g.add(leg);
  }
  return g;
}

export class Pedestrians {
  constructor(scene, rng, city) {
    this.scene = scene;
    this.rng = rng;
    this.city = city;
    this.scatterTimer = 0;
    this.peds = [];
    for (let i = 0; i < 24; i++) {
      const line = rng.pick(STREETS);
      const along = rng.range(-240, 240);
      const side = rng.chance(0.5) ? 5.5 : -5.5;
      const vertical = rng.chance(0.5);
      const x = vertical ? line + side : along;
      const z = vertical ? along : line + side;
      const mesh = makePedMesh(rng.pick(SHIRTS));
      mesh.position.set(x, 0, z);
      scene.add(mesh);
      this.peds.push({
        mesh,
        x,
        z,
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
    const colliders = this.city.colliders.concat(this.city.waterColliders);
    for (const p of this.peds) {
      const dist = Math.hypot(player.x - p.x, player.z - p.z);
      if (wanted > 0 || this.scatterTimer > 0 || dist < 6) {
        p.panic = Math.max(p.panic, 2);
        p.heading = Math.atan2(p.x - player.x, p.z - player.z);
      }
      let speed;
      if (p.panic > 0) {
        p.panic -= dt;
        speed = 5.5;
      } else {
        speed = 1.6;
        p.turnTimer -= dt;
        if (p.turnTimer <= 0) {
          p.turnTimer = this.rng.range(3, 9);
          p.heading += this.rng.pick([-Math.PI / 2, Math.PI / 2, 0, Math.PI]);
        }
      }
      const res = slideMove(
        p.x, p.z,
        Math.sin(p.heading) * speed * dt,
        Math.cos(p.heading) * speed * dt,
        0.6, colliders,
      );
      if (res.hit) p.heading += Math.PI / 2;
      p.x = Math.max(-255, Math.min(255, res.x));
      p.z = Math.max(-255, Math.min(255, res.z));
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
    }
  }
}
