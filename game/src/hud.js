// The HUD: cash and health, the mission objective, wanted stars, the clock,
// the speedometer, the circular minimap, dialogue and toasts. All DOM — the
// 3D scene never draws UI. The minimap is a top-down sketch of the city:
// streets, buildings, the marina basin, the player arrow and every live blip.

const THREE = window.THREE;

export function createHud() {
  const el = (id) => document.getElementById(id);
  const cashText = el('cashText');
  const healthFill = el('healthFill');
  const healthText = el('healthText');
  const weaponText = el('weaponText');
  const ammoText = el('ammoText');
  const objectiveText = el('objectiveText');
  const starsEl = el('stars');
  const clockText = el('clockText');
  const speedText = el('speedText');
  const carHealthText = el('carHealthText');
  const districtText = el('districtText');
  const dialogueEl = el('dialogue');
  const dialogueName = el('dialogueName');
  const dialogueText = el('dialogueText');
  const toastEl = el('toast');
  const crosshair = el('crosshair');
  const hintBar = el('hintBar');
  const minimap = el('minimap');
  const mm = minimap.getContext('2d');

  let dialogueTimer = null;
  let toastTimer = null;
  let lastStars = -1;
  let lastClock = '';

  function showDialogue(name, text) {
    dialogueName.textContent = name;
    dialogueText.textContent = text;
    dialogueEl.classList.add('visible');
    if (dialogueTimer) window.clearTimeout(dialogueTimer);
    dialogueTimer = window.setTimeout(() => dialogueEl.classList.remove('visible'), 7000);
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('visible');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('visible'), 3500);
  }

  function formatClock(minutes) {
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.floor(minutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function drawMinimap(state) {
    const S = minimap.width;
    const scale = S / 560;
    const toX = (x) => (x + 280) * scale;
    const toY = (z) => (z + 280) * scale;
    mm.clearRect(0, 0, S, S);
    // Base.
    mm.fillStyle = '#0d1a12';
    mm.beginPath();
    mm.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    mm.fill();
    mm.save();
    mm.beginPath();
    mm.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    mm.clip();
    // Marina water.
    mm.fillStyle = '#1e4a66';
    mm.fillRect(toX(142), toY(100), (118) * scale, (150) * scale);
    // Streets.
    mm.strokeStyle = '#3a4448';
    mm.lineWidth = 5;
    for (let i = 0; i <= 10; i += 1) {
      const line = -260 + 23 + i * 46;
      mm.beginPath();
      mm.moveTo(toX(line), 0);
      mm.lineTo(toX(line), S);
      mm.stroke();
      mm.beginPath();
      mm.moveTo(0, toY(line));
      mm.lineTo(S, toY(line));
      mm.stroke();
    }
    // Buildings.
    mm.fillStyle = '#5a6a58';
    for (const c of state.colliders) {
      mm.fillRect(toX(c.x - c.hw), toY(c.z - c.hd), c.hw * 2 * scale, c.hd * 2 * scale);
    }
    // Hidden packages.
    mm.fillStyle = '#5be584';
    for (const p of state.packages) {
      if (p.found) continue;
      mm.beginPath();
      mm.arc(toX(p.x), toY(p.z), 2.5, 0, Math.PI * 2);
      mm.fill();
    }
    // Taxi fare marker.
    if (state.taxiTarget) {
      mm.fillStyle = '#4aa8ff';
      mm.beginPath();
      mm.arc(toX(state.taxiTarget.x), toY(state.taxiTarget.z), 4, 0, Math.PI * 2);
      mm.fill();
    }
    // Mission car.
    if (state.missionCar) {
      mm.fillStyle = '#ff8a2a';
      mm.fillRect(toX(state.missionCar.x) - 3, toY(state.missionCar.z) - 3, 6, 6);
    }
    // Cops.
    mm.fillStyle = '#ff4a4a';
    for (const cop of state.cops) {
      mm.beginPath();
      mm.arc(toX(cop.x), toY(cop.z), 3, 0, Math.PI * 2);
      mm.fill();
    }
    // Mission objective: pulsing yellow diamond.
    if (state.objectiveTarget) {
      const pulse = 4 + Math.sin(state.now * 4) * 1.5;
      mm.fillStyle = '#ffd21c';
      mm.save();
      mm.translate(toX(state.objectiveTarget.x), toY(state.objectiveTarget.z));
      mm.rotate(Math.PI / 4);
      mm.fillRect(-pulse, -pulse, pulse * 2, pulse * 2);
      mm.restore();
    }
    // Player arrow.
    mm.save();
    mm.translate(toX(state.player.x), toY(state.player.z));
    mm.rotate(state.player.heading);
    mm.fillStyle = '#ffffff';
    mm.strokeStyle = '#111111';
    mm.lineWidth = 1;
    mm.beginPath();
    mm.moveTo(0, -7);
    mm.lineTo(5, 6);
    mm.lineTo(0, 3);
    mm.lineTo(-5, 6);
    mm.closePath();
    mm.fill();
    mm.stroke();
    mm.restore();
    mm.restore();
    // Rim.
    mm.strokeStyle = 'rgba(255,255,255,0.5)';
    mm.lineWidth = 2;
    mm.beginPath();
    mm.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2);
    mm.stroke();
  }

  return {
    showDialogue,
    showToast,
    setHint(text) {
      hintBar.textContent = text;
    },
    update(state) {
      cashText.textContent = `$${state.money.toLocaleString('en-US')}`;
      healthFill.style.width = `${Math.max(0, state.health)}%`;
      healthFill.style.background = state.health > 50
        ? 'linear-gradient(90deg,#37d67a,#8be36a)'
        : state.health > 25
          ? 'linear-gradient(90deg,#e8a33a,#ffd76a)'
          : 'linear-gradient(90deg,#e84a3a,#ff7a5a)';
      healthText.textContent = `Health ${Math.ceil(state.health)}`;
      weaponText.textContent = state.weaponName;
      ammoText.textContent = state.weapon === 'pistol' ? `Ammo ${state.ammo}` : '';
      objectiveText.textContent = state.objective;
      if (state.wanted !== lastStars) {
        lastStars = state.wanted;
        let stars = '';
        for (let i = 0; i < 5; i += 1) stars += i < state.wanted ? '★' : '☆';
        starsEl.textContent = stars;
        starsEl.style.color = state.wanted > 0 ? '#ffd21c' : 'rgba(255,255,255,0.55)';
      }
      const clock = formatClock(state.clockMinutes);
      if (clock !== lastClock) {
        lastClock = clock;
        clockText.textContent = clock;
      }
      speedText.textContent = `${Math.round(state.speedKmh)}`;
      carHealthText.textContent = state.inCar ? `Car ${Math.max(0, Math.round(state.carHealth))}%` : '';
      districtText.textContent = `${state.district} · Packages ${state.packagesFound}/${state.packagesTotal}`;
      crosshair.style.display = state.showCrosshair ? 'block' : 'none';
      drawMinimap(state);
    },
  };
}
