// hud.js — cash, health, objective, wanted stars, minimap, speed, toasts, dialogue and screens.
export class HUD {
  constructor() {
    this.el = {};
    const ids = ['hud', 'cash', 'healthFill', 'objective', 'stars', 'clock', 'minimap', 'carHealth', 'district', 'speed', 'toasts', 'dialogue', 'dialogueText', 'titleScreen', 'newGameBtn', 'continueBtn', 'deadScreen', 'retryBtn', 'pauseScreen', 'playerName'];
    for (const id of ids) this.el[id] = document.getElementById(id);
    this.ctx2d = this.el.minimap ? this.el.minimap.getContext('2d') : null;
    this.dialogueTimer = 0;
    this.gameMinutes = 18 * 60 + 30;
  }
  showTitle(canContinue) {
    if (this.el.titleScreen) this.el.titleScreen.style.display = 'flex';
    if (this.el.continueBtn) this.el.continueBtn.style.display = canContinue ? '' : 'none';
    if (this.el.hud) this.el.hud.style.display = 'none';
  }
  hideTitle() {
    if (this.el.titleScreen) this.el.titleScreen.style.display = 'none';
    if (this.el.hud) this.el.hud.style.display = 'block';
  }
  showDead() {
    if (this.el.deadScreen) this.el.deadScreen.style.display = 'flex';
  }
  hideDead() {
    if (this.el.deadScreen) this.el.deadScreen.style.display = 'none';
  }
  showPause(show) {
    if (this.el.pauseScreen) this.el.pauseScreen.style.display = show ? 'flex' : 'none';
  }
  toast(msg) {
    if (!this.el.toasts) return;
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = msg;
    this.el.toasts.appendChild(div);
    setTimeout(() => div.remove(), 4200);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
  }
  say(text) {
    if (!this.el.dialogue || !this.el.dialogueText) return;
    this.el.dialogueText.textContent = text;
    this.el.dialogue.style.display = 'block';
    this.dialogueTimer = 6;
  }
  update(dt, state) {
    this.gameMinutes += dt * 0.5;
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0 && this.el.dialogue) this.el.dialogue.style.display = 'none';
    }
    if (this.el.cash) this.el.cash.textContent = '$' + Math.floor(state.money);
    if (this.el.healthFill) {
      const h = Math.max(0, Math.min(100, state.health));
      this.el.healthFill.style.width = h + '%';
      this.el.healthFill.style.background = h > 50 ? '#3aff7a' : (h > 25 ? '#ffb13a' : '#ff4a4a');
    }
    if (this.el.objective) this.el.objective.textContent = state.objective || '';
    if (this.el.stars) {
      let s = '';
      for (let i = 0; i < 5; i++) s += i < state.wanted ? '★' : '☆';
      this.el.stars.textContent = s;
      this.el.stars.style.color = state.wanted > 0 ? '#ffd76a' : '#888888';
    }
    if (this.el.clock) {
      const m = Math.floor(this.gameMinutes) % 1440;
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      this.el.clock.textContent = `${hh}:${mm}`;
    }
    if (this.el.district) this.el.district.textContent = state.district;
    if (this.el.speed) {
      this.el.speed.textContent = state.inCar ? Math.round(Math.abs(state.carSpeed) * 3.2) + ' km/h' : '';
    }
    if (this.el.carHealth) {
      if (state.inCar && state.carHealth !== null && state.carHealth !== undefined) {
        const ch = Math.max(0, Math.min(100, Math.round(state.carHealth)));
        this.el.carHealth.textContent = 'CAR ' + ch + '%';
        this.el.carHealth.style.color = ch > 50 ? '#3aff7a' : (ch > 25 ? '#ffb13a' : '#ff4a4a');
        this.el.carHealth.style.display = '';
      } else {
        this.el.carHealth.style.display = 'none';
      }
    }
    this.drawMinimap(state);
  }
  drawMinimap(state) {
    const c = this.ctx2d;
    if (!c) return;
    const W = 170, H = 170;
    const toMap = v => (v + 260) / 520 * 170;
    c.clearRect(0, 0, W, H);
    c.save();
    c.beginPath();
    c.arc(85, 85, 85, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = 'rgba(12, 14, 20, 0.85)';
    c.fillRect(0, 0, W, H);
    // Marina basin.
    c.fillStyle = '#2a6a8a';
    c.fillRect(toMap(170), toMap(110), toMap(250) - toMap(170), toMap(240) - toMap(110));
    // Casino Row.
    c.fillStyle = '#8a6a2a';
    c.fillRect(toMap(-44), toMap(138), toMap(124) - toMap(-44), toMap(218) - toMap(138));
    // Airport runway.
    c.fillStyle = '#555a63';
    c.fillRect(toMap(110), toMap(55), toMap(126) - toMap(110), toMap(225) - toMap(55));
    // Streets.
    c.strokeStyle = '#555a63';
    c.lineWidth = 2;
    const streets = state.streets || [];
    for (const s of streets) {
      c.beginPath(); c.moveTo(0, toMap(s)); c.lineTo(W, toMap(s)); c.stroke();
      c.beginPath(); c.moveTo(toMap(s), 0); c.lineTo(toMap(s), H); c.stroke();
    }
    // Hidden packages.
    c.fillStyle = '#3aff7a';
    for (const p of state.packages || []) {
      c.fillRect(toMap(p.x) - 2, toMap(p.z) - 2, 4, 4);
    }
    // Taxi fare target.
    if (state.fare) {
      const t = state.fare.state === 'toPickup' ? state.fare.pickup : state.fare.dropoff;
      c.fillStyle = '#ffe14a';
      c.beginPath(); c.arc(toMap(t.x), toMap(t.z), 4, 0, Math.PI * 2); c.fill();
    }
    // Mission target, pulsing diamond.
    if (state.marker) {
      const half = 5 + 2.5 * Math.sin(performance.now() / 180);
      const mx = toMap(state.marker.x), mz = toMap(state.marker.z);
      c.fillStyle = '#ffd76a';
      c.beginPath();
      c.moveTo(mx, mz - half);
      c.lineTo(mx + half, mz);
      c.lineTo(mx, mz + half);
      c.lineTo(mx - half, mz);
      c.closePath();
      c.fill();
    }
    // Cops.
    c.fillStyle = '#ff4a4a';
    for (const cop of state.cops || []) {
      c.beginPath(); c.arc(toMap(cop.x), toMap(cop.z), 3, 0, Math.PI * 2); c.fill();
    }
    // Guards.
    c.fillStyle = '#ff9a3a';
    for (const g of state.guardPos || []) {
      c.beginPath(); c.arc(toMap(g.x), toMap(g.z), 3, 0, Math.PI * 2); c.fill();
    }
    // Player arrow.
    const px = toMap(state.pos.x), pz = toMap(state.pos.z);
    const ang = Math.atan2(Math.sin(state.heading), -Math.cos(state.heading));
    c.save();
    c.translate(px, pz);
    c.rotate(ang);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(0, -7);
    c.lineTo(5, 5);
    c.lineTo(-5, 5);
    c.closePath();
    c.fill();
    c.restore();
    c.restore();
    // Border ring.
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(85, 85, 85, 0, Math.PI * 2);
    c.stroke();
  }
}
