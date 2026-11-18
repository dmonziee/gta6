// Solmar Bay — seeded random numbers (deterministic city and traffic).
// Every random choice in the game comes from here so a screenshot seed
// reproduces the same city, the same traffic and the same pedestrians.
(function () {
  'use strict';

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRng(seed) {
    var next = mulberry32(seed);
    return {
      next: next,
      range: function (lo, hi) { return lo + next() * (hi - lo); },
      int: function (lo, hi) { return Math.floor(lo + next() * (hi - lo + 1)); },
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      chance: function (p) { return next() < p; },
    };
  }

  window.SB = window.SB || {};
  window.SB.makeRng = makeRng;
})();
