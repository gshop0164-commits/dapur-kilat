// The screenshot scenes behind ?shot=start|play|serve|end. Each one stages a real,
// reachable kitchen state — orders from the recipe list, a plate holding exactly
// what a recipe asks for, the grill and the board mid-prep — and the renderer paints
// it, so the frame is what a short game really looks like, and the same seed always
// gives the same frame.
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Put the world into a mid-shift state the play scene needs, then tweak per scene. */
function midShift(world, elapsed, coins, combo) {
  const s = world.state;
  world.reset();
  s.elapsed = elapsed;
  s.coins = coins;
  s.combo = combo;
  s.hearts = 3;
  return s;
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    const s = midShift(world, 72, 42, 2);
    world.addOrder(0, 26); // Burger Kilat, half its patience left
    world.addOrder(3, 38); // Nasi Ayam
    world.addOrder(5, 18); // Salad Segar, running short
    s.chef.x = 900;
    s.chef.y = 330;
    s.chef.face = 1;
    s.hands = { kind: 'items', items: ['bun', 'lettuce+'] };
    s.grill[0].item = { kind: 'patty', t: 2.5, total: 4 };
    s.grill[1].item = { kind: 'chicken', t: 5, total: 5 };
    s.chopper.item = { kind: 'tomato', t: 1.4, total: 2.5 };
    s.plate = { items: ['bun', 'patty+'] };
    return { screen: SCREEN_PLAY, best: 42 };
  }
  if (name === 'serve') {
    const s = midShift(world, 96, 58, 3);
    world.addOrder(0, 20); // Burger Kilat: bun, daging panggang, selada iris
    world.addOrder(1, 34); // Burger Keju
    s.chef.x = 1020;
    s.chef.y = 510;
    s.chef.face = 1;
    s.hands = { kind: 'plate', items: ['bun', 'patty+', 'lettuce+'] };
    s.grill[0].item = { kind: 'chicken', t: 3, total: 5 };
    s.chopper.item = { kind: 'lettuce', t: 2.5, total: 2.5 };
    return { screen: SCREEN_PLAY, best: 58 };
  }
  if (name === 'end') {
    const s = midShift(world, 150, 96, 0);
    s.served = 7;
    s.failed = 1;
    s.hearts = 1;
    s.over = true;
    s.overReason = 'time';
    return { screen: SCREEN_OVER, best: 96 };
  }
  // start: the title screen over a kitchen that is already taking orders.
  const s = midShift(world, 4, 0, 0);
  world.addOrder(0, 48);
  world.addOrder(2, 44);
  s.chef.x = 640;
  s.chef.y = 470;
  return { screen: SCREEN_TITLE, best: 0 };
}
