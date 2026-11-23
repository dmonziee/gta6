// Solmar Bay — seeded random numbers. One tiny generator drives the whole
// city build, so the same seed always builds the same streets, buildings
// and traffic. Mulberry32: small, fast, and deterministic in every browser.
export class RNG {
  constructor(seed = 42) {
    this.s = (seed >>> 0) || 1;
  }

  // Next float in [0, 1).
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a, b) {
    return a + (b - a) * this.next();
  }

  int(a, b) {
    return Math.floor(this.range(a, b + 1));
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  chance(p) {
    return this.next() < p;
  }
}
