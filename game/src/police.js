// Solmar Bay — the wanted system and the police: patrol cars that chase
// and ram, and officers on foot who run the player down.
(function () {
  'use strict';

  var SB = window.SB;
  var THREE = window.THREE;

  function makeWanted() {
    return {
      stars: 0,
      lastCrimeAt: -999,
      decayTimer: 0,
      addCrime: function (n, now) {
        this.stars = Math.min(5, this.stars + n);
        this.lastCrimeAt = now;
        this.decayTimer = 0;
      },
      // stars fade when the player stays clean and unseen for a while
      update: function (dt, now, policeNear) {
        if (this.stars === 0) return;
        if (now - this.lastCrimeAt > 25 && !policeNear) {
          this.decayTimer += dt;
          if (this.decayTimer > 10) {
            this.stars -= 1;
            this.decayTimer = 0;
            this.lastCrimeAt = now;
          }
        } else {
          this.decayTimer = 0;
        }
      },
    };
  }

  // One police car: chases the target, rams on contact, flashes its bar.
  function spawnPoliceCar(scene, x, z, heading) {
    var built = SB.makeCarMesh(0xe8e8e8, true);
    var car = {
      x: x, z: z, heading: heading, speed: 0,
      mesh: built.group, wheels: built.wheels,
      health: 100, isPolice: true, flashT: Math.random(),
    };
    scene.add(car.mesh);
    return car;
  }

  function updatePoliceCars(cars, dt, target, city, onRam) {
    cars.forEach(function (car) {
      var dx = target.x - car.x, dz = target.z - car.z;
      var dist = Math.hypot(dx, dz) || 1;
      var want = Math.atan2(dz, dx);
      var diff = want - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff * 2.5));
      var targetSpeed = dist > 60 ? 34 : 26;
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 0.8);
      var nx = car.x + Math.cos(car.heading) * car.speed * dt;
      var nz = car.z + Math.sin(car.heading) * car.speed * dt;
      nx = Math.max(-234, Math.min(258, nx));
      nz = Math.max(-234, Math.min(234, nz));
      var res = city.collideCircle(nx, nz, 1.7);
      car.x = res.x; car.z = res.z;
      if (res.hit) car.speed *= 0.6;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = -car.heading;
      car.wheels.forEach(function (w) { w.rotation.z -= car.speed * dt * 2.4; });
      // light bar flash
      car.flashT += dt * 8;
      var on = Math.floor(car.flashT) % 2 === 0;
      if (car.mesh.userData.red) {
        car.mesh.userData.red.material.color.setHex(on ? 0xff2222 : 0x551111);
        car.mesh.userData.blue.material.color.setHex(on ? 0x111155 : 0x2244ff);
      }
      // ram the target
      if (dist < 3.4 && onRam) onRam(car, dist);
    });
  }

  // Officers on foot: run at the player and punch up close.
  function makeOfficer(scene, x, z) {
    var g = new THREE.Group();
    var navy = new THREE.MeshLambertMaterial({ color: 0x1c2f4a });
    var skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
    head.position.y = 1.62;
    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.34), navy);
    torso.position.y = 1.05;
    var cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    cap.position.y = 1.86;
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), navy);
    legL.position.set(0, 0.35, 0.14);
    var legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), navy);
    legR.position.set(0, 0.35, -0.14);
    g.add(head); g.add(torso); g.add(cap); g.add(legL); g.add(legR);
    g.userData.legL = legL; g.userData.legR = legR;
    g.position.set(x, 0, z);
    scene.add(g);
    return {
      x: x, z: z, heading: 0, mesh: g, health: 50,
      punchCd: 0, walkPhase: 0, isOfficer: true,
    };
  }

  function updateOfficers(officers, dt, target, city, onPunch) {
    officers.forEach(function (o) {
      var dx = target.x - o.x, dz = target.z - o.z;
      var dist = Math.hypot(dx, dz) || 1;
      o.heading = Math.atan2(dz, dx);
      var speed = dist > 2 ? 5.2 : 0;
      var nx = o.x + Math.cos(o.heading) * speed * dt;
      var nz = o.z + Math.sin(o.heading) * speed * dt;
      var res = city.collideCircle(nx, nz, 0.6);
      o.x = res.x; o.z = res.z;
      o.punchCd -= dt;
      if (dist < 2.0 && o.punchCd <= 0) {
        o.punchCd = 1.1;
        if (onPunch) onPunch(o);
      }
      o.walkPhase += dt * speed * 3;
      var swing = Math.sin(o.walkPhase) * 0.5;
      o.mesh.userData.legL.rotation.x = swing;
      o.mesh.userData.legR.rotation.x = -swing;
      o.mesh.position.set(o.x, 0, o.z);
      o.mesh.rotation.y = -o.heading + Math.PI / 2;
    });
  }

  // Keep the police presence in line with the wanted level: spawn at the
  // city edge, despawn when far away or when the heat dies down.
  function balancePolice(scene, state, target, rng) {
    var wanted = state.wanted.stars;
    var wantCars = Math.min(wanted, 3);
    var wantOfficers = wanted >= 2 ? wanted - 1 : 0;
    // despawn the far ones first when the heat drops
    function prune(list, want, maxDist) {
      while (list.length > want) {
        var far = 0, farD = -1;
        list.forEach(function (c, i) {
          var d = Math.hypot(c.x - target.x, c.z - target.z);
          if (d > farD) { farD = d; far = i; }
        });
        var gone = list.splice(far, 1)[0];
        scene.remove(gone.mesh);
      }
      for (var i = list.length - 1; i >= 0; i--) {
        var c = list[i];
        if (Math.hypot(c.x - target.x, c.z - target.z) > maxDist) {
          scene.remove(c.mesh);
          list.splice(i, 1);
        }
      }
    }
    prune(state.policeCars, wantCars, 320);
    prune(state.officers, wantOfficers, 200);
    // spawn replacements at a street near the edge, behind the player
    while (state.policeCars.length < wantCars) {
      var a = rng.range(0, Math.PI * 2);
      var sx = target.x + Math.cos(a) * 90;
      var sz = target.z + Math.sin(a) * 90;
      sx = Math.max(-230, Math.min(230, sx));
      sz = Math.max(-230, Math.min(230, sz));
      state.policeCars.push(spawnPoliceCar(scene, sx, sz, rng.range(0, Math.PI * 2)));
    }
    while (state.officers.length < wantOfficers) {
      var b = rng.range(0, Math.PI * 2);
      var ox = target.x + Math.cos(b) * 45;
      var oz = target.z + Math.sin(b) * 45;
      ox = Math.max(-230, Math.min(230, ox));
      oz = Math.max(-230, Math.min(230, oz));
      state.officers.push(makeOfficer(scene, ox, oz));
    }
  }

  SB.makeWanted = makeWanted;
  SB.spawnPoliceCar = spawnPoliceCar;
  SB.updatePoliceCars = updatePoliceCars;
  SB.makeOfficer = makeOfficer;
  SB.updateOfficers = updateOfficers;
  SB.balancePolice = balancePolice;
})();
