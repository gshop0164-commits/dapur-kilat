// Dapur Kilat — a warung cooking game for the make.fun cooking-game bounty
// (Node 22, standard library only). The game is this directory's game/
// folder: plain static files a desktop browser loads offline (game/index.html
// and its ES modules — config, random, input, world, render, shots, main —
// no library, no network request). This entrypoint copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library. Before it
// hands anything in, it checks its own work: the game entry page must be
// there, and there must be 3 or 4 screenshots, each at most 256 KiB, the
// first by name being the cover. If a check fails it says so and stops
// instead of handing in a broken entry.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SHOT_BYTES = 262144;

// The kitchen is not submittable without its door: game/index.html must exist,
// and the screenshots must be 3 or 4 real renders, none over the cap.
function checkEntry() {
  const index = join(here, 'game', 'index.html');
  if (!existsSync(index)) throw new Error(`missing game entry page: ${index}`);
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(shotsDir)) throw new Error(`missing screenshots folder: ${shotsDir}`);
  const shots = readdirSync(shotsDir)
    .filter((name) => /\.(png|jpe?g)$/i.test(name))
    .sort();
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`need 3 or 4 screenshots, found ${shots.length}: ${shots.join(', ')}`);
  }
  for (const name of shots) {
    const bytes = statSync(join(shotsDir, name)).size;
    if (bytes > MAX_SHOT_BYTES) {
      throw new Error(`screenshot over the 256 KiB cap: ${name} is ${bytes} bytes`);
    }
  }
  return shots;
}

const shots = checkEntry();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// Say what was handed in, so a human reading the log can see it at a glance.
console.log(`dapur-kilat: game/ copied, ${shots.length} screenshots (${shots.join(', ')}), dossier.json ${dossier.length} bytes`);
