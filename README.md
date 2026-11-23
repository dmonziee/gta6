# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/dmonziee/gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/dmonziee/gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime story in the browser. You are Rico Marin, a wheelman who
owes Lena Cruz one last favour. Solmar Bay is a sun-soaked city on the water —
downtown towers, old-town streets, a working marina, and the glittering new
Casino Row — and five jobs stand between Rico and a clean slate.

The game runs entirely offline: plain static files, three.js vendored under
`game/vendor/`, all sounds synthesized live with WebAudio. There is no build
step and no network.

## The five jobs

Lena calls with the next job a few seconds after the last one pays out. Each
job shows its current step in the objective bar, with a pulsing yellow
diamond marking the target on the map and the minimap.

1. **The Package — $500.** Pick up the package at the Marina Docks and bring
   it to Lena's Garage. No cops, no questions.
2. **Hot Wheels — $900.** A Comet GT sits in the Deluxe Auto Lot, keys in
   it, owner nowhere. Take it to Rook at the chop shop — and try not to bring
   the whole police force. Stealing it raises one star of heat.
3. **The Vault Job — $1,500.** Crack the bank's side vault door, grab the
   bag, and get out before the whole city is looking. Three stars, and two
   rival guards at the bank.
4. **Harbor Heist — $2,200.** A rival crew's boat shipment just landed on
   Pier 9. One crate, full of cash, guarded by their boys. Take it to
   Harbor Warehouse 7. Grabbing the crate raises one star, spawns two guards
   at the pier end — and a fresh Getaway Comet waits at the docks, because
   the escape runs hot.
5. **The Solmar Job — $3,500.** The finale. Lift the vault keycard off the
   casino door guard, crack the vault house on Casino Row in a five-second
   timed hold, and bring the money home in the getaway Comet. The crack
   raises the heat to four stars. Tonight the debt ends.

Rival guards remember where they spawned: they only chase and shoot while
you are within 45 units of their post, so breaking away down a long pier
actually gets you clear. Completing a job pays out, plays Lena's closing
line, and autosaves.

## The city

Solmar Bay is a seeded street grid — the same seed always builds the same
city — with six districts: Downtown's tall towers, Old Town's low streets,
Northside, the East End, the Marina, and Casino Row. Named places include
Lena's Garage, the Marina Docks and Pier 9, Solmar Bay Bank, the Deluxe Auto
Lot, Rook's Chop Shop, Harbor Warehouse 7, Solmar General hospital, Palma
Park, and the Central Taxi Stand.

**Casino Row** is the glittering south strip where the finale happens:
Casino Solmar with its gold front and neon, El Dorado in teal and purple,
the crimson Royale, the vault house with its gold dome across the street,
the Hotel Marbella, a valet lot, a fountain, and the gateway arch over the
street. The neon breathes — every sign's glow wobbles slowly, so the strip
feels lit rather than painted.

**The Marina** is the south-east waterfront: open water that shimmers, two
wooden piers reaching into the basin, six bobbing boats, stacked shipping
containers, two dock cranes, and Harbor Warehouse 7.

## Life around the jobs

- **Wanted, 0–5 stars.** Crimes raise the heat; staying quiet and out of
  sight cools it. Cops chase in cruisers, ram your car, and will bust you on
  foot if they stay close — a bust costs 15% of your cash and sends you back
  to Lena's Garage.
- **Traffic and pedestrians.** Traffic cars cruise the grid and get shoved
  aside in a head-on, so a narrow street never deadlocks. Pedestrians walk
  the sidewalks and scatter when trouble starts.
- **Combat.** Fists do 12 damage up close; the pistol does 26 at range with
  12 rounds and an R reload. Guards and rival crews shoot back. A cop car
  rammed hard takes 30 damage.
- **Driving.** Every car kind has its own top speed and handling, cars slide
  along walls instead of sticking, and hard steering cannot hold top speed —
  so the turn radius stays tight enough to make a 90-degree street corner.
  Climbing back into a parked car rebuilds it at full health.
- **Taxi fares.** Press T: a passenger waits on a street corner nearby, you
  pick them up and drive them to their destination before the meter runs
  out. Fares pay $40–$120.
- **Hidden packages.** Ten are stashed around the city — the end of Pier 9,
  the Palma Park bench, the chop shop, the auto lot fence, the bank alley,
  the garage steps, the Warehouse 7 door, the taxi stand, the dock crane,
  and the hospital steps — each worth $100, marked with green blips.
- **Save.** Progress autosaves on mission completion and at milestones. The
  title screen's Continue restores money, health, completed jobs, and found
  packages. Dying shows a WASTED screen; retrying costs 10% of your money
  and restarts the active job.
- **Sound.** Engine hum that rises with speed, gunshots, crashes, and pickup
  chimes — all synthesized live. M mutes.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move and drive |
| Shift | Run |
| E | Enter or steal a car / interact |
| F | Punch |
| Mouse click | Shoot (pistol out) |
| 1 / 2 | Fists / pistol |
| R | Reload |
| T | Start a taxi fare |
| P | Pause |
| M | Mute |
| Mouse drag | Orbit the camera |
| Mouse wheel | Zoom |

## How to play

Run the server script and open the game in a desktop browser:

```
node serve.ts
```

Then open http://localhost:8080. Pick **New Game** to start Rico's story, or
**Continue** to pick up where you left off. A `?seed=` query parameter picks
the city seed (the default is 42).

## The hand-in program

`main.ts` (Node 22, standard library only) hands the game in: it copies
`game/` and `screenshots/` into the output directory (or the directory named
by `MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with the vendored
make.fun library:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Screenshots

Four staged frames, taken headlessly from the real game with seed 44 (see
`shots.json`):

1. `1-chase.jpg` — a police chase at three stars on the Marina Docks street.
2. `2-drive.jpg` — a red sports car driving through the city.
3. `3-marina.jpg` — Rico on foot at the end of Pier 9.
4. `4-mission.jpg` — the finale: Rico at Casino Solmar's door, four stars.
