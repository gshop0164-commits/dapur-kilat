// Drawing only: the kitchen's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled with
// the backdrop colour. Flat shapes and canvas text: food drawn so it looks worth
// serving, counters readable at a glance. Text that holds a number is rebuilt only
// when the number changes, so a frame allocates nothing.
import { CHEF, FIELD, FONT, HEARTS, INGREDIENTS, LAYOUT, PALETTE, SHIFT_SECONDS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 640, top: 140, line: 34, bottom: 76 };
const TILE = 64;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const coinsLabel = cachedLabel('Koin ');
  const comboLabel = cachedLabel('Kombo x');
  const timeLabel = cachedLabel('');
  const finalLabel = cachedLabel('Koin ');
  const bestLabel = cachedLabel('Terbaik ');
  const servedLabel = cachedLabel('Pesanan disajikan: ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  /** A food icon, drawn from shapes: the base kind decides the picture, cooked ones get a check. */
  function drawIngredient(kind, cx, cy, size) {
    const base = kind.replace(/\+$/, '');
    const ing = INGREDIENTS[kind];
    const s = size / 2;
    context.fillStyle = ing.color;
    context.strokeStyle = 'rgba(0,0,0,0.35)';
    context.lineWidth = 2;
    if (base === 'bun') {
      roundRect(context, cx - s, cy - s * 0.55, size, size * 0.55, 8);
      context.fill();
      context.stroke();
      roundRect(context, cx - s, cy + s * 0.1, size, size * 0.4, 6);
      context.fill();
    } else if (base === 'patty') {
      roundRect(context, cx - s, cy - s * 0.45, size, size * 0.9, 8);
      context.fill();
      context.stroke();
    } else if (base === 'chicken') {
      context.beginPath();
      context.arc(cx, cy, s * 0.85, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = '#f5f0e1';
      context.fillRect(cx + s * 0.4, cy - s * 0.5, s * 0.7, s * 0.22);
    } else if (base === 'lettuce') {
      for (const off of [-0.45, 0, 0.45]) {
        context.beginPath();
        context.arc(cx + off * size, cy, s * 0.55, 0, Math.PI * 2);
        context.fill();
      }
    } else if (base === 'tomato') {
      context.beginPath();
      context.arc(cx, cy, s * 0.85, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = '#3f7d5a';
      context.beginPath();
      context.arc(cx, cy - s * 0.7, s * 0.3, 0, Math.PI * 2);
      context.fill();
    } else if (base === 'cheese') {
      context.beginPath();
      context.moveTo(cx - s, cy + s * 0.7);
      context.lineTo(cx + s, cy + s * 0.7);
      context.lineTo(cx, cy - s * 0.8);
      context.closePath();
      context.fill();
      context.stroke();
    } else if (base === 'rice') {
      context.beginPath();
      context.arc(cx, cy + s * 0.4, s * 0.85, Math.PI, 0);
      context.fill();
      context.stroke();
    } else {
      // noodle: a squiggle of three arcs.
      context.strokeStyle = ing.color;
      context.lineWidth = 5;
      context.beginPath();
      for (let i = 0; i < 3; i += 1) {
        const y = cy - s * 0.5 + i * s * 0.55;
        context.moveTo(cx - s, y);
        context.quadraticCurveTo(cx - s * 0.3, y - s * 0.4, cx, y);
        context.quadraticCurveTo(cx + s * 0.3, y + s * 0.4, cx + s, y);
      }
      context.stroke();
      context.strokeStyle = 'rgba(0,0,0,0.35)';
      context.lineWidth = 2;
    }
    if (kind.endsWith('+')) {
      context.fillStyle = '#ffffff';
      context.font = `bold ${Math.round(size * 0.7)}px ${FONT}`;
      context.textAlign = 'center';
      context.fillText('✓', cx, cy + size * 0.32);
    }
  }

  function drawPlate(items, cx, cy, size) {
    context.fillStyle = PALETTE.plate;
    context.beginPath();
    context.ellipse(cx, cy, size, size * 0.62, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(0,0,0,0.3)';
    context.lineWidth = 2;
    context.stroke();
    const n = items.length;
    for (let i = 0; i < n; i += 1) {
      const a = -Math.PI / 2 + (i / Math.max(n, 1)) * Math.PI * 2;
      drawIngredient(items[i], cx + Math.cos(a) * size * 0.42, cy + Math.sin(a) * size * 0.26, size * 0.42);
    }
  }

  function drawProgressBar(x, y, w, h, frac, color) {
    context.fillStyle = 'rgba(0,0,0,0.5)';
    context.fillRect(x, y, w, h);
    context.fillStyle = color;
    context.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  }

  function drawFloor() {
    const floor = LAYOUT.floor;
    for (let ty = 0; ty < floor.h / TILE; ty += 1) {
      for (let tx = 0; tx < floor.w / TILE; tx += 1) {
        context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        context.fillRect(floor.x + tx * TILE, floor.y + ty * TILE, TILE, TILE);
      }
    }
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, LAYOUT.orderBoard.y + LAYOUT.orderBoard.h, FIELD.width, 6);
  }

  function drawStations(state, near) {
    // Ingredient bins along the left wall.
    context.textBaseline = 'alphabetic';
    for (const bin of LAYOUT.bins) {
      const ing = INGREDIENTS[bin.kind];
      const hot = near === bin;
      context.fillStyle = hot ? '#5a4128' : '#3a2a1e';
      roundRect(context, bin.x, bin.y, bin.w, bin.h, 10);
      context.fill();
      context.strokeStyle = hot ? PALETTE.coin : PALETTE.panelEdge;
      context.lineWidth = hot ? 3 : 2;
      context.stroke();
      drawIngredient(bin.kind, bin.x + bin.w / 2, bin.y + 38, 44);
      text(ing.name, bin.x + bin.w / 2, bin.y + bin.h - 12, 17, PALETTE.text, 'center');
    }
    // The grill, top right: two slots that cook raw meat.
    const grill = LAYOUT.grill;
    context.fillStyle = PALETTE.grill;
    roundRect(context, grill.x, grill.y, grill.w, grill.h, 10);
    context.fill();
    context.strokeStyle = near === grill ? PALETTE.coin : PALETTE.panelEdge;
    context.lineWidth = near === grill ? 3 : 2;
    context.stroke();
    text('PANGGANGAN', grill.x + 14, grill.y + 24, 16, PALETTE.muted, 'left');
    for (let i = 0; i < 2; i += 1) {
      const slot = state.grill[i];
      const sx = grill.x + 20 + i * 140;
      const sy = grill.y + 34;
      context.fillStyle = '#222226';
      roundRect(context, sx, sy, 120, 52, 8);
      context.fill();
      if (slot.item !== null) {
        const done = slot.item.t >= slot.item.total;
        drawIngredient(done ? INGREDIENTS[slot.item.kind].cooked : slot.item.kind, sx + 26, sy + 26, 34);
        drawProgressBar(sx + 52, sy + 20, 58, 12, slot.item.t / slot.item.total, done ? PALETTE.ok : PALETTE.grillHot);
        if (done) text('Siap!', sx + 81, sy + 46, 14, PALETTE.ok, 'center');
      }
    }
    // The chopping board, centre of the room.
    const chop = LAYOUT.chopper;
    context.fillStyle = PALETTE.chopper;
    roundRect(context, chop.x, chop.y, chop.w, chop.h, 10);
    context.fill();
    context.strokeStyle = near === chop ? PALETTE.coin : PALETTE.panelEdge;
    context.lineWidth = near === chop ? 3 : 2;
    context.stroke();
    text('TALENAN', chop.x + 14, chop.y + 24, 16, '#3a2a1e', 'left');
    if (state.chopper.item !== null) {
      const item = state.chopper.item;
      const done = item.t >= item.total;
      drawIngredient(done ? INGREDIENTS[item.kind].cooked : item.kind, chop.x + 52, chop.y + 58, 40);
      drawProgressBar(chop.x + 84, chop.y + 50, 100, 12, item.t / item.total, done ? PALETTE.ok : '#f0d060');
      if (done) text('Siap!', chop.x + 134, chop.y + 80, 14, '#2a5a2a', 'center');
    } else {
      text('Selada / tomat diiris di sini', chop.x + chop.w / 2, chop.y + 62, 15, '#5a4128', 'center');
    }
    // The plating counter, along the bottom.
    const plate = LAYOUT.plating;
    context.fillStyle = '#4a3421';
    roundRect(context, plate.x, plate.y, plate.w, plate.h, 10);
    context.fill();
    context.strokeStyle = near === plate ? PALETTE.coin : PALETTE.panelEdge;
    context.lineWidth = near === plate ? 3 : 2;
    context.stroke();
    text('MEJA SAJI — susun piring di sini', plate.x + 16, plate.y + 24, 16, PALETTE.muted, 'left');
    if (state.plate !== null) drawPlate(state.plate.items, plate.x + plate.w / 2, plate.y + 62, 34);
    // The serving window, right side, with its striped awning.
    const win = LAYOUT.window;
    for (let i = 0; i < 5; i += 1) {
      context.fillStyle = i % 2 === 0 ? PALETTE.awning : PALETTE.awningAlt;
      context.fillRect(win.x + i * (win.w / 5), win.y - 26, win.w / 5, 26);
    }
    context.fillStyle = PALETTE.window;
    roundRect(context, win.x, win.y, win.w, win.h, 10);
    context.fill();
    context.strokeStyle = near === win ? PALETTE.coin : PALETTE.panelEdge;
    context.lineWidth = near === win ? 3 : 2;
    context.stroke();
    text('JENDELA ANTAR', win.x + win.w / 2, win.y + 34, 18, PALETTE.text, 'center');
    text('antar piring jadi', win.x + win.w / 2, win.y + 58, 15, '#e8b0a0', 'center');
    context.fillStyle = 'rgba(0,0,0,0.35)';
    context.fillRect(win.x + 16, win.y + 76, win.w - 32, win.h - 92);
  }

  function drawOrders(state) {
    const board = LAYOUT.orderBoard;
    context.fillStyle = PALETTE.board;
    context.fillRect(board.x, board.y, board.w, board.h);
    context.strokeStyle = PALETTE.boardEdge;
    context.lineWidth = 2;
    context.strokeRect(board.x, board.y, board.w, board.h);
    text('PESANAN', 24, board.y + 34, 22, PALETTE.coin, 'left');
    const cardW = 252;
    const gap = 14;
    for (let i = 0; i < state.orders.length; i += 1) {
      const order = state.orders[i];
      const x = 170 + i * (cardW + gap);
      const y = board.y + 12;
      const frac = order.patience / order.maxPatience;
      context.fillStyle = '#3a2a1e';
      roundRect(context, x, y, cardW, board.h - 24, 10);
      context.fill();
      context.strokeStyle = frac < 0.3 ? PALETTE.danger : PALETTE.panelEdge;
      context.lineWidth = frac < 0.3 ? 3 : 2;
      context.stroke();
      text(order.recipe.name, x + 12, y + 24, 19, PALETTE.text, 'left');
      text(`${order.recipe.reward} koin`, x + cardW - 12, y + 24, 17, PALETTE.coin, 'right');
      let cx = x + 12;
      for (const kind of order.recipe.needs) {
        drawIngredient(kind, cx + 13, y + 48, 26);
        cx += 30;
      }
      drawProgressBar(x + 12, y + board.h - 40, cardW - 24, 10, frac, frac < 0.3 ? PALETTE.danger : PALETTE.ok);
    }
    if (state.orders.length === 0) {
      text('Belum ada pesanan — bersiaplah!', 170, board.y + 58, 19, PALETTE.muted, 'left');
    }
  }

  function drawHud(state) {
    const bar = LAYOUT.topBar;
    context.fillStyle = PALETTE.topBar;
    context.fillRect(bar.x, bar.y, bar.w, bar.h);
    text('DAPUR KILAT', 24, 38, 26, PALETTE.coin, 'left');
    for (let i = 0; i < HEARTS; i += 1) {
      context.fillStyle = i < state.hearts ? PALETTE.danger : 'rgba(255,255,255,0.15)';
      context.beginPath();
      context.arc(216 + i * 30, 28, 10, 0, Math.PI * 2);
      context.fill();
    }
    const left = Math.max(0, Math.ceil(SHIFT_SECONDS - state.elapsed));
    const mm = Math.floor(left / 60);
    const ss = String(left % 60).padStart(2, '0');
    text(timeLabel(`${mm}:${ss}`), FIELD.width / 2, 38, 30, left <= 30 ? PALETTE.danger : PALETTE.text, 'center');
    drawProgressBar(FIELD.width / 2 - 130, 48, 260, 6, 1 - state.elapsed / SHIFT_SECONDS, left <= 30 ? PALETTE.danger : PALETTE.ok);
    text(coinsLabel(state.coins), FIELD.width - 320, 38, 24, PALETTE.coin, 'left');
    if (state.combo >= 2) text(comboLabel(state.combo), FIELD.width - 190, 38, 24, '#ff9a3d', 'left');
  }

  function drawChef(state) {
    const chef = state.chef;
    context.fillStyle = 'rgba(0,0,0,0.3)';
    context.beginPath();
    context.ellipse(chef.x, chef.y + 16, 20, 8, 0, 0, Math.PI * 2);
    context.fill();
    // Body and apron.
    context.fillStyle = PALETTE.apron;
    context.beginPath();
    context.arc(chef.x, chef.y, CHEF.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.chef;
    context.beginPath();
    context.arc(chef.x, chef.y - 4, 13, 0, Math.PI * 2);
    context.fill();
    // Chef's hat.
    context.fillStyle = PALETTE.chefHat;
    roundRect(context, chef.x - 13, chef.y - 24, 26, 12, 6);
    context.fill();
    context.beginPath();
    context.arc(chef.x, chef.y - 24, 10, Math.PI, 0);
    context.fill();
    // Eyes look where the chef faces.
    context.fillStyle = '#222';
    context.beginPath();
    context.arc(chef.x + chef.face * 5 - 4, chef.y - 5, 2, 0, Math.PI * 2);
    context.arc(chef.x + chef.face * 5 + 4, chef.y - 5, 2, 0, Math.PI * 2);
    context.fill();
    // What the hands hold rides above the chef's head.
    const hands = state.hands;
    if (hands !== null) {
      if (hands.kind === 'plate') drawPlate(hands.items, chef.x, chef.y - 44, 26);
      else {
        let x = chef.x - (hands.items.length - 1) * 15;
        for (const kind of hands.items) {
          drawIngredient(kind, x, chef.y - 42, 26);
          x += 30;
        }
      }
    }
    if (state.moveTarget !== null) {
      context.strokeStyle = 'rgba(242,201,76,0.8)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(state.moveTarget.x, state.moveTarget.y, 8, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawFloats(state) {
    for (const f of state.floats) {
      context.globalAlpha = Math.max(0, Math.min(1, f.life));
      text(f.text, f.x, f.y, 24, f.color, 'center');
    }
    context.globalAlpha = 1;
  }

  function drawPrompt(state, near) {
    if (near === null) return;
    const labels = {
      bin: `Ambil ${INGREDIENTS[near.kind].name}`,
      grill: 'Panggang / ambil',
      chopper: 'Iris / ambil',
      plating: 'Susun / ambil piring',
      window: 'Antar piring',
    };
    const label = labels[near.type] ?? 'Gunakan';
    text(`E / klik: ${label}`, FIELD.width / 2, FIELD.height - 16, 20, PALETTE.coin, 'center');
    if (state.messageT > 0) {
      text(state.message, FIELD.width / 2, FIELD.height - 44, 20, PALETTE.danger, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(0,0,0,0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, PANEL.width, height, 14);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 48, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 40, 24, PALETTE.coin, 'center');
  }

  const TITLE_LINES = [
    'Sajikan pesanan sebelum waktunya habis!',
    'Ambil bahan, panggang, iris, susun di piring, antar.',
    'Gerak: WASD / panah / klik.  Gunakan: E atau klik.  Jeda: P.',
    '',
  ];
  const PAUSED_LINES = ['Dapur menunggu — pesanan tidak.'];
  const OVER_LINES = ['', '', ''];

  /** Paint one frame: the kitchen, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, near) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor();
    drawStations(state, near);
    drawOrders(state);
    drawChef(state);
    drawFloats(state);
    drawHud(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[3] = bestLabel(best);
      drawPanel('DAPUR KILAT', TITLE_LINES, 'Tekan Spasi atau klik untuk mulai');
      return;
    }
    drawPrompt(state, near);
    if (screen === SCREEN_PAUSED) drawPanel('Jeda', PAUSED_LINES, 'Tekan P untuk lanjut');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.coins);
      OVER_LINES[1] = servedLabel(state.served);
      OVER_LINES[2] = bestLabel(best);
      drawPanel(state.overReason === 'hearts' ? 'Dapur Kewalahan!' : 'Shift Selesai!', OVER_LINES, 'Tekan Spasi atau klik untuk main lagi');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** Canvas pixels to logical playfield coordinates. */
    toLogical(px, py) {
      return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
    },
  };
}
