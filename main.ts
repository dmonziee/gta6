// main.ts — the hand-in program: copies game/ and screenshots/ out and writes dossier.json.
// The scorer caps below are the ones the bounty enforces: at most 4 screenshots,
// each at most 256 KiB, at most 993 files in game/ and 48 MiB of game files in all,
// any game path at most 1000 bytes, and the dossier text capped at 160 KiB.
// Only text_max_bytes shapes the bytes; the other caps refuse an entry the scorer
// would refuse. game/ counts beside the output directory's own 1000-entry cap,
// its screenshots/ and dossier.json.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
