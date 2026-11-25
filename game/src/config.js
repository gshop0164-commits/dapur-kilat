// Dapur Kilat — every tuning number, ingredient, recipe and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift lasts this long; three failed orders end it early. */
export const SHIFT_SECONDS = 150;
export const HEARTS = 3;

export const CHEF = { radius: 18, speed: 285 };

/** Hands hold at most this many loose ingredients; a plate holds at most this many. */
export const HAND_LIMIT = 3;
export const PLATE_LIMIT = 4;

/**
 * Ingredients. `prep` is what the raw item needs before it can go on a plate:
 * none (ready from the bin), grill (seconds on the grill) or chop (seconds on the board).
 * `cooked` is the form it takes after prep, the form recipes ask for.
 */
export const INGREDIENTS = {
  bun:     { name: 'Roti',    short: 'Roti',   color: '#e8b06a', prep: 'none',  prepTime: 0,   cooked: 'bun' },
  patty:   { name: 'Daging',  short: 'Daging', color: '#a65a3a', prep: 'grill', prepTime: 4,   cooked: 'patty+' },
  chicken: { name: 'Ayam',    short: 'Ayam',   color: '#e08a7a', prep: 'grill', prepTime: 5,   cooked: 'chicken+' },
  lettuce: { name: 'Selada',  short: 'Selada', color: '#7dc95e', prep: 'chop',  prepTime: 2.5, cooked: 'lettuce+' },
  tomato:  { name: 'Tomat',   short: 'Tomat',  color: '#e5534b', prep: 'chop',  prepTime: 2.5, cooked: 'tomato+' },
  cheese:  { name: 'Keju',    short: 'Keju',   color: '#f2c94c', prep: 'none',  prepTime: 0,   cooked: 'cheese' },
  rice:    { name: 'Nasi',    short: 'Nasi',   color: '#f5f0e1', prep: 'none',  prepTime: 0,   cooked: 'rice' },
  noodle:  { name: 'Mie',     short: 'Mie',    color: '#f0d060', prep: 'none',  prepTime: 0,   cooked: 'noodle' },
  'patty+':   { name: 'Daging Panggang', short: 'Dg.Panggang', color: '#7a3f26', prep: 'done', prepTime: 0, cooked: 'patty+' },
  'chicken+': { name: 'Ayam Panggang',   short: 'Ay.Panggang', color: '#c96a3a', prep: 'done', prepTime: 0, cooked: 'chicken+' },
  'lettuce+': { name: 'Selada Iris',     short: 'Selada Iris', color: '#9be07a', prep: 'done', prepTime: 0, cooked: 'lettuce+' },
  'tomato+':  { name: 'Tomat Iris',      short: 'Tomat Iris',  color: '#f0705f', prep: 'done', prepTime: 0, cooked: 'tomato+' },
};

/** Recipes: the dish, the cooked ingredients it needs, and its base coin reward. */
export const RECIPES = [
  { name: 'Burger Kilat', needs: ['bun', 'patty+', 'lettuce+'], reward: 14 },
  { name: 'Burger Keju',  needs: ['bun', 'patty+', 'cheese', 'tomato+'], reward: 18 },
  { name: 'Burger Ayam',  needs: ['bun', 'chicken+', 'lettuce+', 'cheese'], reward: 18 },
  { name: 'Nasi Ayam',    needs: ['rice', 'chicken+', 'tomato+'], reward: 14 },
  { name: 'Mie Ayam',     needs: ['noodle', 'chicken+', 'lettuce+'], reward: 14 },
  { name: 'Salad Segar',  needs: ['lettuce+', 'tomato+', 'cheese'], reward: 12 },
];

/**
 * The kitchen floor plan. The top 168 px are the HUD and the order board; the rest is
 * the kitchen. Bins line the left wall, the grill sits top right, the chopping board in
 * the middle, the plating counter along the bottom and the serving window on the right:
 * every dish is a route through the room, and the route is the game.
 */
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 56 },
  orderBoard: { x: 0, y: 56, w: 1280, h: 112 },
  floor: { x: 0, y: 168, w: 1280, h: 552 },
  bins: [
    { kind: 'bun',     x: 24,  y: 196, w: 100, h: 100 },
    { kind: 'patty',   x: 132, y: 196, w: 100, h: 100 },
    { kind: 'chicken', x: 24,  y: 304, w: 100, h: 100 },
    { kind: 'rice',    x: 132, y: 304, w: 100, h: 100 },
    { kind: 'noodle',  x: 24,  y: 412, w: 100, h: 100 },
    { kind: 'lettuce', x: 132, y: 412, w: 100, h: 100 },
    { kind: 'tomato',  x: 24,  y: 520, w: 100, h: 100 },
    { kind: 'cheese',  x: 132, y: 520, w: 100, h: 100 },
  ],
  grill: { x: 952, y: 196, w: 304, h: 100, slots: 2 },
  chopper: { x: 560, y: 300, w: 208, h: 100 },
  plating: { x: 464, y: 584, w: 352, h: 100 },
  window: { x: 1056, y: 420, w: 200, h: 180 },
};

/** How close the chef must be to a station to use it, in pixels past its edge. */
export const REACH = 30;

/** Orders: how often a new one arrives and how long it waits, easing in with the shift. */
export const ORDERS = {
  maxOpen: 4,
  firstAt: 2,
  intervalStart: 14,
  intervalEnd: 7,
  patienceStart: 52,
  patienceEnd: 30,
};

/** Coins: a served dish pays its reward, plus up to this much for serving it fast, plus the combo. */
export const SERVE_BONUS = 6;

export const PALETTE = {
  backdrop: '#171310',
  wall: '#3a2a1e',
  floorA: '#8a6a4a',
  floorB: '#7d5f42',
  topBar: '#241a12',
  board: '#2e2115',
  boardEdge: '#4a3421',
  text: '#fdf6e9',
  muted: '#c9b18c',
  coin: '#f2c94c',
  danger: '#e5534b',
  ok: '#7dc95e',
  panel: '#2a1d12',
  panelEdge: '#5a4128',
  chef: '#f5f0e1',
  chefHat: '#ffffff',
  apron: '#3f7d5a',
  grill: '#3a3a40',
  grillHot: '#c96a3a',
  chopper: '#b98a56',
  plate: '#f5f0e1',
  window: '#8a2f2a',
  awning: '#e5534b',
  awningAlt: '#fdf6e9',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'dapur-kilat.best';
