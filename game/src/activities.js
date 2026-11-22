// Street centre-lines of the grid (the road network the taxi can drive).
const STREET_LINES = [-237, -191, -145, -99, -53, -7, 39, 85, 131, 177, 223];

function nearestLine(v) {
  let best = STREET_LINES[0];
  for (const l of STREET_LINES) if (Math.abs(l - v) < Math.abs(best - v)) best = l;
  return best;
}

// A corner of the nearest intersection: on the road so the taxi can pull
// up beside the passenger, and never in the marina basin (open water).
function streetCorner(x, z) {
  const cx = nearestLine(x) + 5;
  const cz = nearestLine(z) + 5;
  if (cx > 168 && cz > 105 && cz < 240) return { x: 165, z: cz };
  return { x: cx, z: cz };
}
// 1. Taxi fares: find a waiting passenger (blue marker), pick them up, drive
//    them to their destination before the meter runs out. Pays $40–$120.
// 2. Hidden packages: ten glowing parcels stashed around Solmar Bay — on the
//    pier, in the park, behind the chop shop. Walk over one to collect $100.

import { PLACES } from './city.js';

export const PACKAGE_SPOTS = [
  { x: 216, z: 196, hint: 'end of Pier 9' },
  { x: -23, z: 122, hint: 'Palma Park bench' },
  { x: -160, z: -140, hint: "near Rook's Chop Shop" },
  { x: 108, z: -138, hint: 'Deluxe Auto Lot fence' },
  { x: 42, z: -24, hint: 'bank side alley' },
  { x: -138, z: 70, hint: "Lena's Garage steps" },
  { x: 184, z: -46, hint: 'Warehouse 7 door' },
  { x: 0, z: 66, hint: 'Central Taxi Stand' },
  { x: 170, z: 62, hint: 'under the dock crane' },
  { x: -38, z: 204, hint: 'Solmar General steps' },
];

export const TAXI_FARE_MIN = 40;
export const TAXI_FARE_MAX = 120;

export function createActivities(world) {
  let packagesFound = new Set();
  let fare = null; // { pickup, dropoff, pay, timeLeft, state }
  let fareCooldown = 0;

  function nearestPassengerSpawn(playerPos, rng) {
    // A passenger waits on a street corner near the player.
    return streetCorner(
      playerPos.x + rng.range(-90, 90),
      playerPos.z + rng.range(-90, 90),
    );
  }

  function startFare(rng) {
    const p = world.playerPos();
    const pickup = nearestPassengerSpawn(p, rng);
    const dropoff = streetCorner(
      pickup.x + rng.range(-160, 160),
      pickup.z + rng.range(-160, 160),
    );
    const dist = Math.hypot(dropoff.x - pickup.x, dropoff.z - pickup.z);
    fare = {
      pickup,
      dropoff,
      pay: Math.round(TAXI_FARE_MIN + Math.min(1, dist / 220) * (TAXI_FARE_MAX - TAXI_FARE_MIN)),
      timeLeft: 25 + dist / 4,
      state: 'toPickup',
    };
    world.onDialogue('Passenger', 'Taxi! Take me across town — and step on it.');
    world.setTaxiMarker(pickup);
    return fare;
  }

  return {
    get packagesFound() {
      return packagesFound;
    },
    get fare() {
      return fare;
    },
    loadPackages(ids) {
      packagesFound = new Set(ids);
    },
    collectPackages(playerPos) {
      const found = [];
      for (let i = 0; i < PACKAGE_SPOTS.length; i += 1) {
        if (packagesFound.has(i)) continue;
        const s = PACKAGE_SPOTS[i];
        const dx = playerPos.x - s.x;
        const dz = playerPos.z - s.z;
        if (dx * dx + dz * dz < 9) {
          packagesFound.add(i);
          found.push(i);
          world.onPayout(100);
          world.onDialogue('Rico', `Hidden package ${packagesFound.size} of ${PACKAGE_SPOTS.length} — a hundred bucks, just lying there.`);
        }
      }
      return found;
    },
    // T pressed: start a fare if free, or handle the current fare's state.
    toggleTaxi(rng) {
      if (fare) return false;
      if (fareCooldown > 0) return false;
      startFare(rng);
      return true;
    },
    update(dt, playerPos, inCar) {
      fareCooldown = Math.max(0, fareCooldown - dt);
      if (!fare) return null;
      const target = fare.state === 'toPickup' ? fare.pickup : fare.dropoff;
      const dx = playerPos.x - target.x;
      const dz = playerPos.z - target.z;
      const d2 = dx * dx + dz * dz;
      if (fare.state === 'toPickup') {
        if (d2 < 36) {
          fare.state = 'toDropoff';
          world.onDialogue('Passenger', 'That way — fast, but not crazy fast.');
          world.setTaxiMarker(fare.dropoff);
        }
      } else {
        fare.timeLeft -= dt;
        if (d2 < 49 && inCar) {
          const pay = fare.pay;
          world.onPayout(pay);
          world.onDialogue('Passenger', `Thanks, pal. Keep the change — all ${pay} of it.`);
          fare = null;
          fareCooldown = 8;
          world.setTaxiMarker(null);
          return 'done';
        }
        if (fare.timeLeft <= 0) {
          world.onDialogue('Passenger', "Too slow! I'll walk from here.");
          fare = null;
          fareCooldown = 8;
          world.setTaxiMarker(null);
          return 'failed';
        }
      }
      return null;
    },
    cancelFare() {
      fare = null;
      world.setTaxiMarker(null);
    },
  };
}
