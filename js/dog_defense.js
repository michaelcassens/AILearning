// ================================================================
// DOG TOWER DEFENSE  –  dog_defense.js   (p5.js)
// Dogs defend the yard from bones, cats, squirrels, raccoons,
// and mailmen!  Slobbering dogs slow enemies.
// ================================================================

// ── Layout constants ─────────────────────────────────────────────
const COLS = 16, ROWS = 12, CS = 50;   // grid columns, rows, cell-size
const SB = 210;                         // sidebar width
const CW = COLS * CS + SB;             // total canvas width  (1010)
const CH = ROWS * CS;                  // canvas height       (600)
const GW = COLS * CS;                  // game area width     (800)

// ── Path (grid col,row pairs from left edge → right edge) ────────
const RAW_PATH = [
  {c:0,r:3},{c:1,r:3},{c:2,r:3},{c:3,r:3},{c:4,r:3},{c:5,r:3},
  {c:5,r:2},{c:5,r:1},
  {c:6,r:1},{c:7,r:1},{c:8,r:1},{c:9,r:1},{c:10,r:1},{c:11,r:1},
  {c:11,r:2},{c:11,r:3},{c:11,r:4},{c:11,r:5},
  {c:10,r:5},{c:9,r:5},{c:8,r:5},{c:7,r:5},{c:6,r:5},
  {c:5,r:5},{c:4,r:5},{c:3,r:5},
  {c:3,r:6},{c:3,r:7},{c:3,r:8},{c:3,r:9},
  {c:4,r:9},{c:5,r:9},{c:6,r:9},{c:7,r:9},{c:8,r:9},
  {c:9,r:9},{c:10,r:9},{c:11,r:9},{c:12,r:9},{c:13,r:9},
  {c:13,r:8},{c:13,r:7},{c:13,r:6},
  {c:14,r:6},{c:15,r:6}
];

// ── Dog tower definitions ─────────────────────────────────────────
// size: 'small'|'medium'|'large'   slow: drool slows enemies
const DOG_DEFS = [
  { name:'Chihuahua',  cost: 50,  dmg: 7,  range: 80,  rate:22, slow:false, size:'small',  col:[210,175,130], desc:'Tiny but fierce' },
  { name:'Dachshund',  cost: 75,  dmg:11,  range:105,  rate:38, slow:false, size:'small',  col:[140, 85, 35], desc:'Long-body, long reach' },
  { name:'Beagle',     cost:110,  dmg:17,  range:118,  rate:36, slow:false, size:'medium', col:[200,140, 60], desc:'Trusty tracker' },
  { name:'Poodle',     cost:130,  dmg:14,  range:145,  rate:32, slow:false, size:'medium', col:[240,210,230], desc:'Fancy & effective' },
  { name:'Bulldog',    cost:150,  dmg: 9,  range: 95,  rate:48, slow:true,  size:'medium', col:[155,155,155], desc:'Drool slows enemies' },
  { name:'G.Shepherd', cost:200,  dmg:27,  range:132,  rate:40, slow:false, size:'large',  col:[ 70, 50, 15], desc:'Elite guard dog' },
  { name:'St.Bernard', cost:225,  dmg:20,  range:122,  rate:52, slow:true,  size:'large',  col:[190,130, 65], desc:'Slobber storm!' },
  { name:'Great Dane', cost:275,  dmg:42,  range:148,  rate:46, slow:false, size:'large',  col:[ 90,100,120], desc:'Apex defender' },
];

// ── Enemy definitions ─────────────────────────────────────────────
const ENEMY_DEFS = {
  bone:     { hp: 30, spd:2.6, reward: 5, armor:0, c:[245,240,215], lbl:'Bone'     },
  cat:      { hp: 65, spd:2.0, reward:10, armor:0, c:[230,140, 40], lbl:'Cat'      },
  squirrel: { hp: 28, spd:3.6, reward: 8, armor:0, c:[145, 95, 45], lbl:'Squirrel' },
  raccoon:  { hp:135, spd:1.2, reward:15, armor:5, c:[105,105,115], lbl:'Raccoon'  },
  mailman:  { hp: 85, spd:1.8, reward:20, armor:0, c:[ 30, 65,185], lbl:'Mailman'  },
};

// ── Wave definitions ──────────────────────────────────────────────
// Each wave is an array of spawn groups {type, count, interval(frames between spawns)}
const WAVES = [
  [{type:'bone',count:8,ivl:60}],
  [{type:'bone',count:6,ivl:50},{type:'cat',count:3,ivl:80}],
  [{type:'squirrel',count:8,ivl:42},{type:'cat',count:4,ivl:68}],
  [{type:'bone',count:10,ivl:38},{type:'raccoon',count:2,ivl:120}],
  [{type:'cat',count:6,ivl:52},{type:'squirrel',count:6,ivl:40},{type:'mailman',count:2,ivl:100}],
  [{type:'raccoon',count:4,ivl:95},{type:'mailman',count:3,ivl:85}],
  [{type:'squirrel',count:12,ivl:33},{type:'cat',count:6,ivl:48},{type:'bone',count:8,ivl:38}],
  [{type:'raccoon',count:5,ivl:88},{type:'mailman',count:5,ivl:78},{type:'cat',count:6,ivl:52}],
  [{type:'bone',count:15,ivl:28},{type:'squirrel',count:10,ivl:33},{type:'raccoon',count:4,ivl:82}],
  [{type:'mailman',count:8,ivl:65},{type:'raccoon',count:6,ivl:80},{type:'cat',count:8,ivl:48},{type:'squirrel',count:10,ivl:33}],
];

// ── Game-state globals ────────────────────────────────────────────
let gState = 'playing';   // 'playing' | 'gameover' | 'win'
let lives, coins, waveNum, waveActive;
let towers, enemies, projectiles, particles, floatingTexts;
let spawnQueue, spawnTimer;
let selDog = -1;
let hovCell = null;
let grid;         // grid[r][c]: null | 'path' | 'tower'
let pathSet;      // Set of "c,r" strings for path collision
let waypoints;    // pixel-centre waypoints along path

// ════════════════════════════════════════════════════════════════
// p5.js SETUP
// ════════════════════════════════════════════════════════════════
function setup() {
  let cnv = createCanvas(CW, CH);
  cnv.elt.addEventListener('contextmenu', e => e.preventDefault());
  textFont('Arial');
  initGame();
}

function initGame() {
  gState     = 'playing';
  lives      = 20;
  coins      = 200;
  waveNum    = 0;
  waveActive = false;
  towers     = [];
  enemies    = [];
  projectiles= [];
  particles  = [];
  floatingTexts = [];
  spawnQueue = [];
  spawnTimer = 0;
  selDog     = -1;

  // Build path data
  waypoints = RAW_PATH.map(p => ({ x: p.c * CS + CS/2, y: p.r * CS + CS/2 }));
  pathSet   = new Set(RAW_PATH.map(p => `${p.c},${p.r}`));

  // Build grid
  grid = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  for (let p of RAW_PATH) grid[p.r][p.c] = 'path';
}

// ════════════════════════════════════════════════════════════════
// p5.js DRAW  (runs every frame)
// ════════════════════════════════════════════════════════════════
function draw() {
  if (gState === 'playing') gameUpdate();

  drawBG();
  drawPathCells();
  drawGridLines();
  drawTowerRangePreview();
  for (let t of towers)      { t.draw(); }
  for (let e of enemies)     { e.draw(); }
  for (let p of projectiles) { p.draw(); }
  for (let p of particles)   { p.draw(); }
  for (let f of floatingTexts){ f.draw(); }
  drawSidebar();
  if (gState === 'gameover') drawOverlay('GAME OVER!','The enemies got through!', color(255,70,70));
  if (gState === 'win')      drawOverlay('YOU WIN! 🎉','Your dogs saved the yard!', color(80,255,100));
}

// ════════════════════════════════════════════════════════════════
// GAME UPDATE
// ════════════════════════════════════════════════════════════════
function gameUpdate() {
  // ── Spawn logic ───────────────────────────
  if (spawnQueue.length > 0) {
    waveActive = true;
    spawnTimer--;
    if (spawnTimer <= 0) {
      let grp = spawnQueue[0];
      enemies.push(new Enemy(grp.type));
      grp.count--;
      spawnTimer = grp.ivl;
      if (grp.count <= 0) spawnQueue.shift();
    }
  } else if (waveActive && enemies.length === 0) {
    waveActive = false;
    if (waveNum >= WAVES.length) gState = 'win';
  }

  // ── Update towers ─────────────────────────
  for (let t of towers) t.update();

  // ── Update enemies ────────────────────────
  for (let e of enemies) e.update();
  enemies = enemies.filter(e => {
    if (e.reached) { lives--; if (lives <= 0) gState = 'gameover'; return false; }
    if (e.dead)    { coins += e.reward; addFT('+$'+e.reward, e.x, e.y, color(255,220,0)); addFT(e.lbl+' defeated!', e.x, e.y-18, color(255,180,80)); return false; }
    return true;
  });

  // ── Update projectiles ────────────────────
  for (let p of projectiles) p.update();
  projectiles = projectiles.filter(p => !p.done);

  // ── Update particles / FTs ────────────────
  for (let p of particles)    p.update();
  particles = particles.filter(p => p.life > 0);
  for (let f of floatingTexts) f.update();
  floatingTexts = floatingTexts.filter(f => f.life > 0);
}

function launchWave() {
  if (waveActive || waveNum >= WAVES.length || spawnQueue.length > 0) return;
  let def = WAVES[waveNum++];
  for (let g of def) spawnQueue.push({...g});
  spawnTimer = 0;
}

// ════════════════════════════════════════════════════════════════
// TOWER CLASS
// ════════════════════════════════════════════════════════════════
class Tower {
  constructor(col, row, defIdx) {
    this.col = col; this.row = row;
    this.x = col*CS + CS/2;  this.y = row*CS + CS/2;
    this.def = DOG_DEFS[defIdx];
    this.defIdx = defIdx;
    this.cd = 0;   // cooldown
    this.angle = 0;
  }

  update() {
    if (this.cd > 0) { this.cd--; return; }
    let best = null, bd = Infinity;
    for (let e of enemies) {
      let d = dist(this.x, this.y, e.x, e.y);
      if (d <= this.def.range && d < bd) { bd = d; best = e; }
    }
    if (best) {
      this.angle = atan2(best.y - this.y, best.x - this.x);
      projectiles.push(new Proj(this.x, this.y, best, this.def.dmg, this.def.slow, this.def.col));
      this.cd = this.def.rate;
      for (let i=0;i<3;i++) particles.push(new Particle(this.x, this.y, color(255,255,200), 2, 0.18));
    }
  }

  draw() {
    // Range circle when hovered
    if (hovCell && hovCell.c===this.col && hovCell.r===this.row) {
      noFill(); stroke(255,255,255,70); strokeWeight(1);
      circle(this.x, this.y, this.def.range*2);
    }
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    drawDogSprite(this.def.size, this.def.col, this.def.slow);
    pop();
  }
}

// ════════════════════════════════════════════════════════════════
// ENEMY CLASS
// ════════════════════════════════════════════════════════════════
class Enemy {
  constructor(type) {
    let d = ENEMY_DEFS[type];
    this.type    = type;
    this.lbl     = d.lbl;
    this.hp      = d.hp; this.maxHp = d.hp;
    this.spd     = d.spd;
    this.reward  = d.reward;
    this.armor   = d.armor;
    this.ec      = d.c;          // color array
    this.wpIdx   = 1;
    this.x       = waypoints[0].x;
    this.y       = waypoints[0].y;
    this.dead    = false;
    this.reached = false;
    this.slowT   = 0;            // slow timer
    this.af      = 0;            // anim frame
    this.at      = 0;            // anim timer
  }

  update() {
    if (this.slowT > 0) this.slowT--;
    let spd = this.slowT > 0 ? this.spd * 0.38 : this.spd;
    if (this.wpIdx >= waypoints.length) { this.reached = true; return; }
    let tx = waypoints[this.wpIdx].x, ty = waypoints[this.wpIdx].y;
    let dx = tx-this.x, dy = ty-this.y, d = sqrt(dx*dx+dy*dy);
    if (d < spd) { this.x=tx; this.y=ty; this.wpIdx++; }
    else         { this.x += (dx/d)*spd; this.y += (dy/d)*spd; }
    if (++this.at > 7) { this.at=0; this.af=(this.af+1)%4; }
  }

  takeDmg(dmg) {
    this.hp -= max(1, dmg - this.armor);
    if (this.hp <= 0) this.dead = true;
  }

  slow() { this.slowT = 200; }

  draw() {
    push();
    translate(this.x, this.y);
    // Slow glow
    if (this.slowT > 0) {
      noFill(); stroke(80,160,255,120); strokeWeight(2); circle(0,0,34);
    }
    let bob = sin(this.af * PI/2) * 1.8;
    translate(0, bob);
    drawEnemySprite(this.type, this.ec, this.af);
    // Health bar
    if (this.hp < this.maxHp) {
      let bw=30, bh=4, ratio=this.hp/this.maxHp;
      noStroke();
      fill(70,0,0);    rect(-bw/2,-26,bw,bh,2);
      fill(lerpColor(color(220,50,50),color(60,220,60),ratio));
      rect(-bw/2,-26,bw*ratio,bh,2);
    }
    pop();
  }
}

// ════════════════════════════════════════════════════════════════
// PROJECTILE CLASS
// ════════════════════════════════════════════════════════════════
class Proj {
  constructor(x,y,target,dmg,slow,col) {
    this.x=x; this.y=y; this.target=target;
    this.dmg=dmg; this.slow=slow; this.col=col;
    this.spd=7; this.done=false;
  }
  update() {
    if (this.target.dead||this.target.reached){this.done=true;return;}
    let dx=this.target.x-this.x, dy=this.target.y-this.y;
    let d=sqrt(dx*dx+dy*dy);
    if (d < this.spd+4) {
      this.target.takeDmg(this.dmg);
      if (this.slow) this.target.slow();
      for (let i=0;i<5;i++) particles.push(new Particle(this.target.x,this.target.y, color(...this.col),2,0.14));
      this.done=true;
    } else { this.x+=(dx/d)*this.spd; this.y+=(dy/d)*this.spd; }
  }
  draw() {
    noStroke();
    if (this.slow) { fill(120,190,255,220); circle(this.x,this.y,9); }  // drool blob
    else           { fill(...this.col);    circle(this.x,this.y,6); }
  }
}

// ════════════════════════════════════════════════════════════════
// PARTICLE  &  FLOATING TEXT
// ════════════════════════════════════════════════════════════════
class Particle {
  constructor(x,y,col,sz,decay) {
    this.x=x+random(-8,8); this.y=y+random(-8,8);
    this.vx=random(-1.5,1.5); this.vy=random(-2.5,0.5);
    this.col=col; this.sz=sz; this.life=1; this.decay=decay;
  }
  update() { this.x+=this.vx; this.y+=this.vy; this.vy+=0.12; this.life-=this.decay; }
  draw() {
    let c=color(red(this.col),green(this.col),blue(this.col),this.life*255);
    noStroke(); fill(c); circle(this.x,this.y,this.sz*this.life*3);
  }
}

class FT {   // Floating Text
  constructor(txt,x,y,col){ this.txt=txt; this.x=x; this.y=y; this.col=col; this.life=1; }
  update() { this.y-=1.2; this.life-=0.018; }
  draw() {
    let c=color(red(this.col),green(this.col),blue(this.col),this.life*255);
    noStroke(); fill(c);
    textAlign(CENTER,CENTER); textSize(13); textStyle(BOLD);
    text(this.txt,this.x,this.y);
  }
}

function addFT(t,x,y,c){ floatingTexts.push(new FT(t,x,y,c)); }

// ════════════════════════════════════════════════════════════════
// DRAWING – BACKGROUND, PATH, GRID
// ════════════════════════════════════════════════════════════════
function drawBG() {
  // Grass
  background(82,145,55);
  // Subtle texture dots
  randomSeed(42);
  fill(70,130,48,120); noStroke();
  for (let i=0;i<200;i++) ellipse(random(GW),random(CH),4,2);
}

function drawPathCells() {
  fill(190,155,90); noStroke();
  for (let p of RAW_PATH) rect(p.c*CS,p.r*CS,CS,CS);
  // Path outline
  stroke(160,128,65,180); strokeWeight(2); noFill();
  beginShape();
  for (let wp of waypoints) vertex(wp.x,wp.y);
  endShape();
  // Start / End labels
  let s=waypoints[0], e=waypoints[waypoints.length-1];
  noStroke(); textAlign(CENTER,CENTER); textSize(9); textStyle(BOLD);
  fill(40,180,40); text('START',s.x,s.y);
  fill(200,50,50); text('END',e.x,e.y);
}

function drawGridLines() {
  stroke(55,110,35,70); strokeWeight(1);
  for (let c=0;c<=COLS;c++) line(c*CS,0,c*CS,CH);
  for (let r=0;r<=ROWS;r++) line(0,r*CS,GW,r*CS);
}

function drawTowerRangePreview() {
  if (selDog < 0 || !hovCell) return;
  let {c,r} = hovCell;
  if (pathSet.has(`${c},${r}`) || grid[r][c]==='tower') return;
  let def = DOG_DEFS[selDog];
  let canBuy = coins >= def.cost;
  fill(canBuy?color(255,255,255,50):color(255,50,50,60)); noStroke();
  rect(c*CS,r*CS,CS,CS);
  noFill(); stroke(255,255,255,80); strokeWeight(1);
  circle(c*CS+CS/2, r*CS+CS/2, def.range*2);
}

// ════════════════════════════════════════════════════════════════
// SIDEBAR UI
// ════════════════════════════════════════════════════════════════
function drawSidebar() {
  let sx = GW;
  // Panel bg
  fill(28,32,48); noStroke(); rect(sx,0,SB,CH);
  fill(40,46,68); rect(sx,0,SB,4);  // top accent

  // Title
  fill(200,240,160); textAlign(CENTER,TOP); textSize(15); textStyle(BOLD);
  text('Dog Tower Defense', sx+SB/2, 8);

  // Stats
  let sy=30;
  textSize(13); textStyle(NORMAL);
  fill(255,110,110); text('Lives: '+lives, sx+SB/2, sy);
  fill(255,220,60);  text('Coins: $'+coins, sx+SB/2, sy+18);
  fill(170,180,255); text('Wave: '+waveNum+' / '+WAVES.length, sx+SB/2, sy+36);

  // Wave button
  let bx=sx+8, by=90, bw=SB-16, bh=28;
  let canSend = !waveActive && waveNum<WAVES.length && spawnQueue.length===0;
  fill(canSend?color(55,185,85):color(75,78,90)); noStroke(); rect(bx,by,bw,bh,6);
  fill(255); textAlign(CENTER,CENTER); textSize(12); textStyle(BOLD);
  let btnTxt = waveActive ? 'Wave in progress...'
             : (waveNum>=WAVES.length&&!waveActive&&enemies.length===0 ? 'All Waves Done!'
             : 'Send Wave '+(waveNum+1)+' !');
  text(btnTxt, sx+SB/2, by+bh/2);

  // Section header
  fill(180,200,255); textAlign(LEFT,TOP); textSize(11); textStyle(BOLD);
  text('SELECT DEFENDER:', sx+8, 128);

  // Dog cards
  let cy=146;
  for (let i=0;i<DOG_DEFS.length;i++) {
    let d = DOG_DEFS[i];
    let sel = selDog===i;
    let afford = coins>=d.cost;
    fill(sel?color(55,80,130):color(36,40,60));
    stroke(sel?color(140,200,255):color(55,60,85)); strokeWeight(1);
    rect(sx+4, cy, SB-8, 48, 5);

    // Dog mini-sprite
    push();
    translate(sx+24, cy+24);
    let sf = d.size==='small'?0.45:(d.size==='large'?0.65:0.55);
    scale(sf);
    drawDogSprite(d.size, d.col, d.slow);
    pop();

    noStroke();
    fill(afford?255:100); textAlign(LEFT,TOP); textSize(11); textStyle(BOLD);
    text(d.name, sx+46, cy+5);
    textStyle(NORMAL); textSize(10);
    fill(afford?color(255,215,0):color(200,80,80)); text('$'+d.cost, sx+46, cy+18);
    fill(d.slow?color(100,200,255):color(140,220,130));
    text(d.slow ? 'Slobber: SLOWS foes' : (d.size==='large'?'Large dog':d.size==='small'?'Small dog':'Medium dog'), sx+46, cy+30);
    cy+=52;
  }

  // Hints
  fill(130,135,160); textAlign(CENTER,BOTTOM); textSize(9); textStyle(NORMAL);
  text('Click dog then click grass to place', sx+SB/2, CH-14);
  text('Right-click tower to sell (50% refund)', sx+SB/2, CH-2);
}

function drawOverlay(title, sub, tc) {
  fill(0,0,0,165); noStroke(); rect(0,0,CW,CH);
  fill(tc); textAlign(CENTER,CENTER); textSize(52); textStyle(BOLD);
  text(title, CW/2, CH/2-28);
  fill(255); textSize(20); textStyle(NORMAL);
  text(sub, CW/2, CH/2+22);
  fill(190,200,255); textSize(15);
  text('Click anywhere to play again', CW/2, CH/2+62);
}

// ════════════════════════════════════════════════════════════════
// DOG SPRITE  (p5.js shapes, no images needed)
// ════════════════════════════════════════════════════════════════
function drawDogSprite(sz, col, slobber) {
  // sz: 'small'|'medium'|'large'
  // All positions are relative to dog centre (0,0), facing right.
  let s = sz==='small' ? 0.72 : sz==='large' ? 1.28 : 1.0;
  let bc = color(...col);
  let dc = color(red(bc)*0.75, green(bc)*0.75, blue(bc)*0.75); // darker for ears/detail

  // Shadow
  fill(0,0,0,50); noStroke(); ellipse(0, 14*s, 30*s, 8*s);

  // Body
  fill(bc); noStroke(); ellipse(-2*s, 2*s, 24*s, 16*s);

  // Legs (4 little stumps)
  fill(dc); noStroke();
  rect(-10*s, 8*s, 6*s, 9*s, 2);
  rect(-3*s,  8*s, 6*s, 9*s, 2);
  rect(5*s,   8*s, 6*s, 9*s, 2);

  // Tail
  stroke(dc); strokeWeight(3*s); noFill();
  arc(-14*s, 0*s, 14*s, 14*s, -PI*0.6, PI*0.2);

  // Head
  fill(bc); noStroke(); ellipse(11*s, -4*s, 20*s, 17*s);

  // Ear (floppy)
  fill(dc); noStroke(); ellipse(15*s, -12*s, 9*s, 11*s);

  // Eye
  fill(30); circle(14*s, -5*s, 4*s);
  fill(255); circle(15*s, -6*s, 1.5*s);

  // Nose
  fill(30); ellipse(20*s, -2*s, 6*s, 4*s);

  // Slobber drool
  if (slobber) {
    fill(130,190,255,200); noStroke();
    ellipse(22*s, 5*s, 6*s, 8*s);
    stroke(90,170,255); strokeWeight(1.5*s); noFill();
    arc(20*s, 3*s, 6*s, 6*s, 0, PI/2);
  }
}

// ════════════════════════════════════════════════════════════════
// ENEMY SPRITES
// ════════════════════════════════════════════════════════════════
function drawEnemySprite(type, ec, af) {
  let c = color(...ec);
  switch(type) {
    case 'bone':     drawBone(c, af);     break;
    case 'cat':      drawCat(c, af);      break;
    case 'squirrel': drawSquirrel(c, af); break;
    case 'raccoon':  drawRaccoon(c, af);  break;
    case 'mailman':  drawMailman(c, af);  break;
  }
}

// ─── Bone ───────────────────────────────────────────────────────
function drawBone(c, af) {
  let spin = af * PI/2;          // rolling bone
  push(); rotate(spin);
  fill(c); noStroke();
  rect(-10,-3,20,6,3);           // shaft
  circle(-12,0,10); circle(-12,0,6); // left knob
  circle( 12,0,10); circle( 12,0,6); // right knob
  // Creepy face
  fill(200,30,30);
  circle(-3,-1,3); circle(3,-1,3);  // eyes
  noFill(); stroke(200,30,30); strokeWeight(1);
  arc(0, 2, 8, 6, 0, PI);           // grimace
  pop();
}

// ─── Cat ────────────────────────────────────────────────────────
function drawCat(c, af) {
  let dc = color(red(c)*0.75, green(c)*0.75, blue(c)*0.75);
  // Body
  fill(c); noStroke(); ellipse(0,5,20,16);
  // Head
  ellipse(0,-9,18,16);
  // Ears
  fill(dc);
  triangle(-6,-14,-11,-23,-1,-18);
  triangle( 6,-14, 11,-23,  1,-18);
  fill(255,150,150);
  triangle(-5,-15,-9,-21,-2,-17);
  triangle( 5,-15, 9,-21,  2,-17);
  // Eyes (glow green)
  fill(70,210,70); ellipse(-4,-10,7,5); ellipse(4,-10,7,5);
  fill(0);         ellipse(-4,-10,2,5); ellipse(4,-10,2,5);
  // Nose
  fill(255,140,140); triangle(-2,-5,2,-5,0,-3);
  // Whiskers (twitch with af)
  stroke(200,200,200); strokeWeight(0.8);
  let tw = sin(af*PI/2)*2;
  line(-7,-7,-16+tw,-6); line(-7,-6,-15+tw,-8);
  line( 7,-7, 16-tw,-6); line( 7,-6, 15-tw,-8);
  // Tail (sway)
  noFill(); stroke(c); strokeWeight(2);
  let ts = sin(af*PI/2)*0.4;
  arc(0, 8, 22, 18, PI/2, PI+ts);
}

// ─── Squirrel ───────────────────────────────────────────────────
function drawSquirrel(c, af) {
  let dc = color(red(c)*0.8, green(c)*0.8, blue(c)*0.8);
  // Fluffy tail (behind body)
  fill(dc); noStroke();
  let ta = sin(af*PI/2)*0.3;
  push(); translate(-3,6); rotate(ta); ellipse(0,-12,14,26); pop();
  // Body
  fill(c); ellipse(0,5,17,14);
  // Head
  ellipse(2,-9,15,13);
  // Ears
  fill(dc); ellipse(-3,-15,6,8); ellipse(6,-15,6,8);
  // Eye
  fill(25); circle(5,-10,5); fill(255); circle(6,-11,1.5);
  // Nose
  fill(255,140,140); circle(8,-7,3);
  // Acorn
  fill(155,100,35); noStroke(); ellipse(9,1,8,10);
  fill(80,52,20);   rect(6,-4,6,4,2);
}

// ─── Raccoon ────────────────────────────────────────────────────
function drawRaccoon(c, af) {
  let dc = color(red(c)*0.65, green(c)*0.65, blue(c)*0.65);
  // Striped tail
  let cols=[c,dc,c,dc];
  for (let i=0;i<4;i++) {
    fill(cols[i]); noStroke();
    arc(-14-i*2, 6, 16, 12, PI/2, 3*PI/2);
  }
  // Chunky body
  fill(c); noStroke(); ellipse(0,5,27,21);
  // Head
  ellipse(0,-11,24,20);
  // Mask
  fill(35,35,35);
  ellipse(-6,-12,12,9); ellipse(6,-12,12,9);
  fill(255); circle(-6,-12,7); circle(6,-12,7);
  fill(0);   circle(-6,-12,3.5); circle(6,-12,3.5);
  fill(255); circle(-5,-13,1.5); circle(7,-13,1.5);
  // Nose
  fill(35); ellipse(0,-5,8,5);
  // Ears
  fill(c); circle(-9,-19,9); circle(9,-19,9);
  fill(200,160,160); circle(-9,-19,4); circle(9,-19,4);
}

// ─── Mailman ────────────────────────────────────────────────────
function drawMailman(c, af) {
  let ll =  sin(af*PI/2)*5;
  let rl = -sin(af*PI/2)*5;
  // Legs
  fill(40,70,170); noStroke();
  rect(-8, 12, 7, 14+ll, 3);
  rect( 1, 12, 7, 14+rl, 3);
  // Body (uniform)
  fill(c); rect(-11,-8,22,22,5);
  // Mail bag
  fill(210,170,55); rect(9,-4,11,15,4);
  fill(180,140,30); rect(10,-3,9,3);
  // Arm (swings)
  let as = sin(af*PI/2)*8;
  fill(c); rect(-16,-6+as, 7,16,4); // left arm
  fill(c); rect( 9,-6-as, 7,16,4);  // right arm (mail bag side)
  // Head (skin)
  fill(255,215,168); noStroke(); ellipse(0,-19,22,20);
  // Hat
  fill(c); rect(-12,-28,24,9,4); rect(-8,-34,16,8);
  fill(red(c)*0.8,green(c)*0.8,blue(c)*0.8); rect(-14,-21,28,5,2);
  // Eyes
  fill(30); ellipse(-4,-20,5,5); ellipse(4,-20,5,5);
  // Angry brow
  stroke(30); strokeWeight(1.8); noFill();
  line(-7,-24,-2,-22); line(2,-22,7,-24);
  // Frown
  arc(0,-15,8,5,0,PI);
  // Letter occasionally visible
  if (af===1) { fill(255); noStroke(); rect(10,-7,8,6,1); stroke(180,140,30); strokeWeight(0.6); line(11,-6,17,-6); }
}

// ════════════════════════════════════════════════════════════════
// INPUT HANDLERS
// ════════════════════════════════════════════════════════════════
function mouseMoved() { updateHover(); }
function mouseDragged(){ updateHover(); }

function updateHover() {
  let c=floor(mouseX/CS), r=floor(mouseY/CS);
  hovCell = (c>=0&&c<COLS&&r>=0&&r<ROWS) ? {c,r} : null;
}

function mousePressed() {
  if (gState!=='playing') { initGame(); return; }

  let sx=GW;
  // ── Sidebar clicks ──────────────────────────
  if (mouseX >= sx) {
    // Wave button: y 90-118
    if (mouseY>=90&&mouseY<=118&&mouseX>=sx+8&&mouseX<=sx+SB-8) { launchWave(); return; }
    // Dog cards
    let cy=146;
    for (let i=0;i<DOG_DEFS.length;i++) {
      if (mouseY>=cy&&mouseY<=cy+48&&mouseX>=sx+4&&mouseX<=sx+SB-4) {
        selDog = selDog===i ? -1 : i;
        return;
      }
      cy+=52;
    }
    return;
  }

  // ── Game grid clicks ────────────────────────
  let c=floor(mouseX/CS), r=floor(mouseY/CS);
  if (c<0||c>=COLS||r<0||r>=ROWS) return;

  if (mouseButton===RIGHT) {
    // Sell tower
    let idx=towers.findIndex(t=>t.col===c&&t.row===r);
    if (idx>=0) {
      let refund=floor(towers[idx].def.cost*0.5);
      coins+=refund;
      addFT('+$'+refund+' (sold)', c*CS+CS/2, r*CS+CS/2, color(255,220,0));
      grid[r][c]=null;
      towers.splice(idx,1);
    }
    return;
  }

  if (selDog<0) return;
  if (pathSet.has(`${c},${r}`)) { addFT("Can't build on path!", c*CS+CS/2, r*CS, color(255,100,100)); return; }
  if (grid[r][c]==='tower')     { addFT('Already occupied!', c*CS+CS/2, r*CS, color(255,100,100)); return; }
  if (coins<DOG_DEFS[selDog].cost) { addFT('Need $'+DOG_DEFS[selDog].cost+'!', c*CS+CS/2, r*CS, color(255,80,80)); return; }

  coins -= DOG_DEFS[selDog].cost;
  towers.push(new Tower(c, r, selDog));
  grid[r][c]='tower';
  addFT(DOG_DEFS[selDog].name+' placed!', c*CS+CS/2, r*CS, color(180,255,150));
}
