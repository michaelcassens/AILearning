// ============================================================
// NINJA VEHICLE QUEST
// Side-scrolling ninja game with vehicles, combat, and a horse
// ============================================================

// --- CONSTANTS ---
const W = 1000, H = 600;
const GROUND_Y = 500;
const GRAVITY = 0.6;
const NINJA_W = 20, NINJA_H = 32;
const SHURIKEN_SPEED = 10;
const SHURIKEN_SIZE = 8;
const ENEMY_W = 22, ENEMY_H = 30;
const BOSS_W = 40, BOSS_H = 50;

// Game states
const TITLE = 0, TRAVEL = 1, COMBAT = 2, HORSE = 3, VICTORY = 4, LEVEL_INTRO = 5, BOSS_INTRO = 6;

// Difficulty scaling per level
const DIFFICULTY = [
  { enemyHP: 2, enemySpeed: 1.2, throwRate: [100, 160], jumpRate: 100, projSpeed: 5, ninjaThrowCD: 300 },
  { enemyHP: 3, enemySpeed: 1.8, throwRate: [70, 130],  jumpRate: 70,  projSpeed: 7, ninjaThrowCD: 180 },
  { enemyHP: 4, enemySpeed: 2.4, throwRate: [50, 100],  jumpRate: 50,  projSpeed: 9, ninjaThrowCD: 100 }
];

// Boss definitions per level
const BOSSES = [
  { name: "Captain Blackbeard", hp: 15, color: [180, 40, 40], speed: 1.5, attackRate: 60, type: "pirate" },
  { name: "Shadow Kingpin",     hp: 20, color: [60, 60, 80],  speed: 2.0, attackRate: 45, type: "thug" },
  { name: "Temple Guardian",    hp: 25, color: [140, 80, 200], speed: 2.5, attackRate: 35, type: "warrior" }
];

// Level definitions
const LEVELS = [
  {
    name: "Pirate Island",
    vehicle: "ship",
    travelBg: [20, 60, 120],
    combatBg: [30, 80, 40],
    enemyColor: [200, 80, 80],
    enemyCount: 6,
    travelDist: 800,
    groundColor: [60, 140, 60],
    desc: "Sail the seas to Pirate Island!"
  },
  {
    name: "City Hideout",
    vehicle: "car",
    travelBg: [40, 40, 60],
    combatBg: [50, 40, 50],
    enemyColor: [180, 120, 60],
    enemyCount: 8,
    travelDist: 900,
    groundColor: [80, 80, 90],
    desc: "Drive through the city streets!"
  },
  {
    name: "River Temple",
    vehicle: "boat",
    travelBg: [15, 70, 60],
    combatBg: [60, 50, 30],
    enemyColor: [100, 60, 160],
    enemyCount: 10,
    travelDist: 850,
    groundColor: [90, 120, 50],
    desc: "Speed down the river to the temple!"
  }
];

// --- GAME STATE ---
let state = TITLE;
let currentLevel = 0;
let travelProgress = 0;
let introTimer = 0;

// Ninja
let ninja = { x: 100, y: GROUND_Y - NINJA_H, vx: 0, vy: 0, onGround: true, hp: 5, maxHp: 5, facing: 1, invincible: 0, animFrame: 0 };

// Entities
let shurikens = [];
let enemies = [];
let particles = [];
let stars = [];
let boss = null;
let bossIntroTimer = 0;

// Input
let keys = {};
let lastThrow = 0;

// Horse
let horseSpeed = 3;
let horseX = 0;
let horseTargetX = 3000;
let horseBtnHover = 0;

// Scrolling
let cameraX = 0;
let bgScroll = 0;

// --- P5 SETUP ---
function setup() {
  createCanvas(W, H);
  textFont('Arial');
  for (let i = 0; i < 60; i++) {
    stars.push({ x: random(W), y: random(H * 0.6), s: random(1, 3), b: random(100, 255) });
  }
}

// --- P5 DRAW ---
function draw() {
  switch (state) {
    case TITLE:      drawTitle(); break;
    case LEVEL_INTRO: drawLevelIntro(); break;
    case TRAVEL:     updateTravel(); drawTravel(); break;
    case COMBAT:     updateCombat(); drawCombat(); break;
    case BOSS_INTRO: drawBossIntro(); break;
    case HORSE:      updateHorse(); drawHorseScene(); break;
    case VICTORY:    drawVictory(); break;
  }
}

// ============================================================
// TITLE SCREEN
// ============================================================
function drawTitle() {
  background(10, 10, 25);
  drawStars();

  push();
  textAlign(CENTER, CENTER);
  textSize(48);
  fill(255, 60, 60);
  text("NINJA VEHICLE QUEST", W / 2, 140);
  textSize(18);
  fill(200);
  text("Ride vehicles. Reach your destination. Defeat enemies.", W / 2, 200);

  // Ninja standing to the left
  drawNinjaSprite(W / 2 - 280, 320, 1, frameCount);

  // Vehicle previews
  textSize(14);
  fill(150);
  drawMiniShip(W / 2 - 100, 330);
  text("Ship", W / 2 - 100, 390);
  drawMiniCar(W / 2 + 50, 335);
  text("Car", W / 2 + 50, 390);
  drawMiniBoat(W / 2 + 200, 330);
  text("Boat", W / 2 + 200, 390);

  let bx = W / 2 - 80, by = 470, bw = 160, bh = 50;
  let hover = mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh;
  fill(hover ? color(255, 80, 80) : color(200, 40, 40));
  stroke(255, 100, 100);
  strokeWeight(2);
  rect(bx, by, bw, bh, 8);
  noStroke();
  fill(255);
  textSize(22);
  text("START", W / 2, by + 25);
  pop();

  push();
  textAlign(CENTER);
  textSize(13);
  fill(120);
  text("Arrow Keys / WASD to move & jump  |  SPACE to throw shuriken", W / 2, 560);
  pop();
}

// ============================================================
// LEVEL INTRO
// ============================================================
function drawLevelIntro() {
  let lv = LEVELS[currentLevel];
  background(lv.travelBg[0], lv.travelBg[1], lv.travelBg[2]);

  push();
  textAlign(CENTER, CENTER);

  textSize(16);
  fill(200);
  text("LEVEL " + (currentLevel + 1), W / 2, 180);

  textSize(38);
  fill(255);
  text(lv.name, W / 2, 240);

  textSize(20);
  fill(180);
  text(lv.desc, W / 2, 300);

  if (lv.vehicle === "ship") drawMiniShip(W / 2, 380);
  else if (lv.vehicle === "car") drawMiniCar(W / 2, 385);
  else drawMiniBoat(W / 2, 385);

  textSize(14);
  fill(150);
  let dots = ".".repeat((floor(frameCount / 20) % 3) + 1);
  text("Get ready" + dots, W / 2, 450);
  pop();

  introTimer++;
  if (introTimer > 120) {
    introTimer = 0;
    state = TRAVEL;
    startTravel();
  }
}

// ============================================================
// TRAVEL PHASE
// ============================================================
function startTravel() {
  travelProgress = 0;
  bgScroll = 0;
  ninja.x = 100;
  ninja.y = GROUND_Y - NINJA_H - 40;
  ninja.vx = 0;
  ninja.vy = 0;
  ninja.onGround = true;
  shurikens = [];
  particles = [];
}

function updateTravel() {
  let lv = LEVELS[currentLevel];
  travelProgress += 2;
  bgScroll += 2;
  ninja.animFrame += 0.1;

  if (lv.vehicle === "car") {
    // Road debris
    if (frameCount % 8 === 0) {
      particles.push({
        x: W + 10, y: GROUND_Y + random(-10, 40),
        vx: -random(3, 6), vy: 0,
        life: 60, color: [100, 100, 110],
        size: random(3, 8)
      });
    }
  } else {
    // Boat/ship wake - spray from behind the vehicle
    let vx = W / 2 - 40;
    if (frameCount % 2 === 0) {
      // Main wake trail (behind boat)
      particles.push({
        x: vx - 30 + random(-5, 5), y: GROUND_Y + random(-3, 8),
        vx: -random(2, 5), vy: random(-1, 1),
        life: 40, color: [150, 200, 240],
        size: random(4, 10)
      });
      // Splash spray (upward)
      particles.push({
        x: vx - 25 + random(-8, 0), y: GROUND_Y - random(0, 10),
        vx: -random(1, 3), vy: -random(1, 3),
        life: 25, color: [200, 230, 255],
        size: random(2, 5)
      });
    }
    // Wide wake V-shape
    if (frameCount % 6 === 0) {
      particles.push({
        x: vx - 35, y: GROUND_Y + random(5, 15),
        vx: -random(3, 5), vy: random(0.5, 2),
        life: 50, color: [100, 160, 210],
        size: random(6, 12)
      });
      particles.push({
        x: vx - 35, y: GROUND_Y + random(-5, 5),
        vx: -random(3, 5), vy: -random(0.3, 1),
        life: 50, color: [100, 160, 210],
        size: random(6, 12)
      });
    }
  }

  updateParticles();

  if (travelProgress >= lv.travelDist) {
    state = COMBAT;
    startCombat();
  }
}

function drawTravel() {
  let lv = LEVELS[currentLevel];
  background(lv.travelBg[0], lv.travelBg[1], lv.travelBg[2]);

  if ((lv.travelBg[0] + lv.travelBg[1] + lv.travelBg[2]) < 200) {
    drawStars();
  }

  drawTravelBackground(lv);

  // Ground/water
  push();
  if (lv.vehicle === "car") {
    // Road
    fill(60, 60, 70);
    rect(0, GROUND_Y, W, H - GROUND_Y);
    // Sidewalk
    fill(90, 90, 95);
    rect(0, GROUND_Y, W, 8);
    // Road lines
    stroke(200, 200, 50);
    strokeWeight(2);
    for (let x = -bgScroll % 60; x < W; x += 60) {
      line(x, GROUND_Y + 25, x + 30, GROUND_Y + 25);
    }
    noStroke();
    // Lane divider
    stroke(255, 255, 255, 80);
    strokeWeight(1);
    for (let x = -bgScroll % 80; x < W; x += 80) {
      line(x, GROUND_Y + 50, x + 40, GROUND_Y + 50);
    }
    noStroke();
  } else {
    fill(30, 80, 150);
    rect(0, GROUND_Y, W, H - GROUND_Y);
    fill(50, 100, 180, 150);
    for (let x = 0; x < W; x += 30) {
      let waveY = GROUND_Y + sin((x + bgScroll) * 0.05) * 5;
      ellipse(x, waveY, 40, 10);
    }
  }
  pop();

  // Draw vehicle
  let vx = W / 2 - 40;
  let vy = GROUND_Y - 45;
  if (lv.vehicle === "ship") drawShip(vx, vy);
  else if (lv.vehicle === "car") drawCar(vx, vy + 10);
  else drawBoat(vx, vy);

  // Ninja on vehicle
  drawNinjaSprite(vx + 30, vy - NINJA_H - 5, 1, frameCount);

  drawParticles();
  drawHUD();

  // Progress bar
  push();
  fill(40, 40, 60, 180);
  rect(200, 20, 600, 16, 8);
  let prog = map(travelProgress, 0, lv.travelDist, 0, 596);
  fill(255, 80, 80);
  rect(202, 22, prog, 12, 6);
  fill(255);
  textSize(10);
  textAlign(CENTER);
  text("Traveling to " + lv.name, 500, 31);
  pop();
}

function drawTravelBackground(lv) {
  push();
  if (lv.vehicle === "ship" || lv.vehicle === "boat") {
    // Distant islands/mountains
    fill(lv.travelBg[0] + 15, lv.travelBg[1] + 20, lv.travelBg[2] + 10);
    for (let i = 0; i < 4; i++) {
      let ix = ((i * 300 - bgScroll * 0.3) % (W + 200)) + 100;
      triangle(ix, GROUND_Y, ix - 60, GROUND_Y, ix - 30, GROUND_Y - 80 - i * 20);
    }
    // Clouds
    fill(255, 255, 255, 40);
    for (let i = 0; i < 5; i++) {
      let cx = ((i * 250 - bgScroll * 0.5) % (W + 200));
      ellipse(cx, 80 + i * 30, 120, 30);
    }
    // Seabirds
    stroke(200, 200, 200, 80);
    strokeWeight(1);
    noFill();
    for (let i = 0; i < 3; i++) {
      let bx = ((i * 350 - bgScroll * 0.6) % (W + 200));
      let by = 60 + i * 40 + sin(frameCount * 0.03 + i) * 10;
      arc(bx, by, 15, 8, PI, TWO_PI);
      arc(bx + 15, by, 15, 8, PI, TWO_PI);
    }
    noStroke();
  } else {
    // City buildings - far layer
    fill(20, 20, 35);
    for (let i = 0; i < 8; i++) {
      let bx = ((i * 160 - bgScroll * 0.15) % (W + 300)) - 50;
      let bh = 180 + (i * 53 % 120);
      rect(bx, GROUND_Y - bh, 90, bh);
    }
    // City buildings - mid layer
    for (let i = 0; i < 12; i++) {
      let bx = ((i * 100 - bgScroll * 0.4) % (W + 200)) - 50;
      let bh = 100 + (i * 37 % 150);
      fill(30 + (i * 7 % 30), 30 + (i * 5 % 20), 50 + (i * 3 % 30));
      rect(bx, GROUND_Y - bh, 60, bh);
      // Windows
      fill(200, 200, 100, 100 + sin(frameCount * 0.05 + i) * 50);
      for (let wy = GROUND_Y - bh + 15; wy < GROUND_Y - 10; wy += 25) {
        for (let wx = bx + 10; wx < bx + 55; wx += 18) {
          rect(wx, wy, 8, 12);
        }
      }
    }
    // Streetlights
    fill(80, 80, 90);
    for (let i = 0; i < 6; i++) {
      let lx = ((i * 200 - bgScroll * 0.7) % (W + 200)) - 20;
      rect(lx, GROUND_Y - 70, 4, 70);
      fill(255, 220, 100, 150 + sin(frameCount * 0.1 + i * 2) * 50);
      ellipse(lx + 2, GROUND_Y - 75, 14, 14);
      fill(80, 80, 90);
    }
    // Neon signs
    let neonColors = [[255, 50, 100], [50, 200, 255], [255, 200, 50]];
    for (let i = 0; i < 3; i++) {
      let nx = ((i * 380 - bgScroll * 0.4) % (W + 300)) + 20;
      let nc = neonColors[i];
      let flicker = 150 + sin(frameCount * 0.15 + i * 3) * 80;
      fill(nc[0], nc[1], nc[2], flicker);
      rect(nx, GROUND_Y - 160 - i * 30, 40, 15, 3);
      // Glow
      fill(nc[0], nc[1], nc[2], flicker * 0.2);
      ellipse(nx + 20, GROUND_Y - 152 - i * 30, 60, 25);
    }
  }
  pop();
}

// ============================================================
// COMBAT PHASE
// ============================================================
function startCombat() {
  let lv = LEVELS[currentLevel];
  let diff = DIFFICULTY[currentLevel];
  ninja.x = 100;
  ninja.y = GROUND_Y - NINJA_H;
  ninja.vx = 0;
  ninja.vy = 0;
  ninja.onGround = true;
  ninja.invincible = 60;
  cameraX = 0;
  shurikens = [];
  enemies = [];
  particles = [];
  boss = null;

  // Spawn enemies with scaling difficulty
  for (let i = 0; i < lv.enemyCount; i++) {
    let eType = i % 3; // 0=walker, 1=jumper, 2=thrower
    enemies.push({
      x: 400 + i * 120 + random(-30, 30),
      y: GROUND_Y - ENEMY_H,
      vx: 0, vy: 0,
      hp: diff.enemyHP,
      maxHp: diff.enemyHP,
      facing: -1,
      animFrame: random(100),
      type: eType,
      throwTimer: floor(random(diff.throwRate[0], diff.throwRate[1])),
      alive: true,
      isBoss: false
    });
  }
}

function spawnBoss() {
  let bossDef = BOSSES[currentLevel];
  boss = {
    x: 1200,
    y: GROUND_Y - BOSS_H,
    vx: 0, vy: 0,
    hp: bossDef.hp,
    maxHp: bossDef.hp,
    facing: -1,
    animFrame: 0,
    type: 3, // boss type
    throwTimer: bossDef.attackRate,
    alive: true,
    isBoss: true,
    attackPattern: 0,
    patternTimer: 0,
    speed: bossDef.speed,
    attackRate: bossDef.attackRate,
    flashTimer: 0,
    name: bossDef.name,
    bossType: bossDef.type,
    color: bossDef.color
  };
  enemies.push(boss);
}

function updateCombat() {
  // Ninja movement
  let moveSpeed = 4;
  ninja.vx = 0;
  if (keys[LEFT_ARROW] || keys[65]) { ninja.vx = -moveSpeed; ninja.facing = -1; }
  if (keys[RIGHT_ARROW] || keys[68]) { ninja.vx = moveSpeed; ninja.facing = 1; }
  if ((keys[UP_ARROW] || keys[87]) && ninja.onGround) {
    ninja.vy = -12;
    ninja.onGround = false;
  }

  ninja.vy += GRAVITY;
  ninja.x += ninja.vx;
  ninja.y += ninja.vy;

  if (ninja.y >= GROUND_Y - NINJA_H) {
    ninja.y = GROUND_Y - NINJA_H;
    ninja.vy = 0;
    ninja.onGround = true;
  }

  ninja.x = constrain(ninja.x, 10, 1600);
  ninja.animFrame += abs(ninja.vx) > 0 ? 0.2 : 0.05;

  cameraX = lerp(cameraX, ninja.x - 300, 0.08);
  cameraX = constrain(cameraX, 0, 800);

  if (ninja.invincible > 0) ninja.invincible--;

  // Update shurikens
  for (let i = shurikens.length - 1; i >= 0; i--) {
    let s = shurikens[i];
    s.x += s.vx;
    if (s.vy !== undefined) s.y += s.vy;
    s.angle += 0.3;
    if (s.x < cameraX - 50 || s.x > cameraX + W + 50 || s.y < -50 || s.y > H + 50) {
      shurikens.splice(i, 1);
      continue;
    }

    // Check enemy collision (player shurikens only)
    if (!s.enemy) {
      for (let e of enemies) {
        if (!e.alive) continue;
        let ew = e.isBoss ? BOSS_W : ENEMY_W;
        let eh = e.isBoss ? BOSS_H : ENEMY_H;
        if (s.x > e.x - ew / 2 && s.x < e.x + ew / 2 &&
            s.y > e.y && s.y < e.y + eh) {
          e.hp--;
          if (e.isBoss) e.flashTimer = 8;
          spawnHitParticles(s.x, s.y, [255, 255, 100]);
          if (e.hp <= 0) {
            e.alive = false;
            let col = e.isBoss ? e.color : LEVELS[min(currentLevel, LEVELS.length - 1)].enemyColor;
            for (let p = 0; p < (e.isBoss ? 20 : 8); p++) {
              spawnHitParticles(e.x + random(-15, 15), e.y + eh / 2 + random(-10, 10), col);
            }
          }
          shurikens.splice(i, 1);
          break;
        }
      }
    }
  }

  let diff = DIFFICULTY[min(currentLevel, 2)];

  // Update enemies
  let aliveCount = 0;
  let nonBossAlive = 0;
  for (let e of enemies) {
    if (!e.alive) continue;
    aliveCount++;
    if (!e.isBoss) nonBossAlive++;
    e.animFrame += 0.1;
    if (e.flashTimer > 0) e.flashTimer--;

    let dx = ninja.x - e.x;
    let dist = abs(dx);
    e.facing = dx > 0 ? 1 : -1;

    if (e.isBoss) {
      updateBossAI(e, dx, dist);
    } else {
      // Regular enemy AI with difficulty scaling
      if (e.type === 0) {
        // Walker
        if (dist > 40) e.vx = e.facing * diff.enemySpeed;
        else e.vx = 0;
      } else if (e.type === 1) {
        // Jumper
        if (dist > 50) e.vx = e.facing * (diff.enemySpeed + 0.5);
        if (frameCount % diff.jumpRate === 0 && e.y >= GROUND_Y - ENEMY_H) {
          e.vy = -10;
        }
      } else {
        // Thrower
        if (dist < 200) e.vx = -e.facing * diff.enemySpeed * 0.7;
        else if (dist > 350) e.vx = e.facing * diff.enemySpeed * 0.7;
        else e.vx = 0;

        e.throwTimer--;
        if (e.throwTimer <= 0) {
          e.throwTimer = floor(random(diff.throwRate[0], diff.throwRate[1]));
          shurikens.push({
            x: e.x, y: e.y + ENEMY_H / 2,
            vx: e.facing * diff.projSpeed, vy: 0, angle: 0,
            enemy: true
          });
        }
      }
    }

    if (!e.vy) e.vy = 0;
    e.vy += GRAVITY;
    e.x += e.vx;
    e.y += e.vy;
    let eh = e.isBoss ? BOSS_H : ENEMY_H;
    if (e.y >= GROUND_Y - eh) {
      e.y = GROUND_Y - eh;
      e.vy = 0;
    }

    // Enemy hits ninja
    if (ninja.invincible <= 0) {
      let hitDist = e.isBoss ? 35 : 25;
      let hitH = e.isBoss ? 45 : 30;
      if (abs(ninja.x - e.x) < hitDist && abs(ninja.y - e.y) < hitH) {
        let dmg = e.isBoss ? 2 : 1;
        ninja.hp -= dmg;
        ninja.invincible = 60;
        spawnHitParticles(ninja.x, ninja.y + NINJA_H / 2, [255, 50, 50]);
        if (ninja.hp <= 0) {
          resetAfterDeath();
          return;
        }
      }
    }
  }

  // Check enemy shurikens hitting ninja
  for (let i = shurikens.length - 1; i >= 0; i--) {
    let s = shurikens[i];
    if (!s.enemy) continue;
    if (ninja.invincible <= 0 &&
        abs(s.x - ninja.x) < 18 && abs(s.y - (ninja.y + NINJA_H / 2)) < 18) {
      ninja.hp--;
      ninja.invincible = 60;
      spawnHitParticles(ninja.x, ninja.y + NINJA_H / 2, [255, 50, 50]);
      shurikens.splice(i, 1);
      if (ninja.hp <= 0) {
        resetAfterDeath();
        return;
      }
    }
  }

  updateParticles();

  // If all non-boss enemies dead and no boss yet, spawn boss
  if (nonBossAlive === 0 && boss === null) {
    state = BOSS_INTRO;
    bossIntroTimer = 0;
    return;
  }

  // All enemies (including boss) defeated
  if (aliveCount === 0 && boss !== null) {
    currentLevel++;
    boss = null;
    if (currentLevel >= LEVELS.length) {
      state = HORSE;
      startHorse();
    } else {
      state = LEVEL_INTRO;
      introTimer = 0;
    }
  }
}

function updateBossAI(e, dx, dist) {
  e.patternTimer++;

  // Switch attack patterns every 180 frames
  if (e.patternTimer > 180) {
    e.patternTimer = 0;
    e.attackPattern = (e.attackPattern + 1) % 3;
  }

  if (e.attackPattern === 0) {
    // Chase
    if (dist > 50) e.vx = e.facing * e.speed * 1.5;
    else e.vx = 0;
  } else if (e.attackPattern === 1) {
    // Ranged barrage
    if (dist < 250) e.vx = -e.facing * e.speed;
    else e.vx = 0;

    e.throwTimer--;
    if (e.throwTimer <= 0) {
      e.throwTimer = e.attackRate;
      // Triple shot
      for (let a = -1; a <= 1; a++) {
        shurikens.push({
          x: e.x + e.facing * 20, y: e.y + BOSS_H / 2,
          vx: e.facing * 7, vy: a * 2, angle: 0,
          enemy: true
        });
      }
    }
  } else {
    // Jump attack
    if (dist > 80) e.vx = e.facing * e.speed * 2;
    if (e.patternTimer % 60 === 0 && e.y >= GROUND_Y - BOSS_H) {
      e.vy = -14;
    }

    e.throwTimer--;
    if (e.throwTimer <= 0) {
      e.throwTimer = e.attackRate + 20;
      shurikens.push({
        x: e.x + e.facing * 20, y: e.y + BOSS_H / 2,
        vx: e.facing * 8, vy: 0, angle: 0,
        enemy: true
      });
    }
  }
}

// ============================================================
// BOSS INTRO
// ============================================================
function drawBossIntro() {
  // Draw the combat scene behind the intro overlay
  drawCombat();

  bossIntroTimer++;
  let bossDef = BOSSES[min(currentLevel, BOSSES.length - 1)];

  push();
  // Dark overlay
  fill(0, 0, 0, min(bossIntroTimer * 4, 160));
  rect(0, 0, W, H);

  // Warning text
  textAlign(CENTER, CENTER);
  if (bossIntroTimer > 20) {
    textSize(20);
    fill(255, 50, 50, min((bossIntroTimer - 20) * 8, 255));
    text("WARNING!", W / 2, H / 2 - 50);
  }
  if (bossIntroTimer > 50) {
    textSize(32);
    fill(255, 220, 50, min((bossIntroTimer - 50) * 6, 255));
    text(bossDef.name, W / 2, H / 2);
  }
  if (bossIntroTimer > 80) {
    textSize(16);
    fill(200, 200, 200, min((bossIntroTimer - 80) * 6, 255));
    text("has appeared!", W / 2, H / 2 + 40);
  }
  pop();

  if (bossIntroTimer > 140) {
    spawnBoss();
    state = COMBAT;
  }
}

function drawCombat() {
  let lv = LEVELS[min(currentLevel, LEVELS.length - 1)];
  background(lv.combatBg[0], lv.combatBg[1], lv.combatBg[2]);

  push();
  translate(-cameraX, 0);

  drawCombatBackground(lv);

  // Ground
  fill(lv.groundColor[0], lv.groundColor[1], lv.groundColor[2]);
  rect(-100, GROUND_Y, 2000, H - GROUND_Y + 100);

  fill(lv.groundColor[0] - 10, lv.groundColor[1] - 10, lv.groundColor[2] - 10);
  for (let x = 0; x < 1800; x += 40) {
    rect(x, GROUND_Y, 20, 4);
  }

  // Draw enemies
  for (let e of enemies) {
    if (!e.alive) continue;
    if (e.isBoss) {
      drawBossSprite(e);
    } else {
      drawEnemySprite(e, lv.enemyColor);
    }
  }

  // Draw shurikens
  for (let s of shurikens) {
    drawShuriken(s.x, s.y, s.angle, s.enemy);
  }

  // Draw ninja
  if (ninja.invincible <= 0 || frameCount % 4 < 2) {
    drawNinjaSprite(ninja.x, ninja.y, ninja.facing, ninja.animFrame);
  }

  drawParticles();

  pop();

  drawHUD();

  // Enemy count + boss HP
  push();
  textAlign(RIGHT);
  textSize(16);
  fill(255);
  let alive = enemies.filter(e => e.alive && !e.isBoss).length;
  let bossAlive = boss && boss.alive;
  if (bossAlive) {
    // Boss HP bar
    let barW = 300, barH = 20;
    let barX = W / 2 - barW / 2, barY = 15;
    fill(40, 0, 0, 200);
    rect(barX, barY, barW, barH, 4);
    fill(255, 50, 50);
    rect(barX + 2, barY + 2, (barW - 4) * (boss.hp / boss.maxHp), barH - 4, 3);
    fill(255);
    textAlign(CENTER);
    textSize(12);
    text(boss.name, W / 2, barY + barH / 2 + 1);
  } else {
    text("Enemies: " + alive + " / " + enemies.filter(e => !e.isBoss).length, W - 20, 30);
  }
  pop();
}

function drawCombatBackground(lv) {
  let lvIdx = min(currentLevel, LEVELS.length - 1);
  push();
  if (lvIdx === 0) {
    // Island: palm trees + huts
    for (let i = 0; i < 6; i++) {
      let tx = 200 + i * 280;
      // Palm trunk (curved)
      fill(100, 70, 40);
      beginShape();
      vertex(tx - 4, GROUND_Y);
      vertex(tx + 4, GROUND_Y);
      vertex(tx + 8, GROUND_Y - 50);
      vertex(tx + 3, GROUND_Y - 100);
      vertex(tx - 3, GROUND_Y - 100);
      vertex(tx - 2, GROUND_Y - 50);
      endShape(CLOSE);
      // Leaves
      fill(30, 130, 50);
      for (let a = 0; a < 6; a++) {
        let angle = a * 60 - 150;
        let lx = tx + cos(radians(angle)) * 35;
        let ly = GROUND_Y - 110 + sin(radians(angle)) * 15;
        ellipse(lx, ly, 50, 18);
      }
      // Coconuts
      fill(120, 80, 30);
      ellipse(tx - 5, GROUND_Y - 95, 8, 8);
      ellipse(tx + 7, GROUND_Y - 98, 8, 8);
    }
    // Tiki torches
    for (let i = 0; i < 4; i++) {
      let ttx = 350 + i * 350;
      fill(110, 80, 40);
      rect(ttx - 3, GROUND_Y - 60, 6, 60);
      fill(255, 150, 30, 180 + sin(frameCount * 0.2 + i) * 60);
      ellipse(ttx, GROUND_Y - 65, 14, 18);
      fill(255, 220, 80, 100);
      ellipse(ttx, GROUND_Y - 70, 8, 12);
    }
  } else if (lvIdx === 1) {
    // City: background buildings + detail
    for (let i = 0; i < 15; i++) {
      let bx = i * 120;
      let bh = 80 + (i * 47 % 180);
      fill(25 + (i * 11 % 25), 25 + (i * 7 % 20), 40 + (i * 3 % 25));
      rect(bx, GROUND_Y - bh, 80, bh);
      // Windows
      fill(200, 180, 80, 60);
      for (let wy = GROUND_Y - bh + 15; wy < GROUND_Y - 10; wy += 25) {
        for (let wx = bx + 10; wx < bx + 75; wx += 20) {
          rect(wx, wy, 10, 14);
        }
      }
    }
    // Dumpsters
    for (let i = 0; i < 4; i++) {
      let dx = 300 + i * 400;
      fill(50, 80, 50);
      rect(dx, GROUND_Y - 25, 35, 25, 2);
      fill(40, 70, 40);
      rect(dx - 2, GROUND_Y - 28, 39, 5, 2);
    }
    // Neon signs on buildings
    let nColors = [[255, 50, 100], [50, 200, 255], [0, 255, 150]];
    for (let i = 0; i < 3; i++) {
      let nx = 250 + i * 500;
      let nc = nColors[i];
      let flicker = 150 + sin(frameCount * 0.1 + i * 5) * 100;
      fill(nc[0], nc[1], nc[2], flicker);
      rect(nx, GROUND_Y - 130 - i * 20, 45, 12, 3);
      fill(nc[0], nc[1], nc[2], flicker * 0.15);
      ellipse(nx + 22, GROUND_Y - 124 - i * 20, 70, 30);
    }
  } else {
    // Temple: stone structures + vegetation
    for (let i = 0; i < 5; i++) {
      let tx = 150 + i * 350;
      // Stone pillar
      fill(80, 70, 50);
      rect(tx - 30, GROUND_Y - 120, 60, 120);
      // Roof
      fill(90, 75, 45);
      triangle(tx - 50, GROUND_Y - 120, tx + 50, GROUND_Y - 120, tx, GROUND_Y - 175);
      // Stone detail
      fill(70, 60, 40);
      for (let sy = GROUND_Y - 110; sy < GROUND_Y; sy += 30) {
        line(tx - 28, sy, tx + 28, sy);
        rect(tx - 28, sy, 56, 1);
      }
      // Vines
      fill(40, 100, 40);
      for (let v = 0; v < 4; v++) {
        let vx = tx - 25 + v * 15;
        let vLen = 40 + v * 15 + sin(frameCount * 0.02 + v) * 5;
        rect(vx, GROUND_Y - 120, 3, vLen);
        // Leaves on vines
        fill(50, 120, 50);
        for (let lf = 0; lf < 3; lf++) {
          ellipse(vx + (lf % 2 === 0 ? -5 : 7), GROUND_Y - 100 + lf * 15, 8, 5);
        }
        fill(40, 100, 40);
      }
    }
    // Lanterns
    for (let i = 0; i < 6; i++) {
      let lx = 250 + i * 260;
      fill(160, 50, 30);
      rect(lx - 6, GROUND_Y - 55, 12, 18, 3);
      fill(255, 180, 50, 140 + sin(frameCount * 0.15 + i) * 80);
      ellipse(lx, GROUND_Y - 46, 8, 12);
      // String
      stroke(100, 80, 60);
      strokeWeight(1);
      line(lx, GROUND_Y - 55, lx, GROUND_Y - 70);
      noStroke();
    }
  }
  pop();
}

// ============================================================
// HORSE PHASE
// ============================================================
function startHorse() {
  horseX = 0;
  horseSpeed = 3;
  bgScroll = 0;
  particles = [];
}

function updateHorse() {
  horseX += horseSpeed;
  bgScroll += horseSpeed;

  if (frameCount % 4 === 0) {
    particles.push({
      x: W / 2 - 80 + random(-10, 10), y: GROUND_Y - 5,
      vx: -random(1, 3) - horseSpeed * 0.5, vy: -random(0.5, 2),
      life: 30, color: [180, 150, 100],
      size: random(4, 10)
    });
  }

  updateParticles();

  horseBtnHover = 0;
  let slowerBx = W / 2 - 160, fasterBx = W / 2 + 60, by = 530, bw = 100, bh = 40;
  if (mouseY > by && mouseY < by + bh) {
    if (mouseX > slowerBx && mouseX < slowerBx + bw) horseBtnHover = 1;
    if (mouseX > fasterBx && mouseX < fasterBx + bw) horseBtnHover = 2;
  }

  if (horseX >= horseTargetX) {
    state = VICTORY;
  }
}

function drawHorseScene() {
  // Sunset gradient
  for (let y = 0; y < H; y++) {
    let inter = map(y, 0, H, 0, 1);
    let c = lerpColor(color(255, 120, 50), color(80, 20, 80), inter);
    stroke(c);
    line(0, y, W, y);
  }
  noStroke();

  // Sun
  fill(255, 200, 50, 200);
  ellipse(W / 2, 120, 100, 100);
  fill(255, 220, 100, 100);
  ellipse(W / 2, 120, 130, 130);

  // Distant mountains
  fill(60, 30, 60);
  for (let i = 0; i < 6; i++) {
    let mx = ((i * 220 - bgScroll * 0.2) % (W + 300)) - 50;
    triangle(mx, GROUND_Y, mx + 150, GROUND_Y, mx + 75, GROUND_Y - 120 - i * 15);
  }

  // Ground
  fill(90, 70, 40);
  rect(0, GROUND_Y, W, H - GROUND_Y);

  fill(80, 60, 30);
  for (let x = -bgScroll % 50; x < W; x += 50) {
    rect(x, GROUND_Y + 5, 25, 3);
  }

  // Draw horse + ninja (facing RIGHT)
  drawHorseSprite(W / 2 - 40, GROUND_Y - 70);

  // Dust particles
  push();
  for (let p of particles) {
    fill(p.color[0], p.color[1], p.color[2], map(p.life, 0, 30, 0, 150));
    noStroke();
    ellipse(p.x, p.y, p.size);
  }
  pop();

  // Speed buttons
  push();
  let slowerBx = W / 2 - 160, fasterBx = W / 2 + 60, by = 530, bw = 100, bh = 40;

  fill(horseBtnHover === 1 ? color(180, 100, 60) : color(140, 70, 40));
  stroke(200, 120, 60);
  strokeWeight(2);
  rect(slowerBx, by, bw, bh, 8);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  text("SLOWER", slowerBx + bw / 2, by + bh / 2);

  fill(horseBtnHover === 2 ? color(60, 180, 100) : color(40, 140, 70));
  stroke(60, 200, 120);
  strokeWeight(2);
  rect(fasterBx, by, bw, bh, 8);
  noStroke();
  fill(255);
  text("FASTER", fasterBx + bw / 2, by + bh / 2);
  pop();

  push();
  textAlign(CENTER);
  textSize(14);
  fill(255, 200);
  let speedLabel = horseSpeed <= 2 ? "Trot" : horseSpeed <= 5 ? "Canter" : "Gallop!";
  text("Speed: " + speedLabel, W / 2, 515);
  pop();

  // Progress bar
  push();
  fill(40, 20, 40, 180);
  rect(200, 20, 600, 16, 8);
  let prog = map(horseX, 0, horseTargetX, 0, 596);
  fill(255, 180, 50);
  rect(202, 22, prog, 12, 6);
  fill(255);
  textSize(10);
  textAlign(CENTER);
  text("Ride to Victory!", 500, 31);
  pop();

  drawHUD();
}

// ============================================================
// VICTORY SCREEN
// ============================================================
function drawVictory() {
  background(10, 10, 30);
  drawStars();

  push();
  textAlign(CENTER, CENTER);

  if (frameCount % 10 === 0) {
    let fx = random(200, 800), fy = random(100, 350);
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: fx, y: fy,
        vx: cos(i * 30) * random(2, 5), vy: sin(i * 30) * random(2, 5),
        life: 40, color: [random(150, 255), random(100, 255), random(50, 255)],
        size: random(3, 7)
      });
    }
  }
  updateParticles();
  push();
  for (let p of particles) {
    fill(p.color[0], p.color[1], p.color[2], map(p.life, 0, 40, 0, 255));
    noStroke();
    ellipse(p.x, p.y, p.size);
  }
  pop();

  textSize(52);
  fill(255, 220, 50);
  text("VICTORY!", W / 2, 200);

  textSize(20);
  fill(200);
  text("The ninja has conquered all challenges!", W / 2, 270);

  textSize(16);
  fill(150);
  text("Pirate Island - Cleared", W / 2, 330);
  text("City Hideout - Cleared", W / 2, 360);
  text("River Temple - Cleared", W / 2, 390);
  text("Horse Ride - Complete", W / 2, 420);

  let bx = W / 2 - 80, by = 470, bw = 160, bh = 50;
  let hover = mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh;
  fill(hover ? color(80, 200, 80) : color(40, 150, 40));
  stroke(100, 220, 100);
  strokeWeight(2);
  rect(bx, by, bw, bh, 8);
  noStroke();
  fill(255);
  textSize(20);
  text("PLAY AGAIN", W / 2, by + 25);
  pop();
}

// ============================================================
// DRAWING HELPERS
// ============================================================

function drawNinjaSprite(x, y, facing, anim) {
  push();
  translate(x, y);
  scale(facing, 1);

  // Body
  fill(30, 30, 40);
  rect(-NINJA_W / 2, 0, NINJA_W, NINJA_H, 3);

  // Head wrap
  fill(20, 20, 30);
  ellipse(0, 2, 18, 16);

  // Head wrap tail (flowing)
  fill(25, 25, 35);
  let tailWave = sin(anim * 2) * 3;
  beginShape();
  vertex(-8, 0);
  vertex(-8, 4);
  vertex(-20 + tailWave, 6);
  vertex(-18 + tailWave, 2);
  endShape(CLOSE);

  // Eyes
  fill(255, 60, 60);
  ellipse(3, 1, 5, 3);

  // Belt + buckle
  fill(180, 40, 40);
  rect(-NINJA_W / 2, NINJA_H / 2 - 2, NINJA_W, 4);
  fill(220, 180, 50);
  rect(-2, NINJA_H / 2 - 2, 4, 4);

  // Legs animation
  let legOffset = sin(anim * 3) * 4;
  fill(25, 25, 35);
  rect(-7, NINJA_H - 2, 5, 6 + legOffset);
  rect(2, NINJA_H - 2, 5, 6 - legOffset);

  // Arm with sword sheath on back
  fill(60, 50, 40);
  push();
  translate(-3, 2);
  rotate(-0.4);
  rect(-1, -12, 3, 20);
  fill(180, 160, 100);
  rect(-2, -14, 5, 3);
  pop();

  // Arm
  fill(30, 30, 40);
  let armAngle = sin(anim * 2) * 0.2;
  push();
  translate(6, 8);
  rotate(armAngle);
  rect(0, 0, 4, 12);
  pop();

  pop();
}

function drawEnemySprite(e, col) {
  push();
  translate(e.x, e.y);
  scale(e.facing, 1);

  // Shadow
  fill(0, 0, 0, 30);
  ellipse(0, ENEMY_H + 2, 24, 6);

  // Body
  fill(col[0], col[1], col[2]);
  rect(-ENEMY_W / 2, 0, ENEMY_W, ENEMY_H, 2);

  // Head
  fill(col[0] - 20, col[1] - 20, col[2] - 20);
  ellipse(0, 2, 16, 14);

  // Eyes
  fill(255);
  ellipse(2, 0, 6, 5);
  ellipse(8, 0, 6, 5);
  fill(0);
  ellipse(3, 0, 3, 3);
  ellipse(9, 0, 3, 3);

  if (e.type === 0) {
    // Walker: spiked helmet
    fill(col[0] + 30, col[1] - 10, col[2] - 10);
    arc(0, -3, 18, 12, PI, TWO_PI);
    // Spike
    fill(180, 180, 190);
    triangle(-2, -9, 2, -9, 0, -18);
    // Arm bands
    fill(col[0] + 40, col[1] + 10, col[2]);
    rect(-ENEMY_W / 2 - 2, 8, 4, 6, 1);
    rect(ENEMY_W / 2 - 2, 8, 4, 6, 1);
    // Fists
    fill(col[0] - 10, col[1] - 10, col[2] - 10);
    ellipse(-ENEMY_W / 2, 16, 7, 7);
    ellipse(ENEMY_W / 2, 16, 7, 7);
  } else if (e.type === 1) {
    // Jumper: headband + spring legs
    fill(255, 255, 0);
    rect(-10, -5, 20, 4, 1);
    // Headband tails
    fill(255, 230, 0);
    let hw = sin(e.animFrame * 2) * 3;
    beginShape();
    vertex(-10, -5);
    vertex(-10, -1);
    vertex(-20 + hw, 0);
    vertex(-18 + hw, -4);
    endShape(CLOSE);
    // Knee pads
    fill(col[0] + 20, col[1] + 20, col[2]);
    ellipse(-4, ENEMY_H - 4, 6, 6);
    ellipse(4, ENEMY_H - 4, 6, 6);
  } else {
    // Thrower: hood + weapon
    fill(col[0] - 30, col[1] - 30, col[2] - 30);
    arc(0, 0, 20, 16, PI, TWO_PI);
    triangle(-10, 0, 10, 0, 0, -14);
    // Weapon in hand
    fill(150, 150, 160);
    push();
    translate(ENEMY_W / 2 + 2, 10);
    rotate(sin(e.animFrame * 2) * 0.3);
    rect(0, -1, 12, 3, 1);
    // Blade tip
    fill(200, 200, 210);
    triangle(12, -2, 12, 4, 17, 1);
    pop();
    // Ammo belt
    fill(100, 80, 50);
    rect(-ENEMY_W / 2, ENEMY_H / 2 - 1, ENEMY_W, 3);
    for (let b = 0; b < 4; b++) {
      fill(120, 120, 130);
      ellipse(-6 + b * 5, ENEMY_H / 2, 3, 4);
    }
  }

  // HP bar
  let hpW = 24;
  fill(80, 0, 0);
  rect(-hpW / 2, -14, hpW, 4);
  fill(255, 50, 50);
  rect(-hpW / 2, -14, hpW * (e.hp / e.maxHp), 4);

  // Legs
  let legOffset = sin(e.animFrame * 3) * 3;
  fill(col[0] - 30, col[1] - 30, col[2] - 30);
  rect(-7, ENEMY_H - 2, 5, 5 + legOffset);
  rect(2, ENEMY_H - 2, 5, 5 - legOffset);

  // Shoes
  fill(col[0] - 50, col[1] - 50, col[2] - 50);
  rect(-8, ENEMY_H + 2 + legOffset, 7, 3, 1);
  rect(1, ENEMY_H + 2 - legOffset, 7, 3, 1);

  pop();
}

function drawBossSprite(e) {
  push();
  translate(e.x, e.y);
  scale(e.facing, 1);

  // Flash effect when hit
  let flashWhite = e.flashTimer > 0 && frameCount % 2 === 0;

  // Shadow
  fill(0, 0, 0, 40);
  ellipse(0, BOSS_H + 3, 50, 12);

  // Body
  if (flashWhite) fill(255, 255, 255);
  else fill(e.color[0], e.color[1], e.color[2]);
  rect(-BOSS_W / 2, 0, BOSS_W, BOSS_H, 4);

  // Armor plates
  if (!flashWhite) fill(e.color[0] + 20, e.color[1] + 20, e.color[2] + 20);
  rect(-BOSS_W / 2 + 3, 5, BOSS_W - 6, 8, 2);
  rect(-BOSS_W / 2 + 3, 18, BOSS_W - 6, 8, 2);

  // Head
  if (flashWhite) fill(255);
  else fill(e.color[0] - 20, e.color[1] - 20, e.color[2] - 20);
  ellipse(0, 0, 28, 24);

  if (e.bossType === "pirate") {
    // Pirate hat
    fill(30, 30, 30);
    arc(0, -6, 34, 18, PI, TWO_PI);
    rect(-17, -8, 34, 5, 2);
    // Skull on hat
    fill(220, 220, 200);
    ellipse(0, -12, 8, 7);
    fill(30);
    ellipse(-2, -12, 2, 2);
    ellipse(2, -12, 2, 2);
    // Eye patch
    fill(30);
    ellipse(-6, -1, 9, 8);
    stroke(30);
    strokeWeight(1);
    line(-6, -5, 8, -8);
    noStroke();
    // Beard
    fill(60, 40, 30);
    for (let b = 0; b < 5; b++) {
      rect(-8 + b * 4, 6, 3, 10 + sin(e.animFrame + b) * 2);
    }
  } else if (e.bossType === "thug") {
    // Sunglasses
    fill(10, 10, 10);
    rect(-12, -4, 10, 6, 1);
    rect(2, -4, 10, 6, 1);
    rect(-2, -3, 4, 2);
    // Scar
    stroke(180, 60, 60);
    strokeWeight(2);
    line(6, -2, 12, 8);
    noStroke();
    // Gold chain
    fill(220, 180, 50);
    for (let c = 0; c < 6; c++) {
      ellipse(-8 + c * 4, 10, 4, 4);
    }
    // Fedora
    fill(40, 40, 50);
    rect(-16, -10, 32, 5, 2);
    rect(-10, -18, 20, 10, 3);
  } else {
    // Temple guardian: ornate mask
    fill(180, 150, 80);
    ellipse(0, -2, 30, 26);
    // Mask features
    fill(140, 40, 40);
    ellipse(-5, -2, 7, 9);
    ellipse(5, -2, 7, 9);
    fill(0);
    ellipse(-5, -2, 4, 6);
    ellipse(5, -2, 4, 6);
    // Crown
    fill(200, 170, 50);
    for (let c = 0; c < 5; c++) {
      triangle(-12 + c * 6, -10, -6 + c * 6, -10, -9 + c * 6, -22);
    }
    // Gems
    fill(100, 200, 100);
    ellipse(0, -18, 5, 5);
    fill(200, 50, 50);
    ellipse(-7, -15, 4, 4);
    ellipse(7, -15, 4, 4);
  }

  // Arms with weapons
  fill(e.color[0] - 10, e.color[1] - 10, e.color[2] - 10);
  let armSwing = sin(e.animFrame * 2) * 0.4;
  // Left arm
  push();
  translate(-BOSS_W / 2 - 2, 10);
  rotate(-0.3 + armSwing);
  rect(-3, 0, 6, 18, 2);
  // Weapon
  fill(160, 160, 170);
  rect(-2, 16, 4, 14);
  fill(200, 200, 210);
  rect(-4, 28, 8, 4, 1);
  pop();
  // Right arm
  push();
  translate(BOSS_W / 2 + 2, 10);
  rotate(0.3 - armSwing);
  fill(e.color[0] - 10, e.color[1] - 10, e.color[2] - 10);
  rect(-3, 0, 6, 18, 2);
  pop();

  // Legs
  let legOffset = sin(e.animFrame * 2) * 5;
  fill(e.color[0] - 40, e.color[1] - 40, e.color[2] - 40);
  rect(-12, BOSS_H - 3, 8, 10 + legOffset, 2);
  rect(4, BOSS_H - 3, 8, 10 - legOffset, 2);

  // Boots
  fill(40, 30, 25);
  rect(-14, BOSS_H + 6 + legOffset, 12, 5, 2);
  rect(2, BOSS_H + 6 - legOffset, 12, 5, 2);

  // Boss HP bar (above head)
  let hpW = 44;
  fill(80, 0, 0);
  rect(-hpW / 2, -28, hpW, 6, 2);
  fill(255, 50, 50);
  rect(-hpW / 2, -28, hpW * (e.hp / e.maxHp), 6, 2);
  // HP bar border
  noFill();
  stroke(200, 180, 50);
  strokeWeight(1);
  rect(-hpW / 2, -28, hpW, 6, 2);
  noStroke();

  pop();
}

function drawShuriken(x, y, angle, isEnemy) {
  push();
  translate(x, y);
  rotate(angle);
  fill(isEnemy ? color(255, 100, 100) : color(200, 200, 220));
  stroke(isEnemy ? color(200, 50, 50) : color(150, 150, 170));
  strokeWeight(1);
  beginShape();
  for (let i = 0; i < 8; i++) {
    let r = i % 2 === 0 ? SHURIKEN_SIZE : SHURIKEN_SIZE * 0.3;
    let a = i * PI / 4;
    vertex(cos(a) * r, sin(a) * r);
  }
  endShape(CLOSE);
  noStroke();
  fill(100);
  ellipse(0, 0, 3, 3);
  pop();
}

function drawShip(x, y) {
  push();
  fill(120, 70, 30);
  beginShape();
  vertex(x - 50, y);
  vertex(x + 60, y);
  vertex(x + 45, y + 30);
  vertex(x - 35, y + 30);
  endShape(CLOSE);

  fill(140, 90, 40);
  rect(x - 35, y - 5, 80, 10, 2);

  fill(100, 60, 20);
  rect(x + 5, y - 70, 5, 70);

  fill(240, 230, 210);
  triangle(x + 10, y - 65, x + 10, y - 15, x + 55, y - 35);

  fill(255, 50, 50);
  triangle(x + 7, y - 70, x + 7, y - 55, x - 10, y - 62);
  pop();
}

function drawCar(x, y) {
  push();
  // Body
  fill(180, 40, 40);
  rect(x - 40, y - 15, 80, 25, 5);
  // Top
  fill(160, 35, 35);
  rect(x - 20, y - 35, 45, 22, 5);
  // Windshield
  fill(150, 200, 230, 180);
  quad(x - 18, y - 33, x + 5, y - 33, x + 0, y - 15, x - 18, y - 15);
  // Rear window
  fill(150, 200, 230, 140);
  quad(x + 8, y - 33, x + 23, y - 33, x + 23, y - 15, x + 8, y - 15);
  // Wheels
  fill(40);
  ellipse(x - 22, y + 12, 18, 18);
  ellipse(x + 25, y + 12, 18, 18);
  fill(120);
  ellipse(x - 22, y + 12, 8, 8);
  ellipse(x + 25, y + 12, 8, 8);
  // Headlight
  fill(255, 255, 150);
  ellipse(x + 40, y - 5, 8, 8);
  // Tail light
  fill(255, 30, 30);
  ellipse(x - 40, y - 5, 6, 6);
  // Exhaust
  fill(100, 100, 110, 120);
  for (let i = 0; i < 3; i++) {
    let ex = x - 48 - i * 8 - bgScroll % 20 * 0.3;
    let ey = y + 12 + sin(frameCount * 0.1 + i) * 3;
    ellipse(ex, ey, 8 + i * 3, 6 + i * 2);
  }
  pop();
}

function drawBoat(x, y) {
  push();
  fill(60, 60, 80);
  beginShape();
  vertex(x - 45, y);
  vertex(x + 55, y);
  vertex(x + 40, y + 20);
  vertex(x - 30, y + 20);
  endShape(CLOSE);
  fill(80, 80, 100);
  rect(x - 15, y - 20, 35, 22, 3);
  fill(100, 180, 220, 150);
  rect(x - 10, y - 18, 25, 12, 2);
  fill(50, 50, 60);
  rect(x - 40, y + 5, 12, 15);
  pop();
}

// Horse sprite - now facing RIGHT (head on right side)
function drawHorseSprite(x, y) {
  push();
  translate(x, y);

  let bob = sin(frameCount * (0.1 + horseSpeed * 0.05)) * 3;
  let legAnim = frameCount * (0.15 + horseSpeed * 0.05);

  translate(0, bob);

  // Horse body
  fill(140, 90, 50);
  ellipse(0, 30, 80, 40);

  // Horse neck (right side now)
  fill(130, 80, 45);
  quad(25, 20, 15, 20, 30, -5, 40, 0);

  // Horse head (right side)
  fill(140, 90, 50);
  ellipse(40, -5, 30, 22);
  // Ear
  triangle(45, -15, 40, -5, 50, -8);
  // Eye
  fill(30);
  ellipse(46, -6, 5, 5);
  // Eye shine
  fill(255, 255, 255, 150);
  ellipse(47, -7, 2, 2);
  // Nostril
  fill(80, 50, 30);
  ellipse(54, -2, 4, 3);
  // Mouth line
  stroke(80, 50, 30);
  strokeWeight(1);
  line(50, 2, 55, 1);
  noStroke();

  // Bridle/reins
  stroke(80, 40, 20);
  strokeWeight(2);
  noFill();
  line(42, -2, 25, 15);
  line(38, 3, 25, 15);
  noStroke();

  // Mane (on neck, right side)
  fill(80, 50, 25);
  for (let i = 0; i < 6; i++) {
    let mx = 22 + i * 3;
    let my = 5 + i * 3;
    let mWave = sin(frameCount * 0.15 + i * 0.8) * 3;
    rect(mx, my - 6, 4, 10 + mWave);
  }

  // Tail (left side now - behind horse)
  fill(80, 50, 25);
  let tailWave = sin(frameCount * (0.08 + horseSpeed * 0.02)) * 12;
  quad(-38, 20, -42, 18, -55 + tailWave, 30, -50 + tailWave, 40);
  // Extra tail strands
  quad(-40, 22, -43, 20, -52 + tailWave * 0.8, 35, -48 + tailWave * 0.8, 42);

  // Saddle
  fill(100, 50, 20);
  ellipse(-5, 18, 30, 14);
  fill(120, 60, 25);
  rect(-10, 12, 10, 5, 2);
  // Stirrup
  fill(160, 160, 170);
  rect(-12, 24, 3, 10);
  ellipse(-11, 35, 6, 4);

  // Legs
  fill(120, 75, 40);
  let l1 = sin(legAnim) * 20;
  let l2 = sin(legAnim + PI) * 20;
  let l3 = sin(legAnim + PI / 2) * 20;
  let l4 = sin(legAnim + PI * 1.5) * 20;
  // Back legs (left)
  push(); translate(-20, 45); rotate(radians(l3)); rect(-3, 0, 7, 25); pop();
  push(); translate(-10, 45); rotate(radians(l4)); rect(-3, 0, 7, 25); pop();
  // Front legs (right)
  push(); translate(15, 45); rotate(radians(l1)); rect(-3, 0, 7, 25); pop();
  push(); translate(25, 45); rotate(radians(l2)); rect(-3, 0, 7, 25); pop();

  // Hooves
  fill(50, 30, 15);

  // Ninja on horse
  drawNinjaSprite(-5, -20, 1, frameCount);

  pop();
}

// Mini versions for title/intro
function drawMiniShip(x, y) {
  push(); translate(x - 20, y); scale(0.5); drawShip(0, 0); pop();
}

function drawMiniCar(x, y) {
  push(); translate(x - 15, y); scale(0.5); drawCar(0, 0); pop();
}

function drawMiniBoat(x, y) {
  push(); translate(x - 20, y); scale(0.5); drawBoat(0, 0); pop();
}

function drawStars() {
  push();
  noStroke();
  for (let s of stars) {
    fill(255, 255, 255, s.b + sin(frameCount * 0.03 + s.x) * 50);
    ellipse(s.x, s.y, s.s);
  }
  pop();
}

function drawHUD() {
  push();
  for (let i = 0; i < ninja.maxHp; i++) {
    let hx = 20 + i * 28;
    let hy = 25;
    if (i < ninja.hp) {
      fill(255, 50, 50);
    } else {
      fill(60, 30, 30);
    }
    drawHeart(hx, hy, 10);
  }

  textAlign(LEFT);
  textSize(14);
  fill(255, 200);
  if (state === HORSE) {
    text("Horse Ride!", 20, 55);
  } else if (currentLevel < LEVELS.length) {
    text("Level " + (currentLevel + 1) + ": " + LEVELS[min(currentLevel, LEVELS.length - 1)].name, 20, 55);
  }
  pop();
}

function drawHeart(x, y, s) {
  push();
  noStroke();
  beginShape();
  vertex(x, y);
  bezierVertex(x - s / 2, y - s / 2, x - s, y + s / 4, x, y + s);
  bezierVertex(x + s, y + s / 4, x + s / 2, y - s / 2, x, y);
  endShape(CLOSE);
  pop();
}

// ============================================================
// PARTICLES
// ============================================================
function spawnHitParticles(x, y, col) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x, y: y,
      vx: random(-3, 3), vy: random(-4, 1),
      life: 25, color: col,
      size: random(3, 7)
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  push();
  noStroke();
  for (let p of particles) {
    fill(p.color[0], p.color[1], p.color[2], map(p.life, 0, 25, 0, 200));
    ellipse(p.x, p.y, p.size);
  }
  pop();
}

// ============================================================
// INPUT
// ============================================================
function keyPressed() {
  keys[keyCode] = true;

  let throwCD = DIFFICULTY[min(currentLevel, DIFFICULTY.length - 1)].ninjaThrowCD;
  if (state === COMBAT && keyCode === 32 && millis() - lastThrow > throwCD) {
    lastThrow = millis();
    shurikens.push({
      x: ninja.x + ninja.facing * 15,
      y: ninja.y + NINJA_H / 2 - 2,
      vx: ninja.facing * SHURIKEN_SPEED,
      vy: 0,
      angle: 0,
      enemy: false
    });
  }

  // --- CHEAT KEYS ---
  // 1, 2, 3 = skip to level 1, 2, 3
  // 4 = skip to horse ride
  // H = full heal
  // K = kill all enemies on screen
  // B = skip to boss
  if (key === '1') { currentLevel = 0; boss = null; state = LEVEL_INTRO; introTimer = 0; }
  if (key === '2') { currentLevel = 1; boss = null; state = LEVEL_INTRO; introTimer = 0; }
  if (key === '3') { currentLevel = 2; boss = null; state = LEVEL_INTRO; introTimer = 0; }
  if (key === '4') { currentLevel = LEVELS.length; boss = null; state = HORSE; startHorse(); }
  if (key === 'h' || key === 'H') { ninja.hp = ninja.maxHp; }
  if (key === 'k' || key === 'K') {
    enemies.forEach(function(e) { e.alive = false; });
  }
  if (key === 'b' || key === 'B') {
    if (state === COMBAT && boss === null) {
      enemies.forEach(function(e) { if (!e.isBoss) e.alive = false; });
    }
  }

  return false;
}

function keyReleased() {
  keys[keyCode] = false;
  return false;
}

function mousePressed() {
  if (state === TITLE) {
    let bx = W / 2 - 80, by = 470, bw = 160, bh = 50;
    if (mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh) {
      startGame();
    }
  }

  if (state === HORSE) {
    let slowerBx = W / 2 - 160, fasterBx = W / 2 + 60, by = 530, bw = 100, bh = 40;
    if (mouseY > by && mouseY < by + bh) {
      if (mouseX > slowerBx && mouseX < slowerBx + bw) {
        horseSpeed = max(1, horseSpeed - 1);
      }
      if (mouseX > fasterBx && mouseX < fasterBx + bw) {
        horseSpeed = min(8, horseSpeed + 1);
      }
    }
  }

  if (state === VICTORY) {
    let bx = W / 2 - 80, by = 470, bw = 160, bh = 50;
    if (mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh) {
      startGame();
    }
  }
}

// ============================================================
// GAME FLOW
// ============================================================
function startGame() {
  currentLevel = 0;
  ninja.hp = ninja.maxHp;
  ninja.invincible = 0;
  shurikens = [];
  enemies = [];
  particles = [];
  boss = null;
  state = LEVEL_INTRO;
  introTimer = 0;
}

function resetAfterDeath() {
  ninja.hp = ninja.maxHp;
  ninja.invincible = 120;
  boss = null;
  state = COMBAT;
  startCombat();
}
