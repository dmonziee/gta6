// hud.js — cash and health top left, the mission objective across the top centre,
// wanted stars top right, a circular minimap bottom left, a speedometer bottom
// right, plus car health, the district name, a clock, toasts and dialogue.
// Title, dead and pause screens live here too, as plain DOM.
const STREETS = [-237, -191, -145, -99, -53, -7, 39, 85, 131, 177, 223];

export class HUD {
  constructor() {
    const ids = ['hud', 'cash', 'healthFill', 'objective', 'stars', 'clock', 'minimap',
      'carHealth', 'district', 'speed', 'toasts', 'dialogue', 'dialogueText',
      'titleScreen', 'newGameBtn', 'continueBtn', 'deadScreen', 'retryBtn',
      'pauseScreen', 'playerName'];
    this.el = {};
    for (const id of ids) this.el[id] = document.getElementById(id);
    this.mm = this.el.minimap ? this.el.minimap.getContext('2d') : null;
    this.dialogueTimer = 0;
    this.gameMinutes = 18 * 60 + 30;
  }

  showTitle(canContinue) {
    if (this.el.titleScreen) this.el.titleScreen.style.display = 'flex';
    if (this.el.continueBtn) this.el.continueBtn.style.display = canContinue ? 'inline-block' : 'none';
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
    while (this.el.toasts.children.length > 4) {
      this.el.toasts.removeChild(this.el.toasts.firstChild);
    }
  }
  say(text) {
    if (!this.el.dialogueText || !this.el.dialogue) return;
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
    const hp = Math.max(0, Math.min(100, state.health));
    if (this.el.healthFill) {
      this.el.healthFill.style.width = hp + '%';
      this.el.healthFill.style.background = hp > 50 ? '#3aff7a' : hp > 25 ? '#ffb13a' : '#ff4a4a';
    }
    if (this.el.objective) this.el.objective.textContent = state.objective || '';
    if (this.el.stars) {
      const w = state.wanted || 0;
      this.el.stars.textContent = '★'.repeat(w) + '☆'.repeat(5 - w);
      this.el.stars.style.color = w > 0 ? '#ffd76a' : '#888888';
    }
    if (this.el.clock) {
      const mins = Math.floor(this.gameMinutes) % 1440;
      const hh = String(Math.floor(mins / 60)).padStart(2, '0');
      const mm = String(mins % 60).padStart(2, '0');
      this.el.clock.textContent = hh + ':' + mm;
    }
    if (this.el.district) this.el.district.textContent = state.district || '';
    if (this.el.speed) {
      this.el.speed.textContent = state.inCar ? Math.round(Math.abs(state.carSpeed) * 3.2) + ' km/h' : '';
    }
    if (this.el.carHealth) {
      if (state.inCar && state.carHealth !== null && state.carHealth !== undefined) {
        const ch = Math.max(0, Math.min(100, state.carHealth));
        this.el.carHealth.style.display = 'block';
        this.el.carHealth.textContent = 'CAR ' + Math.round(ch) + '%';
        this.el.carHealth.style.color = ch > 50 ? '#3aff7a' : ch > 25 ? '#ffb13a' : '#ff4a4a';
      } else {
        this.el.carHealth.style.display = 'none';
      }
    }
    this.drawMinimap(state);
  }
  drawMinimap(state) {
    const ctx = this.mm;
    if (!ctx) return;
    const toX = (x) => (x + 260) / 520 * 170;
    const toZ = (z) => (z + 260) / 520 * 170;
    ctx.clearRect(0, 0, 170, 170);
    ctx.save();
    ctx.beginPath();
    ctx.arc(85, 85, 85, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(12,14,20,0.85)';
    ctx.fillRect(0, 0, 170, 170);
    const rect = (x0, z0, x1, z1, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(toX(x0), toZ(z0), (x1 - x0) / 520 * 170, (z1 - z0) / 520 * 170);
    };
    rect(170, 110, 250, 240, '#2a6a8a'); // marina water
    rect(-44, 138, 124, 218, '#8a6a2a'); // Casino Row
    rect(-44, 242, 92, 260, '#c8b89a'); // Ocean Drive sand
    rect(-44, 250, 92, 260, '#2a6a8a'); // Ocean Drive sea
    rect(110, 55, 126, 225, '#555a63'); // airport runway
    ctx.strokeStyle = '#555a63';
    ctx.lineWidth = 2;
    for (const s of STREETS) {
      ctx.beginPath();
      ctx.moveTo(toX(-260), toZ(s));
      ctx.lineTo(toX(260), toZ(s));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toX(s), toZ(-260));
      ctx.lineTo(toX(s), toZ(260));
      ctx.stroke();
    }
    ctx.fillStyle = '#3aff7a';
    for (const p of state.packages || []) {
      ctx.fillRect(toX(p.x) - 2, toZ(p.z) - 2, 4, 4);
    }
    if (state.fare) {
      const t = state.fare.state === 'toPickup' ? state.fare.pickup : state.fare.dropoff;
      ctx.fillStyle = '#ffe14a';
      ctx.beginPath();
      ctx.arc(toX(t.x), toZ(t.z), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.marker) {
      const h = 5 + 2.5 * Math.sin(performance.now() / 180);
      const mx = toX(state.marker.x);
      const my = toZ(state.marker.z);
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.moveTo(mx, my - h);
      ctx.lineTo(mx + h, my);
      ctx.lineTo(mx, my + h);
      ctx.lineTo(mx - h, my);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#ff4a4a';
    for (const c of state.cops || []) {
      ctx.beginPath();
      ctx.arc(toX(c.x), toZ(c.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff9a3a';
    for (const g of state.guardPos || []) {
      ctx.beginPath();
      ctx.arc(toX(g.x), toZ(g.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const px = toX(state.pos.x);
    const py = toZ(state.pos.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(Math.sin(state.heading), -Math.cos(state.heading)));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(85, 85, 84, 0, Math.PI * 2);
    ctx.stroke();
  }
}
