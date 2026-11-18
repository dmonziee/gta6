// Solmar Bay — pedestrians: sidewalk walkers who stroll the grid and
// run away from cars and gunfire.
(function () {
  'use strict';

  var SB = window.SB;
  var THREE = window.THREE;

  var SHIRT_COLORS = [0xd84a4a, 0x4a7ad8, 0x4ad87a, 0xd8b84a, 0x9a4ad8, 0xe8e8e8, 0x333333, 0xd87ab0];
  var SKIN_COLORS = [0xe8b88a, 0xc98a5a, 0x8a5a38, 0xf0c8a0];

  function makePedMesh(rng) {
    var g = new THREE.Group();
    var skin = new THREE.MeshLambertMaterial({ color: rng.pick(SKIN_COLORS) });
    var shirt = new THREE.MeshLambertMaterial({ color: rng.pick(SHIRT_COLORS) });
    var pants = new THREE.MeshLambertMaterial({ color: rng.pick([0x2a2a3a, 0x3a3a3a, 0x4a3a2a]) });
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
    head.position.y = 1.62;
    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), shirt);
    torso.position.y = 1.05;
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), pants);
    legL.position.set(0, 0.35, 0.14);
    var legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), pants);
    legR.position.set(0, 0.35, -0.14);
    g.add(head); g.add(torso); g.add(legL); g.add(legR);
    g.userData.legL = legL; g.userData.legR = legR;
    return g;
  }

  function makePedestrians(scene, rng, city, count) {
    var peds = [];
    var streets = city.streets;
    for (var i = 0; i < count; i++) {
      var alongX = rng.chance(0.5);
      var street = rng.pick(streets);
      var side = rng.chance(0.5) ? 8.5 : -8.5;
      var mesh = makePedMesh(rng);
      var ped = {
        x: alongX ? rng.range(-220, 220) : street + side,
        z: alongX ? street + side : rng.range(-220, 220),
        heading: alongX ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2),
        alongX: alongX,
        dir: rng.chance(0.5) ? 1 : -1,
        side: side,
        speed: rng.range(1.0, 1.6),
        mesh: mesh,
        flee: 0,
        fleeX: 0, fleeZ: 0,
        walkPhase: rng.range(0, 6),
        alive: true,
      };
      scene.add(mesh);
      peds.push(ped);
    }
    return peds;
  }

  function updatePedestrians(peds, dt, city, threats) {
    // threats: [{x, z, radius}] — cars and gunshots that make people run
    var streets = city.streets;
    peds.forEach(function (p) {
      if (!p.alive) return;
      var fleeing = p.flee > 0;
      if (!fleeing && threats) {
        for (var i = 0; i < threats.length; i++) {
          var t = threats[i];
          var dx = p.x - t.x, dz = p.z - t.z;
          if (dx * dx + dz * dz < t.radius * t.radius) {
            p.flee = 3;
            p.fleeX = dx; p.fleeZ = dz;
            fleeing = true;
            break;
          }
        }
      }
      var speed = p.speed;
      if (fleeing) {
        p.flee -= dt;
        speed = 4.2;
        var len = Math.hypot(p.fleeX, p.fleeZ) || 1;
        p.heading = Math.atan2(p.fleeZ / len, p.fleeX / len);
        p.x += Math.cos(p.heading) * speed * dt;
        p.z += Math.sin(p.heading) * speed * dt;
      } else {
        var step = p.speed * p.dir * dt;
        if (p.alongX) p.x += step; else p.z += step;
        // at an intersection, sometimes turn onto the cross street
        var coord = p.alongX ? p.x : p.z;
        var onCross = false;
        streets.forEach(function (s) { if (Math.abs(coord - s) < 1.0) onCross = true; });
        if (onCross && Math.random() < 0.02) {
          var cross = null;
          streets.forEach(function (s) {
            var v = p.alongX ? p.z : p.x;
            if (Math.abs(v - s) < 10) cross = s;
          });
          if (cross !== null) {
            if (p.alongX) {
              p.z = cross + p.side;
              p.alongX = false;
              p.dir = Math.random() < 0.5 ? 1 : -1;
              p.heading = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
            } else {
              p.x = cross + p.side;
              p.alongX = true;
              p.dir = Math.random() < 0.5 ? 1 : -1;
              p.heading = p.dir > 0 ? 0 : Math.PI;
            }
          }
        }
      }
      // stay inside the city, turn around at the edge
      if (p.x > 232 || p.x < -232 || p.z > 232 || p.z < -232) {
        p.dir *= -1;
        p.heading += Math.PI;
        p.x = Math.max(-232, Math.min(232, p.x));
        p.z = Math.max(-232, Math.min(232, p.z));
      }
      p.walkPhase += dt * speed * 3.2;
      var swing = Math.sin(p.walkPhase) * 0.45;
      p.mesh.userData.legL.rotation.x = swing;
      p.mesh.userData.legR.rotation.x = -swing;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = -p.heading + Math.PI / 2;
    });
  }

  SB.makePedestrians = makePedestrians;
  SB.updatePedestrians = updatePedestrians;
})();
