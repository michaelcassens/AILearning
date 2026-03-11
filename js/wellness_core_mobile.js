// ═══════════════════════════════════════════════════════════════
// WELLNESS JOURNEY — Mobile-Responsive Core Game Engine
// A week-long life simulation exploring the 8 Dimensions of Wellness
// ═══════════════════════════════════════════════════════════════

// ── Dimension Colors (warm earth-tone palette) ──────────────
const DIM_COLORS = {
  physical:      [224, 120, 80],
  emotional:     [212, 160, 64],
  social:        [124, 184, 104],
  intellectual:  [91, 141, 191],
  spiritual:     [155, 125, 196],
  occupational:  [196, 122, 90],
  financial:     [106, 171, 142],
  environmental: [133, 165, 85]
};

const DIM_NAMES = ['physical','emotional','social','intellectual','spiritual','occupational','financial','environmental'];
const DIM_LABELS = ['Physical','Emotional','Social','Intellectual','Spiritual','Occupational','Financial','Environmental'];
const DIM_ICONS = ['♥','☀','☺','✎','✦','⚙','$','♣'];

const TIME_LABELS = ['Morning','Afternoon','Evening'];
const TIME_ICONS  = ['☀','⛅','☾'];
const DAY_NAMES   = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// ── Responsive Layout ─────────────────────────────────────────
let isMobile = false;
let isTablet = false;
let S = 1;         // general scale factor
let showWheelOverlay = false;

// Touch scrolling state
let touchStartY = 0;
let touchStartX = 0;
let isTouchDragging = false;
let playScrollY = 0;
let playMaxScroll = 0;

// ── Global Game State ───────────────────────────────────────
let GS = {};

function resetGameState() {
  GS = {
    phase: 'title',
    day: 1,
    timeSlot: 0,
    wellness: {
      physical: 50, emotional: 50, social: 50, intellectual: 50,
      spiritual: 50, occupational: 50, financial: 50, environmental: 50
    },
    startWellness: null,
    history: [],
    achievements: [],
    achievementQueue: [],
    usedEvents: new Set(),
    activeEvent: null,
    currentScenario: null,
    selectedChoice: null,
    choiceResult: null,
    miniActivity: null,
    miniScore: 0,
    daySummary: null,
    introPage: 0,
    reportSection: 0,

    ui: {
      wheelDisplay: { physical:50, emotional:50, social:50, intellectual:50, spiritual:50, occupational:50, financial:50, environmental:50 },
      fadeAlpha: 255,
      fadeTarget: 0,
      fadeLabel: '',
      typewriterText: '',
      typewriterTarget: '',
      typewriterIdx: 0,
      choicesVisible: false,
      choiceAlpha: 0,
      resultTimer: 0,
      achieveTimer: 0,
      achieveSlide: 0,
      particles: [],
      scrollY: 0,
      maxScroll: 0,
      hoverBtn: -1,
      transitionTimer: 0,
      transitionCallback: null,
      dayTransitionTimer: 0
    }
  };
  playScrollY = 0;
  playMaxScroll = 0;
  showWheelOverlay = false;
}

// ── Warm Color Palette ──────────────────────────────────────
const C = {
  bg:        [245, 239, 230],
  surface:   [255, 248, 240],
  surfaceAlt:[248, 240, 228],
  text:      [61, 44, 30],
  textLight: [130, 105, 80],
  accent:    [224, 123, 60],
  accentDark:[180, 90, 40],
  border:    [210, 195, 170],
  gold:      [218, 175, 65],
  shadow:    [0, 0, 0, 25]
};

// ── Responsive Helpers ──────────────────────────────────────
function updateScale() {
  isMobile = width < 600;
  isTablet = width >= 600 && width < 950;
  S = min(width / 1000, height / 650);
}

// Responsive text size: scales down but enforces minimum
function ts(base) {
  if (isMobile) return max(base * max(width / 500, 0.55), 9);
  if (isTablet) return max(base * max(width / 800, 0.7), 10);
  return base;
}

// Responsive size (general dimensions)
function rs(base) {
  return base * S;
}

// ── Button Management ───────────────────────────────────────
let buttons = [];

class Btn {
  constructor(x, y, w, h, label, action, col) {
    this.x = x; this.y = y;
    this.w = max(w, 80);
    this.h = max(h, 48); // touch-friendly minimum
    this.label = label; this.action = action;
    this.col = col || C.accent;
    this.hover = false;
    this.alpha = 255;
  }
  contains(mx, my) {
    // Expand hit area slightly for touch
    let pad = isMobile ? 4 : 0;
    return mx >= this.x - pad && mx <= this.x + this.w + pad &&
           my >= this.y - pad && my <= this.y + this.h + pad;
  }
  draw() {
    push();
    let bc = this.col;
    if (this.hover) {
      fill(bc[0]-15, bc[1]-15, bc[2]-15, this.alpha);
      cursor(HAND);
    } else {
      fill(bc[0], bc[1], bc[2], this.alpha);
    }
    noStroke();
    rect(this.x, this.y, this.w, this.h, 10);
    fill(255, 255, 255, this.alpha);
    textAlign(CENTER, CENTER);
    textSize(ts(15));
    textStyle(BOLD);
    text(this.label, this.x + this.w/2, this.y + this.h/2);
    textStyle(NORMAL);
    pop();
  }
}

// ── Particle System ─────────────────────────────────────────
class Particle {
  constructor(x, y, col, vx, vy, life, size) {
    this.x = x; this.y = y;
    this.col = col;
    this.vx = vx || random(-1, 1);
    this.vy = vy || random(-2, -0.5);
    this.life = life || 60;
    this.maxLife = this.life;
    this.size = size || random(3, 7);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.02;
    this.life--;
  }
  draw() {
    let a = map(this.life, 0, this.maxLife, 0, 200);
    fill(this.col[0], this.col[1], this.col[2], a);
    noStroke();
    ellipse(this.x, this.y, this.size);
  }
  isDead() { return this.life <= 0; }
}

function emitParticles(x, y, col, count, config) {
  for (let i = 0; i < count; i++) {
    let vx = (config && config.vx) ? config.vx() : random(-2, 2);
    let vy = (config && config.vy) ? config.vy() : random(-3, -0.5);
    let life = (config && config.life) || random(40, 80);
    let size = (config && config.size) || random(3, 8);
    GS.ui.particles.push(new Particle(x, y, col, vx, vy, life, size));
  }
}

function updateParticles() {
  for (let i = GS.ui.particles.length - 1; i >= 0; i--) {
    GS.ui.particles[i].update();
    if (GS.ui.particles[i].isDead()) GS.ui.particles.splice(i, 1);
  }
  if (GS.ui.particles.length > 150) GS.ui.particles.splice(0, GS.ui.particles.length - 150);
}

function drawParticles() {
  for (let p of GS.ui.particles) p.draw();
}

// ── Text Wrapping Utility ───────────────────────────────────
function wrapText(str, maxW) {
  let words = str.split(' ');
  let lines = [];
  let line = '';
  for (let w of words) {
    let test = line ? line + ' ' + w : w;
    if (textWidth(test) > maxW) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ── Typewriter Effect ───────────────────────────────────────
function updateTypewriter() {
  if (GS.ui.typewriterIdx < GS.ui.typewriterTarget.length) {
    let charsPerFrame = 2;
    GS.ui.typewriterIdx = min(GS.ui.typewriterIdx + charsPerFrame, GS.ui.typewriterTarget.length);
    GS.ui.typewriterText = GS.ui.typewriterTarget.substring(0, GS.ui.typewriterIdx);
  }
  if (GS.ui.typewriterIdx >= GS.ui.typewriterTarget.length && !GS.ui.choicesVisible) {
    GS.ui.choicesVisible = true;
    GS.ui.choiceAlpha = 0;
  }
  if (GS.ui.choicesVisible && GS.ui.choiceAlpha < 255) {
    GS.ui.choiceAlpha = min(GS.ui.choiceAlpha + 8, 255);
  }
}

function startTypewriter(txt) {
  GS.ui.typewriterTarget = txt;
  GS.ui.typewriterText = '';
  GS.ui.typewriterIdx = 0;
  GS.ui.choicesVisible = false;
  GS.ui.choiceAlpha = 0;
}

// ── Fade Transition ─────────────────────────────────────────
function startTransition(label, callback) {
  GS.ui.fadeTarget = 255;
  GS.ui.fadeLabel = label;
  GS.ui.transitionCallback = () => {
    callback();
    GS.ui.fadeTarget = 0;
    GS.ui.fadeLabel = '';
  };
  GS.ui.transitionTimer = 0;
}

function updateTransition() {
  if (GS.ui.fadeTarget === 255) {
    GS.ui.fadeAlpha = min(GS.ui.fadeAlpha + 10, 255);
    if (GS.ui.fadeAlpha >= 255) {
      GS.ui.transitionTimer++;
      if (GS.ui.transitionTimer > 30 && GS.ui.transitionCallback) {
        GS.ui.transitionCallback();
        GS.ui.transitionCallback = null;
      }
    }
  } else {
    GS.ui.fadeAlpha = max(GS.ui.fadeAlpha - 8, 0);
  }
}

function drawTransition() {
  if (GS.ui.fadeAlpha > 0) {
    fill(C.bg[0], C.bg[1], C.bg[2], GS.ui.fadeAlpha);
    noStroke();
    rect(0, 0, width, height);
    if (GS.ui.fadeLabel && GS.ui.fadeAlpha > 150) {
      fill(C.text[0], C.text[1], C.text[2], GS.ui.fadeAlpha);
      textAlign(CENTER, CENTER);
      textSize(ts(22));
      textStyle(BOLD);
      text(GS.ui.fadeLabel, width/2, height/2);
      textStyle(NORMAL);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// WELLNESS WHEEL RENDERER
// ═══════════════════════════════════════════════════════════════

function drawWellnessWheel(cx, cy, radius, showLabels, showValues) {
  push();
  let n = 8;
  let angleStep = TWO_PI / n;

  // Background rings
  for (let ring = 1; ring <= 4; ring++) {
    let r = radius * (ring / 4);
    stroke(C.border[0], C.border[1], C.border[2], 60);
    strokeWeight(1);
    noFill();
    beginShape();
    for (let i = 0; i < n; i++) {
      let angle = -HALF_PI + i * angleStep;
      vertex(cx + cos(angle) * r, cy + sin(angle) * r);
    }
    endShape(CLOSE);
  }

  // Axis lines
  for (let i = 0; i < n; i++) {
    let angle = -HALF_PI + i * angleStep;
    stroke(C.border[0], C.border[1], C.border[2], 40);
    strokeWeight(1);
    line(cx, cy, cx + cos(angle) * radius, cy + sin(angle) * radius);
  }

  // Animated wellness polygon
  let glowVerts = [];
  for (let i = 0; i < n; i++) {
    let dim = DIM_NAMES[i];
    GS.ui.wheelDisplay[dim] = lerp(GS.ui.wheelDisplay[dim], GS.wellness[dim], 0.06);
    let val = GS.ui.wheelDisplay[dim] / 100;
    let angle = -HALF_PI + i * angleStep;
    glowVerts.push({ x: cx + cos(angle) * radius * val, y: cy + sin(angle) * radius * val });
  }

  // Glow layer
  fill(C.accent[0], C.accent[1], C.accent[2], 15);
  noStroke();
  beginShape();
  for (let v of glowVerts) vertex(v.x, v.y);
  endShape(CLOSE);

  // Main polygon
  fill(C.accent[0], C.accent[1], C.accent[2], 40);
  stroke(C.accent[0], C.accent[1], C.accent[2], 180);
  strokeWeight(2);
  beginShape();
  for (let v of glowVerts) vertex(v.x, v.y);
  endShape(CLOSE);

  // Vertex dots
  for (let i = 0; i < n; i++) {
    let col = DIM_COLORS[DIM_NAMES[i]];
    fill(col[0], col[1], col[2]);
    noStroke();
    ellipse(glowVerts[i].x, glowVerts[i].y, isMobile ? 6 : 8);
  }

  // Labels
  if (showLabels !== false) {
    let labelDist = radius + (isMobile ? 18 : 30);
    for (let i = 0; i < n; i++) {
      let angle = -HALF_PI + i * angleStep;
      let col = DIM_COLORS[DIM_NAMES[i]];
      let lx = cx + cos(angle) * labelDist;
      let ly = cy + sin(angle) * labelDist;

      fill(col[0], col[1], col[2]);
      textAlign(CENTER, CENTER);
      textSize(ts(11));
      textStyle(BOLD);
      text(isMobile ? DIM_LABELS[i].substring(0, 4) : DIM_LABELS[i], lx, ly);
      textStyle(NORMAL);

      if (showValues !== false) {
        fill(C.textLight[0], C.textLight[1], C.textLight[2]);
        textSize(ts(10));
        text(Math.round(GS.ui.wheelDisplay[DIM_NAMES[i]]), lx, ly + ts(13));
      }
    }
  }
  pop();
}

// ═══════════════════════════════════════════════════════════════
// DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════

function drawRoundedBox(x, y, w, h, r, fillCol, strokeCol) {
  push();
  if (fillCol) fill(fillCol[0], fillCol[1], fillCol[2], fillCol[3] || 255);
  else noFill();
  if (strokeCol) { stroke(strokeCol[0], strokeCol[1], strokeCol[2]); strokeWeight(1.5); }
  else noStroke();
  rect(x, y, w, h, r);
  pop();
}

// Compact score bar for mobile (replaces bottom bar + wheel)
function drawScoreBar(y) {
  push();
  fill(C.surfaceAlt[0], C.surfaceAlt[1], C.surfaceAlt[2]);
  noStroke();
  let barH = isMobile ? 48 : 40;
  rect(0, y, width, barH);
  stroke(C.border[0], C.border[1], C.border[2]);
  strokeWeight(1);
  line(0, y, width, y);

  let spacing = width / 8;
  let dotY = y + barH / 2;

  for (let i = 0; i < 8; i++) {
    let x = spacing * i + spacing / 2;
    let dim = DIM_NAMES[i];
    let col = DIM_COLORS[dim];
    let val = Math.round(GS.wellness[dim]);

    // Colored dot
    fill(col[0], col[1], col[2]);
    noStroke();
    let dotSize = isMobile ? 8 : 10;
    ellipse(x, dotY - 7, dotSize);

    // Value below
    fill(C.text[0], C.text[1], C.text[2]);
    textAlign(CENTER, CENTER);
    textSize(isMobile ? 8 : 10);
    text(val, x, dotY + 8);
  }
  pop();
}

function drawTopBar() {
  push();
  let barH = isMobile ? 40 : 45;
  fill(C.surfaceAlt[0], C.surfaceAlt[1], C.surfaceAlt[2]);
  noStroke();
  rect(0, 0, width, barH);
  stroke(C.border[0], C.border[1], C.border[2]);
  strokeWeight(1);
  line(0, barH, width, barH);

  // Day and time
  fill(C.text[0], C.text[1], C.text[2]);
  textAlign(LEFT, CENTER);
  textSize(ts(14));
  textStyle(BOLD);
  let dayLabel = isMobile
    ? DAY_NAMES[GS.day - 1].substring(0, 3) + ' — ' + TIME_LABELS[GS.timeSlot]
    : DAY_NAMES[GS.day - 1] + ' — ' + TIME_LABELS[GS.timeSlot];
  text(dayLabel, 12, barH / 2);
  textStyle(NORMAL);

  // Time icon
  textSize(ts(18));
  textAlign(CENTER, CENTER);
  text(TIME_ICONS[GS.timeSlot], width/2, barH / 2);

  // Day counter
  textSize(ts(11));
  textAlign(RIGHT, CENTER);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Day ' + GS.day + '/7', width - 12, barH / 2);

  pop();
  return barH;
}

// ═══════════════════════════════════════════════════════════════
// TITLE SCREEN
// ═══════════════════════════════════════════════════════════════

function drawTitle() {
  background(C.bg[0], C.bg[1], C.bg[2]);

  // Decorative floating particles
  if (frameCount % 15 === 0) {
    let col = DIM_COLORS[DIM_NAMES[floor(random(8))]];
    emitParticles(random(width), random(height), col, 1, {
      vx: () => random(-0.3, 0.3), vy: () => random(-0.5, -0.1),
      life: random(80, 150), size: random(4, 10)
    });
  }

  drawParticles();

  push();
  textAlign(CENTER, CENTER);

  // Title
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(36));
  textStyle(BOLD);
  text('Wellness Journey', width/2, height * 0.14);
  textStyle(NORMAL);

  // Subtitle
  textSize(ts(15));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  let sub = WELLNESS_CONFIG.subtitle || 'Explore the 8 Dimensions of Wellness';
  let subLines = wrapText(sub, width * 0.85);
  for (let i = 0; i < subLines.length; i++) {
    text(subLines[i], width/2, height * 0.20 + i * ts(20));
  }

  // Animated preview wheel
  let wheelR = isMobile ? min(width * 0.22, 90) : min(width * 0.15, 120);
  let pulse = sin(frameCount * 0.02) * 4;
  drawWellnessWheel(width/2, height * 0.48, wheelR + pulse, true, false);

  // Version badge
  textSize(ts(13));
  fill(C.accent[0], C.accent[1], C.accent[2]);
  textStyle(BOLD);
  text(WELLNESS_CONFIG.title, width/2, height * 0.76);
  textStyle(NORMAL);

  pop();

  // Start button
  let btnW = min(200, width * 0.5);
  let btnH = 52;
  buttons = [new Btn(width/2 - btnW/2, height * 0.82, btnW, btnH, 'Begin Journey', 'start', C.accent)];
  for (let b of buttons) b.draw();
}

// ═══════════════════════════════════════════════════════════════
// INTRO SCREEN — Explains the 8 Dimensions
// ═══════════════════════════════════════════════════════════════

const INTRO_PAGES = [
  {
    title: 'Welcome to Your Wellness Journey',
    body: 'Over the next 7 days, you\'ll navigate real-life scenarios that affect your overall wellness. Every choice matters — and some choices involve trade-offs between different areas of your life.',
    highlight: 'Your goal: keep all 8 dimensions of wellness balanced and thriving!'
  },
  {
    title: 'The 8 Dimensions of Wellness',
    body: 'Your wellness is measured across 8 interconnected dimensions. Each starts at 50 (out of 100). Your choices throughout the week will raise or lower these scores.',
    showDimensions: true
  },
  {
    title: 'How to Play',
    body: 'Each day has Morning, Afternoon, and Evening scenarios. Read the situation, then choose how to respond. Some choices unlock interactive mini-activities for bonus points! Watch for random events that add surprises to your week.',
    highlight: 'Ready? Let\'s start your journey!'
  }
];

function drawIntro() {
  background(C.bg[0], C.bg[1], C.bg[2]);
  let page = INTRO_PAGES[GS.introPage];
  let margin = isMobile ? 15 : 30;

  push();
  // Title
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(22));
  textStyle(BOLD);
  let titleLines = wrapText(page.title, width - margin * 2);
  for (let i = 0; i < titleLines.length; i++) {
    text(titleLines[i], width/2, 40 + i * ts(26));
  }
  textStyle(NORMAL);

  // Body text
  let bodyY = 40 + titleLines.length * ts(26) + 15;
  textSize(ts(13));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  let bodyW = min(width - margin * 2, 600);
  let lines = wrapText(page.body, bodyW);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], width/2, bodyY + i * ts(20));
  }

  let contentY = bodyY + lines.length * ts(20) + 15;

  // Show dimensions grid on page 2
  if (page.showDimensions) {
    let cols = isMobile ? 2 : (isTablet ? 2 : 4);
    let cardW = isMobile ? (width - margin * 2 - 10) / 2 : (isTablet ? (width - 60) / 2 : 200);
    let cardH = isMobile ? 55 : 70;
    let gap = isMobile ? 8 : 15;
    let startX = (width - (cols * cardW + (cols-1) * gap)) / 2;

    for (let i = 0; i < 8; i++) {
      let col = floor(i % cols);
      let row = floor(i / cols);
      let cx = startX + col * (cardW + gap);
      let cy = contentY + row * (cardH + gap);
      let dimCol = DIM_COLORS[DIM_NAMES[i]];

      // Card
      drawRoundedBox(cx, cy, cardW, cardH, 8, [...dimCol, 25], dimCol);

      // Icon and name
      fill(dimCol[0], dimCol[1], dimCol[2]);
      textAlign(LEFT, TOP);
      textSize(ts(16));
      text(DIM_ICONS[i], cx + 8, cy + 6);
      textSize(ts(12));
      textStyle(BOLD);
      text(DIM_LABELS[i], cx + 26, cy + 8);
      textStyle(NORMAL);

      // Description
      if (!isMobile || cardH >= 55) {
        textSize(ts(9));
        fill(C.textLight[0], C.textLight[1], C.textLight[2]);
        let desc = getDimensionDesc(i);
        text(desc, cx + 8, cy + 28, cardW - 16, cardH - 32);
      }
    }
    let rows = ceil(8 / cols);
    contentY += rows * (cardH + gap) + 15;
  }

  // Highlight text
  if (page.highlight) {
    textAlign(CENTER, CENTER);
    fill(C.accent[0], C.accent[1], C.accent[2]);
    textSize(ts(14));
    textStyle(BOLD);
    let hlLines = wrapText(page.highlight, width - margin * 2);
    let hlY = min(contentY + 10, height - 100);
    for (let i = 0; i < hlLines.length; i++) {
      text(hlLines[i], width/2, hlY + i * ts(18));
    }
    textStyle(NORMAL);
  }

  // Page dots
  let dotsY = height - 55;
  for (let i = 0; i < 3; i++) {
    fill(i === GS.introPage ? C.accent : C.border);
    noStroke();
    ellipse(width/2 - 20 + i * 20, dotsY, 8);
  }

  pop();

  // Navigation buttons
  let btnY = height - 75;
  let btnH = 48;
  buttons = [];
  if (GS.introPage > 0) {
    buttons.push(new Btn(margin, btnY, min(100, width * 0.25), btnH, '← Back', 'intro_back', C.border));
  }
  if (GS.introPage < 2) {
    buttons.push(new Btn(width - margin - min(100, width * 0.25), btnY, min(100, width * 0.25), btnH, 'Next →', 'intro_next', C.accent));
  } else {
    let startW = min(160, width * 0.4);
    buttons.push(new Btn(width - margin - startW, btnY, startW, btnH, 'Start Week →', 'start_game', C.accent));
  }
  for (let b of buttons) b.draw();
}

function getDimensionDesc(i) {
  const descs = [
    'Exercise, nutrition, sleep & health',
    'Stress management, self-care & awareness',
    'Relationships, community & belonging',
    'Learning, creativity & critical thinking',
    'Purpose, mindfulness & values',
    'Career satisfaction & work-life balance',
    'Budgeting, literacy & financial security',
    'Sustainability, spaces & connection to nature'
  ];
  return descs[i];
}

// ═══════════════════════════════════════════════════════════════
// MAIN GAMEPLAY — Scenario Display + Choice (Responsive)
// ═══════════════════════════════════════════════════════════════

function drawPlaying() {
  background(C.bg[0], C.bg[1], C.bg[2]);

  let topH = drawTopBar();
  updateTypewriter();

  let scenario = GS.currentScenario;
  if (!scenario) return;

  if (isMobile || isTablet) {
    drawPlayingMobile(topH, scenario);
  } else {
    drawPlayingDesktop(topH, scenario);
  }
}

function drawPlayingMobile(topH, scenario) {
  let margin = 10;
  let scoreBarH = 48;

  // Score bar below top bar
  drawScoreBar(topH);
  let contentTop = topH + scoreBarH + 5;

  // Wheel overlay button
  let wheelBtnW = 36;
  let wheelBtnH = 36;
  let wheelBtnX = width - margin - wheelBtnW;
  let wheelBtnY = topH + 6;

  push();
  fill(C.accent[0], C.accent[1], C.accent[2], 180);
  noStroke();
  rect(wheelBtnX, wheelBtnY, wheelBtnW, wheelBtnH, 8);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  text('🎯', wheelBtnX + wheelBtnW/2, wheelBtnY + wheelBtnH/2);
  pop();

  // Content area: scenario + choices
  let panelX = margin;
  let panelY = contentTop;
  let panelW = width - margin * 2;
  let panelH = height - contentTop - margin;

  push();
  drawRoundedBox(panelX, panelY, panelW, panelH, 12, C.surface, C.border);

  // Clip to panel
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.roundRect(panelX, panelY, panelW, panelH, 12);
  drawingContext.clip();

  push();
  translate(0, -playScrollY);

  // Scenario narrative
  fill(C.text[0], C.text[1], C.text[2]);
  textAlign(LEFT, TOP);
  textSize(ts(14));
  let wrapped = wrapText(GS.ui.typewriterText, panelW - 30);
  let lineH = ts(20);
  for (let i = 0; i < wrapped.length; i++) {
    text(wrapped[i], panelX + 15, panelY + 15 + i * lineH);
  }

  let contentBottom = panelY + 15 + wrapped.length * lineH + 20;

  // Choice buttons
  if (GS.ui.choicesVisible && !GS.selectedChoice && !GS.choiceResult) {
    let choices = scenario.choices;
    let btnY = contentBottom;

    buttons = [];
    for (let i = 0; i < choices.length; i++) {
      let btnH = isMobile ? 56 : 52;
      let by = btnY + i * (btnH + 8);

      let isHover = GS.ui.hoverBtn === i;
      let dimCol = getMainEffectColor(choices[i].effects);

      push();
      let a = GS.ui.choiceAlpha;
      if (isHover) {
        fill(dimCol[0], dimCol[1], dimCol[2], a * 0.15);
        stroke(dimCol[0], dimCol[1], dimCol[2], a * 0.6);
      } else {
        fill(255, 255, 255, a * 0.8);
        stroke(C.border[0], C.border[1], C.border[2], a);
      }
      strokeWeight(1.5);
      rect(panelX + 10, by, panelW - 20, btnH, 8);

      // Choice text
      fill(C.text[0], C.text[1], C.text[2], a);
      noStroke();
      textAlign(LEFT, CENTER);
      textSize(ts(12));
      let choiceLines = wrapText(choices[i].text, panelW - 50);
      for (let j = 0; j < choiceLines.length; j++) {
        text(choiceLines[j], panelX + 22, by + btnH/2 - (choiceLines.length-1) * ts(8) + j * ts(16));
      }

      // Effect hints
      let hints = getEffectHints(choices[i].effects);
      textAlign(RIGHT, CENTER);
      textSize(ts(8));
      fill(C.textLight[0], C.textLight[1], C.textLight[2], a * 0.7);
      text(hints, panelX + panelW - 18, by + btnH - 10);

      pop();

      buttons.push({ x: panelX + 10, y: by - playScrollY, w: panelW - 20, h: btnH, idx: i, scrollAdjust: playScrollY });
      contentBottom = by + btnH + 8;
    }

    // Wheel button (added to buttons for click detection)
    buttons.push({ x: wheelBtnX, y: wheelBtnY, w: wheelBtnW, h: wheelBtnH, action: 'toggle_wheel' });
  }

  // Choice result display
  if (GS.choiceResult) {
    GS.ui.resultTimer++;
    let a = min(GS.ui.resultTimer * 6, 255);

    let wrapped2 = wrapText(GS.choiceResult, panelW - 40);
    let rY = contentBottom;

    push();
    fill(C.surfaceAlt[0], C.surfaceAlt[1], C.surfaceAlt[2], a);
    stroke(C.accent[0], C.accent[1], C.accent[2], a * 0.5);
    strokeWeight(1);
    rect(panelX + 12, rY, panelW - 24, wrapped2.length * ts(20) + 20, 8);

    fill(C.text[0], C.text[1], C.text[2], a);
    textAlign(LEFT, TOP);
    textSize(ts(13));
    for (let i = 0; i < wrapped2.length; i++) {
      text(wrapped2[i], panelX + 22, rY + 10 + i * ts(20));
    }
    pop();

    contentBottom = rY + wrapped2.length * ts(20) + 30;

    // Continue button after delay
    if (GS.ui.resultTimer > 60) {
      let contBtnW = min(140, width * 0.4);
      let contBtnY = contentBottom + 5;
      let contBtn = new Btn(width/2 - contBtnW/2, contBtnY, contBtnW, 48, 'Continue →', 'continue', C.accent);
      contBtn.draw();
      buttons.push({ ...contBtn, action: 'continue', scrollAdjust: playScrollY });
      contentBottom = contBtnY + 55;
    }
  }

  // Calculate scroll bounds
  playMaxScroll = max(0, contentBottom + 20 - (panelY + panelH));

  pop();
  drawingContext.restore();
  pop();

  // Draw wheel overlay if active
  if (showWheelOverlay) {
    drawWheelOverlay();
  }
}

function drawPlayingDesktop(topH, scenario) {
  // Bottom score bar
  let bottomH = 40;
  push();
  fill(C.surfaceAlt[0], C.surfaceAlt[1], C.surfaceAlt[2]);
  noStroke();
  rect(0, height - bottomH, width, bottomH);
  stroke(C.border[0], C.border[1], C.border[2]);
  strokeWeight(1);
  line(0, height - bottomH, width, height - bottomH);
  let spacing = width / 8;
  for (let i = 0; i < 8; i++) {
    let x = spacing * i + spacing / 2;
    let y = height - 20;
    let dim = DIM_NAMES[i];
    let col = DIM_COLORS[dim];
    let val = Math.round(GS.wellness[dim]);
    fill(col[0], col[1], col[2]);
    noStroke();
    ellipse(x - 30, y, 8);
    fill(C.text[0], C.text[1], C.text[2]);
    textAlign(LEFT, CENTER);
    textSize(10);
    text(DIM_LABELS[i].substring(0, 4) + ': ' + val, x - 24, y);
  }
  pop();

  // Left panel — Scenario and choices
  let panelX = 20;
  let panelY = topH + 10;
  let panelW = 510;
  let panelH = height - topH - 10 - bottomH - 10;

  push();
  drawRoundedBox(panelX, panelY, panelW, panelH, 12, C.surface, C.border);

  fill(C.text[0], C.text[1], C.text[2]);
  textAlign(LEFT, TOP);
  textSize(14);
  let wrapped = wrapText(GS.ui.typewriterText, panelW - 40);
  for (let i = 0; i < wrapped.length; i++) {
    text(wrapped[i], panelX + 20, panelY + 20 + i * 22);
  }

  // Choice buttons
  if (GS.ui.choicesVisible && !GS.selectedChoice && !GS.choiceResult) {
    let choices = scenario.choices;
    let btnY = panelY + 20 + wrapped.length * 22 + 25;

    buttons = [];
    for (let i = 0; i < choices.length; i++) {
      let btnH = 50;
      let by = btnY + i * (btnH + 10);
      if (by + btnH > panelY + panelH - 10) break;

      let isHover = GS.ui.hoverBtn === i;
      let dimCol = getMainEffectColor(choices[i].effects);

      push();
      let a = GS.ui.choiceAlpha;
      if (isHover) {
        fill(dimCol[0], dimCol[1], dimCol[2], a * 0.15);
        stroke(dimCol[0], dimCol[1], dimCol[2], a * 0.6);
      } else {
        fill(255, 255, 255, a * 0.8);
        stroke(C.border[0], C.border[1], C.border[2], a);
      }
      strokeWeight(1.5);
      rect(panelX + 15, by, panelW - 30, btnH, 8);

      fill(C.text[0], C.text[1], C.text[2], a);
      noStroke();
      textAlign(LEFT, CENTER);
      textSize(12);
      let choiceLines = wrapText(choices[i].text, panelW - 70);
      for (let j = 0; j < choiceLines.length; j++) {
        text(choiceLines[j], panelX + 35, by + btnH/2 - (choiceLines.length-1)*8 + j*16);
      }

      let hints = getEffectHints(choices[i].effects);
      textAlign(RIGHT, CENTER);
      textSize(9);
      fill(C.textLight[0], C.textLight[1], C.textLight[2], a * 0.7);
      text(hints, panelX + panelW - 40, by + btnH - 12);

      pop();

      buttons.push({ x: panelX + 15, y: by, w: panelW - 30, h: btnH, idx: i });
    }
  }

  // Choice result display
  if (GS.choiceResult) {
    GS.ui.resultTimer++;
    let a = min(GS.ui.resultTimer * 6, 255);

    let wrapped2 = wrapText(GS.choiceResult, panelW - 60);
    let rY = panelY + panelH - 30 - wrapped2.length * 20;

    push();
    fill(C.surfaceAlt[0], C.surfaceAlt[1], C.surfaceAlt[2], a);
    stroke(C.accent[0], C.accent[1], C.accent[2], a * 0.5);
    strokeWeight(1);
    rect(panelX + 20, rY - 15, panelW - 40, wrapped2.length * 20 + 25, 8);

    fill(C.text[0], C.text[1], C.text[2], a);
    textAlign(LEFT, TOP);
    textSize(13);
    for (let i = 0; i < wrapped2.length; i++) {
      text(wrapped2[i], panelX + 35, rY + i * 20);
    }
    pop();

    if (GS.ui.resultTimer > 60) {
      let contBtn = new Btn(panelX + panelW/2 - 60, panelY + panelH - 55, 120, 36, 'Continue →', 'continue', C.accent);
      contBtn.draw();
      buttons.push(contBtn);
    }
  }
  pop();

  // Right panel — Wellness Wheel
  let wheelCX = 540 + (width - 540) / 2;
  let wheelCY = topH + (height - topH - bottomH) / 2;
  drawWellnessWheel(wheelCX, wheelCY, 140, true, true);
}

// Wheel overlay for mobile
function drawWheelOverlay() {
  push();
  fill(0, 0, 0, 140);
  rect(0, 0, width, height);

  // White card
  let cardW = min(width - 30, 400);
  let cardH = min(height * 0.7, 420);
  let cx = (width - cardW) / 2;
  let cy = (height - cardH) / 2;

  drawRoundedBox(cx, cy, cardW, cardH, 16, C.surface, C.border);

  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(18));
  textStyle(BOLD);
  text('Wellness Wheel', cx + cardW/2, cy + 25);
  textStyle(NORMAL);

  let wheelR = min(cardW * 0.3, cardH * 0.3, 110);
  drawWellnessWheel(cx + cardW/2, cy + cardH/2 + 5, wheelR, true, true);

  // Close button
  let closeBtn = new Btn(cx + cardW/2 - 50, cy + cardH - 60, 100, 48, 'Close', 'close_wheel', C.accent);
  closeBtn.draw();
  buttons.push(closeBtn);

  pop();
}

function getMainEffectColor(effects) {
  let maxDim = '';
  let maxVal = 0;
  for (let d in effects) {
    if (Math.abs(effects[d]) > maxVal) {
      maxVal = Math.abs(effects[d]);
      maxDim = d;
    }
  }
  return DIM_COLORS[maxDim] || C.accent;
}

function getEffectHints(effects) {
  let parts = [];
  for (let d in effects) {
    let idx = DIM_NAMES.indexOf(d);
    if (idx >= 0) {
      let icon = effects[d] > 0 ? '↑' : '↓';
      parts.push(DIM_LABELS[idx].substring(0,4) + icon);
    }
  }
  return parts.join(' · ');
}

// ═══════════════════════════════════════════════════════════════
// RANDOM EVENT DISPLAY
// ═══════════════════════════════════════════════════════════════

function drawEvent() {
  drawPlaying();

  if (!GS.activeEvent) return;

  push();
  fill(0, 0, 0, 120);
  rect(0, 0, width, height);

  let margin = isMobile ? 15 : 0;
  let cardW = min(500, width - margin * 2);
  let cardH = min(350, height * 0.55);
  let cx = (width - cardW) / 2;
  let cy = (height - cardH) / 2;

  drawRoundedBox(cx, cy, cardW, cardH, 14, C.surface, C.accent);

  // Event badge
  fill(C.accent[0], C.accent[1], C.accent[2]);
  noStroke();
  rect(cx + cardW/2 - 60, cy - 15, 120, 30, 15);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(ts(12));
  textStyle(BOLD);
  text('⚡ Random Event!', cx + cardW/2, cy);
  textStyle(NORMAL);

  // Event text
  fill(C.text[0], C.text[1], C.text[2]);
  textAlign(LEFT, TOP);
  textSize(ts(13));
  let lines = wrapText(GS.activeEvent.text, cardW - 30);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], cx + 15, cy + 30 + i * ts(20));
  }

  // Event choices
  let choiceY = cy + 30 + lines.length * ts(20) + 15;
  buttons = [];
  let choices = GS.activeEvent.choices;
  for (let i = 0; i < choices.length; i++) {
    let btnW = cardW - 40;
    let btnH = isMobile ? 48 : 42;
    let by = choiceY + i * (btnH + 8);

    let isHover = GS.ui.hoverBtn === i;
    fill(isHover ? [C.accent[0], C.accent[1], C.accent[2], 30] : [255, 255, 255, 200]);
    stroke(C.border[0], C.border[1], C.border[2]);
    strokeWeight(1);
    rect(cx + 20, by, btnW, btnH, 8);

    fill(C.text[0], C.text[1], C.text[2]);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(ts(12));
    let choiceLines = wrapText(choices[i].text, btnW - 20);
    for (let j = 0; j < choiceLines.length; j++) {
      text(choiceLines[j], cx + 30, by + btnH/2 - (choiceLines.length-1) * ts(7) + j * ts(15));
    }

    buttons.push({ x: cx + 20, y: by, w: btnW, h: btnH, idx: i, isEvent: true });
  }

  pop();
}

// ═══════════════════════════════════════════════════════════════
// DAY END TRANSITION
// ═══════════════════════════════════════════════════════════════

function drawDayEnd() {
  background(C.bg[0], C.bg[1], C.bg[2]);

  GS.ui.dayTransitionTimer++;

  push();
  textAlign(CENTER, CENTER);

  // Day complete header
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(26));
  textStyle(BOLD);
  text(DAY_NAMES[GS.day - 1] + ' Complete', width/2, height * 0.1);
  textStyle(NORMAL);

  // Mini wellness wheel
  let wheelR = isMobile ? min(width * 0.25, 90) : 110;
  drawWellnessWheel(width/2, height * 0.38, wheelR, true, true);

  // Day summary narrative
  if (GS.daySummary) {
    textSize(ts(13));
    fill(C.textLight[0], C.textLight[1], C.textLight[2]);
    let lines = wrapText(GS.daySummary, min(width - 30, 500));
    let summaryY = height * 0.62;
    for (let i = 0; i < lines.length; i++) {
      text(lines[i], width/2, summaryY + i * ts(20));
    }
  }

  // Show changes
  let changeY = height * 0.74;
  let spacing = width / 8;
  for (let i = 0; i < 8; i++) {
    let x = spacing * i + spacing / 2;
    let dim = DIM_NAMES[i];
    let col = DIM_COLORS[dim];
    let val = Math.round(GS.wellness[dim]);

    fill(col[0], col[1], col[2]);
    textAlign(CENTER, TOP);
    textSize(ts(9));
    textStyle(BOLD);
    text(isMobile ? DIM_LABELS[i].substring(0, 3) : DIM_LABELS[i].substring(0, 5), x, changeY);
    textStyle(NORMAL);
    textSize(ts(14));
    text(val, x, changeY + ts(13));
  }

  pop();

  // Continue button
  if (GS.ui.dayTransitionTimer > 40) {
    let label = GS.day < 7 ? 'Next Day →' : 'View Report →';
    let btnW = min(180, width * 0.5);
    buttons = [new Btn(width/2 - btnW/2, height * 0.87, btnW, 52, label, 'next_day', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

// ═══════════════════════════════════════════════════════════════
// MINI-ACTIVITIES (Responsive)
// ═══════════════════════════════════════════════════════════════

// ── Breathing Bubble ────────────────────────────────────────
function initBreathingBubble() {
  GS.miniActivity = {
    type: 'breathingBubble',
    timer: 0,
    maxTime: 60 * 12,
    cycle: 0,
    maxCycles: 4,
    phase: 'in',
    guideRadius: 40,
    playerRadius: 40,
    playerHolding: false,
    matchScore: 0,
    matchSamples: 0,
    complete: false
  };
}

function updateBreathingBubble() {
  let ma = GS.miniActivity;
  ma.timer++;

  let maxR = isMobile ? min(width * 0.28, 110) : 130;
  let minR = isMobile ? 30 : 40;

  let cycleLen = 60 * 4;
  let t = (ma.timer % (cycleLen * 2));
  if (t < cycleLen) {
    ma.phase = 'in';
    ma.guideRadius = map(t, 0, cycleLen, minR, maxR);
  } else {
    ma.phase = 'out';
    ma.guideRadius = map(t, cycleLen, cycleLen * 2, maxR, minR);
  }

  if (ma.playerHolding) {
    ma.playerRadius = min(ma.playerRadius + 1.5, maxR + 10);
  } else {
    ma.playerRadius = max(ma.playerRadius - 1.5, minR - 5);
  }

  let diff = abs(ma.guideRadius - ma.playerRadius);
  ma.matchScore += max(0, 1 - diff / 50);
  ma.matchSamples++;

  ma.cycle = floor(ma.timer / (cycleLen * 2));
  if (ma.timer >= ma.maxTime) {
    ma.complete = true;
  }
}

function drawBreathingBubble() {
  background(C.bg[0], C.bg[1], C.bg[2]);
  let ma = GS.miniActivity;

  push();
  textAlign(CENTER, CENTER);

  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(20));
  textStyle(BOLD);
  text('Breathing Exercise', width/2, height * 0.06);
  textStyle(NORMAL);

  textSize(ts(12));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text(isMobile ? 'Tap & hold to breathe in. Release to breathe out.' : 'Hold mouse button to breathe in. Release to breathe out.', width/2, height * 0.11);

  // Breath phase text
  textSize(ts(20));
  fill(C.accent[0], C.accent[1], C.accent[2]);
  text(ma.phase === 'in' ? 'Breathe In...' : 'Breathe Out...', width/2, height * 0.17);

  let centerY = height * 0.48;

  // Guide bubble
  noFill();
  stroke(C.border[0], C.border[1], C.border[2], 100);
  strokeWeight(2);
  ellipse(width/2, centerY, ma.guideRadius * 2);

  // Player bubble
  let matchQuality = 1 - abs(ma.guideRadius - ma.playerRadius) / 100;
  let col = lerpColor(
    color(200, 100, 100),
    color(100, 180, 140),
    constrain(matchQuality, 0, 1)
  );
  fill(red(col), green(col), blue(col), 60);
  stroke(red(col), green(col), blue(col), 150);
  strokeWeight(2);
  ellipse(width/2, centerY, ma.playerRadius * 2);

  noStroke();
  fill(red(col), green(col), blue(col), 30);
  ellipse(width/2, centerY, ma.playerRadius * 1.5);

  // Calming particles
  if (frameCount % 5 === 0) {
    let angle = random(TWO_PI);
    emitParticles(
      width/2 + cos(angle) * ma.playerRadius,
      centerY + sin(angle) * ma.playerRadius,
      [red(col), green(col), blue(col)], 1,
      { vx: () => cos(angle) * 0.5, vy: () => sin(angle) * 0.5 - 0.3, life: 40, size: 4 }
    );
  }

  // Progress bar
  let barW = min(300, width * 0.7);
  let progress = ma.timer / ma.maxTime;
  fill(C.border[0], C.border[1], C.border[2]);
  rect(width/2 - barW/2, height - 80, barW, 8, 4);
  fill(C.accent[0], C.accent[1], C.accent[2]);
  rect(width/2 - barW/2, height - 80, barW * progress, 8, 4);

  textSize(ts(11));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Breath ' + min(ma.cycle + 1, ma.maxCycles) + ' of ' + ma.maxCycles, width/2, height - 60);

  pop();
  drawParticles();

  if (ma.complete) {
    let btnW = min(140, width * 0.4);
    buttons = [new Btn(width/2 - btnW/2, height - 55, btnW, 48, 'Done ✓', 'mini_done', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

// ── Gratitude Garden ────────────────────────────────────────
function initGratitudeGarden() {
  GS.miniActivity = {
    type: 'gratitudeGarden',
    timer: 0,
    maxTime: 60 * 30,
    flowers: [],
    inputText: '',
    goal: 5,
    complete: false,
    inputActive: true
  };
  let inp = document.getElementById('textInput');
  if (inp) {
    inp.value = '';
    inp.classList.add('active');
    setTimeout(() => inp.focus(), 100);
  }
}

function updateGratitudeGarden() {
  let ma = GS.miniActivity;
  ma.timer++;

  for (let f of ma.flowers) {
    if (f.growProgress < 1) f.growProgress += 0.02;
  }

  let inp = document.getElementById('textInput');
  if (inp) ma.inputText = inp.value;

  if (ma.flowers.length >= ma.goal || ma.timer >= ma.maxTime) {
    ma.complete = true;
    ma.inputActive = false;
    if (inp) inp.classList.remove('active');
  }
}

function drawGratitudeGarden() {
  let ma = GS.miniActivity;
  let groundY = height - height * 0.22;

  // Sky gradient
  for (let y = 0; y < groundY; y++) {
    let t = y / groundY;
    let c = lerpColor(color(200, 220, 240), color(245, 239, 230), t);
    stroke(c);
    line(0, y, width, y);
  }

  // Ground
  noStroke();
  fill(120, 160, 80);
  rect(0, groundY, width, height - groundY);
  fill(100, 140, 65);
  rect(0, groundY, width, 15, 10, 10, 0, 0);

  push();
  textAlign(CENTER, CENTER);

  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(18));
  textStyle(BOLD);
  text('Gratitude Garden', width/2, height * 0.04);
  textStyle(NORMAL);

  textSize(ts(11));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  let instrLines = wrapText('Type something you\'re grateful for and press Enter to plant a flower', width * 0.9);
  for (let i = 0; i < instrLines.length; i++) {
    text(instrLines[i], width/2, height * 0.08 + i * ts(16));
  }

  // Draw flowers
  for (let f of ma.flowers) {
    drawFlower(f.x, groundY, f.color, f.growProgress, f.text);
  }

  // On mobile, the HTML input is shown instead of canvas input
  if (!isMobile) {
    // Canvas input box (for desktop)
    fill(255, 255, 255, 220);
    stroke(C.accent[0], C.accent[1], C.accent[2]);
    strokeWeight(2);
    let inputW = min(400, width * 0.8);
    rect(width/2 - inputW/2, height * 0.14, inputW, 36, 8);

    fill(C.text[0], C.text[1], C.text[2]);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(ts(12));
    let displayText = ma.inputText || 'I\'m grateful for...';
    if (!ma.inputText) fill(C.textLight[0], C.textLight[1], C.textLight[2], 150);
    text(displayText, width/2 - inputW/2 + 10, height * 0.14 + 18);
  }

  // Counter
  textAlign(CENTER, CENTER);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  textSize(ts(11));
  text(ma.flowers.length + ' / ' + ma.goal + ' flowers planted', width/2, isMobile ? height * 0.12 : height * 0.21);

  pop();
  drawParticles();

  if (ma.complete) {
    let inp = document.getElementById('textInput');
    if (inp) inp.classList.remove('active');
    let btnW = min(140, width * 0.4);
    buttons = [new Btn(width/2 - btnW/2, height * 0.22, btnW, 48, 'Done ✓', 'mini_done', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

function drawFlower(x, groundY, col, progress, label) {
  if (progress <= 0) return;
  let p = constrain(progress, 0, 1);
  let stemH = min(60, height * 0.1) * p;
  let petalSize = (isMobile ? 10 : 12) * p;

  push();
  stroke(80, 140, 60);
  strokeWeight(3);
  line(x, groundY, x, groundY - stemH);

  if (p > 0.3) {
    noStroke();
    fill(90, 150, 60);
    ellipse(x - 8, groundY - stemH * 0.4, 14 * p, 7 * p);
    ellipse(x + 10, groundY - stemH * 0.6, 14 * p, 7 * p);
  }

  if (p > 0.5) {
    noStroke();
    fill(col[0], col[1], col[2], 200 * p);
    for (let a = 0; a < 6; a++) {
      let angle = a * (TWO_PI / 6);
      ellipse(x + cos(angle) * petalSize * 0.7, groundY - stemH + sin(angle) * petalSize * 0.7, petalSize, petalSize);
    }
    fill(250, 220, 100);
    ellipse(x, groundY - stemH, petalSize * 0.6);
  }

  if (p > 0.8 && label) {
    fill(C.text[0], C.text[1], C.text[2], 180);
    textAlign(CENTER, BOTTOM);
    textSize(ts(8));
    noStroke();
    let lines = wrapText(label, isMobile ? 60 : 80);
    for (let i = 0; i < min(lines.length, 2); i++) {
      text(lines[i], x, groundY - stemH - 12 + i * ts(10));
    }
  }
  pop();
}

// ── Budget Balancer ─────────────────────────────────────────
function initBudgetBalancer() {
  let cats = WELLNESS_CONFIG.version === 'student'
    ? ['Housing','Food','Transport','Entertain.','Savings','Supplies']
    : ['Housing','Food','Transport','Entertain.','Savings','Prof. Dev.'];
  GS.miniActivity = {
    type: 'budgetBalancer',
    timer: 0,
    maxTime: 60 * 25,
    categories: cats.map((c, i) => ({ label: c, value: floor(100/6), dragging: false })),
    totalBudget: WELLNESS_CONFIG.version === 'student' ? 1000 : 5000,
    complete: false,
    submitted: false
  };
  let sum = GS.miniActivity.categories.reduce((s, c) => s + c.value, 0);
  GS.miniActivity.categories[0].value += (100 - sum);
}

function updateBudgetBalancer() {
  let ma = GS.miniActivity;
  ma.timer++;
  if (ma.timer >= ma.maxTime && !ma.submitted) {
    ma.submitted = true;
    ma.complete = true;
  }
}

function drawBudgetBalancer() {
  background(C.bg[0], C.bg[1], C.bg[2]);
  let ma = GS.miniActivity;
  let margin = isMobile ? 12 : 20;

  push();
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(18));
  textStyle(BOLD);
  text('Budget Balancer', width/2, height * 0.04);
  textStyle(NORMAL);

  textSize(ts(11));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  let instrLines = wrapText('Drag the sliders to allocate your monthly budget of $' + ma.totalBudget, width * 0.9);
  for (let i = 0; i < instrLines.length; i++) {
    text(instrLines[i], width/2, height * 0.08 + i * ts(16));
  }

  // Sliders
  let labelW = isMobile ? 70 : 120;
  let valueW = isMobile ? 55 : 80;
  let sx = margin + labelW;
  let sw = width - margin * 2 - labelW - valueW;
  let sy = height * 0.15;
  let sh = isMobile ? max(height * 0.1, 55) : 65;

  for (let i = 0; i < ma.categories.length; i++) {
    let cat = ma.categories[i];
    let y = sy + i * sh;
    let dollars = floor(cat.value / 100 * ma.totalBudget);

    // Label
    fill(C.text[0], C.text[1], C.text[2]);
    textAlign(RIGHT, CENTER);
    textSize(ts(12));
    text(cat.label, sx - 10, y + 15);

    // Dollar amount
    textSize(ts(10));
    fill(C.textLight[0], C.textLight[1], C.textLight[2]);
    textAlign(LEFT, CENTER);
    text('$' + dollars, sx + sw + 10, y + 15);

    // Track
    fill(C.border[0], C.border[1], C.border[2]);
    noStroke();
    rect(sx, y + 10, sw, 10, 5);

    // Filled portion
    let col = DIM_COLORS[DIM_NAMES[i % 8]];
    fill(col[0], col[1], col[2], 180);
    rect(sx, y + 10, sw * cat.value / 100, 10, 5);

    // Handle (bigger for touch)
    let hx = sx + sw * cat.value / 100;
    let handleSize = isMobile ? 26 : 20;
    fill(cat.dragging ? C.accentDark : C.accent);
    stroke(255);
    strokeWeight(2);
    ellipse(hx, y + 15, handleSize);
    noStroke();
  }

  // Total indicator
  let total = ma.categories.reduce((s, c) => s + c.value, 0);
  textAlign(CENTER, CENTER);
  textSize(ts(13));
  fill(total === 100 ? [100, 160, 100] : [200, 100, 80]);
  textStyle(BOLD);
  text('Total: ' + total + '%' + (total === 100 ? ' ✓' : ' (must be 100%)'), width/2, sy + ma.categories.length * sh + 10);
  textStyle(NORMAL);

  // Progress bar
  let barW = min(300, width * 0.7);
  let progress = ma.timer / ma.maxTime;
  fill(C.border[0], C.border[1], C.border[2]);
  noStroke();
  rect(width/2 - barW/2, height - 75, barW, 8, 4);
  fill(C.accent[0], C.accent[1], C.accent[2]);
  rect(width/2 - barW/2, height - 75, barW * progress, 8, 4);

  textSize(ts(10));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Time remaining: ' + max(0, ceil((ma.maxTime - ma.timer) / 60)) + 's', width/2, height - 58);

  pop();

  if (ma.complete || total === 100) {
    if (!ma.complete) ma.complete = true;
    let btnW = min(140, width * 0.4);
    buttons = [new Btn(width/2 - btnW/2, height - 52, btnW, 48, 'Submit ✓', 'mini_done', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

// ── Social Connection Web ───────────────────────────────────
function initSocialWeb() {
  let labels = WELLNESS_CONFIG.version === 'student'
    ? ['Friend','Family','Classmate','Mentor','Club','Roommate','Study Buddy','Self']
    : ['Colleague','Family','Manager','Mentor','Friend','Team','Community','Self'];

  let nodeRadius = isMobile ? min(width * 0.28, 110) : 150;
  let nodes = [];
  for (let i = 0; i < labels.length; i++) {
    let angle = (i / labels.length) * TWO_PI - HALF_PI;
    let r = i === labels.length - 1 ? 0 : nodeRadius;
    nodes.push({
      label: labels[i],
      x: width/2 + cos(angle) * r,
      y: height/2 + sin(angle) * r - 20,
      connections: [],
      isSelf: i === labels.length - 1
    });
  }

  GS.miniActivity = {
    type: 'socialWeb',
    timer: 0,
    maxTime: 60 * 20,
    nodes: nodes,
    connections: [],
    selectedNode: null,
    goal: 6,
    complete: false
  };
}

function updateSocialWeb() {
  let ma = GS.miniActivity;
  ma.timer++;
  if (ma.connections.length >= ma.goal || ma.timer >= ma.maxTime) {
    ma.complete = true;
  }
}

function drawSocialWeb() {
  background(C.bg[0], C.bg[1], C.bg[2]);
  let ma = GS.miniActivity;

  push();
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(18));
  textStyle(BOLD);
  text('Social Connection Web', width/2, height * 0.04);
  textStyle(NORMAL);
  textSize(ts(11));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Tap two people to connect them. Build ' + ma.goal + ' connections!', width/2, height * 0.08);

  // Draw connections
  for (let conn of ma.connections) {
    let a = ma.nodes[conn[0]];
    let b = ma.nodes[conn[1]];
    stroke(C.accent[0], C.accent[1], C.accent[2], 150);
    strokeWeight(2);
    line(a.x, a.y, b.x, b.y);
  }

  // Draw line from selected to touch/mouse
  if (ma.selectedNode !== null) {
    let n = ma.nodes[ma.selectedNode];
    stroke(C.accent[0], C.accent[1], C.accent[2], 80);
    strokeWeight(1.5);
    line(n.x, n.y, mouseX, mouseY);
  }

  // Draw nodes
  let nodeSize = isMobile ? 30 : 35;
  for (let i = 0; i < ma.nodes.length; i++) {
    let n = ma.nodes[i];
    let connCount = ma.connections.filter(c => c[0] === i || c[1] === i).length;
    let ns = nodeSize + connCount * 4;
    let isSelected = ma.selectedNode === i;
    let isHover = dist(mouseX, mouseY, n.x, n.y) < ns/2;

    let col = n.isSelf ? C.accent : DIM_COLORS[DIM_NAMES[i % 8]];

    if (connCount > 0) {
      noStroke();
      fill(col[0], col[1], col[2], 20 + sin(frameCount * 0.05) * 10);
      ellipse(n.x, n.y, ns + 15);
    }

    fill(isSelected ? [...col, 255] : (isHover ? [...col, 200] : [...col, 150]));
    stroke(col[0], col[1], col[2]);
    strokeWeight(isSelected ? 3 : 1.5);
    ellipse(n.x, n.y, ns);

    fill(255);
    noStroke();
    textSize(ts(9));
    textStyle(BOLD);
    text(n.label, n.x, n.y);
    textStyle(NORMAL);
  }

  textSize(ts(11));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text(ma.connections.length + ' / ' + ma.goal + ' connections', width/2, height - 55);

  pop();
  drawParticles();

  if (ma.complete) {
    let btnW = min(140, width * 0.4);
    buttons = [new Btn(width/2 - btnW/2, height - 50, btnW, 48, 'Done ✓', 'mini_done', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

// ── Mindful Moment ──────────────────────────────────────────
function initMindfulMoment() {
  GS.miniActivity = {
    type: 'mindfulMoment',
    timer: 0,
    maxTime: 60 * 20,
    changes: [],
    activeChange: null,
    changeTimer: 0,
    score: 0,
    totalChanges: 0,
    maxChanges: 8,
    complete: false,
    clouds: [{ x: width * 0.15, y: height * 0.12 }, { x: width * 0.4, y: height * 0.09 }, { x: width * 0.7, y: height * 0.13 }],
    trees: [{ x: width * 0.1 }, { x: width * 0.3 }, { x: width * 0.6 }, { x: width * 0.85 }],
    birds: [],
    ripples: []
  };
  scheduleNextChange();
}

function scheduleNextChange() {
  let ma = GS.miniActivity;
  ma.changeTimer = 60 * random(2, 4);
  ma.activeChange = null;
}

function updateMindfulMoment() {
  let ma = GS.miniActivity;
  ma.timer++;

  for (let r of ma.ripples) r.radius += 0.5;
  ma.ripples = ma.ripples.filter(r => r.radius < 40);

  for (let b of ma.birds) { b.x += b.speed; b.wingPhase += 0.1; }
  ma.birds = ma.birds.filter(b => b.x < width + 50);

  if (ma.totalChanges >= ma.maxChanges || ma.timer >= ma.maxTime) {
    ma.complete = true;
    return;
  }

  ma.changeTimer--;
  if (ma.changeTimer <= 0 && !ma.activeChange) {
    let types = ['bird', 'cloud_color', 'leaf', 'ripple', 'star'];
    let type = types[floor(random(types.length))];
    let cx, cy;

    let waterY = height * 0.82;
    let treeTopY = height * 0.45;

    switch(type) {
      case 'bird':
        cy = random(height * 0.07, height * 0.22);
        ma.birds.push({ x: -20, y: cy, speed: 1.5, wingPhase: 0 });
        cx = width * 0.1; cy = cy;
        break;
      case 'cloud_color':
        let ci = floor(random(ma.clouds.length));
        cx = ma.clouds[ci].x; cy = ma.clouds[ci].y;
        ma.clouds[ci].highlight = true;
        break;
      case 'leaf':
        cx = random(width * 0.1, width * 0.9);
        cy = random(height * 0.3, height * 0.55);
        break;
      case 'ripple':
        cx = random(width * 0.1, width * 0.9);
        cy = random(waterY, waterY + height * 0.08);
        ma.ripples.push({ x: cx, y: cy, radius: 0 });
        break;
      case 'star':
        cx = random(width * 0.05, width * 0.95);
        cy = random(height * 0.03, height * 0.15);
        break;
    }

    ma.activeChange = { type, x: cx, y: cy, found: false, timer: 60 * 4 };
    ma.totalChanges++;
  }

  if (ma.activeChange) {
    ma.activeChange.timer--;
    if (ma.activeChange.timer <= 0) {
      for (let c of ma.clouds) c.highlight = false;
      scheduleNextChange();
    }
  }
}

function drawMindfulMoment() {
  let ma = GS.miniActivity;
  let waterY = height * 0.82;
  let treeBaseY = height * 0.62;

  // Sky
  for (let y = 0; y < waterY; y++) {
    let t = y / waterY;
    let c = lerpColor(color(170, 200, 230), color(230, 225, 210), t);
    stroke(c); line(0, y, width, y);
  }

  // Water
  for (let y = waterY; y < height; y++) {
    let t = (y - waterY) / (height - waterY);
    let c = lerpColor(color(140, 180, 200), color(100, 150, 180), t);
    stroke(c); line(0, y, width, y);
  }

  // Clouds
  let cloudScale = isMobile ? 0.7 : 1;
  for (let cl of ma.clouds) {
    noStroke();
    fill(cl.highlight ? [255, 200, 150, 200] : [255, 255, 255, 180]);
    ellipse(cl.x, cl.y, 80 * cloudScale, 35 * cloudScale);
    ellipse(cl.x - 25 * cloudScale, cl.y + 5, 50 * cloudScale, 25 * cloudScale);
    ellipse(cl.x + 25 * cloudScale, cl.y + 5, 60 * cloudScale, 28 * cloudScale);
  }

  // Trees
  let treeScale = isMobile ? 0.7 : 1;
  for (let tr of ma.trees) {
    noStroke();
    fill(90, 70, 50);
    rect(tr.x - 6 * treeScale, treeBaseY, 12 * treeScale, 80 * treeScale);
    fill(80, 140, 70);
    ellipse(tr.x, treeBaseY - 20 * treeScale, 60 * treeScale, 70 * treeScale);
    fill(70, 125, 60, 200);
    ellipse(tr.x - 15 * treeScale, treeBaseY - 10 * treeScale, 40 * treeScale, 50 * treeScale);
    ellipse(tr.x + 15 * treeScale, treeBaseY - 10 * treeScale, 40 * treeScale, 50 * treeScale);
  }

  // Birds
  for (let b of ma.birds) {
    stroke(60, 60, 80);
    strokeWeight(2);
    noFill();
    let wingY = sin(b.wingPhase) * 5;
    line(b.x - 8, b.y + wingY, b.x, b.y);
    line(b.x, b.y, b.x + 8, b.y + wingY);
  }

  // Ripples
  for (let r of ma.ripples) {
    noFill();
    stroke(200, 220, 240, map(r.radius, 0, 40, 150, 0));
    strokeWeight(1);
    ellipse(r.x, r.y, r.radius * 2, r.radius);
  }

  // Active change indicator
  if (ma.activeChange && !ma.activeChange.found) {
    let ac = ma.activeChange;
    let sparkle = sin(frameCount * 0.15) * 20 + 40;
    noStroke();
    fill(255, 255, 200, sparkle);
    ellipse(ac.x, ac.y, isMobile ? 20 : 15);
  }

  // Falling leaf
  if (ma.activeChange && ma.activeChange.type === 'leaf' && !ma.activeChange.found) {
    let ac = ma.activeChange;
    let leafY = ac.y + sin(frameCount * 0.05) * 3;
    fill(180, 140, 60, 200);
    noStroke();
    push();
    translate(ac.x, leafY);
    rotate(sin(frameCount * 0.03) * 0.3);
    ellipse(0, 0, 12, 8);
    pop();
  }

  push();
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(16));
  textStyle(BOLD);
  text('Mindful Moment', width/2, height * 0.03);
  textStyle(NORMAL);
  textSize(ts(10));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Tap on changes you notice in the scene', width/2, height * 0.06);

  textSize(ts(11));
  text('Found: ' + ma.score + ' / ' + ma.maxChanges, width/2, height - 20);
  pop();

  if (ma.complete) {
    let btnW = min(140, width * 0.4);
    buttons = [new Btn(width/2 - btnW/2, height - 55, btnW, 48, 'Done ✓', 'mini_done', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

// ── Memory Match ────────────────────────────────────────────
function initMemoryMatch() {
  let symbols = ['♥','★','♦','♣','☀','♪','✿','⚡'];
  let cards = [];
  for (let s of symbols) {
    cards.push({ symbol: s, faceUp: false, matched: false, flipAnim: 0 });
    cards.push({ symbol: s, faceUp: false, matched: false, flipAnim: 0 });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  GS.miniActivity = {
    type: 'memoryMatch',
    timer: 0,
    maxTime: 60 * 30,
    cards: cards,
    flipped: [],
    pairsFound: 0,
    totalFlips: 0,
    flipCooldown: 0,
    complete: false
  };
}

function updateMemoryMatch() {
  let ma = GS.miniActivity;
  ma.timer++;

  for (let c of ma.cards) {
    if (c.faceUp && c.flipAnim < 1) c.flipAnim = min(c.flipAnim + 0.1, 1);
    if (!c.faceUp && c.flipAnim > 0) c.flipAnim = max(c.flipAnim - 0.1, 0);
  }

  if (ma.flipped.length === 2) {
    ma.flipCooldown++;
    if (ma.flipCooldown > 40) {
      let [a, b] = ma.flipped;
      if (ma.cards[a].symbol === ma.cards[b].symbol) {
        ma.cards[a].matched = true;
        ma.cards[b].matched = true;
        ma.pairsFound++;
        emitParticles(width/2, height/2, C.accent, 10);
      } else {
        ma.cards[a].faceUp = false;
        ma.cards[b].faceUp = false;
      }
      ma.flipped = [];
      ma.flipCooldown = 0;
    }
  }

  if (ma.pairsFound >= 8 || ma.timer >= ma.maxTime) {
    ma.complete = true;
  }
}

function drawMemoryMatch() {
  background(C.bg[0], C.bg[1], C.bg[2]);
  let ma = GS.miniActivity;

  push();
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(18));
  textStyle(BOLD);
  text('Memory Match', width/2, height * 0.04);
  textStyle(NORMAL);
  textSize(ts(11));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Find all 8 matching pairs!', width/2, height * 0.08);

  // Cards grid 4x4 — responsive
  let availW = width - 30;
  let availH = height * 0.7;
  let cols = 4;
  let rows = 4;
  let gap = isMobile ? 8 : 12;
  let cardW = min((availW - (cols - 1) * gap) / cols, 90);
  let cardH = min((availH - (rows - 1) * gap) / rows, 100);
  let startX = (width - (cols * cardW + (cols-1) * gap)) / 2;
  let startY = height * 0.12;

  for (let i = 0; i < ma.cards.length; i++) {
    let card = ma.cards[i];
    let col = i % cols;
    let row = floor(i / cols);
    let cx = startX + col * (cardW + gap);
    let cy = startY + row * (cardH + gap);

    let isHover = mouseX >= cx && mouseX <= cx + cardW && mouseY >= cy && mouseY <= cy + cardH;

    if (card.matched) {
      fill(C.gold[0], C.gold[1], C.gold[2], 40);
      stroke(C.gold[0], C.gold[1], C.gold[2], 100);
      strokeWeight(1.5);
      rect(cx, cy, cardW, cardH, 8);
      fill(C.gold[0], C.gold[1], C.gold[2]);
      noStroke();
      textSize(min(cardW * 0.35, 28));
      text(card.symbol, cx + cardW/2, cy + cardH/2);
    } else if (card.faceUp) {
      fill(C.surface[0], C.surface[1], C.surface[2]);
      stroke(C.accent[0], C.accent[1], C.accent[2]);
      strokeWeight(2);
      rect(cx, cy, cardW, cardH, 8);
      fill(C.accent[0], C.accent[1], C.accent[2]);
      noStroke();
      textSize(min(cardW * 0.35, 28));
      text(card.symbol, cx + cardW/2, cy + cardH/2);
    } else {
      fill(isHover ? [C.accent[0], C.accent[1], C.accent[2], 60] : C.surfaceAlt);
      stroke(C.border[0], C.border[1], C.border[2]);
      strokeWeight(1.5);
      rect(cx, cy, cardW, cardH, 8);
      fill(C.border[0], C.border[1], C.border[2], 40);
      noStroke();
      textSize(min(cardW * 0.25, 20));
      text('?', cx + cardW/2, cy + cardH/2);
    }
  }

  textSize(ts(11));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Pairs: ' + ma.pairsFound + '/8  |  Flips: ' + ma.totalFlips, width/2, height - 55);

  let timeLeft = max(0, ceil((ma.maxTime - ma.timer) / 60));
  text('Time: ' + timeLeft + 's', width/2, height - 38);

  pop();
  drawParticles();

  if (ma.complete) {
    let btnW = min(140, width * 0.4);
    buttons = [new Btn(width/2 - btnW/2, height - 50, btnW, 48, 'Done ✓', 'mini_done', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

// ── Step Challenge ──────────────────────────────────────────
function initStepChallenge() {
  GS.miniActivity = {
    type: 'stepChallenge',
    timer: 0,
    maxTime: 60 * 15,
    steps: 0,
    target: 200,
    characterX: width * 0.2,
    scrollOffset: 0,
    lastClickTime: 0,
    clickSpeed: 0,
    legPhase: 0,
    complete: false
  };
}

function updateStepChallenge() {
  let ma = GS.miniActivity;
  ma.timer++;
  ma.clickSpeed *= 0.97;
  ma.legPhase += ma.clickSpeed * 0.3;
  ma.scrollOffset += ma.clickSpeed * 2;
  if (ma.steps >= ma.target || ma.timer >= ma.maxTime) {
    ma.complete = true;
  }
}

function drawStepChallenge() {
  let ma = GS.miniActivity;
  let groundY = height * 0.82;

  background(200, 220, 240);

  // Scrolling ground
  noStroke();
  fill(120, 160, 80);
  rect(0, groundY, width, height - groundY);

  // Path markings
  stroke(140, 175, 95);
  strokeWeight(2);
  for (let x = -ma.scrollOffset % 50; x < width; x += 50) {
    line(x, groundY + 30, x + 20, groundY + 30);
  }

  // Scrolling trees
  for (let i = 0; i < 6; i++) {
    let tx = (i * 200 - ma.scrollOffset * 0.3) % (width + 200) - 100;
    noStroke();
    fill(90, 70, 50);
    rect(tx - 5, groundY - 60, 10, 60);
    fill(70, 130, 60);
    ellipse(tx, groundY - 70, 40, 50);
  }

  // Character
  let charX = width * 0.25;
  let charY = groundY - 15;
  let bounce = sin(ma.legPhase * 0.5) * min(ma.clickSpeed * 3, 8);

  push();
  translate(charX, charY - bounce);
  noStroke();
  fill(C.accent[0], C.accent[1], C.accent[2]);
  ellipse(0, -20, 30, 35);
  fill(220, 190, 160);
  ellipse(0, -45, 22);
  stroke(C.accent[0] - 20, C.accent[1] - 20, C.accent[2] - 20);
  strokeWeight(4);
  let armSwing = sin(ma.legPhase) * 20;
  line(-12, -22, -12 + armSwing, 0);
  line(12, -22, 12 - armSwing, 0);
  let legSwing = sin(ma.legPhase) * 15;
  stroke(80, 80, 120);
  line(-6, -5, -6 + legSwing, 15);
  line(6, -5, 6 - legSwing, 15);
  pop();

  // UI
  push();
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(18));
  textStyle(BOLD);
  text('Step Challenge', width/2, height * 0.04);
  textStyle(NORMAL);

  textSize(ts(12));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Tap rapidly to walk! Reach ' + ma.target + ' steps.', width/2, height * 0.08);

  textSize(ts(32));
  fill(C.accent[0], C.accent[1], C.accent[2]);
  textStyle(BOLD);
  text(ma.steps, width/2, height * 0.15);
  textStyle(NORMAL);
  textSize(ts(13));
  text('steps', width/2, height * 0.19);

  // Progress bar
  let barW = min(width - 60, 500);
  let progress = ma.steps / ma.target;
  fill(C.border[0], C.border[1], C.border[2]);
  noStroke();
  rect(width/2 - barW/2, height - 50, barW, 12, 6);
  fill(C.accent[0], C.accent[1], C.accent[2]);
  rect(width/2 - barW/2, height - 50, barW * min(progress, 1), 12, 6);

  let timeLeft = max(0, ceil((ma.maxTime - ma.timer) / 60));
  textSize(ts(10));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text(timeLeft + 's remaining', width/2, height - 30);

  pop();

  if (ma.complete) {
    let btnW = min(140, width * 0.4);
    buttons = [new Btn(width/2 - btnW/2, height - 55, btnW, 48, 'Done ✓', 'mini_done', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

// ── Desk Organizer ──────────────────────────────────────────
function initDeskOrganizer() {
  let zoneW = isMobile ? (width - 30) / 2 : min(250, (width - 60) / 3);
  let zoneH = isMobile ? height * 0.2 : 200;
  let margin = isMobile ? 10 : 20;

  let zones;
  if (isMobile) {
    let zRow1Y = height * 0.1;
    let zRow2Y = zRow1Y + zoneH + 8;
    zones = [
      { label: 'Study Area', x: margin, y: zRow1Y, w: zoneW, h: zoneH, items: [] },
      { label: 'Personal', x: margin + zoneW + 10, y: zRow1Y, w: zoneW, h: zoneH, items: [] },
      { label: 'Supplies', x: margin, y: zRow2Y, w: zoneW, h: zoneH, items: [] },
      { label: 'Recycle', x: margin + zoneW + 10, y: zRow2Y, w: zoneW, h: zoneH, items: [] }
    ];
  } else {
    zones = [
      { label: 'Study Area', x: 50, y: 100, w: zoneW, h: zoneH, items: [] },
      { label: 'Personal', x: 50 + zoneW + 20, y: 100, w: zoneW, h: zoneH, items: [] },
      { label: 'Supplies', x: 50 + (zoneW + 20) * 2, y: 100, w: zoneW, h: zoneH, items: [] },
      { label: 'Recycle', x: width/2 - zoneW/2, y: 100 + zoneH + 20, w: zoneW, h: min(150, zoneH * 0.75), items: [] }
    ];
  }

  let items = WELLNESS_CONFIG.version === 'student'
    ? [
      { label: '📚 Textbook', zone: 0 }, { label: '💻 Laptop', zone: 0 },
      { label: '📝 Notebook', zone: 0 }, { label: '🖊️ Pens', zone: 2 },
      { label: '🌱 Plant', zone: 1 }, { label: '📱 Phone', zone: 1 },
      { label: '🥤 Empty Cup', zone: 3 }, { label: '💡 Lamp', zone: 2 },
      { label: '🎧 Headphones', zone: 1 }, { label: '📄 Old Notes', zone: 3 },
      { label: '🧴 Sanitizer', zone: 2 }, { label: '🍕 Wrapper', zone: 3 }
    ]
    : [
      { label: '💻 Laptop', zone: 0 }, { label: '📋 Reports', zone: 0 },
      { label: '🖊️ Pen Set', zone: 2 }, { label: '📸 Photo', zone: 1 },
      { label: '🌱 Plant', zone: 1 }, { label: '☕ Mug', zone: 1 },
      { label: '📎 Clips', zone: 2 }, { label: '📁 Folder', zone: 0 },
      { label: '📰 Memos', zone: 3 }, { label: '🗒️ Sticky Notes', zone: 2 },
      { label: '📧 Email', zone: 3 }, { label: '🎧 Headset', zone: 1 }
    ];

  // Scatter items below zones
  let scatterTop = isMobile ? (zones[3].y + zones[3].h + 10) : (height * 0.55);
  for (let item of items) {
    item.x = random(20, width - 100);
    item.y = random(scatterTop, height - 60);
    item.placed = false;
    item.dragging = false;
    item.origX = item.x;
    item.origY = item.y;
  }

  GS.miniActivity = {
    type: 'deskOrganizer',
    timer: 0,
    maxTime: 60 * 25,
    zones: zones,
    items: items,
    dragItem: null,
    score: 0,
    complete: false
  };
}

function updateDeskOrganizer() {
  let ma = GS.miniActivity;
  ma.timer++;
  let allPlaced = ma.items.every(item => item.placed);
  if (allPlaced || ma.timer >= ma.maxTime) {
    ma.complete = true;
  }
}

function drawDeskOrganizer() {
  background(C.bg[0], C.bg[1], C.bg[2]);
  let ma = GS.miniActivity;

  push();
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(18));
  textStyle(BOLD);
  text('Organize Your Space', width/2, height * 0.03);
  textStyle(NORMAL);
  textSize(ts(11));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Drag items to the correct zones', width/2, height * 0.065);

  // Draw zones
  for (let z of ma.zones) {
    stroke(C.border[0], C.border[1], C.border[2]);
    strokeWeight(2);
    setLineDash([8, 4]);
    noFill();
    rect(z.x, z.y, z.w, z.h, 10);
    setLineDash([]);

    fill(C.textLight[0], C.textLight[1], C.textLight[2]);
    noStroke();
    textSize(ts(11));
    textStyle(BOLD);
    text(z.label, z.x + z.w/2, z.y + 14);
    textStyle(NORMAL);
  }

  // Draw items
  let itemW = isMobile ? 70 : 80;
  let itemH = isMobile ? 28 : 30;
  for (let item of ma.items) {
    let ix = item.dragging ? mouseX - itemW/2 : item.x;
    let iy = item.dragging ? mouseY - itemH/2 : item.y;

    fill(item.placed ? [200, 230, 200] : C.surface);
    stroke(item.placed ? [100, 180, 100] : C.border);
    strokeWeight(item.dragging ? 2 : 1);
    rect(ix, iy, itemW, itemH, 6);

    fill(C.text[0], C.text[1], C.text[2]);
    noStroke();
    textSize(ts(9));
    text(item.label, ix + itemW/2, iy + itemH/2);
  }

  let placed = ma.items.filter(i => i.placed).length;
  textSize(ts(10));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text(placed + ' / ' + ma.items.length + ' items placed', width/2, height - 30);

  let timeLeft = max(0, ceil((ma.maxTime - ma.timer) / 60));
  text('Time: ' + timeLeft + 's', width/2, height - 15);

  pop();

  if (ma.complete) {
    let btnW = min(140, width * 0.4);
    buttons = [new Btn(width/2 - btnW/2, height - 55, btnW, 48, 'Done ✓', 'mini_done', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

function setLineDash(pattern) {
  drawingContext.setLineDash(pattern);
}

// ═══════════════════════════════════════════════════════════════
// MINI-ACTIVITY DISPATCH
// ═══════════════════════════════════════════════════════════════

function drawMiniActivity() {
  if (!GS.miniActivity) return;

  switch (GS.miniActivity.type) {
    case 'breathingBubble': updateBreathingBubble(); drawBreathingBubble(); break;
    case 'gratitudeGarden': updateGratitudeGarden(); drawGratitudeGarden(); break;
    case 'budgetBalancer':  updateBudgetBalancer();  drawBudgetBalancer();  break;
    case 'socialWeb':       updateSocialWeb();       drawSocialWeb();       break;
    case 'mindfulMoment':   updateMindfulMoment();   drawMindfulMoment();   break;
    case 'memoryMatch':     updateMemoryMatch();      drawMemoryMatch();     break;
    case 'stepChallenge':   updateStepChallenge();   drawStepChallenge();   break;
    case 'deskOrganizer':   updateDeskOrganizer();   drawDeskOrganizer();   break;
  }
}

function getMiniActivityScore() {
  let ma = GS.miniActivity;
  if (!ma) return 50;

  switch (ma.type) {
    case 'breathingBubble':
      return ma.matchSamples > 0 ? constrain(ma.matchScore / ma.matchSamples * 100, 0, 100) : 50;
    case 'gratitudeGarden':
      return constrain((ma.flowers.length / ma.goal) * 100, 0, 100);
    case 'budgetBalancer': {
      let cats = ma.categories;
      let score = 50;
      let savings = cats.find(c => c.label === 'Savings');
      if (savings && savings.value >= 10) score += 20;
      if (cats.every(c => c.value > 0)) score += 15;
      if (!cats.some(c => c.value > 50)) score += 15;
      return constrain(score, 0, 100);
    }
    case 'socialWeb':
      return constrain((ma.connections.length / ma.goal) * 100, 0, 100);
    case 'mindfulMoment':
      return constrain((ma.score / ma.maxChanges) * 100, 0, 100);
    case 'memoryMatch':
      return constrain((ma.pairsFound / 8) * 100, 0, 100);
    case 'stepChallenge':
      return constrain((ma.steps / ma.target) * 100, 0, 100);
    case 'deskOrganizer': {
      let correct = ma.items.filter(item => {
        if (!item.placed) return false;
        let zone = ma.zones[item.zone];
        return item.x >= zone.x && item.x <= zone.x + zone.w && item.y >= zone.y && item.y <= zone.y + zone.h;
      }).length;
      return constrain((correct / ma.items.length) * 100, 0, 100);
    }
    default: return 50;
  }
}

function startMiniActivity(type) {
  GS.phase = 'miniActivity';
  switch (type) {
    case 'breathingBubble': initBreathingBubble(); break;
    case 'gratitudeGarden': initGratitudeGarden(); break;
    case 'budgetBalancer':  initBudgetBalancer();  break;
    case 'socialWeb':       initSocialWeb();       break;
    case 'mindfulMoment':   initMindfulMoment();   break;
    case 'memoryMatch':     initMemoryMatch();      break;
    case 'stepChallenge':   initStepChallenge();   break;
    case 'deskOrganizer':   initDeskOrganizer();   break;
  }
}

// ═══════════════════════════════════════════════════════════════
// ACHIEVEMENT SYSTEM
// ═══════════════════════════════════════════════════════════════

const BASE_ACHIEVEMENTS = [
  { id: 'balanced', name: 'Finding Balance', desc: 'All dimensions within 15 points', icon: '⚖',
    check: gs => { let v = Object.values(gs.wellness); return max(...v) - min(...v) <= 15; }},
  { id: 'well_rounded', name: 'Well-Rounded', desc: 'All dimensions above 60', icon: '⭕',
    check: gs => Object.values(gs.wellness).every(v => v >= 60) },
  { id: 'thriving', name: 'Thriving', desc: 'All dimensions above 80', icon: '⭐',
    check: gs => Object.values(gs.wellness).every(v => v >= 80) },
  { id: 'physical_peak', name: 'Peak Fitness', desc: 'Physical reached 90+', icon: '♥',
    check: gs => gs.wellness.physical >= 90 },
  { id: 'emotional_peak', name: 'Inner Peace', desc: 'Emotional reached 90+', icon: '☀',
    check: gs => gs.wellness.emotional >= 90 },
  { id: 'social_peak', name: 'Social Butterfly', desc: 'Social reached 90+', icon: '☺',
    check: gs => gs.wellness.social >= 90 },
  { id: 'intellectual_peak', name: 'Sharp Mind', desc: 'Intellectual reached 90+', icon: '✎',
    check: gs => gs.wellness.intellectual >= 90 },
  { id: 'spiritual_peak', name: 'Zen Master', desc: 'Spiritual reached 90+', icon: '✦',
    check: gs => gs.wellness.spiritual >= 90 },
  { id: 'occupational_peak', name: 'Career Star', desc: 'Occupational reached 90+', icon: '⚙',
    check: gs => gs.wellness.occupational >= 90 },
  { id: 'financial_peak', name: 'Money Wise', desc: 'Financial reached 90+', icon: '$',
    check: gs => gs.wellness.financial >= 90 },
  { id: 'environmental_peak', name: 'Eco Champion', desc: 'Environmental reached 90+', icon: '♣',
    check: gs => gs.wellness.environmental >= 90 },
  { id: 'bounce_back', name: 'Bounce Back', desc: 'Raised any dimension from below 35 to above 60', icon: '🚀',
    check: gs => {
      for (let d of DIM_NAMES) {
        let wasLow = gs.history.some(h => h.wellnessBefore && h.wellnessBefore[d] < 35);
        if (wasLow && gs.wellness[d] > 60) return true;
      }
      return false;
    }},
  { id: 'mini_star', name: 'Activity Star', desc: 'Scored 80+ on 3 mini-activities', icon: '🏆',
    check: gs => gs.history.filter(h => h.miniScore && h.miniScore >= 80).length >= 3 },
  { id: 'full_week', name: 'Committed', desc: 'Completed all 21 time slots', icon: '📅',
    check: gs => gs.history.length >= 21 }
];

function checkAchievements() {
  let allAchievements = [...BASE_ACHIEVEMENTS, ...(WELLNESS_CONFIG.extraAchievements || [])];
  for (let a of allAchievements) {
    if (!GS.achievements.includes(a.id) && a.check(GS)) {
      GS.achievements.push(a.id);
      GS.achievementQueue.push(a);
    }
  }
}

function drawAchievementNotification() {
  if (GS.achievementQueue.length === 0) return;

  let a = GS.achievementQueue[0];
  GS.ui.achieveTimer++;

  let targetY = isMobile ? 10 : 55;
  if (GS.ui.achieveTimer < 20) {
    GS.ui.achieveSlide = lerp(GS.ui.achieveSlide, targetY, 0.15);
  } else if (GS.ui.achieveTimer > 150) {
    GS.ui.achieveSlide = lerp(GS.ui.achieveSlide, -60, 0.15);
    if (GS.ui.achieveSlide < -50) {
      GS.achievementQueue.shift();
      GS.ui.achieveTimer = 0;
      GS.ui.achieveSlide = -60;
    }
  }

  push();
  let badgeW = min(300, width - 20);
  let bx = width/2 - badgeW/2;
  let by = GS.ui.achieveSlide;

  fill(C.gold[0], C.gold[1], C.gold[2], 240);
  noStroke();
  rect(bx, by, badgeW, 40, 20);

  textAlign(CENTER, CENTER);
  fill(255);
  textSize(ts(16));
  text(a.icon, bx + 25, by + 20);

  textAlign(LEFT, CENTER);
  textSize(ts(11));
  textStyle(BOLD);
  fill(60, 40, 10);
  text(a.name, bx + 45, by + 13);
  textStyle(NORMAL);
  textSize(ts(9));
  fill(80, 60, 30);
  text(a.desc, bx + 45, by + 28);

  pop();
}

// ═══════════════════════════════════════════════════════════════
// END-OF-WEEK REPORT (Scrollable, Responsive)
// ═══════════════════════════════════════════════════════════════

function drawReport() {
  background(C.bg[0], C.bg[1], C.bg[2]);

  let scrollY = GS.ui.scrollY;
  let margin = isMobile ? 10 : 20;
  push();
  translate(0, -scrollY);

  let y = 30;

  // Header
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(24));
  textStyle(BOLD);
  let headerLines = wrapText('Your Wellness Journey Report', width - margin * 2);
  for (let i = 0; i < headerLines.length; i++) {
    text(headerLines[i], width/2, y + i * ts(28));
  }
  textStyle(NORMAL);
  y += headerLines.length * ts(28) + 5;

  textSize(ts(12));
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text(WELLNESS_CONFIG.reportIntro || 'Here\'s how your week went...', width/2, y + 10);
  y += 35;

  // Final Wellness Wheel
  let wheelR = isMobile ? min(width * 0.25, 90) : 130;
  drawWellnessWheel(width/2, y + wheelR + 20, wheelR, true, true);
  y += wheelR * 2 + 70;

  // Dimension breakdown cards
  textAlign(LEFT, TOP);
  let cardW = min(440, width - margin * 2);
  let cardH = isMobile ? 55 : 60;
  let gap = 8;
  let startX = (width - cardW) / 2;

  for (let i = 0; i < 8; i++) {
    let dim = DIM_NAMES[i];
    let col = DIM_COLORS[dim];
    let val = Math.round(GS.wellness[dim]);
    let startVal = GS.startWellness ? Math.round(GS.startWellness[dim]) : 50;
    let change = val - startVal;
    let grade = val >= 90 ? 'A' : val >= 75 ? 'B' : val >= 60 ? 'C' : val >= 45 ? 'D' : 'F';

    let cy = y + i * (cardH + gap);

    drawRoundedBox(startX, cy, cardW, cardH, 8, C.surface, [...col, 150]);

    noStroke();
    fill(col[0], col[1], col[2]);
    rect(startX, cy, 5, cardH, 8, 0, 0, 8);

    textSize(ts(14));
    text(DIM_ICONS[i], startX + 14, cy + 8);
    fill(C.text[0], C.text[1], C.text[2]);
    textSize(ts(12));
    textStyle(BOLD);
    text(DIM_LABELS[i], startX + 32, cy + 10);
    textStyle(NORMAL);

    textAlign(CENTER, CENTER);
    fill(col[0], col[1], col[2]);
    textSize(ts(18));
    textStyle(BOLD);
    text(grade, startX + cardW - 30, cy + cardH/2);
    textStyle(NORMAL);

    textAlign(LEFT, TOP);
    fill(C.textLight[0], C.textLight[1], C.textLight[2]);
    textSize(ts(10));
    let changeStr = change >= 0 ? '+' + change : '' + change;
    let changeCol = change >= 0 ? [100, 160, 100] : [200, 100, 80];
    text('Score: ' + val + '/100', startX + 32, cy + 28);
    fill(changeCol[0], changeCol[1], changeCol[2]);
    text('(' + changeStr + ')', startX + 100, cy + 28);

    // Sparkline (if space)
    if (!isMobile) {
      drawSparkline(startX + 180, cy + 15, 140, 25, dim);
    }

    // Tip
    let tips = WELLNESS_CONFIG.tips ? WELLNESS_CONFIG.tips[dim] : null;
    if (tips) {
      fill(C.textLight[0], C.textLight[1], C.textLight[2]);
      textSize(ts(8));
      let tip = val >= 60 ? tips.high : tips.low;
      let tipW = isMobile ? cardW - 44 : cardW - 44;
      let tipLines = wrapText(tip, tipW);
      text(tipLines[0], startX + 32, cy + 42);
    }
  }

  y += 8 * (cardH + gap) + 25;

  // Achievements section
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(18));
  textStyle(BOLD);
  text('Achievements Earned', width/2, y);
  textStyle(NORMAL);
  y += 28;

  let allAchievements = [...BASE_ACHIEVEMENTS, ...(WELLNESS_CONFIG.extraAchievements || [])];
  let cols = isMobile ? 2 : (isTablet ? 2 : 4);
  let aCardW = isMobile ? (width - margin * 2 - 10) / 2 : min(200, (width - 60) / 4);
  let aCardH = isMobile ? 48 : 55;
  let aGap = 8;
  let aStartX = (width - (cols * aCardW + (cols-1) * aGap)) / 2;

  for (let i = 0; i < allAchievements.length; i++) {
    let a = allAchievements[i];
    let earned = GS.achievements.includes(a.id);
    let col = floor(i % cols);
    let row = floor(i / cols);
    let ax = aStartX + col * (aCardW + aGap);
    let ay = y + row * (aCardH + aGap);

    fill(earned ? [C.gold[0], C.gold[1], C.gold[2], 30] : [200, 200, 200, 30]);
    stroke(earned ? C.gold : C.border);
    strokeWeight(1);
    rect(ax, ay, aCardW, aCardH, 8);

    noStroke();
    textAlign(LEFT, CENTER);
    textSize(ts(14));
    fill(earned ? C.gold : [180, 180, 180]);
    text(a.icon, ax + 8, ay + aCardH/2);

    textSize(ts(9));
    textStyle(BOLD);
    fill(earned ? C.text : [180, 180, 180]);
    text(a.name, ax + 26, ay + 14);
    textStyle(NORMAL);
    textSize(ts(8));
    fill(earned ? C.textLight : [190, 190, 190]);
    text(a.desc, ax + 26, ay + 32);
  }

  let achieveRows = ceil(allAchievements.length / cols);
  y += achieveRows * (aCardH + aGap) + 35;

  // Strengths & Growth
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(ts(18));
  textStyle(BOLD);
  text('Strengths & Growth Areas', width/2, y);
  textStyle(NORMAL);
  y += 28;

  let sorted = DIM_NAMES.map((d, i) => ({ dim: d, label: DIM_LABELS[i], val: GS.wellness[d], col: DIM_COLORS[d] }));
  sorted.sort((a, b) => b.val - a.val);

  textAlign(LEFT, TOP);
  fill(100, 160, 100);
  textSize(ts(13));
  textStyle(BOLD);
  text('💪 Your Strengths:', startX, y);
  textStyle(NORMAL);
  y += 20;
  for (let i = 0; i < 2; i++) {
    let s = sorted[i];
    fill(s.col[0], s.col[1], s.col[2]);
    textSize(ts(11));
    text('• ' + s.label + ' (' + Math.round(s.val) + ')', startX + 10, y);
    y += 17;
  }
  y += 10;

  fill(200, 140, 80);
  textSize(ts(13));
  textStyle(BOLD);
  text('🌱 Growth Areas:', startX, y);
  textStyle(NORMAL);
  y += 20;
  for (let i = sorted.length - 1; i >= sorted.length - 2; i--) {
    let s = sorted[i];
    fill(s.col[0], s.col[1], s.col[2]);
    textSize(ts(11));
    text('• ' + s.label + ' (' + Math.round(s.val) + ')', startX + 10, y);
    y += 17;
  }
  y += 30;

  GS.ui.maxScroll = max(0, y + 80 - height);

  pop();

  // Fixed play again button at bottom
  let btnW = min(180, width * 0.5);
  let btnY2 = height - 60;
  buttons = [new Btn(width/2 - btnW/2, btnY2, btnW, 52, 'Play Again', 'restart', C.accent)];
  for (let b of buttons) b.draw();
}

function drawSparkline(x, y, w, h, dim) {
  let vals = [];
  for (let entry of GS.history) {
    if (entry.wellnessAfter && entry.wellnessAfter[dim] !== undefined) {
      vals.push(entry.wellnessAfter[dim]);
    }
  }
  if (vals.length < 2) return;

  let col = DIM_COLORS[dim];
  stroke(col[0], col[1], col[2], 150);
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let i = 0; i < vals.length; i++) {
    let px = x + (i / (vals.length - 1)) * w;
    let py = y + h - (vals[i] / 100) * h;
    vertex(px, py);
  }
  endShape();
  noStroke();
}

// ═══════════════════════════════════════════════════════════════
// GAME ENGINE — Scenario & Progression Logic
// ═══════════════════════════════════════════════════════════════

function loadScenario() {
  let dayData = WELLNESS_CONFIG.days[GS.day - 1];
  if (!dayData) return;

  let slot = dayData.slots[GS.timeSlot];
  if (!slot) return;

  GS.currentScenario = slot;
  GS.selectedChoice = null;
  GS.choiceResult = null;
  GS.ui.resultTimer = 0;
  playScrollY = 0;
  playMaxScroll = 0;
  startTypewriter(slot.narrative);
  buttons = [];
}

function applyChoice(choiceIdx) {
  let scenario = GS.currentScenario;
  if (!scenario || !scenario.choices[choiceIdx]) return;

  let choice = scenario.choices[choiceIdx];
  GS.selectedChoice = choiceIdx;

  let wellnessBefore = { ...GS.wellness };

  for (let dim in choice.effects) {
    if (GS.wellness[dim] !== undefined) {
      GS.wellness[dim] = constrain(GS.wellness[dim] + choice.effects[dim], 0, 100);
    }
  }

  let wellnessAfter = { ...GS.wellness };

  GS.history.push({
    day: GS.day,
    timeSlot: GS.timeSlot,
    scenarioId: scenario.id,
    choiceIdx: choiceIdx,
    effects: choice.effects,
    wellnessBefore: wellnessBefore,
    wellnessAfter: wellnessAfter,
    miniScore: null,
    wasEvent: false
  });

  GS.choiceResult = choice.followUp;
  GS.ui.resultTimer = 0;

  // Emit particles
  if (!isMobile) {
    let n = 8;
    let angleStep = TWO_PI / n;
    let wheelCX = 540 + (width - 540) / 2;
    let wheelCY = 45 + (height - 85) / 2;
    for (let dim in choice.effects) {
      let idx = DIM_NAMES.indexOf(dim);
      if (idx >= 0) {
        let angle = -HALF_PI + idx * angleStep;
        let px = wheelCX + cos(angle) * 100;
        let py = wheelCY + sin(angle) * 100;
        let col = choice.effects[dim] > 0 ? [100, 200, 120] : [220, 100, 80];
        emitParticles(px, py, col, 5);
      }
    }
  }

  checkAchievements();
  GS.pendingMiniActivity = choice.miniActivity || null;
}

function applyEventChoice(choiceIdx) {
  let event = GS.activeEvent;
  if (!event || !event.choices[choiceIdx]) return;

  let choice = event.choices[choiceIdx];
  let wellnessBefore = { ...GS.wellness };

  for (let dim in choice.effects) {
    if (GS.wellness[dim] !== undefined) {
      GS.wellness[dim] = constrain(GS.wellness[dim] + choice.effects[dim], 0, 100);
    }
  }

  GS.history.push({
    day: GS.day,
    timeSlot: GS.timeSlot,
    scenarioId: 'event_' + event.id,
    choiceIdx: choiceIdx,
    effects: choice.effects,
    wellnessBefore: wellnessBefore,
    wellnessAfter: { ...GS.wellness },
    miniScore: null,
    wasEvent: true
  });

  GS.usedEvents.add(event.id);
  GS.activeEvent = null;
  GS.phase = 'playing';

  checkAchievements();
}

function advanceTimeSlot() {
  GS.timeSlot++;
  if (GS.timeSlot > 2) {
    GS.timeSlot = 0;
    GS.daySummary = generateDaySummary();
    GS.ui.dayTransitionTimer = 0;
    GS.phase = 'dayEnd';
    return;
  }

  if (shouldTriggerEvent()) {
    triggerRandomEvent();
  } else {
    loadScenario();
  }
}

function advanceDay() {
  GS.day++;
  if (GS.day > 7) {
    GS.phase = 'report';
    GS.ui.scrollY = 0;
    return;
  }

  startTransition(DAY_NAMES[GS.day - 1], () => {
    GS.phase = 'playing';
    if (shouldTriggerEvent()) {
      triggerRandomEvent();
    } else {
      loadScenario();
    }
  });
}

function shouldTriggerEvent() {
  if (!WELLNESS_CONFIG.randomEvents || WELLNESS_CONFIG.randomEvents.length === 0) return false;
  if (GS.usedEvents.size >= 4) return false;
  return random() < 0.2;
}

function triggerRandomEvent() {
  let available = WELLNESS_CONFIG.randomEvents.filter(e =>
    !GS.usedEvents.has(e.id) && (!e.triggerCondition || e.triggerCondition(GS))
  );
  if (available.length === 0) {
    loadScenario();
    return;
  }

  GS.activeEvent = available[floor(random(available.length))];
  GS.phase = 'event';
}

function generateDaySummary() {
  let dayEntries = GS.history.filter(h => h.day === GS.day);
  if (dayEntries.length === 0) return 'A quiet day.';

  let totalChanges = {};
  for (let d of DIM_NAMES) totalChanges[d] = 0;
  for (let entry of dayEntries) {
    for (let d in entry.effects) {
      if (totalChanges[d] !== undefined) totalChanges[d] += entry.effects[d];
    }
  }

  let best = '', worst = '', bestVal = -999, worstVal = 999;
  for (let d in totalChanges) {
    if (totalChanges[d] > bestVal) { bestVal = totalChanges[d]; best = d; }
    if (totalChanges[d] < worstVal) { worstVal = totalChanges[d]; worst = d; }
  }

  let bestLabel = DIM_LABELS[DIM_NAMES.indexOf(best)];
  let worstLabel = DIM_LABELS[DIM_NAMES.indexOf(worst)];

  if (bestVal > 0 && worstVal < 0) {
    return 'Today was a mixed day. Your ' + bestLabel + ' wellness grew, but ' + worstLabel + ' took a hit. Balance is key!';
  } else if (bestVal > 0) {
    return 'A great day overall! Your ' + bestLabel + ' wellness especially benefited from your choices.';
  } else {
    return 'A challenging day. Tomorrow brings new opportunities to improve your wellness.';
  }
}

// ═══════════════════════════════════════════════════════════════
// p5.js SETUP & DRAW
// ═══════════════════════════════════════════════════════════════

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.elt.style.touchAction = 'none';
  cnv.elt.addEventListener('contextmenu', e => e.preventDefault());
  textFont('Georgia');
  updateScale();
  resetGameState();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateScale();
}

function draw() {
  cursor(ARROW);

  // Continuous input checks
  checkMouseHold();
  checkBudgetSliderPress();

  switch (GS.phase) {
    case 'title':         drawTitle();         break;
    case 'intro':         drawIntro();         break;
    case 'playing':       drawPlaying();       break;
    case 'event':         drawEvent();         break;
    case 'miniActivity':  drawMiniActivity();  break;
    case 'dayEnd':        drawDayEnd();        break;
    case 'report':        drawReport();        break;
  }

  updateParticles();
  if (GS.phase !== 'miniActivity') drawParticles();
  drawAchievementNotification();
  updateTransition();
  drawTransition();
}

// ═══════════════════════════════════════════════════════════════
// INPUT HANDLERS (Touch + Mouse)
// ═══════════════════════════════════════════════════════════════

function getInputXY() {
  // Use touch position if available, else mouse
  if (touches && touches.length > 0) {
    return { x: touches[0].x, y: touches[0].y };
  }
  return { x: mouseX, y: mouseY };
}

function mousePressed() {
  handlePress(mouseX, mouseY);
}

function touchStarted() {
  if (touches.length > 0) {
    touchStartY = touches[0].y;
    touchStartX = touches[0].x;
    isTouchDragging = false;
    handlePress(touches[0].x, touches[0].y);
  }
  return false; // Prevent default
}

function handlePress(mx, my) {
  // Wheel overlay close
  if (showWheelOverlay) {
    for (let b of buttons) {
      if (b instanceof Btn && b.contains(mx, my) && b.action === 'close_wheel') {
        showWheelOverlay = false;
        return;
      }
      if (b.action === 'close_wheel' && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        showWheelOverlay = false;
        return;
      }
    }
    // Click outside card closes overlay
    showWheelOverlay = false;
    return;
  }

  // Button click detection
  if (GS.phase === 'title' || GS.phase === 'intro' || GS.phase === 'dayEnd' || GS.phase === 'report') {
    for (let b of buttons) {
      if (b instanceof Btn && b.contains(mx, my)) {
        handleAction(b.action);
        return;
      }
    }
  }

  // Scenario choice detection (with scroll adjustment)
  if (GS.phase === 'playing' && GS.ui.choicesVisible && !GS.selectedChoice && !GS.choiceResult) {
    for (let b of buttons) {
      if (b.action === 'toggle_wheel' && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        showWheelOverlay = true;
        return;
      }
      if (b.idx !== undefined && !b.isEvent) {
        let adjustedY = b.scrollAdjust ? my + b.scrollAdjust : my;
        let btnY = b.scrollAdjust ? b.y + b.scrollAdjust : b.y;
        if (mx >= b.x && mx <= b.x + b.w && adjustedY >= btnY && adjustedY <= btnY + b.h) {
          applyChoice(b.idx);
          return;
        }
      }
    }
  }

  // Continue button in playing
  if (GS.phase === 'playing' && GS.choiceResult) {
    for (let b of buttons) {
      if (b instanceof Btn && b.contains(mx, my)) {
        handleAction(b.action);
        return;
      }
      if (b.action === 'continue') {
        let adjustedY = b.scrollAdjust ? my + b.scrollAdjust : my;
        let btnY = b.scrollAdjust ? b.y + b.scrollAdjust : b.y;
        if (mx >= b.x && mx <= b.x + b.w && adjustedY >= btnY && adjustedY <= btnY + b.h) {
          handleAction('continue');
          return;
        }
      }
    }
  }

  // Event choice detection
  if (GS.phase === 'event') {
    for (let b of buttons) {
      if (b.isEvent && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        applyEventChoice(b.idx);
        return;
      }
    }
  }

  // Mini-activity clicks
  if (GS.phase === 'miniActivity') {
    handleMiniActivityClick(mx, my);

    for (let b of buttons) {
      if (b instanceof Btn && b.contains(mx, my)) {
        handleAction(b.action);
        return;
      }
    }
  }
}

function handleAction(action) {
  switch (action) {
    case 'start':
      GS.phase = 'intro';
      GS.introPage = 0;
      break;
    case 'intro_back':
      GS.introPage = max(0, GS.introPage - 1);
      break;
    case 'intro_next':
      GS.introPage = min(2, GS.introPage + 1);
      break;
    case 'start_game':
      GS.startWellness = { ...GS.wellness };
      startTransition(DAY_NAMES[0], () => {
        GS.phase = 'playing';
        loadScenario();
      });
      break;
    case 'continue':
      if (GS.pendingMiniActivity) {
        startMiniActivity(GS.pendingMiniActivity);
        GS.pendingMiniActivity = null;
      } else {
        advanceTimeSlot();
      }
      break;
    case 'mini_done':
      let score = getMiniActivityScore();
      if (GS.history.length > 0) {
        GS.history[GS.history.length - 1].miniScore = score;
      }

      let bonus = map(score, 0, 100, -2, 5);
      let lastEntry = GS.history[GS.history.length - 1];
      if (lastEntry && lastEntry.effects) {
        for (let d in lastEntry.effects) {
          if (lastEntry.effects[d] > 0 && GS.wellness[d] !== undefined) {
            GS.wellness[d] = constrain(GS.wellness[d] + bonus, 0, 100);
          }
        }
      }

      // Hide gratitude input if it was active
      let inp = document.getElementById('textInput');
      if (inp) inp.classList.remove('active');

      GS.miniActivity = null;
      GS.phase = 'playing';
      checkAchievements();
      advanceTimeSlot();
      break;
    case 'next_day':
      advanceDay();
      break;
    case 'restart':
      resetGameState();
      break;
    case 'toggle_wheel':
      showWheelOverlay = !showWheelOverlay;
      break;
    case 'close_wheel':
      showWheelOverlay = false;
      break;
  }
}

function handleMiniActivityClick(mx, my) {
  if (!GS.miniActivity) return;
  let ma = GS.miniActivity;

  switch (ma.type) {
    case 'stepChallenge':
      if (!ma.complete) {
        ma.steps++;
        ma.clickSpeed = min(ma.clickSpeed + 0.8, 5);
        ma.lastClickTime = millis();
      }
      break;
    case 'socialWeb':
      if (!ma.complete) {
        for (let i = 0; i < ma.nodes.length; i++) {
          if (dist(mx, my, ma.nodes[i].x, ma.nodes[i].y) < (isMobile ? 30 : 25)) {
            if (ma.selectedNode === null) {
              ma.selectedNode = i;
            } else if (ma.selectedNode !== i) {
              let exists = ma.connections.some(c =>
                (c[0] === ma.selectedNode && c[1] === i) || (c[0] === i && c[1] === ma.selectedNode)
              );
              if (!exists) {
                ma.connections.push([ma.selectedNode, i]);
                emitParticles(ma.nodes[i].x, ma.nodes[i].y, C.accent, 5);
              }
              ma.selectedNode = null;
            } else {
              ma.selectedNode = null;
            }
            return;
          }
        }
        ma.selectedNode = null;
      }
      break;
    case 'mindfulMoment':
      if (ma.activeChange && !ma.activeChange.found) {
        let hitDist = isMobile ? 50 : 40;
        if (dist(mx, my, ma.activeChange.x, ma.activeChange.y) < hitDist) {
          ma.activeChange.found = true;
          ma.score++;
          emitParticles(mx, my, [255, 220, 100], 8);
          for (let c of ma.clouds) c.highlight = false;
          scheduleNextChange();
        }
      }
      break;
    case 'memoryMatch':
      if (!ma.complete && ma.flipped.length < 2 && ma.flipCooldown === 0) {
        let availW = width - 30;
        let availH = height * 0.7;
        let cols = 4;
        let gap = isMobile ? 8 : 12;
        let cardW = min((availW - (cols - 1) * gap) / cols, 90);
        let cardH = min((availH - 3 * gap) / 4, 100);
        let startX = (width - (cols * cardW + (cols-1) * gap)) / 2;
        let startY = height * 0.12;
        for (let i = 0; i < ma.cards.length; i++) {
          let card = ma.cards[i];
          if (card.faceUp || card.matched) continue;
          let c = i % cols;
          let r = floor(i / cols);
          let cx = startX + c * (cardW + gap);
          let cy = startY + r * (cardH + gap);
          if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) {
            card.faceUp = true;
            ma.flipped.push(i);
            ma.totalFlips++;
            break;
          }
        }
      }
      break;
  }
}

function mouseReleased() {
  handleRelease(mouseX, mouseY);
}

function touchEnded() {
  handleRelease(mouseX, mouseY);
  isTouchDragging = false;
  return false;
}

function handleRelease(mx, my) {
  if (GS.phase === 'miniActivity' && GS.miniActivity) {
    let ma = GS.miniActivity;
    if (ma.type === 'breathingBubble') {
      ma.playerHolding = false;
    }
    if (ma.type === 'budgetBalancer') {
      for (let c of ma.categories) c.dragging = false;
    }
    if (ma.type === 'deskOrganizer' && ma.dragItem !== null) {
      let item = ma.items[ma.dragItem];
      item.dragging = false;
      let itemW = isMobile ? 70 : 80;
      let itemH = isMobile ? 28 : 30;
      let ix = mx - itemW/2;
      let iy = my - itemH/2;
      let correctZone = ma.zones[item.zone];
      if (ix >= correctZone.x && ix <= correctZone.x + correctZone.w &&
          iy >= correctZone.y && iy <= correctZone.y + correctZone.h) {
        item.placed = true;
        item.x = ix;
        item.y = iy;
        emitParticles(ix + itemW/2, iy + itemH/2, [100, 200, 120], 5);
      } else {
        let inAnyZone = false;
        for (let z of ma.zones) {
          if (ix >= z.x && ix <= z.x + z.w && iy >= z.y && iy <= z.y + z.h) {
            inAnyZone = true;
            item.x = ix;
            item.y = iy;
            break;
          }
        }
        if (!inAnyZone) {
          item.x = item.origX;
          item.y = item.origY;
        }
      }
      ma.dragItem = null;
    }
  }
}

function mouseDragged() {
  handleDrag(mouseX, mouseY);
}

function touchMoved() {
  if (touches.length > 0) {
    let ty = touches[0].y;
    let dy = touchStartY - ty;

    // Detect if this is a scroll gesture (vertical movement)
    if (!isTouchDragging && abs(dy) > 5) {
      isTouchDragging = true;
    }

    // Scroll in report
    if (GS.phase === 'report') {
      GS.ui.scrollY = constrain(GS.ui.scrollY + dy, 0, GS.ui.maxScroll);
      touchStartY = ty;
      return false;
    }

    // Scroll in playing (mobile)
    if (GS.phase === 'playing' && (isMobile || isTablet) && playMaxScroll > 0) {
      playScrollY = constrain(playScrollY + dy, 0, playMaxScroll);
      touchStartY = ty;
      return false;
    }

    handleDrag(touches[0].x, touches[0].y);
    touchStartY = ty;
  }
  return false;
}

function handleDrag(mx, my) {
  if (GS.phase === 'miniActivity' && GS.miniActivity) {
    let ma = GS.miniActivity;

    if (ma.type === 'budgetBalancer') {
      let labelW = isMobile ? 70 : 120;
      let valueW = isMobile ? 55 : 80;
      let margin = isMobile ? 12 : 20;
      let sx = margin + labelW;
      let sw = width - margin * 2 - labelW - valueW;
      let sy = height * 0.15;
      let sh = isMobile ? max(height * 0.1, 55) : 65;

      for (let i = 0; i < ma.categories.length; i++) {
        let cat = ma.categories[i];
        if (cat.dragging) {
          let newVal = constrain(round(map(mx, sx, sx + sw, 0, 100)), 0, 100);
          let diff = newVal - cat.value;
          cat.value = newVal;
          let others = ma.categories.filter((c, j) => j !== i && !c.dragging);
          let redistribute = -diff / others.length;
          for (let o of others) {
            o.value = constrain(round(o.value + redistribute), 0, 100);
          }
          break;
        }
      }
    }

    if (ma.type === 'deskOrganizer') {
      if (ma.dragItem === null) {
        let itemW = isMobile ? 70 : 80;
        let itemH = isMobile ? 28 : 30;
        for (let i = ma.items.length - 1; i >= 0; i--) {
          let item = ma.items[i];
          if (!item.placed && mx >= item.x && mx <= item.x + itemW && my >= item.y && my <= item.y + itemH) {
            ma.dragItem = i;
            item.dragging = true;
            break;
          }
        }
      }
    }
  }
}

function mouseMoved() {
  GS.ui.hoverBtn = -1;

  if (GS.phase === 'playing' && GS.ui.choicesVisible && !GS.selectedChoice) {
    for (let b of buttons) {
      if (b.idx !== undefined && mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
        GS.ui.hoverBtn = b.idx;
        break;
      }
    }
  }

  if (GS.phase === 'event') {
    for (let b of buttons) {
      if (b.isEvent && mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
        GS.ui.hoverBtn = b.idx;
        break;
      }
    }
  }

  for (let b of buttons) {
    if (b instanceof Btn) {
      b.hover = b.contains(mouseX, mouseY);
    }
  }
}

function mouseWheel(event) {
  if (GS.phase === 'report') {
    GS.ui.scrollY = constrain(GS.ui.scrollY + event.delta, 0, GS.ui.maxScroll);
    return false;
  }
  if (GS.phase === 'playing' && (isMobile || isTablet) && playMaxScroll > 0) {
    playScrollY = constrain(playScrollY + event.delta, 0, playMaxScroll);
    return false;
  }
}

function keyPressed() {
  if (GS.phase === 'miniActivity' && GS.miniActivity) {
    let ma = GS.miniActivity;
    if (ma.type === 'gratitudeGarden' && ma.inputActive) {
      if (keyCode === ENTER) {
        let inp = document.getElementById('textInput');
        if (inp && inp.value.trim().length > 0) {
          let colors = [[230, 100, 100], [230, 180, 80], [180, 100, 200], [230, 150, 170], [100, 180, 230]];
          ma.flowers.push({
            x: random(width * 0.1, width * 0.9),
            color: colors[ma.flowers.length % colors.length],
            growProgress: 0,
            text: inp.value.trim()
          });
          inp.value = '';
          ma.inputText = '';
          emitParticles(width/2, height * 0.78, [100, 200, 120], 8);
        }
      }
    }
    if (ma.type === 'breathingBubble') {
      if (keyCode === 32) {
        ma.playerHolding = true;
      }
    }
  }

  // Skip typewriter
  if (GS.phase === 'playing' && GS.ui.typewriterIdx < GS.ui.typewriterTarget.length) {
    GS.ui.typewriterIdx = GS.ui.typewriterTarget.length;
    GS.ui.typewriterText = GS.ui.typewriterTarget;
  }
}

function keyReleased() {
  if (GS.phase === 'miniActivity' && GS.miniActivity) {
    if (GS.miniActivity.type === 'breathingBubble' && keyCode === 32) {
      GS.miniActivity.playerHolding = false;
    }
  }
}

function checkMouseHold() {
  if (GS.phase === 'miniActivity' && GS.miniActivity && GS.miniActivity.type === 'breathingBubble') {
    GS.miniActivity.playerHolding = mouseIsPressed;
  }
}

function checkBudgetSliderPress() {
  if (GS.phase === 'miniActivity' && GS.miniActivity && GS.miniActivity.type === 'budgetBalancer') {
    if (mouseIsPressed) {
      let ma = GS.miniActivity;
      let labelW = isMobile ? 70 : 120;
      let valueW = isMobile ? 55 : 80;
      let margin = isMobile ? 12 : 20;
      let sx = margin + labelW;
      let sw = width - margin * 2 - labelW - valueW;
      let sy = height * 0.15;
      let sh = isMobile ? max(height * 0.1, 55) : 65;
      let handleSize = isMobile ? 18 : 15;
      for (let i = 0; i < ma.categories.length; i++) {
        let cat = ma.categories[i];
        let hx = sx + sw * cat.value / 100;
        let hy = sy + i * sh + 15;
        if (dist(mouseX, mouseY, hx, hy) < handleSize) {
          cat.dragging = true;
          break;
        }
      }
    }
  }
}
