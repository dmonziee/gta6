// Solmar Bay — the HUD: health, cash, wanted stars, clock, mission
// objective, speedometer and the live circular minimap.
(function () {
  'use strict';

  var SB = window.SB;

  function makeHud(doc) {
    var els = {};
    ['healthFill', 'healthText', 'cashText', 'stars', 'clockText', 'objectiveText',
     'speedText', 'carHealthText', 'dialogue', 'dialogueName', 'dialogueText',
     'weaponText', 'ammoText', 'crosshair', 'minimap', 'hintBar'].forEach(function (id) {
      els[id] = doc.getElementById(id);
    });
    var mapCtx = els.minimap.getContext('2d');
    var dialogueTimer = 0;

    function setStars(n) {
      var s = '';
      for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆';
      els.stars.textContent = s;
      els.stars.style.color = n > 0 ? '#ffd21c' : 'rgba(255,255,255,0.35)';
    }

    function showDialogue(name, text, seconds) {
      els.dialogueName.textContent = name + ':';
      els.dialogueText.textContent = text;
      els.dialogue.style.display = 'block';
      dialogueTimer = seconds || 6;
    }

    function drawMinimap(state) {
      var c = mapCtx, S = 180, R = S / 2;
      c.clearRect(0, 0, S, S);
      // round mask
      c.save();
      c.beginPath();
      c.arc(R, R, R - 2, 0, Math.PI * 2);
      c.clip();
      // background
      c.fillStyle = '#101a14';
      c.fillRect(0, 0, S, S);
      var scale = S / 560; // world -280..280
      function mx(x) { return R + x * scale; }
      function mz(z) { return R + z * scale; }
      // roads
      c.strokeStyle = '#3d4a42';
      c.lineWidth = 5;
      state.city.streets.forEach(function (s) {
        c.beginPath(); c.moveTo(mx(s), mz(-234)); c.lineTo(mx(s), mz(234)); c.stroke();
        c.beginPath(); c.moveTo(mx(-234), mz(s)); c.lineTo(mx(234), mz(s)); c.stroke();
      });
      // beach + water
      c.fillStyle = '#c9b078';
      c.fillRect(mx(234), 0, S, S);
      c.fillStyle = '#2e7f9e';
      c.fillRect(mx(262), 0, S, S);
      // mission marker
      var st = state.missions.stageDef();
      if (st) {
        c.fillStyle = '#ffc21c';
        c.beginPath();
        c.moveTo(mx(st.target.x), mz(st.target.z) - 7);
        c.lineTo(mx(st.target.x) + 6, mz(st.target.z));
        c.lineTo(mx(st.target.x), mz(st.target.z) + 7);
        c.lineTo(mx(st.target.x) - 6, mz(st.target.z));
        c.closePath(); c.fill();
      }
      // traffic
      c.fillStyle = '#cfd6cf';
      state.traffic.forEach(function (car) {
        c.fillRect(mx(car.x) - 1.5, mz(car.z) - 1.5, 3, 3);
      });
      // goons
      c.fillStyle = '#c05ad8';
      state.combat.goons.forEach(function (g) {
        if (g.alive) { c.beginPath(); c.arc(mx(g.x), mz(g.z), 3, 0, Math.PI * 2); c.fill(); }
      });
      // police
      c.fillStyle = '#ff3b30';
      state.policeCars.forEach(function (car) {
        c.beginPath(); c.arc(mx(car.x), mz(car.z), 3.5, 0, Math.PI * 2); c.fill();
      });
      state.officers.forEach(function (o) {
        c.beginPath(); c.arc(mx(o.x), mz(o.z), 2.5, 0, Math.PI * 2); c.fill();
      });
      // player arrow
      var px = mx(state.player.x), pz = mz(state.player.z);
      c.save();
      c.translate(px, pz);
      c.rotate(state.player.heading);
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(7, 0); c.lineTo(-5, -4.5); c.lineTo(-5, 4.5);
      c.closePath(); c.fill();
      c.restore();
      // gold ring around the player
      c.strokeStyle = '#ffc21c';
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(px, pz, 9, 0, Math.PI * 2); c.stroke();
      c.restore();
      // round border
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 2;
      c.beginPath(); c.arc(R, R, R - 2, 0, Math.PI * 2); c.stroke();
    }

    return {
      update: function (state, dt) {
        if (dialogueTimer > 0) {
          dialogueTimer -= dt;
          if (dialogueTimer <= 0) els.dialogue.style.display = 'none';
        }
        els.healthFill.style.width = Math.max(0, state.player.health) + '%';
        els.healthText.textContent = 'Health ' + Math.max(0, Math.round(state.player.health));
        els.cashText.textContent = '$' + state.cash;
        setStars(state.wanted.stars);
        var mins = state.clockMinutes % 1440;
        var hh = Math.floor(mins / 60), mm = mins % 60;
        els.clockText.textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
        els.objectiveText.textContent = state.missions.objectiveText();
        var speedKmh = Math.round(Math.abs(state.player.car ? state.player.car.speed : 0) * 3.6);
        els.speedText.textContent = state.player.car ? speedKmh : 0;
        els.carHealthText.textContent = state.player.car
          ? state.player.car.name + ' — ' + Math.round(state.player.car.health) + '%'
          : '';
        els.weaponText.textContent = state.player.weapon === 'pistol' ? 'Pistol' : 'Fists';
        els.ammoText.textContent = state.player.weapon === 'pistol'
          ? state.player.ammo + ' / ' + state.player.reserveAmmo : '';
        els.crosshair.style.display = state.player.weapon === 'pistol' && !state.player.car ? 'block' : 'none';
        drawMinimap(state);
      },
      showDialogue: showDialogue,
    };
  }

  SB.makeHud = makeHud;
})();
