// Solmar Bay — Lena Cruz's three jobs: objectives, the gold marker,
// dialogue lines, rewards and save progress.
(function () {
  'use strict';

  var SB = window.SB;
  var THREE = window.THREE;

  var SAVE_KEY = 'solmar-bay-save-v1';

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (typeof s.mission !== 'number') return null;
      return s;
    } catch (e) { return null; }
  }

  function saveGame(missionIndex, cash) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ mission: missionIndex, cash: cash }));
    } catch (e) { /* private mode: play without saving */ }
  }

  // The gold marker: floating diamond, light beam and ground ring.
  function makeMarker(scene) {
    var group = new THREE.Group();
    var diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.6),
      new THREE.MeshBasicMaterial({ color: 0xffc21c })
    );
    diamond.position.y = 4;
    var beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 26, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc21c, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.y = 13;
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.4, 32),
      new THREE.MeshBasicMaterial({ color: 0xffc21c, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    group.add(diamond); group.add(beam); group.add(ring);
    group.visible = false;
    scene.add(group);
    return {
      group: group, diamond: diamond,
      setTarget: function (x, z) {
        group.position.set(x, 0, z);
        group.visible = true;
      },
      hide: function () { group.visible = false; },
      update: function (t) {
        diamond.rotation.y = t * 1.6;
        diamond.position.y = 4 + Math.sin(t * 2.2) * 0.5;
      },
    };
  }

  // Mission definitions. Each mission is a list of stages; a stage is done
  // when the player reaches its target, enters the marked car, or clears
  // its goons, depending on its kind.
  function missionDefs(landmarks) {
    return [
      {
        title: 'First Errand',
        reward: 500,
        intro: 'Rico. You owe me one job, and it starts now. Pick up the package at the Marina Docks and bring it to my garage. No cops, no questions.',
        stages: [
          { kind: 'reach', text: 'Pick up the package at the Marina Docks', target: landmarks.docks, radius: 4,
            line: 'The package is waiting on the pier. Grab it and get moving.' },
          { kind: 'reach', text: 'Deliver the package to Lena\'s Garage', target: landmarks.garage, radius: 4,
            line: 'Good. Now bring it to my garage, west side. Nice and easy.' },
        ],
      },
      {
        title: 'Getaway Driver',
        reward: 900,
        intro: 'Second job. There is a Coral Coupe parked at Marlin Plaza. Take it — the owner will not miss it — then lose the cops and bring it to the Hideout.',
        stages: [
          { kind: 'steal', text: 'Steal the Coral Coupe at Marlin Plaza', target: landmarks.plaza, radius: 5,
            line: 'The coupe is parked by the plaza. Get in and the heat is on you.' },
          { kind: 'reach', text: 'Lose the cops and reach the Hideout', target: landmarks.hideout, radius: 5,
            line: 'North-west corner, the old Hideout. Shake them first or bring them with you — your call.' },
        ],
      },
      {
        title: 'The Exchange',
        reward: 1500,
        intro: 'Last one, Rico. The Vultures took my briefcase at the plaza. Take it back — all three of them — and bring it to the garage. Then we are even.',
        stages: [
          { kind: 'clear', text: 'Take out the Vultures at Marlin Plaza', target: landmarks.plaza, radius: 6,
            line: 'Three of them, and they are armed. Make it quick.' },
          { kind: 'pickup', text: 'Pick up the briefcase', target: landmarks.plaza, radius: 3,
            line: 'The briefcase is on the ground. Grab it.' },
          { kind: 'reach', text: 'Bring the briefcase to Lena\'s Garage', target: landmarks.garage, radius: 4,
            line: 'Almost done. Garage, west side. Then the debt is paid.' },
        ],
      },
    ];
  }

  function makeMissions(scene, landmarks) {
    var defs = missionDefs(landmarks);
    var marker = makeMarker(scene);
    return {
      defs: defs,
      marker: marker,
      index: 0,
      stage: 0,
      done: false,
      current: function () { return defs[this.index] || null; },
      stageDef: function () {
        var m = this.current();
        return m ? m.stages[this.stage] : null;
      },
      objectiveText: function () {
        if (this.done) return 'All jobs done — Solmar Bay is yours, Rico.';
        var s = this.stageDef();
        return s ? s.text : '';
      },
      start: function (index) {
        this.index = index;
        this.stage = 0;
        this.done = index >= defs.length;
        this.updateMarker();
      },
      updateMarker: function () {
        var s = this.stageDef();
        if (!s) { marker.hide(); return; }
        marker.setTarget(s.target.x, s.target.z);
      },
      // advance one stage; returns the reward if a mission just completed
      advance: function () {
        var m = this.current();
        if (!m) return 0;
        this.stage += 1;
        if (this.stage >= m.stages.length) {
          this.index += 1;
          this.stage = 0;
          this.done = this.index >= defs.length;
          this.updateMarker();
          return m.reward;
        }
        this.updateMarker();
        return 0;
      },
    };
  }

  SB.loadSave = loadSave;
  SB.saveGame = saveGame;
  SB.makeMissions = makeMissions;
})();
