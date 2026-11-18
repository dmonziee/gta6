[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/dmonziee/gta6/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/dmonziee/gta6/reward.svg)](https://make.fun/bounty/gta6-01)

# Solmar Bay — an open-world crime story

An original 3D open-world crime game built for the [gta6-01 bounty on make.fun](https://make.fun/bounty/gta6-01). No Rockstar or GTA names, characters, art or music — everything here is invented: the city of Solmar Bay, the wheelman Rico Marín, and the fixer Lena Cruz.

## Play it

Serve `game/` with any static server and open `index.html` in desktop Chrome (no network needed — every file is local):

```sh
node serve.ts   # then open http://localhost:8080
```

## The game

- **A living city**: a seeded procedural grid city with ~120 buildings, the Marlin Tower landmark, a beach, a bay and a pier, palms and street lamps, traffic and pedestrians.
- **On foot and by car**: third-person movement with a mouse-drag camera, arcade driving, and any parked or traffic car can be stolen (E) — stealing one earns a wanted star.
- **Wanted level and police**: 0–5 stars; police cars chase and ram, officers on foot run you down at 2+ stars, and the heat fades if you stay clean.
- **Missions and a story**: three jobs for Lena Cruz — a package errand ($500), a getaway in a stolen Coral Coupe ($900), and taking a briefcase back from three armed Vultures ($1,500). Progress saves to localStorage.
- **Combat**: fists (F) and a pistol (click, 12-round mag, ammo drops), with goons who shoot back.
- **HUD**: health, cash, wanted stars, clock, mission objective, speedometer and a live circular minimap.
- **Sound**: fully synthesised WebAudio — engine hum, two-tone siren, gunshots, punches and cash blips. No audio files.

## Controls

WASD move / drive · Shift run · mouse drag camera · E enter or steal a car · F punch · mouse click shoot · 1 fists / 2 pistol · R reload · P pause · M mute

## Layout

- `game/index.html` — canvas, HUD and menus
- `game/src/rng.js` — seeded random numbers
- `game/src/city.js` — the procedural city, collision and landmarks
- `game/src/vehicles.js` — car factory, driving physics, traffic
- `game/src/pedestrians.js` — sidewalk walkers who flee danger
- `game/src/police.js` — wanted level, police cars and officers
- `game/src/missions.js` — Lena's three jobs, the gold marker, saves
- `game/src/combat.js` — fists, pistol, goons, ammo drops
- `game/src/audio.js` — synthesised WebAudio sound
- `game/src/hud.js` — HUD and live minimap
- `game/src/shots.js` — `?shot=` staging for the screenshots
- `game/src/main.js` — game state, input, camera and the main loop
- `game/vendor/three.min.js` — vendored three.js 0.149.0
- `main.ts` — hands the game and screenshots in (Node 22, stdlib only)
- `screenshots/` — four real renders of the game in Chrome
