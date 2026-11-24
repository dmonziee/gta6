[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/dmonziee/gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/dmonziee/gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay

Made for the [gta6-01 bounty](https://make.fun/bounty/gta6-01) on make.fun — enter with https://make.fun/r/fret8z8g.

**Solmar Bay** is a sun-soaked open-world crime story in the browser. Rico Marin owes Lena Cruz one last favour, and seven jobs stand between Rico and a clean slate, ending in a $5,500 Ocean Drive job at five stars. The city has downtown towers, old-town streets, a working marina, Casino Row, an airport and a beachfront boulevard — all of it driveable, walkable and stealable.

The game runs entirely offline as plain static files, with three.js vendored under `game/vendor`, all sounds synthesized live with WebAudio, no build step and no network.

## The seven jobs

Lena calls with the next job a few seconds after the last one pays out. Completing a job pays out, plays Lena's closing line and autosaves.

1. **The Package — $500.** Pick up the package at the Marina Docks and bring it to Lena's Garage.
2. **Hot Wheels — $900.** Steal the Comet GT from the Deluxe Auto Lot and deliver it to Rook's Chop Shop.
3. **The Vault Job — $1,500.** Crack the bank vault, grab the bag, and escape to Lena's Garage before the whole city is looking.
4. **Harbor Heist — $2,200.** Lift a rival crew's crate from Pier 9, guarded by their boys, and carry it to Warehouse 7.
5. **The Solmar Job — $3,500.** Lift the vault keycard off the casino door guard, crack the casino vault, and bring the take home.
6. **The Airlift — $4,500.** Lift the cargo manifest at the airport terminal, crack the cargo plane hold, and deliver the cargo to Lena's Garage.
7. **The Ocean Drive Job — $5,500.** Lift the hotel ledger at the Ocean Palms, crack the pier-end drop safe at five stars, and deliver the ledger home.

Guards only chase and shoot within 45 units of their post — break away past the leash and they hold their ground instead of gunning Rico down across the whole map. The vault, cargo-hold and drop-safe cracks are five-second timed holds: stay in the ring or the combination is lost and the crack starts over.

## The city

A seeded street grid — eleven streets each way, 46 units apart — with eight districts: **Downtown** (tall towers), **Old Town** (low warm streets, Lena's Garage and Rook's Chop Shop), **Northside**, **East End**, **Marina**, **Casino Row**, **Airport** and **Ocean Drive**. Named places include the Marina Docks, Pier 9, Solmar Bay Bank, the Deluxe Auto Lot, Harbor Warehouse 7, Solmar General, Palma Park and the Central Taxi Stand. The same seed always builds the same city; the default seed is 42.

### Casino Row

Three casinos face the street at z 177 — Casino Solmar, El Dorado and the Royale — with the vault house, its gold dome, Hotel Marbella, a valet lot, a fountain and a gateway arch across it. Every neon sign breathes, its glow wobbling slowly with a sine wave plus a faster smaller wobble, so the signs feel lit rather than painted.

### The Marina

Open water, two wooden piers, six bobbing boats, stacked shipping containers, two dock cranes and Harbor Warehouse 7, joined to the street grid by a concrete causeway — the only way the mission 4 escape car gets off the docks. The bay is fenced for feet, not for cars: the water stops a walker, but a car may cross the causeway.

### Solmar Airport

A north-south runway (x 118, z 55–225) with centre dashes, threshold bars and edge lights, a terminal with a glass front, two hangars, a control tower and a windsock that turns slowly in the wind. Traffic still drives the streets that bound and cross the district, and the crossing streets are treated in fiction as at-grade taxiway crossings.

### Ocean Drive

A beachfront boulevard along the south edge of the map: three art-deco hotels with neon — The Colony, the Ocean Palms and the Seaside — a wooden boardwalk, sand, the sea at the map edge, a pier running out to the water and a lifeguard tower. The Ocean Palms is where Mission 7 lifts the ledger.

## Life around the jobs

- **Wanted, 0–5 stars.** Crimes raise it; quiet time cools it. Getting busted costs 15% of the cash and sends Rico back to Lena's Garage.
- **Traffic and pedestrians.** Fourteen cars cruise the grid and slow down instead of rear-ending the player; 24 pedestrians stroll the sidewalks and scatter when trouble starts.
- **Combat.** Fists deal 12 damage, the pistol 26 damage with 12 rounds and R to reload. Guards shoot back for 8 damage a hit. A cop car rammed hard takes 30 damage.
- **Driving.** Per-kind top speed and handling, sliding along walls, hard steering limiting top speed. Re-entering a parked car rebuilds it at full health. A car has 100 health and is wrecked at zero.
- **Taxi fares.** Press T: a passenger waits at a street corner 25–60 units away, and the fare pays $40–$120 if you get them to their destination within 150 seconds.
- **Hidden packages.** Fourteen, $100 each, marked with green blips on the minimap: the end of Pier 9, the Palma Park bench, near Rook's Chop Shop, the Deluxe Auto Lot fence, the bank side alley, Lena's Garage steps, the Warehouse 7 door, the Central Taxi Stand, under the dock crane, the Solmar General steps, the control tower base, the south hangar door, the end of the Ocean Drive pier, and the lifeguard tower.
- **Save.** Autosave on mission completion and every 30 seconds. Continue restores money, health, completed jobs and found packages. The WASTED screen's retry costs 10% of cash and restarts the active job.
- **Sound.** Engine hum rising with speed, gunshots, crashes, pickup chimes, all synthesized live. M mutes.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move on foot, drive in a car |
| Shift | Run |
| E | Enter or steal a car, interact |
| F | Punch |
| Mouse click | Shoot with the pistol out |
| 1 / 2 | Fists / pistol |
| R | Reload |
| T | Start a taxi fare |
| P | Pause |
| M | Mute |
| Mouse drag | Orbit the camera |
| Mouse wheel | Zoom |

## How to play

```sh
node serve.ts
```

Open http://localhost:8080, choose New Game or Continue, and pick the city seed with `?seed=` (default 42).

## The hand-in program

`main.ts` copies `game/` and `screenshots/` into the output directory and writes `dossier.json` with the vendored make.fun library:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Screenshots

Four staged frames taken headlessly from the real game with seed 44 (see `shots.json`):

1. `1-chase.jpg` — a three-star police chase east along the Marina Docks street.
2. `2-airport.jpg` — Rico on foot at the airport terminal with the runway behind him.
3. `3-ocean.jpg` — Rico on foot on the Ocean Drive beach at sunset, neon hotels behind him and the pier running out to the sea.
4. `4-mission.jpg` — Rico at Casino Solmar's door at four stars, the finale of The Solmar Job.
