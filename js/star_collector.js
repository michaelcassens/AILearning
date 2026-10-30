// ================================================================
// STAR COLLECTOR  –  star_collector.js   (p5.js 1.9.x)
//
// An optimized, commented and expanded version of the classic
// "player dodges/collects falling stars" teaching sketch.
//
// WHAT CHANGED FROM THE ORIGINAL SKETCH  (see notes inline, marked ▸)
//   1. BUG  – splicing an array while looping forward skipped stars.
//   2. BUG  – collected stars were deleted forever; the game emptied out.
//   3. BUG  – diagonal movement was ~41% faster than straight movement.
//   4. BUG  – the player could walk off the edge of the canvas.
//   5. PERF – dist() (a square root) replaced with squared-distance.
//   6. PERF – stars are RECYCLED from a fixed pool: zero allocation,
//             zero garbage collection, no array re-indexing.
//   7. PERF – motion is measured in pixels per SECOND (deltaTime), so
//             the game plays identically at 30 fps and 144 fps.
//   8. PERF – the static background is rendered ONCE into an off-screen
//             buffer instead of ~200 draw calls every frame.
//   9. PERF – fill() is hoisted out of the draw loops (draws are batched
//             by color) and pixelDensity(1) quarters the fill rate on
//             HiDPI screens.
//  10. GAME – score, 60-second round, combo multiplier, gold stars,
//             asteroids, particle bursts, screen shake, saved high score,
//             pause/restart, keyboard + touch control, reduced-motion and
//             screen-reader support.
// ================================================================

'use strict';

// ── Playfield ────────────────────────────────────────────────────
// A FIXED logical resolution. The CSS in star_collector.html scales the
// canvas element to fit the screen; p5 converts pointer coordinates back
// into this space for us, so game code never worries about screen size.
const VIEW_W = 420;
const VIEW_H = 560;

// ── Round rules ──────────────────────────────────────────────────
const ROUND_SECONDS = 60;
const COMBO_WINDOW  = 1.6;   // seconds allowed between pickups
const COMBO_MAX     = 5;     // multiplier cap

// ── Player tuning (all speeds are PIXELS PER SECOND) ─────────────
const PLAYER_R     = 16;
const PLAYER_SPEED = 260;
const PLAYER_EASE  = 14;     // how fast velocity chases the target

// ── Object pools (allocated once in setup, reused forever) ───────
const STAR_COUNT    = 46;
const PARTICLE_POOL = 150;
const PARTICLE_LIFE = 0.55;  // seconds
const SPAWN_MARGIN  = 60;    // how far below the canvas stars respawn

// ── Star kinds ───────────────────────────────────────────────────
// A data table beats a chain of if/else: adding a new kind of
// collectible means adding one row here, not editing four functions.
const KIND_STAR = 0;
const KIND_GOLD = 1;
const KIND_ROCK = 2;
const KINDS = [
  // r    speed range   points  timePenalty  color
  { r: 5,  vy: [55, 95],   points: 1, penalty: 0, col: [255, 255, 255] },
  { r: 9,  vy: [110, 160], points: 5, penalty: 0, col: [255, 206,  84] },
  { r: 13, vy: [80, 120],  points: 0, penalty: 3, col: [198, 138, 116] }
];
// Cumulative probabilities: 78% plain star, 12% gold, 10% asteroid.
// Precomputed so spawning is two comparisons instead of a switch.
const KIND_CDF = [0.78, 0.90, 1.0];

// ── Precomputed 5-pointed star outline (unit circle) ─────────────
// ▸ PERF: the trig for the gold star runs 10 times at load time
//   instead of 10 × (gold stars on screen) × 60 times per second.
//   Math.cos/Math.sin are used rather than p5's cos/sin because this
//   runs before setup(), and p5's versions respect angleMode().
const STAR_UNIT = (function buildStarOutline() {
  const pts  = [];
  const step = Math.PI / 5;                 // 10 vertices = 5 points
  for (let i = 0; i < 10; i++) {
    const rad = (i % 2 === 0) ? 1 : 0.45;   // alternate outer / inner
    const a   = i * step - Math.PI / 2;     // start at the top
    pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
  }
  return pts;
})();

// ── Game states ──────────────────────────────────────────────────
const TITLE = 'title', PLAYING = 'playing', PAUSED = 'paused', OVER = 'over';

// ── Mutable game state ───────────────────────────────────────────
let state = TITLE;
let player;
let stars     = [];
let particles = [];
let nextParticle = 0;     // ring-buffer cursor into the particle pool
let backdrop;             // p5.Graphics — the pre-rendered background
let score = 0, best = 0;
let timeLeft = ROUND_SECONDS;
let combo = 1, comboTimer = 0;
let shake = 0;            // seconds of screen shake remaining
let hudTimer = 0;         // throttles the DOM readout to ~4 Hz
let lastMilestone = 0;    // last spoken countdown milestone
let pointerDrive = false; // true only while a drag that STARTED on the canvas is held

// ▸ ACCESSIBILITY: honour the OS "reduce motion" setting. Motion that
//   IS the game (falling stars) stays; decoration (particles, pulsing,
//   screen shake) is switched off.
const REDUCED_MOTION =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ================================================================
// p5 LIFECYCLE
// ================================================================

function setup() {
  const c = createCanvas(VIEW_W, VIEW_H);
  c.parent('sketch-holder');

  // ▸ PERF: on a Retina display p5 defaults to 2× (or 3×) the pixels,
  //   which means 4–9× the fill work every frame. For a flat-shaded
  //   arcade game the extra crispness is not worth the frame budget.
  pixelDensity(1);

  noStroke();
  ellipseMode(CENTER);
  textFont('Arial');

  // ▸ ACCESSIBILITY: a text alternative for the canvas itself.
  c.canvas.setAttribute('role', 'img');
  c.canvas.setAttribute(
    'aria-label',
    'Star Collector playfield. Score, time and combo are also shown as ' +
    'text directly below the game.'
  );
  if (typeof describe === 'function') {
    describe('An arcade playfield: a red ship collects white and gold ' +
             'stars rising from the bottom while avoiding brown asteroids.');
  }

  backdrop = makeBackdrop();

  // Build both pools ONCE. From here on the game never calls `new`.
  player = new Player();
  for (let i = 0; i < STAR_COUNT; i++)    stars.push(new Star());
  for (let i = 0; i < PARTICLE_POOL; i++) particles.push(new Particle());

  best = loadBest();
  wireUpButtons();

  // Losing the tab mid-round is not the player's fault — pause for them.
  window.addEventListener('blur', () => { if (state === PLAYING) setPaused(true); });

  updateReadout();
}

function draw() {
  // ▸ PERF / CORRECTNESS: deltaTime is milliseconds since the last frame.
  //   Multiplying every movement by it makes the game frame-rate
  //   independent. The clamp stops a background tab from resuming with a
  //   4-second delta and teleporting everything across the screen.
  const dt = Math.min(deltaTime, 50) / 1000;

  if (state === PLAYING) updateWorld(dt);

  // ── Playfield (inside push/pop so screen shake can't move the HUD) ──
  push();
  if (shake > 0) {
    shake = Math.max(0, shake - dt);
    const amt = shake * 26;
    translate(random(-amt, amt), random(-amt, amt));
  }
  image(backdrop, 0, 0);   // one blit replaces a whole starfield of draws
  drawStars();
  drawParticles();
  player.show();
  pop();

  // Overlay first, HUD last: the score and timer stay at full contrast
  // even while the dimming panel is up.
  if (state !== PLAYING) drawOverlay();
  drawHud();
}

// Everything that changes over time, in one place.
function updateWorld(dt) {
  player.update(dt);

  for (let i = 0, n = stars.length; i < n; i++) stars[i].update(dt);
  updateParticles(dt);
  handlePickups();

  // Combo decays if you go too long without a pickup.
  comboTimer -= dt;
  if (comboTimer <= 0) combo = 1;

  timeLeft -= dt;
  announceMilestones();
  if (timeLeft <= 0) {
    timeLeft = 0;
    endRound();
  }

  hudTimer -= dt;
  if (hudTimer <= 0) { updateReadout(); hudTimer = 0.25; }
}

// ================================================================
// PLAYER
// ================================================================

class Player {
  constructor() { this.reset(); }

  reset() {
    this.x  = VIEW_W * 0.5;
    this.y  = VIEW_H * 0.72;
    this.vx = 0;
    this.vy = 0;
    this.r  = PLAYER_R;
  }

  update(dt) {
    // Read the keyboard once per frame into plain numbers.
    let dx = 0, dy = 0;
    if (keyIsDown(LEFT_ARROW)  || keyIsDown(65)) dx -= 1;  // A
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) dx += 1;  // D
    if (keyIsDown(UP_ARROW)    || keyIsDown(87)) dy -= 1;  // W
    if (keyIsDown(DOWN_ARROW)  || keyIsDown(83)) dy += 1;  // S

    // ▸ FIX #3: without this, holding two keys gave a speed of
    //   √(5² + 5²) ≈ 7.07 instead of 5. Scaling a diagonal by 1/√2
    //   makes every direction equally fast.
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    // Touch / mouse steering: drag on the playfield and the ship chases
    // the pointer. p5 reports touches through the mouse variables, so
    // this one branch covers phones, tablets and trackpads. `pointerDrive`
    // makes sure a click on the Pause button does not also yank the ship
    // across the screen — p5 sets mouseIsPressed for the whole window.
    if (dx === 0 && dy === 0 && mouseIsPressed && pointerDrive) {
      const px = mouseX - this.x;
      const py = mouseY - this.y;
      const d2 = px * px + py * py;
      if (d2 > 36) {                       // 6px dead zone stops jitter
        const inv = 1 / Math.sqrt(d2);
        dx = px * inv;
        dy = py * inv;
      }
    }

    // Ease toward the target velocity instead of snapping to it: same
    // top speed, much better feel, and it costs two multiplies.
    const k = Math.min(1, PLAYER_EASE * dt);
    this.vx += (dx * PLAYER_SPEED - this.vx) * k;
    this.vy += (dy * PLAYER_SPEED - this.vy) * k;

    // ▸ FIX #4: keep the ship on screen.
    this.x = constrain(this.x + this.vx * dt, this.r, VIEW_W - this.r);
    this.y = constrain(this.y + this.vy * dt, this.r, VIEW_H - this.r);
  }

  show() {
    // Soft glow (drawn first so the body sits on top).
    fill(249, 66, 58, 45);
    circle(this.x, this.y, this.r * 3.4);

    // Body — Sunset Red reads at ~5.6:1 against the near-black sky.
    fill(249, 66, 58);
    circle(this.x, this.y, this.r * 2);

    // Cockpit highlight gives the ship an obvious "front".
    fill(255, 226, 224);
    circle(this.x, this.y - this.r * 0.32, this.r * 0.7);
  }
}

// ================================================================
// STARS  (and asteroids — same pool, different `kind`)
// ================================================================

class Star {
  constructor() { this.rock = new Float32Array(8); this.reset(true); }

  // `anywhere` is true only for the initial fill, so the first frame
  // already has a full sky instead of an empty one.
  reset(anywhere) {
    const kind = pickKind();
    const k    = KINDS[kind];

    this.kind = kind;
    this.r    = k.r * random(0.85, 1.15);
    this.vy   = random(k.vy[0], k.vy[1]);
    this.x    = random(this.r, VIEW_W - this.r);
    this.y    = anywhere ? random(VIEW_H)
                         : random(VIEW_H + this.r, VIEW_H + SPAWN_MARGIN);

    // ▸ PERF #5: cache the squared hit radius. Collision then costs two
    //   subtractions, two multiplies and one compare — no sqrt at all.
    const reach = this.r + PLAYER_R;
    this.hitDistSq = reach * reach;

    this.spin     = random(TWO_PI);
    this.spinRate = random(-1.6, 1.6);
    this.pulse    = random(TWO_PI);

    // Asteroids get a random lumpy silhouette. The Float32Array is
    // allocated once per Star in the constructor and only refilled here,
    // so recycling an asteroid allocates nothing.
    if (kind === KIND_ROCK) {
      for (let i = 0; i < 8; i++) this.rock[i] = random(0.72, 1.15);
    }
  }

  update(dt) {
    this.y    -= this.vy * dt;
    this.spin += this.spinRate * dt;

    // ▸ FIX #2 + PERF #6: when a star leaves the top it is recycled with
    //   a brand-new kind, size and speed. The original teleported the
    //   same star back with `this.y = height`, which popped it into view
    //   half-drawn; `-this.r` lets it slide in cleanly.
    if (this.y < -this.r) this.reset(false);
  }
}

// Weighted random kind. Two comparisons, no allocation.
function pickKind() {
  const roll = Math.random();
  if (roll < KIND_CDF[0]) return KIND_STAR;
  if (roll < KIND_CDF[1]) return KIND_GOLD;
  return KIND_ROCK;
}

// ▸ PERF #9: three passes, three fill() calls — instead of one fill()
//   per star per frame. Changing fill state is the expensive part of a
//   2D canvas draw; the extra loop iterations are nearly free.
function drawStars() {
  const n = stars.length;
  const t = REDUCED_MOTION ? 0 : frameCount * 0.08;

  // Pass 1 — plain stars. Size (not brightness) pulses, so a single
  // fill covers all of them.
  fill(255);
  for (let i = 0; i < n; i++) {
    const s = stars[i];
    if (s.kind !== KIND_STAR) continue;
    circle(s.x, s.y, s.r * 2 + Math.sin(s.pulse + t) * 1.2);
  }

  // Pass 2 — gold stars, drawn from the precomputed outline.
  fill(255, 206, 84);
  for (let i = 0; i < n; i++) {
    const s = stars[i];
    if (s.kind !== KIND_GOLD) continue;
    push();
    translate(s.x, s.y);
    rotate(s.spin);
    beginShape();
    for (let v = 0; v < 10; v++) {
      vertex(STAR_UNIT[v][0] * s.r * 1.7, STAR_UNIT[v][1] * s.r * 1.7);
    }
    endShape(CLOSE);
    pop();
  }

  // Pass 3 — asteroids. Shape, not just color, marks them as hazards,
  // so they stay readable for color-blind players.
  fill(198, 138, 116);
  for (let i = 0; i < n; i++) {
    const s = stars[i];
    if (s.kind !== KIND_ROCK) continue;
    push();
    translate(s.x, s.y);
    rotate(s.spin);
    beginShape();
    for (let v = 0; v < 8; v++) {
      const a = (v / 8) * TWO_PI;
      vertex(Math.cos(a) * s.r * s.rock[v], Math.sin(a) * s.r * s.rock[v]);
    }
    endShape(CLOSE);
    pop();
  }
}

// ================================================================
// COLLISIONS
// ================================================================

function handlePickups() {
  const px = player.x, py = player.y;

  // ▸ FIX #1: the original did `stars.splice(i, 1)` inside a forward
  //   loop, which shifted every later element down one index — the star
  //   right after a collected one was never tested that frame. Because
  //   this version recycles instead of removing, the array length never
  //   changes and the loop stays correct.
  for (let i = 0, n = stars.length; i < n; i++) {
    const s  = stars[i];
    const dx = s.x - px;
    const dy = s.y - py;
    if (dx * dx + dy * dy > s.hitDistSq) continue;   // no sqrt needed

    if (s.kind === KIND_ROCK) hitAsteroid(s);
    else                      collectStar(s);

    s.reset(false);
  }
}

function collectStar(s) {
  score += KINDS[s.kind].points * combo;
  combo = Math.min(COMBO_MAX, combo + 1);
  comboTimer = COMBO_WINDOW;
  burst(s.x, s.y, s.kind, s.kind === KIND_GOLD ? 16 : 8);
}

function hitAsteroid(s) {
  timeLeft = Math.max(0, timeLeft - KINDS[KIND_ROCK].penalty);
  combo = 1;
  comboTimer = 0;
  if (!REDUCED_MOTION) shake = 0.22;
  burst(s.x, s.y, KIND_ROCK, 14);
  announce('Asteroid hit. Three seconds lost.');
}

// ================================================================
// PARTICLES  (fixed-size ring buffer — never grows, never allocates)
// ================================================================

class Particle {
  constructor() {
    this.x = this.y = this.vx = this.vy = 0;
    this.life = 0;      // seconds remaining; 0 means "free"
    this.r = 2;
    this.kind = KIND_STAR;
  }
}

function burst(x, y, kind, count) {
  if (REDUCED_MOTION) return;
  for (let i = 0; i < count; i++) {
    // Overwrite the oldest particle rather than pushing a new one. The
    // pool is big enough that a live particle is almost never stolen.
    const p = particles[nextParticle];
    nextParticle = (nextParticle + 1) % PARTICLE_POOL;

    const a  = random(TWO_PI);
    const sp = random(45, 200);
    p.x = x;  p.y = y;
    p.vx = Math.cos(a) * sp;
    p.vy = Math.sin(a) * sp;
    p.life = PARTICLE_LIFE;
    p.r = random(1.5, 3.5);
    p.kind = kind;
  }
}

function updateParticles(dt) {
  const drag = Math.pow(0.12, dt);   // frame-rate independent damping
  for (let i = 0; i < PARTICLE_POOL; i++) {
    const p = particles[i];
    if (p.life <= 0) continue;
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= drag;
    p.vy *= drag;
  }
}

function drawParticles() {
  if (REDUCED_MOTION) return;
  // Same batching trick as the stars: three fill() calls for the whole
  // pool. Particles fade by SHRINKING rather than by changing alpha —
  // an alpha fade would force one fill() per particle.
  for (let k = 0; k < KINDS.length; k++) {
    const col = KINDS[k].col;
    fill(col[0], col[1], col[2], 230);
    for (let i = 0; i < PARTICLE_POOL; i++) {
      const p = particles[i];
      if (p.life <= 0 || p.kind !== k) continue;
      circle(p.x, p.y, p.r * 2 * (p.life / PARTICLE_LIFE));
    }
  }
}

// ================================================================
// BACKGROUND  (rendered once, blitted every frame)
// ================================================================

// ▸ PERF #8: the original redrew a flat background() every frame, and any
//   decorative starfield would have meant hundreds of extra draw calls per
//   frame forever. Painting it once into a p5.Graphics buffer turns that
//   into a single image() call.
function makeBackdrop() {
  const g = createGraphics(VIEW_W, VIEW_H);
  g.noStroke();

  // Vertical gradient: one thin rectangle per row, drawn exactly once.
  for (let y = 0; y < VIEW_H; y++) {
    const t = y / VIEW_H;
    g.fill(10 + t * 8, 14 + t * 10, 26 + t * 22);
    g.rect(0, y, VIEW_W, 1);
  }

  // Distant dust. Deliberately dim so the playable stars stay readable.
  for (let i = 0; i < 220; i++) {
    const a = Math.random() * 90 + 20;
    g.fill(255, 255, 255, a);
    g.circle(Math.random() * VIEW_W, Math.random() * VIEW_H, Math.random() * 1.8 + 0.5);
  }
  return g;
}

// ================================================================
// HUD AND OVERLAYS
// ================================================================

function drawHud() {
  // Translucent band keeps HUD text above 4.5:1 contrast even when a
  // bright star drifts underneath it.
  fill(6, 9, 18, 210);
  rect(0, 0, VIEW_W, 34);

  const low = timeLeft <= 10;

  textSize(15);
  textAlign(LEFT, CENTER);
  fill(255);
  text('SCORE ' + score, 12, 17);

  // Time is shown as a number AND a bar — never color alone. Numeric
  // fill() arguments avoid building a throwaway p5.Color every frame.
  textAlign(RIGHT, CENTER);
  if (low) fill(255, 176, 168); else fill(255);
  text('TIME ' + Math.ceil(timeLeft), VIEW_W - 12, 17);

  // Timer bar under the band.
  fill(255, 255, 255, 40);
  rect(0, 34, VIEW_W, 4);
  if (low) fill(249, 66, 58); else fill(255, 206, 84);
  rect(0, 34, VIEW_W * (timeLeft / ROUND_SECONDS), 4);

  if (combo > 1 && state === PLAYING) {
    textAlign(CENTER, CENTER);
    textSize(13);
    fill(255, 206, 84);
    text('COMBO ×' + combo, VIEW_W / 2, 17);
  }
}

function drawOverlay() {
  fill(4, 6, 14, 215);
  rect(0, 0, VIEW_W, VIEW_H);

  textAlign(CENTER, CENTER);
  const cx = VIEW_W / 2;

  if (state === TITLE) {
    fill(255, 206, 84); textSize(30); text('STAR COLLECTOR', cx, VIEW_H * 0.30);
    fill(255);          textSize(14);
    text('Collect stars  ·  Gold is worth 5', cx, VIEW_H * 0.42);
    text('Asteroids cost you 3 seconds',      cx, VIEW_H * 0.47);
    text('Arrows / WASD, or drag the screen', cx, VIEW_H * 0.55);
    fill(180, 190, 210);
    text('Press Enter or Start to play',      cx, VIEW_H * 0.66);
    if (best > 0) text('Best: ' + best, cx, VIEW_H * 0.72);

  } else if (state === PAUSED) {
    fill(255); textSize(28); text('PAUSED', cx, VIEW_H * 0.44);
    fill(180, 190, 210); textSize(14);
    text('Press P or Space to resume', cx, VIEW_H * 0.53);

  } else if (state === OVER) {
    fill(255, 206, 84); textSize(28); text("TIME'S UP", cx, VIEW_H * 0.32);
    fill(255); textSize(20); text('Score: ' + score, cx, VIEW_H * 0.43);
    textSize(15);
    if (score >= best && score > 0) {
      fill(255, 206, 84);
      text('New best!', cx, VIEW_H * 0.50);
    } else {
      fill(200, 208, 224);
      text('Best: ' + best, cx, VIEW_H * 0.50);
    }
    fill(180, 190, 210); textSize(14);
    text('Press Enter to play again', cx, VIEW_H * 0.62);
  }
}

// ================================================================
// GAME FLOW
// ================================================================

function startRound() {
  score = 0;
  timeLeft = ROUND_SECONDS;
  combo = 1;
  comboTimer = 0;
  shake = 0;
  lastMilestone = ROUND_SECONDS;
  player.reset();

  // Refill the sky, but keep a clear zone around the ship so the round
  // never opens with free points or an unavoidable asteroid.
  const SAFE_SQ = 90 * 90;
  for (let i = 0, n = stars.length; i < n; i++) {
    const s  = stars[i];
    s.reset(true);
    const dx = s.x - player.x;
    const dy = s.y - player.y;
    if (dx * dx + dy * dy < SAFE_SQ) s.y = random(0, VIEW_H * 0.35);
  }

  for (let i = 0; i < PARTICLE_POOL; i++) particles[i].life = 0;
  state = PLAYING;
  syncButtons();
  updateReadout();
  announce('Round started. Sixty seconds.');
}

function endRound() {
  state = OVER;
  if (score > best) { best = score; saveBest(best); }
  syncButtons();
  updateReadout();
  announce("Time's up. Final score " + score + '. Best ' + best + '.');
}

function setPaused(on) {
  if (on && state === PLAYING)      state = PAUSED;
  else if (!on && state === PAUSED) state = PLAYING;
  syncButtons();
  announce(state === PAUSED ? 'Paused.' : 'Resumed.');
}

// ================================================================
// INPUT
// ================================================================

function keyPressed() {
  // Enter / Return starts or restarts.
  if (keyCode === ENTER || keyCode === RETURN) {
    if (state !== PLAYING) startRound();
    return false;
  }

  // P or Space toggles pause — unless a real button has focus, where
  // Space belongs to the button.
  const onButton = document.activeElement &&
                   document.activeElement.tagName === 'BUTTON';
  if ((key === 'p' || key === 'P' || (keyCode === 32 && !onButton))) {
    if (state === PLAYING)     setPaused(true);
    else if (state === PAUSED) setPaused(false);
    return false;
  }

  // ▸ ACCESSIBILITY: swallow ONLY the movement keys so the page does not
  //   scroll while playing. Tab, Escape and browser shortcuts still work,
  //   so there is no keyboard trap.
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW ||
      keyCode === UP_ARROW   || keyCode === DOWN_ARROW) {
    return false;
  }
}

// p5 fires mousePressed for the whole window, so the first thing to do is
// ask whether the press actually landed on the playfield. Presses on the
// page's own buttons fall through untouched (returning false here would
// preventDefault them and they would never click).
function mousePressed() {
  const onCanvas = mouseX >= 0 && mouseX <= VIEW_W &&
                   mouseY >= 0 && mouseY <= VIEW_H;
  if (!onCanvas) return;

  pointerDrive = true;
  if (state === TITLE || state === OVER) startRound();
  return false;      // no text selection / scroll-drag on the canvas
}

function mouseReleased() { pointerDrive = false; }

function wireUpButtons() {
  const start = document.getElementById('btn-start');
  const pause = document.getElementById('btn-pause');
  if (start) start.addEventListener('click', () => { startRound(); start.blur(); });
  if (pause) pause.addEventListener('click', () => {
    setPaused(state === PLAYING);
    pause.blur();
  });
  syncButtons();
}

// Keep the DOM controls truthful about what they will do.
function syncButtons() {
  const start = document.getElementById('btn-start');
  const pause = document.getElementById('btn-pause');
  if (start) start.textContent = (state === TITLE) ? 'Start game' : 'Restart game';
  if (pause) {
    pause.disabled = (state === TITLE || state === OVER);
    pause.textContent = (state === PAUSED) ? 'Resume' : 'Pause';
    pause.setAttribute('aria-pressed', String(state === PAUSED));
  }
}

// ================================================================
// TEXT READOUT + SCREEN READER SUPPORT
// ================================================================

// The canvas HUD is invisible to assistive technology, so the same
// numbers are mirrored into real text under the canvas.
function updateReadout() {
  const el = document.getElementById('readout');
  if (!el) return;
  el.textContent =
    'Score ' + score +
    ' · Time ' + Math.ceil(timeLeft) + 's' +
    ' · Combo ×' + combo +
    ' · Best ' + best;
}

// Spoken only at meaningful moments — a live region that fires every
// frame is worse than no live region at all.
function announceMilestones() {
  const secs = Math.ceil(timeLeft);
  if (secs < lastMilestone &&
      (secs === 30 || secs === 15 || secs === 10 || secs === 5)) {
    lastMilestone = secs;
    announce(secs + ' seconds left. Score ' + score + '.');
  }
}

function announce(message) {
  const el = document.getElementById('sr-status');
  if (el) el.textContent = message;
}

// ================================================================
// HIGH SCORE  (localStorage can throw in private mode — always guard)
// ================================================================

function loadBest() {
  try {
    return Number(window.localStorage.getItem('starCollectorBest')) || 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem('starCollectorBest', String(value));
  } catch (e) {
    /* Storage blocked — the score simply won't persist. */
  }
}
