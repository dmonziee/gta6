// Solmar Bay — screenshot staging: ?shot=start|drive|chase|mission
// poses the real game so each screenshot shows several systems at once.
// The autopilot keeps the car on the z=0 street lane for the driving shots.
(function () {
  'use strict';

  var SB = window.SB;

  function parseShot() {
    var q = new URLSearchParams(window.location.search);
    var shot = q.get('shot');
    var seed = parseInt(q.get('seed') || '7', 10);
    if (isNaN(seed)) seed = 7;
    return { shot: shot, seed: seed };
  }

  // Pose the game for a screenshot. Called once after the world is built.
  // Returns {autopilot: bool, autopilotSlow: bool} for the main loop.
  function stageShot(game, shot) {
    var s = game.state;
    var L = game.city.landmarks;
    if (shot === 'start') {
      s.mode = 'title';
      return { autopilot: false };
    }
    s.mode = 'playing';
    game.hideTitle();
    document.getElementById('hud').style.display = 'block';
    if (shot === 'drive') {
      // player driving east down the z=0 street at speed
      putPlayerInCar(game, -170, 2.5, 0);
      s.missions.start(0);
      game.hud.showDialogue('Lena', game.missions.defs[0].intro, 8);
      return { autopilot: true, slow: false };
    }
    if (shot === 'chase') {
      putPlayerInCar(game, -120, 2.5, 0);
      s.player.health = 78;
      s.player.car.health = 64;
      s.wanted.addCrime(3, s.time);
      s.missions.start(0);
      game.hud.showDialogue('Lena', game.missions.defs[0].intro, 8);
      // two police cars right on the player's tail
      game.spawnPoliceAt(-128, -6);
      game.spawnPoliceAt(-112, 8);
      return { autopilot: true, slow: true };
    }
    if (shot === 'mission') {
      // Rico on foot at Marlin Plaza, pistol out, Vultures and the gold
      // mission marker ahead, city all around
      s.player.x = 12; s.player.z = 26;
      s.player.heading = 0;
      s.player.weapon = 'pistol';
      s.player.ammo = 12;
      s.missions.start(2);
      game.setupStage();
      game.hud.showDialogue('Lena', game.missions.defs[2].intro, 8);
      return { autopilot: false };
    }
    return { autopilot: false };
  }

  function putPlayerInCar(game, x, z, heading) {
    var s = game.state;
    var car = game.parkedCars[0];
    car.x = x; car.z = z; car.heading = heading; car.speed = 14;
    car.mesh.position.set(x, 0, z);
    car.mesh.rotation.y = -heading;
    s.player.car = car;
    s.player.x = x; s.player.z = z;
    s.player.heading = heading;
  }

  // Autopilot: steer toward the z=2.5 lane, hold speed, stay on the street.
  function autopilotDrive(game, dt, slow) {
    var car = game.state.player.car;
    if (!car) return;
    var targetSpeed = slow ? 15 : 24;
    var input = { forward: car.speed < targetSpeed, back: car.speed > targetSpeed + 4, left: false, right: false };
    // steer back to the lane (z = 2.5, heading 0 = +x)
    var laneErr = 2.5 - car.z;
    var wantHeading = Math.max(-0.5, Math.min(0.5, laneErr * 0.06));
    var diff = wantHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > 0.05) input.left = true;
    if (diff < -0.05) input.right = true;
    SB.driveCar(car, input, dt, game.city);
  }

  SB.parseShot = parseShot;
  SB.stageShot = stageShot;
  SB.autopilotDrive = autopilotDrive;
})();
