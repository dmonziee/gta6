// Solmar Bay — the game itself: state, input, camera, the main loop,
// mission progression, crime, entering cars and saving.
(function () {
  'use strict';

  var SB = window.SB;
  var THREE = window.THREE;

  // Surface script errors in the DOM so headless runs can report them.
  window.addEventListener('error', function (e) {
    var el = document.getElementById('errlog');
    if (el) el.textContent += (e.message || 'error') + '\n';
  });

  function makePlayerMesh() {
    var g = new THREE.Group();
    var skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
    var jacket = new THREE.MeshLambertMaterial({ color: 0xe87a1e }); // orange jacket
    var pants = new THREE.MeshLambertMaterial({ color: 0x2a2a3a });
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skin);
    head.position.y = 1.66;
    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.36), jacket);
    torso.position.y = 1.08;
    var armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), jacket);
    armL.position.set(0, 1.05, 0.42);
    var armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), jacket);
    armR.position.set(0, 1.05, -0.42);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.22), pants);
    legL.position.set(0, 0.36, 0.15);
    var legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.22), pants);
    legR.position.set(0, 0.36, -0.15);
    var gun = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.09),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    gun.position.set(0.3, 1.25, 0.5);
    gun.visible = false;
    g.add(head); g.add(torso); g.add(armL); g.add(armR); g.add(legL); g.add(legR); g.add(gun);
    g.userData.legL = legL; g.userData.legR = legR;
    g.userData.armL = armL; g.userData.armR = armR; g.userData.gun = gun;
    return g;
  }

  function startGame() {
    var shot = SB.parseShot();
    var rng = SB.makeRng(shot.seed);
    var doc = document;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87b5d6);
    scene.fog = new THREE.Fog(0x9fc3dd, 220, 520);

    var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    doc.getElementById('game').appendChild(renderer.domElement);

    // sun + sky light
    var sun = new THREE.DirectionalLight(0xfff2d0, 1.6);
    sun.position.set(180, 260, 120);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xbfd4e6, 0.9));
    var hemi = new THREE.HemisphereLight(0x9fc8e8, 0x8a7a5a, 0.5);
    scene.add(hemi);

    var city = SB.buildCity(scene, rng);
    var audio = SB.makeAudio();
    var traffic = SB.makeTraffic(scene, rng, city, 14);
    var parkedCars = SB.makeParkedCars(scene, rng, 10);
    var peds = SB.makePedestrians(scene, rng, city, 26);
    var combat = SB.makeCombat(scene);
    var missions = SB.makeMissions(scene, city.landmarks);
    var hud = SB.makeHud(doc);

    var playerMesh = makePlayerMesh();
    scene.add(playerMesh);

    var state = {
      mode: 'title', // title | playing | paused | dead
      time: 0,
      clockMinutes: 724, // 12:04
      cash: 0,
      wanted: SB.makeWanted(),
      missions: missions,
      combat: combat,
      traffic: traffic,
      policeCars: [],
      officers: [],
      city: city,
      player: {
        x: -200, z: -20, heading: 0, health: 100,
        weapon: 'fists', ammo: 12, reserveAmmo: 48,
        car: null, mesh: playerMesh, walkPhase: 0, reloadT: 0, punchCd: 0,
      },
      markedCar: null,
      briefcase: null,
      camYaw: 0, camPitch: 0.32,
    };

    var game = {
      state: state, city: city, hud: hud, missions: missions,
      parkedCars: parkedCars,
      hideTitle: hideTitle,
      setupStage: function () { setupMissionStage(); },
      spawnPoliceAt: function (x, z) {
        var car = SB.spawnPoliceCar(scene, x, z, 0);
        state.policeCars.push(car);
        return car;
      },
    };

    // ---- menus -------------------------------------------------------------
    var titleEl = doc.getElementById('title');
    var hudEl = doc.getElementById('hud');
    var pauseEl = doc.getElementById('pause');
    var deadEl = doc.getElementById('dead');
    var playBtn = doc.getElementById('playBtn');
    var continueBtn = doc.getElementById('continueBtn');
    var resumeBtn = doc.getElementById('resumeBtn');
    var retryBtn = doc.getElementById('retryBtn');

    var save = SB.loadSave();
    if (save && save.mission < 3) continueBtn.style.display = 'inline-block';
    else continueBtn.style.display = 'none';

    function hideTitle() { titleEl.style.display = 'none'; }
    function beginPlay(missionIndex, cash) {
      state.mode = 'playing';
      state.cash = cash;
      state.player.health = 100;
      state.wanted.stars = 0;
      hideTitle();
      hudEl.style.display = 'block';
      pauseEl.style.display = 'none';
      deadEl.style.display = 'none';
      missions.start(missionIndex);
      setupMissionStage();
      var m = missions.current();
      if (m) hud.showDialogue('Lena', m.intro, 8);
      audio.unlock();
    }
    playBtn.addEventListener('click', function () { audio.unlock(); beginPlay(0, 0); });
    continueBtn.addEventListener('click', function () {
      audio.unlock();
      var s = SB.loadSave() || { mission: 0, cash: 0 };
      beginPlay(s.mission, s.cash);
    });
    resumeBtn.addEventListener('click', function () { state.mode = 'playing'; pauseEl.style.display = 'none'; });
    retryBtn.addEventListener('click', function () {
      state.player.health = 100;
      state.wanted.stars = 0;
      state.player.x = -208; state.player.z = -26;
      state.player.heading = 0;
      if (state.player.car) { state.player.car = null; }
      deadEl.style.display = 'none';
      state.mode = 'playing';
    });

    // ---- input -------------------------------------------------------------
    var keys = {};
    window.addEventListener('keydown', function (e) {
      keys[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (state.mode === 'playing') { state.mode = 'paused'; pauseEl.style.display = 'block'; }
        else if (state.mode === 'paused') { state.mode = 'playing'; pauseEl.style.display = 'none'; }
      }
      if (e.code === 'KeyM') audio.toggleMute();
      if (e.code === 'Digit1') state.player.weapon = 'fists';
      if (e.code === 'Digit2') state.player.weapon = 'pistol';
      if (e.code === 'KeyR' && state.player.weapon === 'pistol' && state.player.ammo < 12 && state.player.reserveAmmo > 0) {
        state.player.reloadT = 1.2;
      }
      if (e.code === 'KeyE') tryEnterExitCar();
      if (e.code === 'KeyF') tryPunch();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });

    // mouse-drag camera; a still click fires the pistol
    var dragging = false, downX = 0, downY = 0, moved = 0;
    renderer.domElement.addEventListener('pointerdown', function (e) {
      dragging = true; moved = 0; downX = e.clientX; downY = e.clientY;
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - downX, dy = e.clientY - downY;
      downX = e.clientX; downY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      state.camYaw -= dx * 0.005;
      state.camPitch = Math.max(0.05, Math.min(1.1, state.camPitch + dy * 0.004));
    });
    window.addEventListener('pointerup', function (e) {
      if (dragging && moved < 6) tryShoot();
      dragging = false;
    });

    function nearestCar(maxD) {
      var best = null, bestD = maxD;
      parkedCars.concat(traffic).forEach(function (c) {
        var d = Math.hypot(c.x - state.player.x, c.z - state.player.z);
        if (d < bestD) { bestD = d; best = c; }
      });
      return best;
    }

    function tryEnterExitCar() {
      if (state.mode !== 'playing') return;
      var p = state.player;
      if (p.car) {
        // exit beside the car
        var sx = p.car.x - Math.sin(p.car.heading) * 2.2;
        var sz = p.car.z + Math.cos(p.car.heading) * 2.2;
        p.x = sx; p.z = sz;
        p.heading = p.car.heading;
        p.car = null;
        p.mesh.visible = true;
        return;
      }
      var car = nearestCar(4.5);
      if (!car) return;
      p.car = car;
      p.x = car.x; p.z = car.z;
      p.heading = car.heading;
      p.mesh.visible = false;
      audio.unlock();
      if (car.isParked || car.isTraffic) {
        state.wanted.addCrime(1, state.time);
        hud.showDialogue('Rico', 'Borrowed. The owner can file a report.', 3);
      }
      if (state.markedCar === car) {
        // mission 2: the steal itself
        state.wanted.addCrime(2, state.time);
        advanceMission();
      }
    }

    function tryPunch() {
      if (state.mode !== 'playing' || state.player.car || state.player.punchCd > 0) return;
      state.player.punchCd = 0.45;
      audio.punch();
      var p = state.player;
      var enemies = combat.goons.concat(state.officers);
      var victim = combat.punch(p, p.heading, enemies, 25);
      if (victim) {
        if (victim.isOfficer) state.wanted.addCrime(1, state.time);
      }
    }

    function tryShoot() {
      if (state.mode !== 'playing') return;
      var p = state.player;
      if (p.car || p.weapon !== 'pistol' || p.reloadT > 0) return;
      if (p.ammo <= 0) { audio.click(); return; }
      p.ammo -= 1;
      audio.gunshot();
      var enemies = combat.goons.concat(state.officers);
      combat.shoot(camera, enemies, 70, 34, function (enemy) {
        if (enemy) {
          if (enemy.isOfficer) state.wanted.addCrime(1, state.time);
          else state.wanted.addCrime(1, state.time);
        }
      });
      // gunshot noise: pedestrians flee, wanted rises
      state.wanted.addCrime(0, state.time);
      updateThreats.push({ x: p.x, z: p.z, radius: 25, ttl: 0.5 });
    }

    // ---- missions ----------------------------------------------------------
    var updateThreats = [];
    var briefcaseMesh = null;

    function advanceMission() {
      var reward = missions.advance();
      if (reward > 0) {
        state.cash += reward;
        audio.cash();
        SB.saveGame(missions.index, state.cash);
        var next = missions.current();
        if (next) hud.showDialogue('Lena', 'Job done. $' + reward + '. ' + next.intro, 8);
        else hud.showDialogue('Lena', 'That is the last of it, Rico. We are even. Solmar Bay is yours.', 10);
      } else {
        var s = missions.stageDef();
        if (s && s.line) hud.showDialogue('Lena', s.line, 6);
        audio.pickup();
      }
      setupMissionStage();
    }

    function setupMissionStage() {
      var s = missions.stageDef();
      if (!s) return;
      if (missions.index === 1 && missions.stage === 0 && !state.markedCar) {
        // the Coral Coupe, parked by the plaza
        var built = SB.makeCarMesh(0xff7f5a, false);
        var car = {
          x: 40, z: 26, heading: Math.PI / 2, speed: 0,
          mesh: built.group, wheels: built.wheels,
          name: 'Coral Coupe', health: 100, isParked: true, isMarked: true,
        };
        scene.add(car.mesh);
        car.mesh.position.set(40, 0, 26);
        car.mesh.rotation.y = -car.heading;
        parkedCars.push(car);
        state.markedCar = car;
      }
      if (missions.index === 2 && missions.stage === 0) {
        combat.clearGoons();
        combat.spawnGoons(26, 26, 3, rng);
        combat.goons.forEach(function (g) { g.isGoon = true; });
      }
      if (missions.index === 2 && missions.stage === 1 && !briefcaseMesh) {
        briefcaseMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.0, 0.35, 0.7),
          new THREE.MeshLambertMaterial({ color: 0x2a2a2a })
        );
        briefcaseMesh.position.set(30, 0.4, 30);
        scene.add(briefcaseMesh);
        state.briefcase = { x: 30, z: 30 };
      }
    }

    function checkMissionProgress() {
      if (state.mode !== 'playing' || missions.done) return;
      var s = missions.stageDef();
      if (!s) return;
      var p = state.player;
      if (s.kind === 'reach') {
        var d = Math.hypot(p.x - s.target.x, p.z - s.target.z);
        if (d < s.radius) advanceMission();
      } else if (s.kind === 'steal') {
        // handled in tryEnterExitCar via markedCar
      } else if (s.kind === 'clear') {
        var alive = combat.goons.some(function (g) { return g.alive; });
        if (!alive) advanceMission();
      } else if (s.kind === 'pickup') {
        if (state.briefcase) {
          var bd = Math.hypot(p.x - state.briefcase.x, p.z - state.briefcase.z);
          if (bd < 2.5) {
            scene.remove(briefcaseMesh);
            briefcaseMesh = null;
            state.briefcase = null;
            advanceMission();
          }
        }
      }
    }

    // ---- per-frame updates -------------------------------------------------
    function updatePlayerOnFoot(dt) {
      var p = state.player;
      var fx = 0, fz = 0;
      var cy = state.camYaw;
      if (keys.KeyW || keys.ArrowUp) { fx += Math.cos(cy); fz += Math.sin(cy); }
      if (keys.KeyS || keys.ArrowDown) { fx -= Math.cos(cy); fz -= Math.sin(cy); }
      if (keys.KeyA || keys.ArrowLeft) { fx += Math.sin(cy); fz -= Math.cos(cy); }
      if (keys.KeyD || keys.ArrowRight) { fx -= Math.sin(cy); fz += Math.cos(cy); }
      var len = Math.hypot(fx, fz);
      var moving = len > 0.01;
      var speed = (keys.ShiftLeft || keys.ShiftRight) ? 9 : 5.5;
      if (moving) {
        fx /= len; fz /= len;
        var wantHeading = Math.atan2(fz, fx);
        var diff = wantHeading - p.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.heading += Math.max(-10 * dt, Math.min(10 * dt, diff * 12));
        var nx = p.x + fx * speed * dt;
        var nz = p.z + fz * speed * dt;
        nx = Math.max(-234, Math.min(258, nx));
        nz = Math.max(-234, Math.min(234, nz));
        var res = city.collideCircle(nx, nz, 0.6);
        p.x = res.x; p.z = res.z;
        p.walkPhase += dt * speed * 1.6;
      }
      var swing = moving ? Math.sin(p.walkPhase) * 0.5 : 0;
      p.mesh.userData.legL.rotation.x = swing;
      p.mesh.userData.legR.rotation.x = -swing;
      p.mesh.userData.armL.rotation.x = -swing * 0.7;
      p.mesh.userData.armR.rotation.x = swing * 0.7;
      p.mesh.userData.gun.visible = p.weapon === 'pistol';
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = -p.heading + Math.PI / 2;
      p.punchCd = Math.max(0, p.punchCd - dt);
      if (p.reloadT > 0) {
        p.reloadT -= dt;
        if (p.reloadT <= 0) {
          var need = 12 - p.ammo;
          var take = Math.min(need, p.reserveAmmo);
          p.ammo += take; p.reserveAmmo -= take;
          audio.click();
        }
      }
      // ammo drops
      var got = combat.collectDrops(p, 2);
      if (got > 0) { p.reserveAmmo += got; audio.pickup(); }
    }

    function updatePlayerInCar(dt) {
      var p = state.player;
      var car = p.car;
      var input = {
        forward: !!(keys.KeyW || keys.ArrowUp),
        back: !!(keys.KeyS || keys.ArrowDown),
        left: !!(keys.KeyA || keys.ArrowLeft),
        right: !!(keys.KeyD || keys.ArrowRight),
      };
      var prevSpeed = car.speed;
      SB.driveCar(car, input, dt, city);
      p.x = car.x; p.z = car.z; p.heading = car.heading;
      // running over pedestrians
      peds.forEach(function (ped) {
        if (!ped.alive) return;
        var d = Math.hypot(ped.x - car.x, ped.z - car.z);
        if (d < 2.2 && Math.abs(car.speed) > 3) {
          ped.alive = false;
          ped.mesh.visible = false;
          state.wanted.addCrime(1, state.time);
          audio.crash();
        }
      });
      // bumping traffic cars
      traffic.forEach(function (t) {
        var d = Math.hypot(t.x - car.x, t.z - car.z);
        if (d < 3.6 && Math.abs(car.speed) > 5) {
          car.speed *= 0.7;
          t.speed = Math.max(0, t.speed - 4);
        }
      });
      if (car.health <= 0) {
        // car wrecked: bail out, take damage
        p.health -= 20;
        p.x = car.x - Math.sin(car.heading) * 2.5;
        p.z = car.z + Math.cos(car.heading) * 2.5;
        p.car = null;
        p.mesh.visible = true;
        car.health = 0;
        audio.crash();
      }
      audio.setEngine(Math.abs(car.speed) / 38, true);
    }

    var cameraSnapped = false;
    function updateCamera(dt) {
      var p = state.player;
      if (state.mode === 'title') {
        var t = state.time * 0.05;
        var cx = Math.cos(t) * 190, cz = Math.sin(t) * 190;
        camera.position.set(cx, 95, cz);
        camera.lookAt(0, 20, 0);
        cameraSnapped = true;
        return;
      }
      var dist = p.car ? 11 : 9;
      var height = p.car ? 4.8 : 4.2;
      var tx = p.x - Math.cos(state.camYaw) * dist * Math.cos(state.camPitch);
      var tz = p.z - Math.sin(state.camYaw) * dist * Math.cos(state.camPitch);
      var ty = height + Math.sin(state.camPitch) * dist * 0.6;
      if (!cameraSnapped) {
        // first frame: snap behind the player instead of swooping in from the origin
        camera.position.set(tx, ty, tz);
        cameraSnapped = true;
      } else {
        camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 8);
        camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 8);
        camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 8);
      }
      camera.lookAt(p.x, 1.6, p.z);
    }

    // ---- main loop ---------------------------------------------------------
    var last = performance.now();
    var shotState = { autopilot: false, slow: false };
    if (shot.shot) shotState = SB.stageShot(game, shot.shot);

    function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      state.time += dt;
      state.clockMinutes = 724 + Math.floor(state.time / 5);

      if (state.mode === 'playing') {
        if (shotState.autopilot && state.player.car) {
          SB.autopilotDrive(game, dt, shotState.slow);
          state.player.x = state.player.car.x;
          state.player.z = state.player.car.z;
          state.player.heading = state.player.car.heading;
        } else if (state.player.car) {
          updatePlayerInCar(dt);
        } else {
          updatePlayerOnFoot(dt);
          audio.setEngine(0, false);
        }

        // threats for pedestrians: the player's car and recent gunshots
        var threats = [];
        if (state.player.car) threats.push({ x: state.player.car.x, z: state.player.car.z, radius: 8 });
        updateThreats.forEach(function (t) { threats.push(t); });
        updateThreats = updateThreats.filter(function (t) { t.ttl -= dt; return t.ttl > 0; });

        SB.updateTraffic(traffic, dt, city, state.player.car ? { x: state.player.car.x, z: state.player.car.z } : null);
        SB.updatePedestrians(peds, dt, city, threats);

        // police
        var policeNear = false;
        state.policeCars.forEach(function (c) {
          if (Math.hypot(c.x - state.player.x, c.z - state.player.z) < 50) policeNear = true;
        });
        state.wanted.update(dt, state.time, policeNear);
        SB.balancePolice(scene, state, state.player, rng);
        var target = state.player.car ? state.player.car : state.player;
        SB.updatePoliceCars(state.policeCars, dt, target, city, function (car) {
          if (state.player.car) {
            state.player.car.health -= 8;
            state.player.car.speed *= 0.6;
          } else {
            state.player.health -= 10;
            var dx = state.player.x - car.x, dz = state.player.z - car.z;
            var d = Math.hypot(dx, dz) || 1;
            state.player.x += (dx / d) * 2;
            state.player.z += (dz / d) * 2;
          }
          audio.crash();
        });
        SB.updateOfficers(state.officers, dt, state.player, city, function () {
          state.player.health -= 8;
          audio.punch();
        });
        var sirenOn = state.policeCars.length > 0 && state.wanted.stars > 0;
        audio.setSiren(sirenOn, dt);

        // goons
        combat.updateGoons(dt, state.player, city, function (g, hit) {
          if (hit) {
            state.player.health -= 6;
            audio.gunshot();
          }
        });
        combat.updateFx(dt);

        // health regen when calm
        if (state.wanted.stars === 0 && state.player.health < 100) {
          state.player.health = Math.min(100, state.player.health + dt * 2);
        }
        if (state.player.health <= 0) {
          state.mode = 'dead';
          deadEl.style.display = 'block';
        }
        checkMissionProgress();
        missions.marker.update(state.time);
      } else if (state.mode === 'title') {
        SB.updateTraffic(traffic, dt, city, null);
        SB.updatePedestrians(peds, dt, city, null);
      }

      updateCamera(dt);
      if (state.mode !== 'title') hud.update(state, dt);
      renderer.render(scene, camera);
    }

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    requestAnimationFrame(loop);
    window.SB_GAME = game;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
  } else {
    startGame();
  }
})();
