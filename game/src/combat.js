// Solmar Bay — combat: fists, the pistol, goons who shoot back,
// and ammo drops.
(function () {
  'use strict';

  var SB = window.SB;
  var THREE = window.THREE;

  function makeCombat(scene) {
    var tracers = [];
    var drops = []; // ammo pickups: {x, z, mesh}
    var goons = []; // {x, z, heading, mesh, health, shootCd, alive}

    function makeGoonMesh() {
      var g = new THREE.Group();
      var vest = new THREE.MeshLambertMaterial({ color: 0x3a2a2a });
      var skin = new THREE.MeshLambertMaterial({ color: 0xc98a5a });
      var head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
      head.position.y = 1.62;
      var torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.72, 0.34), vest);
      torso.position.y = 1.05;
      var band = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.36),
        new THREE.MeshLambertMaterial({ color: 0xd8b83a }));
      band.position.y = 1.3;
      var legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), vest);
      legL.position.set(0, 0.35, 0.14);
      var legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), vest);
      legR.position.set(0, 0.35, -0.14);
      var gun = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1),
        new THREE.MeshLambertMaterial({ color: 0x111111 }));
      gun.position.set(0.35, 1.2, 0.3);
      g.add(head); g.add(torso); g.add(band); g.add(legL); g.add(legR); g.add(gun);
      g.userData.legL = legL; g.userData.legR = legR;
      return g;
    }

    function spawnGoons(x, z, count, rng) {
      for (var i = 0; i < count; i++) {
        var mesh = makeGoonMesh();
        var gx = x + rng.range(-8, 8), gz = z + rng.range(-8, 8);
        mesh.position.set(gx, 0, gz);
        scene.add(mesh);
        goons.push({ x: gx, z: gz, heading: 0, mesh: mesh, health: 60, shootCd: rng.range(0.5, 1.5), walkPhase: 0, alive: true });
      }
    }

    function dropAmmo(x, z) {
      var mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.5, 0.7),
        new THREE.MeshLambertMaterial({ color: 0x2fd84a, emissive: 0x0a4416 })
      );
      mesh.position.set(x, 0.5, z);
      scene.add(mesh);
      drops.push({ x: x, z: z, mesh: mesh });
    }

    function clearGoons() {
      goons.forEach(function (g) { scene.remove(g.mesh); });
      goons.length = 0;
      drops.forEach(function (d) { scene.remove(d.mesh); });
      drops.length = 0;
    }

    // Fire the pistol from the camera through the crosshair. Returns the
    // enemy hit, if any, and draws a fading tracer.
    function shoot(camera, enemies, range, damage, onShot) {
      var ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(0, 0), camera);
      ray.far = range;
      var meshes = [];
      enemies.forEach(function (e) { if (e.alive !== false && e.health > 0) meshes.push(e.mesh); });
      var hits = ray.intersectObjects(meshes, true);
      var end;
      var enemy = null;
      if (hits.length > 0) {
        end = hits[0].point;
        // walk up from the hit object to the enemy root group
        enemies.forEach(function (e) {
          var o = hits[0].object;
          while (o) { if (o === e.mesh) enemy = e; o = o.parent; }
        });
        if (enemy) {
          enemy.health -= damage;
          if (enemy.health <= 0 && enemy.alive !== false) {
            enemy.alive = false;
            enemy.mesh.visible = false;
            if (enemy.isGoon) dropAmmo(enemy.x, enemy.z);
          }
        }
      } else {
        end = ray.ray.origin.clone().add(ray.ray.direction.clone().multiplyScalar(range));
      }
      var line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([ray.ray.origin.clone(), end]),
        new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 })
      );
      scene.add(line);
      tracers.push({ line: line, life: 0.12 });
      if (onShot) onShot(enemy, end);
      return enemy;
    }

    // Punch: damage the nearest enemy in front within reach.
    function punch(playerPos, playerHeading, enemies, damage) {
      var best = null, bestD = 2.6;
      enemies.forEach(function (e) {
        if (e.alive === false || e.health <= 0) return;
        var dx = e.x - playerPos.x, dz = e.z - playerPos.z;
        var d = Math.hypot(dx, dz);
        if (d > bestD) return;
        var ang = Math.atan2(dz, dx) - playerHeading;
        while (ang > Math.PI) ang -= Math.PI * 2;
        while (ang < -Math.PI) ang += Math.PI * 2;
        if (Math.abs(ang) > 1.1) return;
        best = e; bestD = d;
      });
      if (best) {
        best.health -= damage;
        // knockback
        var dx = best.x - playerPos.x, dz = best.z - playerPos.z;
        var d = Math.hypot(dx, dz) || 1;
        best.x += (dx / d) * 1.2;
        best.z += (dz / d) * 1.2;
        best.mesh.position.set(best.x, 0, best.z);
        if (best.health <= 0 && best.alive !== false) {
          best.alive = false;
          best.mesh.visible = false;
          if (best.isGoon) dropAmmo(best.x, best.z);
        }
      }
      return best;
    }

    function updateGoons(dt, playerPos, city, onShoot) {
      goons.forEach(function (g) {
        if (!g.alive) return;
        var dx = playerPos.x - g.x, dz = playerPos.z - g.z;
        var dist = Math.hypot(dx, dz) || 1;
        g.heading = Math.atan2(dz, dx);
        // keep some distance, strafe slowly
        var speed = 0;
        if (dist > 16) speed = 3.2;
        else if (dist < 8) speed = -2.0;
        var nx = g.x + Math.cos(g.heading) * speed * dt;
        var nz = g.z + Math.sin(g.heading) * speed * dt;
        var res = city.collideCircle(nx, nz, 0.6);
        g.x = res.x; g.z = res.z;
        g.shootCd -= dt;
        if (g.shootCd <= 0 && dist < 32) {
          g.shootCd = 1.4 + Math.random() * 0.8;
          if (onShoot) onShoot(g, Math.random() < 0.3);
        }
        g.walkPhase += dt * Math.abs(speed) * 3;
        var swing = Math.sin(g.walkPhase) * 0.5;
        g.mesh.userData.legL.rotation.x = swing;
        g.mesh.userData.legR.rotation.x = -swing;
        g.mesh.position.set(g.x, 0, g.z);
        g.mesh.rotation.y = -g.heading + Math.PI / 2;
      });
    }

    function updateFx(dt) {
      for (var i = tracers.length - 1; i >= 0; i--) {
        tracers[i].life -= dt;
        tracers[i].line.material.opacity = Math.max(0, tracers[i].life / 0.12) * 0.9;
        if (tracers[i].life <= 0) {
          scene.remove(tracers[i].line);
          tracers.splice(i, 1);
        }
      }
      drops.forEach(function (d) {
        d.mesh.rotation.y += dt * 2;
        d.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.004) * 0.08;
      });
    }

    function collectDrops(playerPos, radius) {
      var got = 0;
      for (var i = drops.length - 1; i >= 0; i--) {
        var d = drops[i];
        var dx = d.x - playerPos.x, dz = d.z - playerPos.z;
        if (dx * dx + dz * dz < radius * radius) {
          scene.remove(d.mesh);
          drops.splice(i, 1);
          got += 12;
        }
      }
      return got;
    }

    return {
      goons: goons,
      spawnGoons: spawnGoons,
      clearGoons: clearGoons,
      shoot: shoot,
      punch: punch,
      updateGoons: updateGoons,
      updateFx: updateFx,
      collectDrops: collectDrops,
    };
  }

  SB.makeCombat = makeCombat;
})();
