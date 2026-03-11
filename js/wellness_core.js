// ═══════════════════════════════════════════════════════════════
// WELLNESS JOURNEY — Core Game Engine
// A week-long life simulation exploring the 8 Dimensions of Wellness
// ═══════════════════════════════════════════════════════════════

// ── Dimension Colors (warm earth-tone palette) ──────────────
const DIM_COLORS = {
  physical:      [224, 120, 80],   // warm terracotta
  emotional:     [212, 160, 64],   // golden amber
  social:        [124, 184, 104],  // sage green
  intellectual:  [91, 141, 191],   // muted blue
  spiritual:     [155, 125, 196],  // soft lavender
  occupational:  [196, 122, 90],   // warm sienna
  financial:     [106, 171, 142],  // teal green
  environmental: [133, 165, 85]    // olive green
};

const DIM_NAMES = ['physical','emotional','social','intellectual','spiritual','occupational','financial','environmental'];
const DIM_LABELS = ['Physical','Emotional','Social','Intellectual','Spiritual','Occupational','Financial','Environmental'];
const DIM_ICONS = ['♥','☀','☺','✎','✦','⚙','$','♣'];

const TIME_LABELS = ['Morning','Afternoon','Evening'];
const TIME_ICONS  = ['☀','⛅','☾'];
const DAY_NAMES   = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

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

// ── Button Management ───────────────────────────────────────
let buttons = [];

class Btn {
  constructor(x, y, w, h, label, action, col) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.label = label; this.action = action;
    this.col = col || C.accent;
    this.hover = false;
    this.alpha = 255;
  }
  contains(mx, my) {
    return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
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
    textSize(15);
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
      textSize(22);
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

  // Animated wellness polygon — glow
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
    ellipse(glowVerts[i].x, glowVerts[i].y, 8);
  }

  // Labels
  if (showLabels !== false) {
    for (let i = 0; i < n; i++) {
      let angle = -HALF_PI + i * angleStep;
      let col = DIM_COLORS[DIM_NAMES[i]];
      let lx = cx + cos(angle) * (radius + 30);
      let ly = cy + sin(angle) * (radius + 30);

      fill(col[0], col[1], col[2]);
      textAlign(CENTER, CENTER);
      textSize(11);
      textStyle(BOLD);
      text(DIM_LABELS[i], lx, ly);
      textStyle(NORMAL);

      if (showValues !== false) {
        fill(C.textLight[0], C.textLight[1], C.textLight[2]);
        textSize(10);
        text(Math.round(GS.ui.wheelDisplay[DIM_NAMES[i]]), lx, ly + 14);
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

function drawBottomBar() {
  push();
  // Bar background
  fill(C.surfaceAlt[0], C.surfaceAlt[1], C.surfaceAlt[2]);
  noStroke();
  rect(0, height - 40, width, 40);
  stroke(C.border[0], C.border[1], C.border[2]);
  strokeWeight(1);
  line(0, height - 40, width, height - 40);

  // Dimension scores
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
}

function drawTopBar() {
  push();
  fill(C.surfaceAlt[0], C.surfaceAlt[1], C.surfaceAlt[2]);
  noStroke();
  rect(0, 0, width, 45);
  stroke(C.border[0], C.border[1], C.border[2]);
  strokeWeight(1);
  line(0, 45, width, 45);

  // Day and time
  fill(C.text[0], C.text[1], C.text[2]);
  textAlign(LEFT, CENTER);
  textSize(16);
  textStyle(BOLD);
  text(DAY_NAMES[GS.day - 1] + ' — ' + TIME_LABELS[GS.timeSlot], 20, 22);
  textStyle(NORMAL);

  // Time icon
  textSize(20);
  text(TIME_ICONS[GS.timeSlot], width/2, 22);

  // Day counter
  textSize(12);
  textAlign(RIGHT, CENTER);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Day ' + GS.day + ' of 7', width - 20, 22);

  pop();
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

  // Title
  push();
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(36);
  textStyle(BOLD);
  text('Wellness Journey', width/2, 100);
  textStyle(NORMAL);

  // Subtitle
  textSize(16);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text(WELLNESS_CONFIG.subtitle || 'Explore the 8 Dimensions of Wellness', width/2, 140);

  // Animated preview wheel
  let pulse = sin(frameCount * 0.02) * 5;
  drawWellnessWheel(width/2, 330, 120 + pulse, true, false);

  // Version badge
  textSize(13);
  fill(C.accent[0], C.accent[1], C.accent[2]);
  textStyle(BOLD);
  text(WELLNESS_CONFIG.title, width/2, 500);
  textStyle(NORMAL);

  pop();

  // Start button
  buttons = [new Btn(width/2 - 90, 540, 180, 48, 'Begin Journey', 'start', C.accent)];
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

  push();
  // Title
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(24);
  textStyle(BOLD);
  text(page.title, width/2, 60);
  textStyle(NORMAL);

  // Body text
  textSize(14);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  let lines = wrapText(page.body, 600);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], width/2, 110 + i * 22);
  }

  let contentY = 110 + lines.length * 22 + 20;

  // Show dimensions grid on page 2
  if (page.showDimensions) {
    let cols = 4;
    let cardW = 200;
    let cardH = 70;
    let gap = 15;
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
      textSize(18);
      text(DIM_ICONS[i], cx + 12, cy + 10);
      textSize(13);
      textStyle(BOLD);
      text(DIM_LABELS[i], cx + 35, cy + 12);
      textStyle(NORMAL);

      // Description
      textSize(10);
      fill(C.textLight[0], C.textLight[1], C.textLight[2]);
      let desc = getDimensionDesc(i);
      text(desc, cx + 12, cy + 35, cardW - 24, cardH - 40);
    }
    contentY += 2 * (cardH + gap) + 20;
  }

  // Highlight text
  if (page.highlight) {
    textAlign(CENTER, CENTER);
    fill(C.accent[0], C.accent[1], C.accent[2]);
    textSize(15);
    textStyle(BOLD);
    text(page.highlight, width/2, min(contentY + 20, 530));
    textStyle(NORMAL);
  }

  // Page dots
  for (let i = 0; i < 3; i++) {
    fill(i === GS.introPage ? C.accent : C.border);
    noStroke();
    ellipse(width/2 - 20 + i * 20, 580, 8);
  }

  pop();

  // Navigation buttons
  buttons = [];
  if (GS.introPage > 0) {
    buttons.push(new Btn(width/2 - 200, 555, 100, 40, '← Back', 'intro_back', C.border));
  }
  if (GS.introPage < 2) {
    buttons.push(new Btn(width/2 + 100, 555, 100, 40, 'Next →', 'intro_next', C.accent));
  } else {
    buttons.push(new Btn(width/2 + 60, 555, 140, 40, 'Start Week →', 'start_game', C.accent));
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
// MAIN GAMEPLAY — Scenario Display + Choice
// ═══════════════════════════════════════════════════════════════

function drawPlaying() {
  background(C.bg[0], C.bg[1], C.bg[2]);
  drawTopBar();
  drawBottomBar();

  updateTypewriter();

  let scenario = GS.currentScenario;
  if (!scenario) return;

  // Left panel — Scenario and choices
  let panelX = 20;
  let panelY = 55;
  let panelW = 510;
  let panelH = height - 105;

  push();
  // Scenario text box
  drawRoundedBox(panelX, panelY, panelW, panelH, 12, C.surface, C.border);

  // Scenario narrative
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

      // Choice card
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

      // Choice text
      fill(C.text[0], C.text[1], C.text[2], a);
      noStroke();
      textAlign(LEFT, CENTER);
      textSize(12);
      let choiceLines = wrapText(choices[i].text, panelW - 70);
      for (let j = 0; j < choiceLines.length; j++) {
        text(choiceLines[j], panelX + 35, by + btnH/2 - (choiceLines.length-1)*8 + j*16);
      }

      // Effect hints
      let hints = getEffectHints(choices[i].effects);
      textAlign(RIGHT, CENTER);
      textSize(9);
      fill(C.textLight[0], C.textLight[1], C.textLight[2], a * 0.7);
      text(hints, panelX + panelW - 40, by + btnH - 12);

      pop();

      // Store button area for click detection
      buttons.push({ x: panelX + 15, y: by, w: panelW - 30, h: btnH, idx: i });
    }
  }

  // Choice result display
  if (GS.choiceResult) {
    GS.ui.resultTimer++;
    let a = min(GS.ui.resultTimer * 6, 255);

    let wrapped2 = wrapText(GS.choiceResult, panelW - 60);
    let rY = panelY + panelH - 30 - wrapped2.length * 20;

    // Result box
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

    // Continue button after delay
    if (GS.ui.resultTimer > 60) {
      let contBtn = new Btn(panelX + panelW/2 - 60, panelY + panelH - 55, 120, 36, 'Continue →', 'continue', C.accent);
      contBtn.draw();
      buttons.push(contBtn);
    }
  }
  pop();

  // Right panel — Wellness Wheel
  let wheelCX = 540 + (width - 540) / 2;
  let wheelCY = 45 + (height - 85) / 2;
  drawWellnessWheel(wheelCX, wheelCY, 140, true, true);
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
  // Draw the playing screen behind
  drawPlaying();

  if (!GS.activeEvent) return;

  // Overlay
  push();
  fill(0, 0, 0, 120);
  rect(0, 0, width, height);

  // Event card
  let cardW = 500;
  let cardH = 300;
  let cx = (width - cardW) / 2;
  let cy = (height - cardH) / 2;

  drawRoundedBox(cx, cy, cardW, cardH, 14, C.surface, C.accent);

  // Event badge
  fill(C.accent[0], C.accent[1], C.accent[2]);
  noStroke();
  rect(cx + cardW/2 - 60, cy - 15, 120, 30, 15);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(12);
  textStyle(BOLD);
  text('⚡ Random Event!', cx + cardW/2, cy);
  textStyle(NORMAL);

  // Event text
  fill(C.text[0], C.text[1], C.text[2]);
  textAlign(LEFT, TOP);
  textSize(14);
  let lines = wrapText(GS.activeEvent.text, cardW - 40);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], cx + 20, cy + 30 + i * 22);
  }

  // Event choices
  let choiceY = cy + 30 + lines.length * 22 + 20;
  buttons = [];
  let choices = GS.activeEvent.choices;
  for (let i = 0; i < choices.length; i++) {
    let btnW = cardW - 60;
    let btnH = 42;
    let by = choiceY + i * (btnH + 8);

    let isHover = GS.ui.hoverBtn === i;
    fill(isHover ? [C.accent[0], C.accent[1], C.accent[2], 30] : [255, 255, 255, 200]);
    stroke(C.border[0], C.border[1], C.border[2]);
    strokeWeight(1);
    rect(cx + 30, by, btnW, btnH, 8);

    fill(C.text[0], C.text[1], C.text[2]);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(12);
    text(choices[i].text, cx + 45, by + btnH/2);

    buttons.push({ x: cx + 30, y: by, w: btnW, h: btnH, idx: i, isEvent: true });
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
  textSize(28);
  textStyle(BOLD);
  text(DAY_NAMES[GS.day - 1] + ' Complete', width/2, 80);
  textStyle(NORMAL);

  // Mini wellness wheel
  drawWellnessWheel(width/2, 280, 110, true, true);

  // Day summary narrative
  if (GS.daySummary) {
    textSize(14);
    fill(C.textLight[0], C.textLight[1], C.textLight[2]);
    let lines = wrapText(GS.daySummary, 500);
    for (let i = 0; i < lines.length; i++) {
      text(lines[i], width/2, 440 + i * 22);
    }
  }

  // Show changes
  let changeY = 490;
  textSize(11);
  let dims = Object.keys(GS.wellness);
  let spacing = width / 8;
  for (let i = 0; i < 8; i++) {
    let x = spacing * i + spacing / 2;
    let dim = DIM_NAMES[i];
    let col = DIM_COLORS[dim];
    let val = Math.round(GS.wellness[dim]);

    fill(col[0], col[1], col[2]);
    textAlign(CENTER, TOP);
    textSize(10);
    textStyle(BOLD);
    text(DIM_LABELS[i].substring(0, 5), x, changeY);
    textStyle(NORMAL);
    textSize(16);
    text(val, x, changeY + 14);
  }

  pop();

  // Continue button
  if (GS.ui.dayTransitionTimer > 40) {
    let label = GS.day < 7 ? 'Next Day →' : 'View Report →';
    buttons = [new Btn(width/2 - 80, 570, 160, 44, label, 'next_day', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

// ═══════════════════════════════════════════════════════════════
// MINI-ACTIVITIES
// ═══════════════════════════════════════════════════════════════

// ── Breathing Bubble ────────────────────────────────────────
function initBreathingBubble() {
  GS.miniActivity = {
    type: 'breathingBubble',
    timer: 0,
    maxTime: 60 * 12,  // 12 seconds
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

  // Guide bubble breathing cycle (4 sec in, 4 sec out at 60fps)
  let cycleLen = 60 * 4;
  let t = (ma.timer % (cycleLen * 2));
  if (t < cycleLen) {
    ma.phase = 'in';
    ma.guideRadius = map(t, 0, cycleLen, 40, 130);
  } else {
    ma.phase = 'out';
    ma.guideRadius = map(t, cycleLen, cycleLen * 2, 130, 40);
  }

  // Player bubble
  if (ma.playerHolding) {
    ma.playerRadius = min(ma.playerRadius + 1.5, 140);
  } else {
    ma.playerRadius = max(ma.playerRadius - 1.5, 35);
  }

  // Score based on matching
  let diff = abs(ma.guideRadius - ma.playerRadius);
  ma.matchScore += max(0, 1 - diff / 50);
  ma.matchSamples++;

  // Check cycles
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

  // Title
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(20);
  textStyle(BOLD);
  text('Breathing Exercise', width/2, 40);
  textStyle(NORMAL);

  // Instructions
  textSize(13);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Hold mouse button to breathe in. Release to breathe out.', width/2, 70);

  // Breath phase text
  textSize(22);
  fill(C.accent[0], C.accent[1], C.accent[2]);
  text(ma.phase === 'in' ? 'Breathe In...' : 'Breathe Out...', width/2, 110);

  // Guide bubble (outer ring)
  noFill();
  stroke(C.border[0], C.border[1], C.border[2], 100);
  strokeWeight(2);
  ellipse(width/2, height/2 - 20, ma.guideRadius * 2);

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
  ellipse(width/2, height/2 - 20, ma.playerRadius * 2);

  // Inner glow
  noStroke();
  fill(red(col), green(col), blue(col), 30);
  ellipse(width/2, height/2 - 20, ma.playerRadius * 1.5);

  // Calming particles
  if (frameCount % 5 === 0) {
    let angle = random(TWO_PI);
    emitParticles(
      width/2 + cos(angle) * ma.playerRadius,
      height/2 - 20 + sin(angle) * ma.playerRadius,
      [red(col), green(col), blue(col)], 1,
      { vx: () => cos(angle) * 0.5, vy: () => sin(angle) * 0.5 - 0.3, life: 40, size: 4 }
    );
  }

  // Progress bar
  let progress = ma.timer / ma.maxTime;
  fill(C.border[0], C.border[1], C.border[2]);
  rect(width/2 - 150, height - 80, 300, 8, 4);
  fill(C.accent[0], C.accent[1], C.accent[2]);
  rect(width/2 - 150, height - 80, 300 * progress, 8, 4);

  // Cycle counter
  textSize(11);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Breath ' + min(ma.cycle + 1, ma.maxCycles) + ' of ' + ma.maxCycles, width/2, height - 60);

  pop();

  drawParticles();

  // Done
  if (ma.complete) {
    buttons = [new Btn(width/2 - 60, height - 50, 120, 36, 'Done ✓', 'mini_done', C.accent)];
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
  if (inp) { inp.value = ''; inp.focus(); }
}

function updateGratitudeGarden() {
  let ma = GS.miniActivity;
  ma.timer++;

  // Grow flowers
  for (let f of ma.flowers) {
    if (f.growProgress < 1) f.growProgress += 0.02;
  }

  // Read input
  let inp = document.getElementById('textInput');
  if (inp) ma.inputText = inp.value;

  if (ma.flowers.length >= ma.goal || ma.timer >= ma.maxTime) {
    ma.complete = true;
    ma.inputActive = false;
  }
}

function drawGratitudeGarden() {
  let ma = GS.miniActivity;

  // Sky gradient
  for (let y = 0; y < height - 150; y++) {
    let t = y / (height - 150);
    let c = lerpColor(color(200, 220, 240), color(245, 239, 230), t);
    stroke(c);
    line(0, y, width, y);
  }

  // Ground
  noStroke();
  fill(120, 160, 80);
  rect(0, height - 150, width, 150);
  fill(100, 140, 65);
  rect(0, height - 150, width, 20, 10, 10, 0, 0);

  push();
  textAlign(CENTER, CENTER);

  // Title
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(20);
  textStyle(BOLD);
  text('Gratitude Garden', width/2, 35);
  textStyle(NORMAL);

  textSize(13);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Type something you\'re grateful for and press Enter to plant a flower', width/2, 60);

  // Draw flowers
  for (let f of ma.flowers) {
    drawFlower(f.x, height - 150, f.color, f.growProgress, f.text);
  }

  // Input box
  fill(255, 255, 255, 220);
  stroke(C.accent[0], C.accent[1], C.accent[2]);
  strokeWeight(2);
  rect(width/2 - 200, 85, 400, 36, 8);

  fill(C.text[0], C.text[1], C.text[2]);
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(13);
  let displayText = ma.inputText || 'I\'m grateful for...';
  if (!ma.inputText) fill(C.textLight[0], C.textLight[1], C.textLight[2], 150);
  text(displayText, width/2 - 190, 103);

  // Counter
  textAlign(CENTER, CENTER);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  textSize(11);
  text(ma.flowers.length + ' / ' + ma.goal + ' flowers planted', width/2, 135);

  pop();

  drawParticles();

  if (ma.complete) {
    buttons = [new Btn(width/2 - 60, 140, 120, 36, 'Done ✓', 'mini_done', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

function drawFlower(x, groundY, col, progress, label) {
  if (progress <= 0) return;
  let p = constrain(progress, 0, 1);
  let stemH = 60 * p;
  let petalSize = 12 * p;

  push();
  // Stem
  stroke(80, 140, 60);
  strokeWeight(3);
  line(x, groundY, x, groundY - stemH);

  // Leaves
  if (p > 0.3) {
    noStroke();
    fill(90, 150, 60);
    ellipse(x - 8, groundY - stemH * 0.4, 14 * p, 7 * p);
    ellipse(x + 10, groundY - stemH * 0.6, 14 * p, 7 * p);
  }

  // Petals
  if (p > 0.5) {
    noStroke();
    fill(col[0], col[1], col[2], 200 * p);
    for (let a = 0; a < 6; a++) {
      let angle = a * (TWO_PI / 6);
      ellipse(x + cos(angle) * petalSize * 0.7, groundY - stemH + sin(angle) * petalSize * 0.7, petalSize, petalSize);
    }
    // Center
    fill(250, 220, 100);
    ellipse(x, groundY - stemH, petalSize * 0.6);
  }

  // Label
  if (p > 0.8 && label) {
    fill(C.text[0], C.text[1], C.text[2], 180);
    textAlign(CENTER, BOTTOM);
    textSize(9);
    noStroke();
    let lines = wrapText(label, 80);
    for (let i = 0; i < min(lines.length, 2); i++) {
      text(lines[i], x, groundY - stemH - 15 + i * 11);
    }
  }
  pop();
}

// ── Budget Balancer ─────────────────────────────────────────
function initBudgetBalancer() {
  let cats = WELLNESS_CONFIG.version === 'student'
    ? ['Housing','Food','Transport','Entertainment','Savings','Supplies']
    : ['Housing','Food','Transport','Entertainment','Savings','Prof. Dev.'];
  GS.miniActivity = {
    type: 'budgetBalancer',
    timer: 0,
    maxTime: 60 * 25,
    categories: cats.map((c, i) => ({ label: c, value: floor(100/6), dragging: false })),
    totalBudget: WELLNESS_CONFIG.version === 'student' ? 1000 : 5000,
    complete: false,
    submitted: false
  };
  // Normalize to 100
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

  push();
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(20);
  textStyle(BOLD);
  text('Budget Balancer', width/2, 35);
  textStyle(NORMAL);

  textSize(13);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Drag the sliders to allocate your monthly budget of $' + ma.totalBudget, width/2, 60);

  // Sliders
  let sx = 150;
  let sw = width - 300;
  let sy = 100;
  let sh = 65;

  for (let i = 0; i < ma.categories.length; i++) {
    let cat = ma.categories[i];
    let y = sy + i * sh;
    let dollars = floor(cat.value / 100 * ma.totalBudget);

    // Label
    fill(C.text[0], C.text[1], C.text[2]);
    textAlign(RIGHT, CENTER);
    textSize(13);
    text(cat.label, sx - 15, y + 15);

    // Dollar amount
    textSize(11);
    fill(C.textLight[0], C.textLight[1], C.textLight[2]);
    textAlign(LEFT, CENTER);
    text('$' + dollars + ' (' + cat.value + '%)', sx + sw + 15, y + 15);

    // Track
    fill(C.border[0], C.border[1], C.border[2]);
    noStroke();
    rect(sx, y + 10, sw, 10, 5);

    // Filled portion
    let col = DIM_COLORS[DIM_NAMES[i % 8]];
    fill(col[0], col[1], col[2], 180);
    rect(sx, y + 10, sw * cat.value / 100, 10, 5);

    // Handle
    let hx = sx + sw * cat.value / 100;
    fill(cat.dragging ? C.accentDark : C.accent);
    stroke(255);
    strokeWeight(2);
    ellipse(hx, y + 15, 20);
    noStroke();
  }

  // Total indicator
  let total = ma.categories.reduce((s, c) => s + c.value, 0);
  textAlign(CENTER, CENTER);
  textSize(14);
  fill(total === 100 ? [100, 160, 100] : [200, 100, 80]);
  textStyle(BOLD);
  text('Total: ' + total + '%' + (total === 100 ? ' ✓' : ' (must be 100%)'), width/2, sy + ma.categories.length * sh + 15);
  textStyle(NORMAL);

  // Progress bar
  let progress = ma.timer / ma.maxTime;
  fill(C.border[0], C.border[1], C.border[2]);
  noStroke();
  rect(width/2 - 150, height - 70, 300, 8, 4);
  fill(C.accent[0], C.accent[1], C.accent[2]);
  rect(width/2 - 150, height - 70, 300 * progress, 8, 4);

  textSize(10);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Time remaining: ' + max(0, ceil((ma.maxTime - ma.timer) / 60)) + 's', width/2, height - 55);

  pop();

  if (ma.complete || total === 100) {
    if (!ma.complete) ma.complete = true;
    buttons = [new Btn(width/2 - 60, height - 45, 120, 36, 'Submit ✓', 'mini_done', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

// ── Social Connection Web ───────────────────────────────────
function initSocialWeb() {
  let labels = WELLNESS_CONFIG.version === 'student'
    ? ['Friend','Family','Classmate','Mentor','Club Member','Roommate','Study Buddy','Self']
    : ['Colleague','Family','Manager','Mentor','Friend','Team Member','Community','Self'];

  let nodes = [];
  for (let i = 0; i < labels.length; i++) {
    let angle = (i / labels.length) * TWO_PI - HALF_PI;
    let r = i === labels.length - 1 ? 0 : 150;
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
  textSize(20);
  textStyle(BOLD);
  text('Social Connection Web', width/2, 30);
  textStyle(NORMAL);
  textSize(13);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Click two people to connect them. Build ' + ma.goal + ' connections!', width/2, 55);

  // Draw connections
  for (let conn of ma.connections) {
    let a = ma.nodes[conn[0]];
    let b = ma.nodes[conn[1]];
    stroke(C.accent[0], C.accent[1], C.accent[2], 150);
    strokeWeight(2);
    line(a.x, a.y, b.x, b.y);
  }

  // Draw line from selected to mouse
  if (ma.selectedNode !== null) {
    let n = ma.nodes[ma.selectedNode];
    stroke(C.accent[0], C.accent[1], C.accent[2], 80);
    strokeWeight(1.5);
    line(n.x, n.y, mouseX, mouseY);
  }

  // Draw nodes
  for (let i = 0; i < ma.nodes.length; i++) {
    let n = ma.nodes[i];
    let connCount = ma.connections.filter(c => c[0] === i || c[1] === i).length;
    let nodeSize = 35 + connCount * 5;
    let isSelected = ma.selectedNode === i;
    let isHover = dist(mouseX, mouseY, n.x, n.y) < nodeSize/2;

    let col = n.isSelf ? C.accent : DIM_COLORS[DIM_NAMES[i % 8]];

    // Glow for connected nodes
    if (connCount > 0) {
      noStroke();
      fill(col[0], col[1], col[2], 20 + sin(frameCount * 0.05) * 10);
      ellipse(n.x, n.y, nodeSize + 15);
    }

    // Node circle
    fill(isSelected ? [...col, 255] : (isHover ? [...col, 200] : [...col, 150]));
    stroke(col[0], col[1], col[2]);
    strokeWeight(isSelected ? 3 : 1.5);
    ellipse(n.x, n.y, nodeSize);

    // Label
    fill(255);
    noStroke();
    textSize(10);
    textStyle(BOLD);
    text(n.label, n.x, n.y);
    textStyle(NORMAL);
  }

  // Counter
  textSize(12);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text(ma.connections.length + ' / ' + ma.goal + ' connections', width/2, height - 55);

  pop();

  drawParticles();

  if (ma.complete) {
    buttons = [new Btn(width/2 - 60, height - 45, 120, 36, 'Done ✓', 'mini_done', C.accent)];
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
    // Scene elements
    clouds: [{ x: 150, y: 80 }, { x: 400, y: 60 }, { x: 700, y: 90 }],
    trees: [{ x: 100 }, { x: 300 }, { x: 600 }, { x: 850 }],
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

  // Animate ripples
  for (let r of ma.ripples) r.radius += 0.5;
  ma.ripples = ma.ripples.filter(r => r.radius < 40);

  // Animate birds
  for (let b of ma.birds) { b.x += b.speed; b.wingPhase += 0.1; }
  ma.birds = ma.birds.filter(b => b.x < width + 50);

  if (ma.totalChanges >= ma.maxChanges || ma.timer >= ma.maxTime) {
    ma.complete = true;
    return;
  }

  ma.changeTimer--;
  if (ma.changeTimer <= 0 && !ma.activeChange) {
    // Trigger a change
    let types = ['bird', 'cloud_color', 'leaf', 'ripple', 'star'];
    let type = types[floor(random(types.length))];
    let cx, cy;

    switch(type) {
      case 'bird':
        cy = random(50, 150);
        ma.birds.push({ x: -20, y: cy, speed: 1.5, wingPhase: 0 });
        cx = 100; cy = cy;
        break;
      case 'cloud_color':
        let ci = floor(random(ma.clouds.length));
        cx = ma.clouds[ci].x; cy = ma.clouds[ci].y;
        ma.clouds[ci].highlight = true;
        break;
      case 'leaf':
        cx = random(80, width - 80);
        cy = random(200, 350);
        break;
      case 'ripple':
        cx = random(100, width - 100);
        cy = random(height - 140, height - 100);
        ma.ripples.push({ x: cx, y: cy, radius: 0 });
        break;
      case 'star':
        cx = random(50, width - 50);
        cy = random(20, 100);
        break;
    }

    ma.activeChange = { type, x: cx, y: cy, found: false, timer: 60 * 4 };
    ma.totalChanges++;
  }

  // Active change timeout
  if (ma.activeChange) {
    ma.activeChange.timer--;
    if (ma.activeChange.timer <= 0) {
      // Remove cloud highlight
      for (let c of ma.clouds) c.highlight = false;
      scheduleNextChange();
    }
  }
}

function drawMindfulMoment() {
  let ma = GS.miniActivity;

  // Sky
  for (let y = 0; y < height - 120; y++) {
    let t = y / (height - 120);
    let c = lerpColor(color(170, 200, 230), color(230, 225, 210), t);
    stroke(c); line(0, y, width, y);
  }

  // Water
  for (let y = height - 120; y < height; y++) {
    let t = (y - (height - 120)) / 120;
    let c = lerpColor(color(140, 180, 200), color(100, 150, 180), t);
    stroke(c); line(0, y, width, y);
  }

  // Clouds
  for (let cl of ma.clouds) {
    noStroke();
    if (cl.highlight) {
      fill(255, 200, 150, 200);
    } else {
      fill(255, 255, 255, 180);
    }
    ellipse(cl.x, cl.y, 80, 35);
    ellipse(cl.x - 25, cl.y + 5, 50, 25);
    ellipse(cl.x + 25, cl.y + 5, 60, 28);
  }

  // Trees
  for (let tr of ma.trees) {
    noStroke();
    fill(90, 70, 50);
    rect(tr.x - 6, 320, 12, 80);
    fill(80, 140, 70);
    ellipse(tr.x, 300, 60, 70);
    fill(70, 125, 60, 200);
    ellipse(tr.x - 15, 310, 40, 50);
    ellipse(tr.x + 15, 310, 40, 50);
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

  // Active change indicator (subtle sparkle)
  if (ma.activeChange && !ma.activeChange.found) {
    let ac = ma.activeChange;
    let sparkle = sin(frameCount * 0.15) * 20 + 40;
    noStroke();
    fill(255, 255, 200, sparkle);
    ellipse(ac.x, ac.y, 15);
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

  // Title
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(18);
  textStyle(BOLD);
  text('Mindful Moment', width/2, 20);
  textStyle(NORMAL);
  textSize(11);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Click on changes you notice in the scene', width/2, 40);

  // Score
  textSize(12);
  text('Found: ' + ma.score + ' / ' + ma.maxChanges, width/2, height - 20);

  pop();

  if (ma.complete) {
    buttons = [new Btn(width/2 - 60, height - 50, 120, 36, 'Done ✓', 'mini_done', C.accent)];
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
  // Shuffle
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

  // Flip animations
  for (let c of ma.cards) {
    if (c.faceUp && c.flipAnim < 1) c.flipAnim = min(c.flipAnim + 0.1, 1);
    if (!c.faceUp && c.flipAnim > 0) c.flipAnim = max(c.flipAnim - 0.1, 0);
  }

  // Check for matches
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
  textSize(20);
  textStyle(BOLD);
  text('Memory Match', width/2, 30);
  textStyle(NORMAL);
  textSize(13);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Find all 8 matching pairs!', width/2, 55);

  // Cards grid 4x4
  let cardW = 90;
  let cardH = 100;
  let gap = 12;
  let cols = 4;
  let startX = (width - (cols * cardW + (cols-1) * gap)) / 2;
  let startY = 80;

  for (let i = 0; i < ma.cards.length; i++) {
    let card = ma.cards[i];
    let col = i % cols;
    let row = floor(i / cols);
    let cx = startX + col * (cardW + gap);
    let cy = startY + row * (cardH + gap);

    let isHover = mouseX >= cx && mouseX <= cx + cardW && mouseY >= cy && mouseY <= cy + cardH;

    if (card.matched) {
      // Matched card — golden
      fill(C.gold[0], C.gold[1], C.gold[2], 40);
      stroke(C.gold[0], C.gold[1], C.gold[2], 100);
      strokeWeight(1.5);
      rect(cx, cy, cardW, cardH, 8);
      fill(C.gold[0], C.gold[1], C.gold[2]);
      noStroke();
      textSize(28);
      text(card.symbol, cx + cardW/2, cy + cardH/2);
    } else if (card.faceUp) {
      // Face up
      fill(C.surface[0], C.surface[1], C.surface[2]);
      stroke(C.accent[0], C.accent[1], C.accent[2]);
      strokeWeight(2);
      rect(cx, cy, cardW, cardH, 8);
      fill(C.accent[0], C.accent[1], C.accent[2]);
      noStroke();
      textSize(28);
      text(card.symbol, cx + cardW/2, cy + cardH/2);
    } else {
      // Face down
      fill(isHover ? [C.accent[0], C.accent[1], C.accent[2], 60] : C.surfaceAlt);
      stroke(C.border[0], C.border[1], C.border[2]);
      strokeWeight(1.5);
      rect(cx, cy, cardW, cardH, 8);
      // Pattern on back
      fill(C.border[0], C.border[1], C.border[2], 40);
      noStroke();
      textSize(20);
      text('?', cx + cardW/2, cy + cardH/2);
    }
  }

  // Stats
  textSize(12);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Pairs: ' + ma.pairsFound + '/8  |  Flips: ' + ma.totalFlips, width/2, height - 55);

  // Timer
  let timeLeft = max(0, ceil((ma.maxTime - ma.timer) / 60));
  text('Time: ' + timeLeft + 's', width/2, height - 38);

  pop();

  drawParticles();

  if (ma.complete) {
    buttons = [new Btn(width/2 - 60, height - 45, 120, 36, 'Done ✓', 'mini_done', C.accent)];
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
    characterX: 100,
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

  // Decay click speed
  ma.clickSpeed *= 0.97;
  ma.legPhase += ma.clickSpeed * 0.3;

  // Scroll background
  ma.scrollOffset += ma.clickSpeed * 2;

  if (ma.steps >= ma.target || ma.timer >= ma.maxTime) {
    ma.complete = true;
  }
}

function drawStepChallenge() {
  let ma = GS.miniActivity;

  // Sky
  background(200, 220, 240);

  // Scrolling ground
  noStroke();
  fill(120, 160, 80);
  rect(0, height - 120, width, 120);

  // Path markings
  stroke(140, 175, 95);
  strokeWeight(2);
  for (let x = -ma.scrollOffset % 50; x < width; x += 50) {
    line(x, height - 90, x + 20, height - 90);
  }

  // Scrolling trees
  for (let i = 0; i < 6; i++) {
    let tx = (i * 200 - ma.scrollOffset * 0.3) % (width + 200) - 100;
    noStroke();
    fill(90, 70, 50);
    rect(tx - 5, height - 180, 10, 60);
    fill(70, 130, 60);
    ellipse(tx, height - 190, 40, 50);
  }

  // Character
  let charX = 200;
  let charY = height - 135;
  let bounce = sin(ma.legPhase * 0.5) * min(ma.clickSpeed * 3, 8);

  push();
  translate(charX, charY - bounce);

  // Body
  noStroke();
  fill(C.accent[0], C.accent[1], C.accent[2]);
  ellipse(0, -20, 30, 35);

  // Head
  fill(220, 190, 160);
  ellipse(0, -45, 22);

  // Arms swinging
  stroke(C.accent[0] - 20, C.accent[1] - 20, C.accent[2] - 20);
  strokeWeight(4);
  let armSwing = sin(ma.legPhase) * 20;
  line(-12, -22, -12 + armSwing, 0);
  line(12, -22, 12 - armSwing, 0);

  // Legs
  let legSwing = sin(ma.legPhase) * 15;
  stroke(80, 80, 120);
  line(-6, -5, -6 + legSwing, 15);
  line(6, -5, 6 - legSwing, 15);

  pop();

  // UI
  push();
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(20);
  textStyle(BOLD);
  text('Step Challenge', width/2, 30);
  textStyle(NORMAL);

  textSize(13);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Click rapidly to walk! Reach ' + ma.target + ' steps.', width/2, 55);

  // Step counter
  textSize(36);
  fill(C.accent[0], C.accent[1], C.accent[2]);
  textStyle(BOLD);
  text(ma.steps, width/2, 100);
  textStyle(NORMAL);
  textSize(14);
  text('steps', width/2, 125);

  // Progress bar
  let progress = ma.steps / ma.target;
  fill(C.border[0], C.border[1], C.border[2]);
  noStroke();
  rect(100, height - 50, width - 200, 12, 6);
  fill(C.accent[0], C.accent[1], C.accent[2]);
  rect(100, height - 50, (width - 200) * min(progress, 1), 12, 6);

  // Time
  let timeLeft = max(0, ceil((ma.maxTime - ma.timer) / 60));
  textSize(11);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text(timeLeft + 's remaining', width/2, height - 30);

  pop();

  if (ma.complete) {
    buttons = [new Btn(width/2 - 60, height - 50, 120, 36, 'Done ✓', 'mini_done', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

// ── Desk Organizer ──────────────────────────────────────────
function initDeskOrganizer() {
  let zones = [
    { label: 'Study Area', x: 50, y: 100, w: 250, h: 200, items: [] },
    { label: 'Personal', x: 350, y: 100, w: 250, h: 200, items: [] },
    { label: 'Supplies', x: 650, y: 100, w: 250, h: 200, items: [] },
    { label: 'Recycle', x: 350, y: 350, w: 250, h: 150, items: [] }
  ];

  let items = WELLNESS_CONFIG.version === 'student'
    ? [
      { label: '📚 Textbook', zone: 0 }, { label: '💻 Laptop', zone: 0 },
      { label: '📝 Notebook', zone: 0 }, { label: '🖊️ Pens', zone: 2 },
      { label: '🌱 Plant', zone: 1 }, { label: '📱 Phone', zone: 1 },
      { label: '🥤 Empty Cup', zone: 3 }, { label: '💡 Desk Lamp', zone: 2 },
      { label: '🎧 Headphones', zone: 1 }, { label: '📄 Old Notes', zone: 3 },
      { label: '🧴 Hand Sanitizer', zone: 2 }, { label: '🍕 Food Wrapper', zone: 3 }
    ]
    : [
      { label: '💻 Laptop', zone: 0 }, { label: '📋 Reports', zone: 0 },
      { label: '🖊️ Pen Set', zone: 2 }, { label: '📸 Family Photo', zone: 1 },
      { label: '🌱 Desk Plant', zone: 1 }, { label: '☕ Coffee Mug', zone: 1 },
      { label: '📎 Paper Clips', zone: 2 }, { label: '📁 File Folder', zone: 0 },
      { label: '📰 Old Memos', zone: 3 }, { label: '🗒️ Sticky Notes', zone: 2 },
      { label: '📧 Printed Email', zone: 3 }, { label: '🎧 Headset', zone: 1 }
    ];

  // Scatter items randomly
  for (let item of items) {
    item.x = random(50, width - 100);
    item.y = random(350, height - 80);
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
  textSize(20);
  textStyle(BOLD);
  text('Organize Your Space', width/2, 25);
  textStyle(NORMAL);
  textSize(13);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text('Drag items to the correct zones', width/2, 48);

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
    textSize(12);
    textStyle(BOLD);
    text(z.label, z.x + z.w/2, z.y + 15);
    textStyle(NORMAL);
  }

  // Draw items
  for (let item of ma.items) {
    let ix = item.dragging ? mouseX - 30 : item.x;
    let iy = item.dragging ? mouseY - 15 : item.y;

    // Item card
    fill(item.placed ? [200, 230, 200] : C.surface);
    stroke(item.placed ? [100, 180, 100] : C.border);
    strokeWeight(item.dragging ? 2 : 1);
    rect(ix, iy, 80, 30, 6);

    fill(C.text[0], C.text[1], C.text[2]);
    noStroke();
    textSize(10);
    text(item.label, ix + 40, iy + 15);
  }

  // Stats
  let placed = ma.items.filter(i => i.placed).length;
  textSize(11);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text(placed + ' / ' + ma.items.length + ' items placed', width/2, height - 30);

  let timeLeft = max(0, ceil((ma.maxTime - ma.timer) / 60));
  text('Time: ' + timeLeft + 's', width/2, height - 15);

  pop();

  if (ma.complete) {
    buttons = [new Btn(width/2 - 60, height - 55, 120, 36, 'Done ✓', 'mini_done', C.accent)];
    for (let b of buttons) b.draw();
  } else {
    buttons = [];
  }
}

// Dashed line utility for canvas
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

  // Slide in
  let targetY = 55;
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
  let bx = width/2 - 150;
  let by = GS.ui.achieveSlide;

  // Gold badge background
  fill(C.gold[0], C.gold[1], C.gold[2], 240);
  noStroke();
  rect(bx, by, 300, 40, 20);

  // Icon
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(18);
  text(a.icon, bx + 25, by + 20);

  // Text
  textAlign(LEFT, CENTER);
  textSize(12);
  textStyle(BOLD);
  fill(60, 40, 10);
  text(a.name, bx + 45, by + 13);
  textStyle(NORMAL);
  textSize(10);
  fill(80, 60, 30);
  text(a.desc, bx + 45, by + 28);

  pop();
}

// ═══════════════════════════════════════════════════════════════
// END-OF-WEEK REPORT
// ═══════════════════════════════════════════════════════════════

function drawReport() {
  background(C.bg[0], C.bg[1], C.bg[2]);

  let scrollY = GS.ui.scrollY;
  push();
  translate(0, -scrollY);

  let y = 30;

  // Header
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(28);
  textStyle(BOLD);
  text('Your Wellness Journey Report', width/2, y);
  textStyle(NORMAL);
  y += 20;

  textSize(13);
  fill(C.textLight[0], C.textLight[1], C.textLight[2]);
  text(WELLNESS_CONFIG.reportIntro || 'Here\'s how your week went...', width/2, y + 15);
  y += 50;

  // Final Wellness Wheel
  drawWellnessWheel(width/2, y + 150, 130, true, true);
  y += 330;

  // Dimension breakdown cards
  textAlign(LEFT, TOP);
  let cardW = 440;
  let cardH = 60;
  let gap = 10;
  let startX = (width - cardW) / 2;

  for (let i = 0; i < 8; i++) {
    let dim = DIM_NAMES[i];
    let col = DIM_COLORS[dim];
    let val = Math.round(GS.wellness[dim]);
    let startVal = GS.startWellness ? Math.round(GS.startWellness[dim]) : 50;
    let change = val - startVal;
    let grade = val >= 90 ? 'A' : val >= 75 ? 'B' : val >= 60 ? 'C' : val >= 45 ? 'D' : 'F';

    let cy = y + i * (cardH + gap);

    // Card bg
    drawRoundedBox(startX, cy, cardW, cardH, 8, C.surface, [...col, 150]);

    // Color indicator
    noStroke();
    fill(col[0], col[1], col[2]);
    rect(startX, cy, 6, cardH, 8, 0, 0, 8);

    // Icon and name
    textSize(16);
    text(DIM_ICONS[i], startX + 18, cy + 10);
    fill(C.text[0], C.text[1], C.text[2]);
    textSize(13);
    textStyle(BOLD);
    text(DIM_LABELS[i], startX + 40, cy + 12);
    textStyle(NORMAL);

    // Grade
    textAlign(CENTER, CENTER);
    fill(col[0], col[1], col[2]);
    textSize(22);
    textStyle(BOLD);
    text(grade, startX + cardW - 40, cy + cardH/2);
    textStyle(NORMAL);

    // Score and change
    textAlign(LEFT, TOP);
    fill(C.textLight[0], C.textLight[1], C.textLight[2]);
    textSize(11);
    let changeStr = change >= 0 ? '+' + change : '' + change;
    let changeCol = change >= 0 ? [100, 160, 100] : [200, 100, 80];
    text('Score: ' + val + '/100', startX + 40, cy + 32);
    fill(changeCol[0], changeCol[1], changeCol[2]);
    text('(' + changeStr + ')', startX + 115, cy + 32);

    // Mini sparkline
    drawSparkline(startX + 200, cy + 20, 150, 25, dim);

    // Tip
    let tips = WELLNESS_CONFIG.tips ? WELLNESS_CONFIG.tips[dim] : null;
    if (tips) {
      fill(C.textLight[0], C.textLight[1], C.textLight[2]);
      textSize(9);
      let tip = val >= 60 ? tips.high : tips.low;
      text(tip, startX + 40, cy + 46);
    }
  }

  y += 8 * (cardH + gap) + 30;

  // Achievements section
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(20);
  textStyle(BOLD);
  text('Achievements Earned', width/2, y);
  textStyle(NORMAL);
  y += 30;

  let allAchievements = [...BASE_ACHIEVEMENTS, ...(WELLNESS_CONFIG.extraAchievements || [])];
  let cols = 4;
  let aCardW = 200;
  let aCardH = 55;
  let aGap = 10;
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
    textSize(16);
    fill(earned ? C.gold : [180, 180, 180]);
    text(a.icon, ax + 10, ay + aCardH/2);

    textSize(11);
    textStyle(BOLD);
    fill(earned ? C.text : [180, 180, 180]);
    text(a.name, ax + 32, ay + 16);
    textStyle(NORMAL);
    textSize(9);
    fill(earned ? C.textLight : [190, 190, 190]);
    text(a.desc, ax + 32, ay + 34);
  }

  let achieveRows = ceil(allAchievements.length / cols);
  y += achieveRows * (aCardH + aGap) + 40;

  // Strengths & Growth
  textAlign(CENTER, CENTER);
  fill(C.text[0], C.text[1], C.text[2]);
  textSize(20);
  textStyle(BOLD);
  text('Strengths & Growth Areas', width/2, y);
  textStyle(NORMAL);
  y += 30;

  // Sort dimensions by score
  let sorted = DIM_NAMES.map((d, i) => ({ dim: d, label: DIM_LABELS[i], val: GS.wellness[d], col: DIM_COLORS[d] }));
  sorted.sort((a, b) => b.val - a.val);

  // Top 2 strengths
  textAlign(LEFT, TOP);
  fill(100, 160, 100);
  textSize(14);
  textStyle(BOLD);
  text('💪 Your Strengths:', startX, y);
  textStyle(NORMAL);
  y += 22;
  for (let i = 0; i < 2; i++) {
    let s = sorted[i];
    fill(s.col[0], s.col[1], s.col[2]);
    textSize(12);
    text('• ' + s.label + ' (' + Math.round(s.val) + ')', startX + 10, y);
    y += 18;
  }
  y += 10;

  // Bottom 2 growth areas
  fill(200, 140, 80);
  textSize(14);
  textStyle(BOLD);
  text('🌱 Growth Areas:', startX, y);
  textStyle(NORMAL);
  y += 22;
  for (let i = sorted.length - 1; i >= sorted.length - 2; i--) {
    let s = sorted[i];
    fill(s.col[0], s.col[1], s.col[2]);
    textSize(12);
    text('• ' + s.label + ' (' + Math.round(s.val) + ')', startX + 10, y);
    y += 18;
  }
  y += 30;

  // Play again button position
  GS.ui.maxScroll = max(0, y + 80 - height);

  pop();

  // Fixed play again button at bottom
  let btnY = min(y - GS.ui.scrollY, height - 60);
  buttons = [new Btn(width/2 - 80, max(btnY, height - 60), 160, 44, 'Play Again', 'restart', C.accent)];
  for (let b of buttons) b.draw();
}

function drawSparkline(x, y, w, h, dim) {
  // Get history values for this dimension
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
  startTypewriter(slot.narrative);
  buttons = [];
}

function applyChoice(choiceIdx) {
  let scenario = GS.currentScenario;
  if (!scenario || !scenario.choices[choiceIdx]) return;

  let choice = scenario.choices[choiceIdx];
  GS.selectedChoice = choiceIdx;

  // Store before state
  let wellnessBefore = { ...GS.wellness };

  // Apply effects
  for (let dim in choice.effects) {
    if (GS.wellness[dim] !== undefined) {
      GS.wellness[dim] = constrain(GS.wellness[dim] + choice.effects[dim], 0, 100);
    }
  }

  let wellnessAfter = { ...GS.wellness };

  // Record in history
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

  // Show result text
  GS.choiceResult = choice.followUp;
  GS.ui.resultTimer = 0;

  // Emit particles for changed dimensions
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

  // Check achievements
  checkAchievements();

  // Store mini activity info
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
    // Day complete
    GS.timeSlot = 0;
    GS.daySummary = generateDaySummary();
    GS.ui.dayTransitionTimer = 0;
    GS.phase = 'dayEnd';
    return;
  }

  // Check for random event
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

  // Find biggest changes
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
  let cnv = createCanvas(1000, 650);
  cnv.elt.addEventListener('contextmenu', e => e.preventDefault());
  textFont('Georgia');
  resetGameState();
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

  // Always on top
  updateParticles();
  if (GS.phase !== 'miniActivity') drawParticles();
  drawAchievementNotification();
  updateTransition();
  drawTransition();
}

// ═══════════════════════════════════════════════════════════════
// INPUT HANDLERS
// ═══════════════════════════════════════════════════════════════

function mousePressed() {
  // Button click detection
  if (GS.phase === 'title' || GS.phase === 'intro' || GS.phase === 'dayEnd' || GS.phase === 'report') {
    for (let b of buttons) {
      if (b instanceof Btn && b.contains(mouseX, mouseY)) {
        handleAction(b.action);
        return;
      }
    }
  }

  // Scenario choice detection
  if (GS.phase === 'playing' && GS.ui.choicesVisible && !GS.selectedChoice && !GS.choiceResult) {
    for (let b of buttons) {
      if (b.idx !== undefined && !b.isEvent && mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
        applyChoice(b.idx);
        return;
      }
    }
  }

  // Continue button in playing
  if (GS.phase === 'playing' && GS.choiceResult) {
    for (let b of buttons) {
      if (b instanceof Btn && b.contains(mouseX, mouseY)) {
        handleAction(b.action);
        return;
      }
    }
  }

  // Event choice detection
  if (GS.phase === 'event') {
    for (let b of buttons) {
      if (b.isEvent && mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
        applyEventChoice(b.idx);
        return;
      }
    }
  }

  // Mini-activity clicks
  if (GS.phase === 'miniActivity') {
    handleMiniActivityClick();

    // Done button
    for (let b of buttons) {
      if (b instanceof Btn && b.contains(mouseX, mouseY)) {
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
      // Check if mini-activity should launch
      if (GS.pendingMiniActivity) {
        startMiniActivity(GS.pendingMiniActivity);
        GS.pendingMiniActivity = null;
      } else {
        advanceTimeSlot();
      }
      break;
    case 'mini_done':
      // Score the mini-activity and apply bonus
      let score = getMiniActivityScore();
      if (GS.history.length > 0) {
        GS.history[GS.history.length - 1].miniScore = score;
      }

      // Bonus effects based on score
      let bonus = map(score, 0, 100, -2, 5);
      let lastEntry = GS.history[GS.history.length - 1];
      if (lastEntry && lastEntry.effects) {
        for (let d in lastEntry.effects) {
          if (lastEntry.effects[d] > 0 && GS.wellness[d] !== undefined) {
            GS.wellness[d] = constrain(GS.wellness[d] + bonus, 0, 100);
          }
        }
      }

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
  }
}

function handleMiniActivityClick() {
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
        // Check if clicking on a node
        for (let i = 0; i < ma.nodes.length; i++) {
          if (dist(mouseX, mouseY, ma.nodes[i].x, ma.nodes[i].y) < 25) {
            if (ma.selectedNode === null) {
              ma.selectedNode = i;
            } else if (ma.selectedNode !== i) {
              // Check if connection already exists
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
        if (dist(mouseX, mouseY, ma.activeChange.x, ma.activeChange.y) < 40) {
          ma.activeChange.found = true;
          ma.score++;
          emitParticles(mouseX, mouseY, [255, 220, 100], 8);
          for (let c of ma.clouds) c.highlight = false;
          scheduleNextChange();
        }
      }
      break;
    case 'memoryMatch':
      if (!ma.complete && ma.flipped.length < 2 && ma.flipCooldown === 0) {
        let cardW = 90, cardH = 100, gap = 12, cols = 4;
        let startX = (width - (cols * cardW + (cols-1) * gap)) / 2;
        let startY = 80;
        for (let i = 0; i < ma.cards.length; i++) {
          let card = ma.cards[i];
          if (card.faceUp || card.matched) continue;
          let c = i % cols;
          let r = floor(i / cols);
          let cx = startX + c * (cardW + gap);
          let cy = startY + r * (cardH + gap);
          if (mouseX >= cx && mouseX <= cx + cardW && mouseY >= cy && mouseY <= cy + cardH) {
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
      // Check if in correct zone
      let correctZone = ma.zones[item.zone];
      let ix = mouseX - 40;
      let iy = mouseY - 15;
      if (ix >= correctZone.x && ix <= correctZone.x + correctZone.w &&
          iy >= correctZone.y && iy <= correctZone.y + correctZone.h) {
        item.placed = true;
        item.x = ix;
        item.y = iy;
        emitParticles(ix + 40, iy + 15, [100, 200, 120], 5);
      } else {
        // Check if in any zone (wrong placement)
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
  if (GS.phase === 'miniActivity' && GS.miniActivity) {
    let ma = GS.miniActivity;

    if (ma.type === 'budgetBalancer') {
      let sx = 150;
      let sw = width - 300;
      let sy = 100;
      let sh = 65;

      for (let i = 0; i < ma.categories.length; i++) {
        let cat = ma.categories[i];
        if (cat.dragging) {
          let newVal = constrain(round(map(mouseX, sx, sx + sw, 0, 100)), 0, 100);
          let diff = newVal - cat.value;
          cat.value = newVal;
          // Redistribute diff among other categories
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
      // Start drag if not already dragging
      if (ma.dragItem === null) {
        for (let i = ma.items.length - 1; i >= 0; i--) {
          let item = ma.items[i];
          if (!item.placed && mouseX >= item.x && mouseX <= item.x + 80 && mouseY >= item.y && mouseY <= item.y + 30) {
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

  // Btn hover
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
            x: random(80, width - 80),
            color: colors[ma.flowers.length % colors.length],
            growProgress: 0,
            text: inp.value.trim()
          });
          inp.value = '';
          ma.inputText = '';
          emitParticles(width/2, height - 150, [100, 200, 120], 8);
        }
      }
    }
    if (ma.type === 'breathingBubble') {
      if (keyCode === 32) { // space bar
        ma.playerHolding = true;
      }
    }
  }

  // Skip typewriter on any key during playing
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

// Mouse hold detection for breathing bubble
function checkMouseHold() {
  if (GS.phase === 'miniActivity' && GS.miniActivity && GS.miniActivity.type === 'breathingBubble') {
    GS.miniActivity.playerHolding = mouseIsPressed;
  }
}

// Add to draw loop for budget slider mousePressed
function checkBudgetSliderPress() {
  if (GS.phase === 'miniActivity' && GS.miniActivity && GS.miniActivity.type === 'budgetBalancer') {
    if (mouseIsPressed) {
      let ma = GS.miniActivity;
      let sx = 150;
      let sw = width - 300;
      let sy = 100;
      let sh = 65;
      for (let i = 0; i < ma.categories.length; i++) {
        let cat = ma.categories[i];
        let hx = sx + sw * cat.value / 100;
        let hy = sy + i * sh + 15;
        if (dist(mouseX, mouseY, hx, hy) < 15) {
          cat.dragging = true;
          break;
        }
      }
    }
  }
}

