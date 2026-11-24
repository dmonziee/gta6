[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/dmonziee/gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/dmonziee/gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay — an open-world crime story

Rico Marin owes Lena Cruz one last favour, and the debt comes due in Solmar Bay — a sun-soaked city on the water with downtown towers, old-town streets, a working marina, Casino Row and a busy little airport. Six jobs stand between Rico and a clean slate, ending in a 3,500 dollar casino vault crack and a 4,500 dollar airport airlift.

The game runs entirely offline with plain static files, three.js vendored under `game/vendor`, all sounds synthesized live with WebAudio, no build step and no network.

## The six jobs

1. **The Package — $500.** Pick up the package at the Marina Docks and bring it to Lena's Garage. No cops, no questions.
2. **Hot Wheels — $900.** Steal the Comet GT from the Deluxe Auto Lot and deliver it to Rook at the chop shop.
3. **The Vault Job — $1,500.** Crack the bank's side vault door, grab the bag, and escape to Lena's Garage.
4. **Harbor Heist — $2,200.** Lift a rival crew's crate off Pier 9, guarded by their boys, and carry it to Warehouse 7.
5. **The Solmar Job — $3,500.** Lift the vault keycard off the casino door guard, crack the casino vault at four stars, and bring the take home. Tonight the debt ends.
6. **The Airlift — $4,500.** A cargo plane just landed at Solmar Airport with a hold full of cash. Lift the manifest from the terminal desk, crack the hold, and bring the cargo home before the tower calls it in.

Guards only chase and shoot within 45 units of their post — break the leash and they hold their ground. Completing a job pays out, plays Lena's closing line and autosaves.

## The city

A seeded street grid — eleven streets each way, 46 units apart — with seven districts: Downtown, Old Town, Northside, East End, Marina, Airport and Casino Row. Named places include Lena's Garage, the Marina Docks, Pier 9, Solmar Bay Bank, the Deluxe Auto Lot, Rook's Chop Shop, Harbor Warehouse 7, Solmar General hospital, Palma Park, the Central Taxi Stand and Solmar Airport.

**Casino Row** holds Casino Solmar, El Dorado and The Royale, the gold-domed vault house, Hotel Marbella, a valet lot, a fountain and a gateway arch, with neon signs that breathe.

**The Marina** holds open water, two piers, six bobbing boats, stacked containers, two dock cranes and Warehouse 7.

**Solmar Airport** holds a 170-unit runway with centre dashes and edge lights, a glass-fronted terminal, two hangars, a control tower and a windsock, on the eastern strip between the street grid and the Marina.

## Life around the jobs

- **Wanted, 0–5 stars.** Missions raise the heat; quiet time cools it. Getting busted costs 15% of your cash and sends Rico back to Lena's Garage.
- **Traffic and pedestrians.** Fourteen cars cruise the grid and slow behind you; twenty-four walkers stroll the sidewalks and scatter when trouble starts.
- **Combat.** Fists deal 12 damage, the pistol 26 damage with 12 rounds and R to reload. Guards shoot back for 8 damage a hit. A cop car rammed hard takes 30 damage.
- **Driving.** Each car kind has its own top speed and handling; cars slide along walls, hard steering limits top speed, and re-entering a parked car rebuilds it at full health.
- **Taxi fares (T).** Pick up a passenger and deliver them before the meter runs out — $40 to $120 a fare.
- **Hidden packages.** Twelve green boxes stashed around the city, $100 each: the end of Pier 9, the Palma Park bench, near Rook's Chop Shop, the Deluxe Auto Lot fence, the bank side alley, Lena's Garage steps, the Warehouse 7 door, the Central Taxi Stand, under the dock crane, the Solmar General steps, the control tower base and the south hangar door.
- **Save.** Autosave on mission completion and every 30 seconds. Continue restores money, health, completed jobs and found packages. The WASTED screen retries for 10% of your cash and restarts the active job.
- **Sound.** Engine hum rising with speed, gunshots, crashes, pickup chimes and a two-tone alarm — all synthesized live. M mutes.

## Controls

| Key | Action |
| --- | --- |
| W A S D / Arrows | Move on foot, drive in a car |
| Shift | Run |
| E | Enter / steal a car, exit a car, interact |
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

Then open <http://localhost:8080>. Choose New Game or Continue. Pick a city seed with `?seed=` (default 42).

## The hand-in program

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` into the output directory and writes `dossier.json` with the vendored make.fun library.

## Screenshots

Four staged frames taken headlessly from the real game with seed 44 (see `shots.json`):

1. **1-chase.jpg** — a three-star chase down the Marina Docks street, cruisers closing in behind Rico's sedan.
2. **2-airport.jpg** — Rico on foot at the airport terminal with the runway behind him.
3. **3-marina.jpg** — Rico standing at the end of Pier 9, boats bobbing beside him.
4. **4-mission.jpg** — Rico at Casino Solmar's door at four stars, the finale about to begin.

Made for the [gta6-01 bounty](https://make.fun/bounty/gta6-01) on make.fun — enter with https://make.fun/r/fret8z8g.
