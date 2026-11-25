// The kitchen's rules and state, with no drawing and no browser in it: the chef, the
// stations, the orders, the grill and the chopping board, the plate, serving, coins,
// combo and the shift clock. step() advances one fixed step and returns what happened
// as bit flags, so the caller can react without the world knowing about screens.
// Nothing here allocates after createWorld returns, except the short-lived floats
// list, which is capped.

import {
  CHEF, FIELD, HAND_LIMIT, HEARTS, INGREDIENTS, LAYOUT, ORDERS, PLATE_LIMIT,
  RECIPES, REACH, SERVE_BONUS, SHIFT_SECONDS,
} from './config.js';

export const EVENT_SERVE = 1;
export const EVENT_FAIL = 2;
export const EVENT_OVER = 4;

/** Every solid thing in the kitchen, as a rectangle with a kind and a label. */
function stationRects() {
  const out = [];
  for (const bin of LAYOUT.bins) out.push({ type: 'bin', kind: bin.kind, ...bin });
  out.push({ type: 'grill', ...LAYOUT.grill });
  out.push({ type: 'chopper', ...LAYOUT.chopper });
  out.push({ type: 'plating', ...LAYOUT.plating });
  out.push({ type: 'window', ...LAYOUT.window });
  return out;
}

const STATIONS = stationRects();

function rectContains(rect, x, y, pad) {
  return x >= rect.x - pad && x <= rect.x + rect.w + pad && y >= rect.y - pad && y <= rect.y + rect.h + pad;
}

function sameItems(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

export function createWorld(random) {
  const state = {
    chef: { x: 640, y: 470, face: 1 },
    moveTarget: null,
    /** null, { kind: 'items', items: [...] } or { kind: 'plate', items: [...] }. */
    hands: null,
    /** The plate resting on the plating counter, or null. */
    plate: null,
    grill: [{ item: null }, { item: null }],
    chopper: { item: null },
    orders: [],
    nextOrderIn: ORDERS.firstAt,
    orderId: 0,
    elapsed: 0,
    coins: 0,
    served: 0,
    failed: 0,
    combo: 0,
    hearts: HEARTS,
    over: false,
    overReason: '',
    floats: [],
    message: '',
    messageT: 0,
  };

  function reset() {
    state.chef.x = 640;
    state.chef.y = 470;
    state.chef.face = 1;
    state.moveTarget = null;
    state.hands = null;
    state.plate = null;
    state.grill = [{ item: null }, { item: null }];
    state.chopper = { item: null };
    state.orders = [];
    state.nextOrderIn = ORDERS.firstAt;
    state.orderId = 0;
    state.elapsed = 0;
    state.coins = 0;
    state.served = 0;
    state.failed = 0;
    state.combo = 0;
    state.hearts = HEARTS;
    state.over = false;
    state.overReason = '';
    state.floats = [];
    state.message = '';
    state.messageT = 0;
  }

  function say(text) {
    state.message = text;
    state.messageT = 2;
  }

  function float(x, y, text, color) {
    if (state.floats.length > 12) state.floats.shift();
    state.floats.push({ x, y, text, life: 1.2, color });
  }

  function progress() {
    return Math.min(1, state.elapsed / SHIFT_SECONDS);
  }

  function spawnOrder() {
    const recipe = RECIPES[Math.floor(random() * RECIPES.length)];
    const patience = ORDERS.patienceStart + (ORDERS.patienceEnd - ORDERS.patienceStart) * progress();
    state.orders.push({
      id: state.orderId++,
      recipe,
      patience,
      maxPatience: patience,
    });
  }

  /** Add an order for a fixed recipe (used by the screenshot scenes). */
  function addOrder(recipeIndex, patience) {
    const recipe = RECIPES[recipeIndex % RECIPES.length];
    state.orders.push({ id: state.orderId++, recipe, patience, maxPatience: patience });
  }

  function endShift(reason) {
    state.over = true;
    state.overReason = reason;
  }

  /** The station the chef can reach right now, or null. */
  function stationNearChef() {
    let best = null;
    let bestD = Infinity;
    for (const st of STATIONS) {
      if (!rectContains(st, state.chef.x, state.chef.y, REACH)) continue;
      const d = (st.x + st.w / 2 - state.chef.x) ** 2 + (st.y + st.h / 2 - state.chef.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = st;
      }
    }
    return best;
  }

  /** The station whose rectangle holds this point, or null. */
  function stationAtPoint(x, y) {
    for (const st of STATIONS) if (rectContains(st, x, y, 0)) return st;
    return null;
  }

  function takeFromPrep(slot, handsLabel) {
    const item = slot.item;
    if (item === null || item.t < item.total) return false;
    const cooked = INGREDIENTS[item.kind].cooked;
    if (state.hands === null) state.hands = { kind: 'items', items: [cooked] };
    else if (state.hands.kind === 'items' && state.hands.items.length < HAND_LIMIT) state.hands.items.push(cooked);
    else {
      say('Tangan penuh!');
      return false;
    }
    slot.item = null;
    return true;
  }

  function placeOnPrep(slot, prep) {
    if (state.hands === null || state.hands.kind !== 'items') return false;
    for (let i = 0; i < state.hands.items.length; i += 1) {
      const kind = state.hands.items[i];
      const ing = INGREDIENTS[kind];
      if (ing.prep === prep && slot.item === null) {
        slot.item = { kind, t: 0, total: ing.prepTime };
        state.hands.items.splice(i, 1);
        if (state.hands.items.length === 0) state.hands = null;
        return true;
      }
    }
    return false;
  }

  function useStation() {
    const st = stationNearChef();
    if (st === null) return;
    state.moveTarget = null;
    if (st.type === 'bin') {
      if (state.hands !== null && state.hands.kind === 'plate') {
        say('Tangan sedang membawa piring!');
        return;
      }
      if (state.hands !== null && state.hands.items.length >= HAND_LIMIT) {
        say('Tangan penuh!');
        return;
      }
      if (state.hands === null) state.hands = { kind: 'items', items: [st.kind] };
      else state.hands.items.push(st.kind);
      return;
    }
    if (st.type === 'grill') {
      for (const slot of state.grill) if (takeFromPrep(slot)) return;
      if (placeOnPrep(state.grill[0], 'grill') || placeOnPrep(state.grill[1], 'grill')) return;
      say('Panggangan penuh atau bukan bahan panggang!');
      return;
    }
    if (st.type === 'chopper') {
      if (takeFromPrep(state.chopper)) return;
      if (placeOnPrep(state.chopper, 'chop')) return;
      say('Talenan penuh atau bukan bahan iris!');
      return;
    }
    if (st.type === 'plating') {
      if (state.hands !== null && state.hands.kind === 'items') {
        if (state.plate === null) state.plate = { items: [] };
        while (state.hands.items.length > 0 && state.plate.items.length < PLATE_LIMIT) {
          state.plate.items.push(state.hands.items.shift());
        }
        if (state.hands.items.length === 0) state.hands = null;
        else say('Piring penuh!');
        return;
      }
      if (state.hands !== null && state.hands.kind === 'plate') {
        if (state.plate === null) {
          state.plate = { items: state.hands.items };
          state.hands = null;
        } else say('Meja sudah ada piring!');
        return;
      }
      if (state.plate !== null) {
        state.hands = { kind: 'plate', items: state.plate.items };
        state.plate = null;
      }
      return;
    }
    if (st.type === 'window') {
      if (state.hands === null || state.hands.kind !== 'plate') {
        say('Bawa piring jadi ke jendela!');
        return;
      }
      const plate = state.hands.items;
      const match = state.orders.find((o) => sameItems(o.recipe.needs, plate));
      if (match === undefined) {
        say('Tidak ada pesanan yang cocok!');
        return;
      }
      state.orders.splice(state.orders.indexOf(match), 1);
      const speedBonus = Math.round((match.patience / match.maxPatience) * SERVE_BONUS);
      const earned = match.recipe.reward + speedBonus + Math.min(state.combo, 5);
      state.coins += earned;
      state.served += 1;
      state.combo += 1;
      state.hands = null;
      float(st.x + st.w / 2, st.y - 12, `+${earned} koin`, '#f2c94c');
      return;
    }
  }

  function moveChef(dx, dy, dt) {
    const len = Math.hypot(dx, dy);
    if (len === 0) return;
    const nx = (dx / len) * CHEF.speed * dt;
    const ny = (dy / len) * CHEF.speed * dt;
    const r = CHEF.radius;
    const floor = LAYOUT.floor;
    const tryMove = (x, y) => {
      if (x < floor.x + r || x > floor.x + floor.w - r) return false;
      if (y < floor.y + r || y > floor.y + floor.h - r) return false;
      for (const st of STATIONS) {
        if (x > st.x - r && x < st.x + st.w + r && y > st.y - r && y < st.y + st.h + r) return false;
      }
      return true;
    };
    if (tryMove(state.chef.x + nx, state.chef.y)) state.chef.x += nx;
    if (tryMove(state.chef.x, state.chef.y + ny)) state.chef.y += ny;
    if (dx !== 0) state.chef.face = dx > 0 ? 1 : -1;
  }

  /**
   * One fixed step. `input` is { dir: {x, y}, use: boolean } and `harmless` is the title
   * screen's backdrop: the clock runs but nothing is served and nothing fails.
   */
  function step(dt, input, harmless) {
    let events = 0;
    // The title screen's backdrop is frozen: the shift clock only runs while playing.
    if (harmless || state.over) return events;
    state.elapsed += dt;
    if (state.messageT > 0) state.messageT -= dt;
    for (const f of state.floats) {
      f.life -= dt;
      f.y -= 24 * dt;
    }
    state.floats = state.floats.filter((f) => f.life > 0);

    // The chef walks: keys steer, a click target walks itself there.
    if (input.dir.x !== 0 || input.dir.y !== 0) {
      state.moveTarget = null;
      moveChef(input.dir.x, input.dir.y, dt);
    } else if (state.moveTarget !== null) {
      const dx = state.moveTarget.x - state.chef.x;
      const dy = state.moveTarget.y - state.chef.y;
      if (Math.hypot(dx, dy) < 8) state.moveTarget = null;
      else moveChef(dx, dy, dt);
    }
    if (input.use) useStation();

    // The grill and the board cook while the chef runs around.
    for (const slot of state.grill) {
      if (slot.item !== null && slot.item.t < slot.item.total) slot.item.t += dt;
    }
    if (state.chopper.item !== null && state.chopper.item.t < state.chopper.item.total) {
      state.chopper.item.t += dt;
    }

    // Orders arrive faster and wait less patiently as the shift goes on.
    state.nextOrderIn -= dt;
    if (state.nextOrderIn <= 0) {
      if (state.orders.length < ORDERS.maxOpen) spawnOrder();
      const interval = ORDERS.intervalStart + (ORDERS.intervalEnd - ORDERS.intervalStart) * progress();
      state.nextOrderIn += interval;
    }
    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders.splice(i, 1);
        state.failed += 1;
        state.combo = 0;
        state.hearts -= 1;
        say('Pesanan hangus!');
        events |= EVENT_FAIL;
        if (state.hearts <= 0) {
          endShift('hearts');
          events |= EVENT_OVER;
          return events;
        }
      }
    }
    if (state.elapsed >= SHIFT_SECONDS) {
      endShift('time');
      events |= EVENT_OVER;
    }
    return events;
  }

  reset();
  return { state, reset, step, useStation, stationNearChef, stationAtPoint, addOrder };
}
