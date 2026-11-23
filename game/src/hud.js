// Solmar Bay — the HUD: cash and health top left, the mission objective
// across the top centre, wanted stars top right, a circular minimap bottom
// left, a speedometer bottom right, plus car health, the district name, a
// clock, toasts, and the dialogue line. Title, dead and pause screens live
// here too, as plain DOM the game shows and hides.

export class HUD {
  constructor() {
    this.el = {};
    for (const id of [
      'hud', 'cash', 'healthFill', 'objective', 'stars', 'clock', 'minimap',
      'carHealth', 'district', 'speed', 'toasts', 'dialogue', 'dialogueText',
      'titleScreen', 'newGameBtn', 'continueBtn', 'deadScreen', 'retryBtn',
      'pauseScreen', 'playerName',
    ]) {
      this.el[id] = document.getElementById(id);
    }
    this.mapCtx = this.el.minimap ? this.el.minimap.getContext('2d') : null;
    this.dialogueTimer = 0;
    this.gameMinutes = 18 * 60 + 30; // the sun is setting: 18:30
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
    window.setTimeout(() => div.remove(), 4200);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
  }

  say(text) {
    if (!this.el.dialogue || !this.el.dialogueText) return;
    this.el.dialogueText.textContent = text;
    this.el.dialogue.style.display = 'block';
    this.dialogueTimer = 6;
  }

  // state: { money, health, wanted, objective, inCar, carHealth, carSpeed,
  // district, heading, pos, carPos, marker, fare, packages, cops, guards,
  // guardPos, trafficPos }
  update(dt, state) {
    this.gameMinutes += dt * 0.5; // a game minute every two real seconds
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0 && this.el.dialogue) this.el.dialogue.style.display = 'none';
    }
    if (this.el.cash) this.el.cash.textContent = `$${Math.floor(state.money)}`;
    if (this.el.healthFill) {
      this.el.healthFill.style.width = `${Math.max(0, Math.min(100, state.health))}%`;
      this.el.healthFill.style.background = state.health > 50 ? '#3aff7a' : state.health > 25 ? '#ffb13a' : '#ff4a4a';
    }
    if (this.el.objective) this.el.objective.textContent = state.objective || '';
    if (this.el.stars) {
      this.el.stars.textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
      this.el.stars.style.color = state.wanted > 0 ? '#ffd76a' : '#888888';
    }
    if (this.el.clock) {
      const mins = Math.floor(this.gameMinutes) % (24 * 60);
      const hh = String(Math.floor(mins / 60)).padStart(2, '0');
      const mm = String(mins % 60).padStart(2, '0');
      this.el.clock.textContent = `${hh}:${mm}`;
    }
    if (this.el.district) this.el.district.textContent = state.district || '';
    if (this.el.speed) {
      this.el.speed.textContent = state.inCar ? `${Math.round(Math.abs(state.carSpeed || 0) * 3.2)} km/h` : '';
    }
    if (this.el.carHealth) {
      if (state.inCar && state.carHealth !== null && state.carHealth !== undefined) {
        this.el.carHealth.style.display = 'block';
        this.el.carHealth.textContent = `CAR ${Math.max(0, Math.round(state.carHealth))}%`;
        this.el.carHealth.style.color = state.carHealth > 50 ? '#3aff7a' : state.carHealth > 25 ? '#ffb13a' : '#ff4a4a';
      } else {
        this.el.carHealth.style.display = 'none';
      }
    }
    this.drawMinimap(state);
  }

  drawMinimap(state) {
    const ctx = this.mapCtx;
    if (!ctx) return;
    const S = 170;
    const toMap = (x, z) => [((x + 260) / 520) * S, ((z + 260) / 520) * S];
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(12, 14, 20, 0.85)';
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    ctx.clip();
    // Water and Casino Row.
    ctx.fillStyle = '#2a6a8a';
    ctx.fillRect(...toMap(170, 110), (80 / 520) * S, (130 / 520) * S);
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(...toMap(-44, 138), (168 / 520) * S, (80 / 520) * S);
    // Streets.
    ctx.strokeStyle = '#555a63';
    ctx.lineWidth = 2;
    for (const s of [-237, -191, -145, -99, -53, -7, 39, 85, 131, 177, 223]) {
      const [x] = toMap(s, 0);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke();
      const [, z] = toMap(0, s);
      ctx.beginPath(); ctx.moveTo(0, z); ctx.lineTo(S, z); ctx.stroke();
    }
    // Hidden packages.
    ctx.fillStyle = '#3aff7a';
    for (const p of state.packages || []) {
      const [x, z] = toMap(p.x, p.z);
      ctx.fillRect(x - 2, z - 2, 4, 4);
    }
    // Taxi passenger / destination.
    if (state.fare) {
      const target = state.fare.state === 'toPickup' ? state.fare.pickup : state.fare.dropoff;
      const [x, z] = toMap(target.x, target.z);
      ctx.fillStyle = '#ffe14a';
      ctx.beginPath(); ctx.arc(x, z, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Mission target: a pulsing yellow diamond.
    if (state.marker) {
      const [x, z] = toMap(state.marker.x, state.marker.z);
      const pulse = 5 + 2.5 * Math.sin(performance.now() / 180);
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.moveTo(x, z - pulse); ctx.lineTo(x + pulse, z);
      ctx.lineTo(x, z + pulse); ctx.lineTo(x - pulse, z);
      ctx.closePath(); ctx.fill();
    }
    // Cops and guards.
    ctx.fillStyle = '#ff4a4a';
    for (const c of state.cops || []) {
      const [x, z] = toMap(c.x, c.z);
      ctx.beginPath(); ctx.arc(x, z, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff9a3a';
    for (const g of state.guardPos || []) {
      const [x, z] = toMap(g.x, g.z);
      ctx.beginPath(); ctx.arc(x, z, 3, 0, Math.PI * 2); ctx.fill();
    }
    // The player: a white arrow, pointing where Rico faces.
    const [px, pz] = toMap(state.pos.x, state.pos.z);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(Math.atan2(Math.sin(state.heading || 0), -Math.cos(state.heading || 0)));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }
}
