// Solmar Bay — the city itself: procedural grid streets, buildings,
// beach and bay, street props, collision boxes and landmark spots.
// Streets run on a 52 m pitch; blocks are 40 m wide with 12 m streets.
(function () {
  'use strict';

  var SB = window.SB;
  var THREE = window.THREE;

  var PITCH = 52;
  var STREET_W = 12;
  var HALF = 234; // city half-extent (playable area)
  var STREET_COORDS = [-208, -156, -104, -52, 0, 52, 104, 156, 208];
  var BLOCK_COORDS = [-182, -130, -78, -26, 26, 78, 130, 182];

  // Landmark spots the missions and the shots use (all on reachable ground).
  var LANDMARKS = {
    garage: { x: -208, z: -26, name: "Lena's Garage" },
    docks: { x: 246, z: 104, name: 'Marina Docks' },
    plaza: { x: 26, z: 26, name: 'Marlin Plaza' },
    hideout: { x: -208, z: 182, name: 'Hideout' },
    tower: { x: -26, z: 26, name: 'Marlin Tower' },
    pier: { x: 268, z: 130, name: 'Pier' },
  };

  function facadeTexture(rng, base, lit) {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, 128, 256);
    // subtle vertical shading
    var grad = g.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.18)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 256);
    // window grid
    var cols = 5, rows = 12;
    for (var r = 0; r < rows; r++) {
      for (var col = 0; col < cols; col++) {
        var x = 8 + col * 23, y = 10 + r * 20;
        if (rng.chance(lit)) {
          g.fillStyle = rng.pick(['#ffd98a', '#ffe9b0', '#9fd8ff', '#fff3c4']);
        } else {
          g.fillStyle = 'rgba(20,28,44,0.85)';
        }
        g.fillRect(x, y, 15, 12);
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function groundTexture() {
    var size = 1024;
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var g = c.getContext('2d');
    var world = 600; // texture covers -300..300
    function px(v) { return ((v + 300) / world) * size; }
    function pw(v) { return (v / world) * size; }

    // base: pale concrete
    g.fillStyle = '#b9c0b4';
    g.fillRect(0, 0, size, size);

    // blocks: slightly varied pavement tones
    var tones = ['#aeb5a4', '#b3b8a8', '#a9b09d', '#b7bcab'];
    var ti = 0;
    BLOCK_COORDS.forEach(function (bx) {
      BLOCK_COORDS.forEach(function (bz) {
        g.fillStyle = tones[ti++ % tones.length];
        g.fillRect(px(bx - 20), px(bz - 20), pw(40), pw(40));
      });
    });

    // Marlin Plaza: warm paved square
    g.fillStyle = '#c9a86a';
    g.fillRect(px(6), px(6), pw(40), pw(40));
    g.strokeStyle = '#8f7a4a';
    g.lineWidth = 2;
    g.strokeRect(px(10), px(10), pw(32), pw(32));

    // roads: dark asphalt strips
    g.fillStyle = '#3d4450';
    STREET_COORDS.forEach(function (s) {
      g.fillRect(px(s - STREET_W / 2), px(-HALF), pw(STREET_W), pw(HALF * 2));
      g.fillRect(px(-HALF), px(s - STREET_W / 2), pw(HALF * 2), pw(STREET_W));
    });

    // sidewalks: light edging along each street
    g.fillStyle = '#c8cbc0';
    STREET_COORDS.forEach(function (s) {
      g.fillRect(px(s - STREET_W / 2 - 2), px(-HALF), pw(2), pw(HALF * 2));
      g.fillRect(px(s + STREET_W / 2), px(-HALF), pw(2), pw(HALF * 2));
      g.fillRect(px(-HALF), px(s - STREET_W / 2 - 2), pw(HALF * 2), pw(2));
      g.fillRect(px(-HALF), px(s + STREET_W / 2), pw(HALF * 2), pw(2));
    });

    // lane dashes
    g.fillStyle = '#e8d27a';
    STREET_COORDS.forEach(function (s) {
      for (var d = -HALF + 6; d < HALF; d += 18) {
        g.fillRect(px(s - 0.7), px(d), pw(1.4), pw(7));
        g.fillRect(px(d), px(s - 0.7), pw(7), pw(1.4));
      }
    });

    // beach: sand east of the city
    g.fillStyle = '#e6d6a8';
    g.fillRect(px(HALF), 0, pw(66), size);
    // boardwalk line
    g.fillStyle = '#a9805a';
    g.fillRect(px(HALF), 0, pw(4), size);

    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  function buildCity(scene, rng) {
    var colliders = []; // {minX,maxX,minZ,maxZ}

    // ground
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshLambertMaterial({ map: groundTexture() })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // bay water east of the beach
    var water = new THREE.Mesh(
      new THREE.PlaneGeometry(320, 600),
      new THREE.MeshLambertMaterial({ color: 0x2e7f9e, transparent: true, opacity: 0.92 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(300 + 160, -0.4, 0);
    scene.add(water);

    // pier planks into the bay
    var pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6a48 });
    for (var p = 0; p < 10; p++) {
      var plank = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 9), pierMat);
      plank.position.set(244 + p * 5, 0.2, 130);
      scene.add(plank);
    }

    // facade textures (a few shared variants)
    var facades = [
      facadeTexture(rng, '#7d8aa0', 0.45),
      facadeTexture(rng, '#a08a7d', 0.4),
      facadeTexture(rng, '#8a9a8d', 0.4),
      facadeTexture(rng, '#9a8aa8', 0.45),
      facadeTexture(rng, '#b0a080', 0.35),
      facadeTexture(rng, '#6f7f95', 0.5),
    ];

    var boxGeo = new THREE.BoxGeometry(1, 1, 1);
    var roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4f55 });

    function addBuilding(cx, cz, w, d, h, mat) {
      var m = new THREE.Mesh(boxGeo, mat);
      m.scale.set(w, h, d);
      m.position.set(cx, h / 2, cz);
      scene.add(m);
      var roof = new THREE.Mesh(boxGeo, roofMat);
      roof.scale.set(w + 0.4, 0.6, d + 0.4);
      roof.position.set(cx, h + 0.3, cz);
      scene.add(roof);
      colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    }

    // buildings: 1-3 per block, skipping the plaza block
    BLOCK_COORDS.forEach(function (bx) {
      BLOCK_COORDS.forEach(function (bz) {
        if (bx === 26 && bz === 26) return; // Marlin Plaza stays open
        if (bx === -26 && bz === 26) return; // Marlin Tower plot
        var n = rng.int(1, 3);
        for (var i = 0; i < n; i++) {
          var w = rng.range(10, 18), d = rng.range(10, 18);
          var ox = rng.range(-8, 8), oz = rng.range(-8, 8);
          var h = rng.chance(0.12) ? rng.range(38, 58) : rng.range(8, 30);
          var mat = new THREE.MeshLambertMaterial({ map: rng.pick(facades) });
          addBuilding(bx + ox, bz + oz, w, d, h, mat);
        }
      });
    });

    // Marlin Tower: the landmark, tall teal glass slab
    var towerMat = new THREE.MeshLambertMaterial({ map: facadeTexture(rng, '#3f7d8a', 0.7) });
    addBuilding(-26, 26, 22, 22, 96, towerMat);
    var antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 14, 6),
      new THREE.MeshLambertMaterial({ color: 0xd8d8d8 })
    );
    antenna.position.set(-26, 103, 26);
    scene.add(antenna);
    var beacon = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff5533 })
    );
    beacon.position.set(-26, 110, 26);
    scene.add(beacon);

    // palms along the beach and the plaza
    var trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
    var leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
    function addPalm(x, z) {
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 6), trunkMat);
      trunk.position.set(x, 3.5, z);
      scene.add(trunk);
      var crown = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 6), leafMat);
      crown.scale.y = 0.55;
      crown.position.set(x, 7.4, z);
      scene.add(crown);
    }
    for (var b = -220; b <= 220; b += 28) {
      if (rng.chance(0.75)) addPalm(240, b);
    }
    addPalm(14, 14); addPalm(38, 14); addPalm(14, 38); addPalm(38, 38);

    // street lamps at intersections
    var poleMat = new THREE.MeshLambertMaterial({ color: 0x2c2f33 });
    var bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    STREET_COORDS.forEach(function (sx) {
      STREET_COORDS.forEach(function (sz) {
        if ((sx + sz) % 104 !== 0) return; // every other intersection
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7, 6), poleMat);
        pole.position.set(sx + 7, 3.5, sz + 7);
        scene.add(pole);
        var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), bulbMat);
        bulb.position.set(sx + 7, 7.2, sz + 7);
        scene.add(bulb);
      });
    });

    // plaza trees and benches
    var benchMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
    [[16, 16], [36, 36], [16, 36], [36, 16]].forEach(function (pt) {
      var bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 1), benchMat);
      bench.position.set(pt[0], 0.4, pt[1]);
      scene.add(bench);
    });

    return {
      colliders: colliders,
      streets: STREET_COORDS.slice(),
      half: HALF,
      landmarks: LANDMARKS,
      // push a circle (x,z,r) out of every building it overlaps; returns true on hit
      collideCircle: function (x, z, r) {
        var hit = false;
        for (var i = 0; i < colliders.length; i++) {
          var b = colliders[i];
          var nx = Math.max(b.minX, Math.min(x, b.maxX));
          var nz = Math.max(b.minZ, Math.min(z, b.maxZ));
          var dx = x - nx, dz = z - nz;
          var d2 = dx * dx + dz * dz;
          if (d2 < r * r) {
            hit = true;
            if (d2 > 0.0001) {
              var d = Math.sqrt(d2);
              x = nx + (dx / d) * r;
              z = nz + (dz / d) * r;
            } else {
              // centre inside the box: shove out along the smallest penetration
              var px = Math.min(x - b.minX, b.maxX - x);
              var pz = Math.min(z - b.minZ, b.maxZ - z);
              if (px < pz) x = (x - b.minX < b.maxX - x) ? b.minX - r : b.maxX + r;
              else z = (z - b.minZ < b.maxZ - z) ? b.minZ - r : b.maxZ + r;
            }
          }
        }
        return { x: x, z: z, hit: hit };
      },
    };
  }

  SB.buildCity = buildCity;
  SB.CITY = { pitch: PITCH, streetWidth: STREET_W, half: HALF, streets: STREET_COORDS };
})();
