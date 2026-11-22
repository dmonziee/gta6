# Solmar Bay — an open-world crime story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/dmonziee/gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/dmonziee/gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

You are **Rico Marín**, a wheelman who owes **Lena Cruz** one last favour. Steal cars,
lose the Solmar Bay police, and run her four jobs — or the debt runs you.

## Play

Serve the game and open it in desktop Chrome:

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no network: the game is plain static files under `game/`
(three.js 0.149.0 is vendored at `game/vendor/three.min.js`). All sound is
synthesized with WebAudio — there are no audio files.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive in a car |
| Shift | Run |
| Mouse drag | Orbit the camera · wheel zooms |
| E | Enter / steal a car, exit a car, interact with a job |
| F | Punch |
| Mouse click (hold) | Shoot the pistol |
| 1 / 2 | Fists / pistol |
| R | Reload |
| T | Start a taxi fare |
| P | Pause (autosaves) · M mute |

## The city

Solmar Bay is a grid city on a bay at golden hour: Downtown's towers, Old
Town's warm low blocks, Northside, and the Marina in the south-east — docks,
moored boats, shipping containers, cranes and Harbor Warehouse 7. Traffic
flows the streets, pedestrians stroll the sidewalks (and scatter when shots
ring out), and the police answer every crime with a wanted level of 0–5 stars.

## Lena's jobs

1. **The Package** — $500. Pick up a package at the Marina Docks and bring it
   to Lena's Garage.
2. **Hot Wheels** — $900. Steal the Comet GT from the Deluxe Auto Lot and
   deliver it to Rook's Chop Shop.
3. **The Vault Job** — $1,500. Crack the vault at Solmar Bay Bank, grab the
   cash, and escape a 3-star wanted level.
4. **Harbor Heist** — $2,200. A rival crew's boat shipment is sitting on Pier 9.
   Take their crate from under their guards' noses and deliver it to Harbor
   Warehouse 7. The debt is done.

Press **T** anywhere for a taxi fare ($40–$120), and keep an eye out for the
ten **hidden packages** stashed around the city ($100 each). Progress,
money and completed jobs save automatically and with **Continue** on the
title screen.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own
code, staged deterministically with `?shot=<scene>&seed=N` (see `shots.json`):
a police chase, driving at speed, the marina on foot, and the harbor heist.

## Handing in

`main.ts` copies `game/` and `screenshots/` to `/output` (or
`$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with the vendored
make.fun library. The payout wallet is the dedicated make.fun wallet.
