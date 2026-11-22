# Solmar Bay — an open-world crime story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/dmonziee/gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/dmonziee/gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

You are Rico Marín, a wheelman who owes Lena Cruz one last favour. Steal cars, shake the Solmar Bay police off your tail, and run her four jobs — or the debt runs you.

## Play

Start the server and open the game in desktop Chrome:

```sh
node serve.ts
# then open http://localhost:8080
```

There is no build step and no network needed. The game is plain static files under `game/`, and three.js 0.149.0 is vendored at `game/vendor/three.min.js`. Every sound is synthesized live with WebAudio — there are no audio files at all.

## Controls

| Input | What it does |
| --- | --- |
| WASD / arrows | Move on foot, drive when you are in a car |
| Shift | Run |
| Mouse drag | Orbit the camera · wheel zooms in and out |
| E | Enter or steal a car, get out of a car, interact with a job |
| F | Punch |
| Mouse click (hold) | Fire the pistol |
| 1 / 2 | Fists / pistol |
| R | Reload |
| T | Start a taxi fare |
| P | Pause (the game autosaves) |
| M | Mute |

## The city

Solmar Bay is a grid city on a bay at golden hour. Downtown's towers rise in the centre, Old Town's warm low blocks sit nearby, Northside stretches out to the north, and the Marina fills the south-east — docks, moored boats, shipping containers, cranes, and Harbor Warehouse 7. Traffic flows along the streets and pedestrians stroll the sidewalks, scattering when shots ring out. Every crime draws the police, and they answer with a wanted level from 0 to 5 stars.

## Lena's jobs

1. **The Package** — $500. Pick up a package at the Marina Docks and bring it to Lena's Garage.
2. **Hot Wheels** — $900. Steal the Comet GT from the Deluxe Auto Lot and deliver it to Rook's Chop Shop.
3. **The Vault Job** — $1,500. Crack the vault at Solmar Bay Bank, grab the cash, and escape while carrying a 3-star wanted level.
4. **Harbor Heist** — $2,200. A rival crew's boat shipment is sitting on Pier 9. Take their crate from under their guards' noses and deliver it to Harbor Warehouse 7. Then the debt is done.

## Side activities

Press **T** anywhere and a taxi fare will come up ($40–$120). While you are out, keep an eye out for the ten **hidden packages** stashed around the city — each one is worth $100. Progress, money, and completed jobs save automatically, and **Continue** on the title screen picks up right where you left off.

## Screenshots

The four screenshots in `screenshots/` are real renders produced by the game's own code, staged deterministically with `?shot=<scene>&seed=N` (see `shots.json`): a police chase, driving at speed, the marina on foot, and the harbor heist.

## Handing in

`main.ts` copies `game/` and `screenshots/` to `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` using the vendored make.fun library. The payout wallet is the dedicated make.fun wallet.
