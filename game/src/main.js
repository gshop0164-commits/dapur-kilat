// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over.
// A click walks the chef to the spot, or uses a station the chef can already reach
// (and walks there first when it cannot).
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_FAIL, EVENT_OVER, EVENT_SERVE } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_USE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  /** A station the chef is walking to use, once it is within reach. */
  let pendingStation = null;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    pendingStation = null;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Bermain. Sajikan pesanan sebelum waktunya habis.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    announce(`Shift selesai. Koin ${world.state.coins}. Terbaik ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Bermain.');
    } else if (actions & ACTION_USE && screen === SCREEN_PLAY) {
      pendingStation = null;
      world.useStation();
    }
  }

  function handleClick() {
    const click = input.takeClick();
    if (click === null) return;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const point = renderer.toLogical(click.x, click.y);
    const station = world.stationAtPoint(point.x, point.y);
    if (station !== null) {
      pendingStation = null;
      if (world.stationNearChef() === station) world.useStation();
      else {
        pendingStation = station;
        world.state.moveTarget = { x: station.x + station.w / 2, y: station.y + station.h / 2 };
      }
      return;
    }
    pendingStation = null;
    world.state.moveTarget = point;
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dir: { x: 0, y: 0 }, use: false }, true);
      return;
    }
    const events = world.step(STEP, { dir: input.direction(), use: false }, false);
    if (pendingStation !== null && world.stationNearChef() === pendingStation) {
      pendingStation = null;
      world.useStation();
    }
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_SERVE) announce(`Pesanan disajikan! Koin ${world.state.coins}.`);
    else if (events & EVENT_FAIL) announce('Pesanan hangus!');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClick();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, screen === SCREEN_PLAY ? world.stationNearChef() : null);
  }

  // Leaving the tab pauses a running game rather than letting orders burn unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  announce('Dapur Kilat. Tekan Spasi atau klik untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
