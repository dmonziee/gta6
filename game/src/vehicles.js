// Solmar Bay — vehicles: the car factory, arcade driving physics for the
// player's car, and the traffic that drives the road grid.
(function () {
  'use strict';

  var SB = window.SB;
  var THREE = window.THREE;

  var CAR_COLORS = [0xd8d8d8, 0x2e5aa8, 0xc23b2e, 0xe8b93c, 0x3a3a3a, 0x7ab648, 0x8a5aa8, 0xd87a3a];
  var CAR_NAMES = ['Sunset Cruiser', 'Bay Runner', 'Coral Coupe', 'Palm Sedan', 'Harbor Hatch', 'Neon Taxi'];

  // A car is a group of boxes: body, cabin, wheels, lights. Returns {group, wheels}.
  function makeCarMesh(color, isPolice) {
    var group = new THREE.Group();
    var bodyMat = new THREE.MeshLambertMaterial({ color: color });
    var body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.95, 2.0), bodyMat);
    body.position.y = 0.75;
    group.add(body);
    var cabinMat = new THREE.MeshLambertMaterial({ color: isPolice ? 0x1c2f4a : 0x222a33 });
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 1.8), cabinMat);
    cabin.position.set(-0.2, 1.55, 0);
    group.add(cabin);
    // police: white doors band + light bar
    if (isPolice) {
      var band = new THREE.Mesh(new THREE.BoxGeometry(4.42, 0.4, 2.02),
        new THREE.MeshLambertMaterial({ color: 0x1c2f4a }));
      band.position.y = 0.72;
      group.add(band);
    }
    var wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
    var wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
    var wheels = [];
    [[1.5, 0.95], [1.5, -0.95], [-1.5, 0.95], [-1.5, -0.95]].forEach(function (p) {
      var w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(p[0], 0.42, p[1]);
      group.add(w);
      wheels.push(w);
    });
    var headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    [-1, 1].forEach(function (s) {
      var h = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.35), headMat);
      h.position.set(2.22, 0.75, s * 0.65);
      group.add(h);
    });
    var tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a22 });
    [-1, 1].forEach(function (s) {
      var t = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.35), tailMat);
      t.position.set(-2.22, 0.75, s * 0.65);
      group.add(t);
    });
    var lightBar = null;
    if (isPolice) {
      lightBar = new THREE.Group();
      var red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      red.position.set(0, 0, -0.4);
      var blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x2244ff }));
      blue.position.set(0, 0, 0.4);
      lightBar.add(red); lightBar.add(blue);
      lightBar.position.set(-0.2, 2.1, 0);
      group.add(lightBar);
      group.userData.red = red; group.userData.blue = blue;
    }
    return { group: group, wheels: wheels, lightBar: lightBar };
  }

  // Arcade driving for one car: {x, z, heading, speed, health, mesh}.
  // heading 0 = +x, turning left is positive. dt seconds.
  function driveCar(car, input, dt, city) {
    var accel = input.forward ? 15 : 0;
    var brake = input.back ? 22 : 0;
    if (input.forward) car.speed += accel * dt;
    if (input.back) {
      if (car.speed > 0.5) car.speed -= brake * dt;
      else car.speed -= 8 * dt; // reverse
    }
    if (!input.forward && !input.back) car.speed -= Math.sign(car.speed) * 6 * dt;
    var maxF = 38, maxR = -10;
    if (car.speed > maxF) car.speed = maxF;
    if (car.speed < maxR) car.speed = maxR;
    if (Math.abs(car.speed) < 0.15 && !input.forward && !input.back) car.speed = 0;

    var steer = 0;
    if (input.left) steer += 1;
    if (input.right) steer -= 1;
    var speedFactor = Math.min(1, Math.abs(car.speed) / 12);
    car.heading += steer * 1.9 * speedFactor * Math.sign(car.speed || 1) * dt;

    var nx = car.x + Math.cos(car.heading) * car.speed * dt;
    var nz = car.z + Math.sin(car.heading) * car.speed * dt;
    // city bounds (beach is drivable up to the water line)
    nx = Math.max(-234, Math.min(258, nx));
    nz = Math.max(-234, Math.min(234, nz));
    var res = city.collideCircle(nx, nz, 1.7);
    if (res.hit && Math.abs(car.speed) > 4) {
      car.speed *= 0.45;
      car.health = Math.max(0, car.health - Math.abs(car.speed) * 0.4);
    }
    car.x = res.x; car.z = res.z;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = -car.heading;
    car.wheels.forEach(function (w) { w.rotation.z -= car.speed * dt * 2.4; });
  }

  // Traffic: cars that follow the street grid and turn at intersections.
  function makeTraffic(scene, rng, city, count) {
    var cars = [];
    var streets = city.streets;
    for (var i = 0; i < count; i++) {
      var alongX = rng.chance(0.5);
      var street = rng.pick(streets);
      var dir = rng.chance(0.5) ? 1 : -1;
      var lane = rng.chance(0.5) ? 2.5 : -2.5;
      var color = rng.pick(CAR_COLORS);
      var built = makeCarMesh(color, false);
      var car = {
        x: alongX ? rng.range(-220, 220) : street + lane,
        z: alongX ? street + lane : rng.range(-220, 220),
        heading: alongX ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
        speed: rng.range(7, 12),
        alongX: alongX,
        dir: dir,
        lane: lane,
        mesh: built.group,
        wheels: built.wheels,
        name: rng.pick(CAR_NAMES),
        health: 100,
        isTraffic: true,
      };
      scene.add(car.mesh);
      cars.push(car);
    }
    return cars;
  }

  function updateTraffic(cars, dt, city, playerPos) {
    var streets = city.streets;
    cars.forEach(function (car) {
      // slow down if a car is close ahead in the same lane
      var blocked = false;
      cars.forEach(function (other) {
        if (other === car) return;
        var dx = other.x - car.x, dz = other.z - car.z;
        var ahead = car.alongX ? dx * car.dir : dz * car.dir;
        var side = car.alongX ? Math.abs(dz) : Math.abs(dx);
        if (ahead > 0 && ahead < 11 && side < 3) blocked = true;
      });
      if (playerPos) {
        var pdx = playerPos.x - car.x, pdz = playerPos.z - car.z;
        var pahead = car.alongX ? pdx * car.dir : pdz * car.dir;
        var pside = car.alongX ? Math.abs(pdz) : Math.abs(pdx);
        if (pahead > 0 && pahead < 9 && pside < 3) blocked = true;
      }
      var target = blocked ? 0 : car.cruise || 10;
      car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
      if (!car.cruise) car.cruise = car.speed;

      var step = car.speed * car.dir * dt;
      if (car.alongX) car.x += step; else car.z += step;

      // at an intersection, maybe turn onto the cross street
      var nearStreet = null;
      streets.forEach(function (s) {
        var v = car.alongX ? car.z : car.x;
        if (Math.abs(v - s) < 1.2) nearStreet = s;
      });
      var coord = car.alongX ? car.x : car.z;
      var onCross = false;
      streets.forEach(function (s) { if (Math.abs(coord - s) < 1.5) onCross = true; });
      if (nearStreet !== null && onCross && Math.abs(car.speed) > 1) {
        var roll = Math.random();
        if (roll < 0.3) {
          // turn: swap axis, keep moving
          var oldAlong = car.alongX;
          car.alongX = !oldAlong;
          if (oldAlong) {
            car.z = nearStreet + (Math.random() < 0.5 ? 2.5 : -2.5);
            car.dir = Math.random() < 0.5 ? 1 : -1;
            car.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            car.x = nearStreet + (Math.random() < 0.5 ? 2.5 : -2.5);
            car.dir = Math.random() < 0.5 ? 1 : -1;
            car.heading = car.dir > 0 ? 0 : Math.PI;
          }
        }
      }
      // wrap around the far edge
      if (car.x > 232) car.x = -232;
      if (car.x < -232) car.x = 232;
      if (car.z > 232) car.z = -232;
      if (car.z < -232) car.z = 232;

      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = -car.heading;
      car.wheels.forEach(function (w) { w.rotation.z -= car.speed * dt * 2.4; });
    });
  }

  // Parked cars the player can steal, scattered along streets.
  function makeParkedCars(scene, rng, count) {
    var cars = [];
    var streets = [-208, -156, -104, -52, 0, 52, 104, 156, 208];
    for (var i = 0; i < count; i++) {
      var alongX = rng.chance(0.5);
      var street = rng.pick(streets);
      var at = rng.range(-200, 200);
      var color = rng.pick(CAR_COLORS);
      var built = makeCarMesh(color, false);
      var car = {
        x: alongX ? at : street + 3.5,
        z: alongX ? street + 3.5 : at,
        heading: alongX ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2),
        speed: 0,
        mesh: built.group,
        wheels: built.wheels,
        name: rng.pick(CAR_NAMES),
        health: 100,
        isParked: true,
      };
      scene.add(car.mesh);
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = -car.heading;
      cars.push(car);
    }
    return cars;
  }

  SB.makeCarMesh = makeCarMesh;
  SB.driveCar = driveCar;
  SB.makeTraffic = makeTraffic;
  SB.updateTraffic = updateTraffic;
  SB.makeParkedCars = makeParkedCars;
  SB.CAR_COLORS = CAR_COLORS;
  SB.CAR_NAMES = CAR_NAMES;
})();
