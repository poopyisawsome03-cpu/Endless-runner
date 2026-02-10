/* ===== ENDLESS SLASH RUNNER — FULL VFX REWRITE ===== */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const stateEl = document.getElementById("state");

ctx.imageSmoothingEnabled = false;

/* ---------- constants ---------- */
const W = 480, H = 270, GROUND_Y = 230;

/* ---------- palette (neon cyber) ---------- */
const PAL = {
  skyTop:    [6, 6, 18],
  skyBot:    [18, 10, 48],
  stars:     "#ffffff",
  mountain:  "#0e0a26",
  city1:     "#12102e",
  city2:     "#1a1440",
  ground:    "#0d0b22",
  groundLine:"#2a2056",
  neonBlue:  "#00f0ff",
  neonPink:  "#ff3e6c",
  neonPurple:"#b347ff",
  neonOrange:"#ff8c21",
  white:     "#e0dce8",
  dark:      "#0a0a14",
};

/* ---------- state ---------- */
let lastTime = 0, state = "ready", globalTime = 0;

const player = {
  x: 50, y: GROUND_Y - 28, w: 18, h: 28,
  vy: 0, grounded: true,
  slashTimer: 0, slashCooldown: 0,
  runFrame: 0, runAccum: 0,
  trailX: [], trailY: [],
};

const physics = { gravity: 1600, jumpVel: -560 };
const run     = { base: 130, scale: 0.03, max: 400, dist: 0 };
const spawner = { timer: 0 };
const obstacles = [];

/* ---------- VFX systems ---------- */
const particles = [];
const slashArcs = [];
const screenShake = { x: 0, y: 0, trauma: 0 };
const stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * W,
  y: Math.random() * (GROUND_Y - 20),
  s: Math.random() * 1.5 + 0.5,
  twinkle: Math.random() * Math.PI * 2,
  speed: Math.random() * 0.3 + 0.1,
}));

/* city skyline layers */
function makeSkyline(count, minH, maxH, minW, maxW) {
  const bldgs = [];
  let x = 0;
  while (x < W + 80) {
    const w = minW + Math.random() * (maxW - minW);
    const h = minH + Math.random() * (maxH - minH);
    bldgs.push({ x, w, h, windows: Math.random() > 0.3 });
    x += w + Math.random() * 6;
  }
  return bldgs;
}
const cityBack  = makeSkyline(12, 20, 55, 10, 22);
const cityFront = makeSkyline(14, 15, 40, 8, 18);

/* ---------- helper ---------- */
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rng(lo, hi) { return lo + Math.random() * (hi - lo); }
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(r, g, b, a) { return `rgba(${r},${g},${b},${a})`; }

/* ---------- particles ---------- */
function spawnParticle(x, y, vx, vy, life, color, size) {
  particles.push({ x, y, vx, vy, life, maxLife: life, color, size });
}

function spawnDust(x, y) {
  for (let i = 0; i < 3; i++) {
    spawnParticle(x + rng(-2, 2), y, rng(-15, -40), rng(-30, -80), rng(0.2, 0.5), PAL.neonBlue, rng(1, 2.5));
  }
}

function spawnJumpBurst(x, y) {
  for (let i = 0; i < 8; i++) {
    const angle = rng(Math.PI * 0.6, Math.PI * 1.4);
    const speed = rng(40, 120);
    spawnParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, rng(0.2, 0.5),
      [PAL.neonBlue, PAL.neonPurple, PAL.neonPink][Math.floor(Math.random() * 3)], rng(1.5, 3));
  }
}

function spawnSlashSparks(x, y) {
  for (let i = 0; i < 12; i++) {
    const angle = rng(-0.6, 0.6);
    const speed = rng(60, 200);
    spawnParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 30, rng(0.15, 0.4),
      [PAL.neonPink, PAL.neonOrange, "#fff"][Math.floor(Math.random() * 3)], rng(1, 3));
  }
}

function spawnDeathExplosion(x, y) {
  for (let i = 0; i < 25; i++) {
    const angle = rng(0, Math.PI * 2);
    const speed = rng(30, 180);
    spawnParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, rng(0.3, 0.8),
      [PAL.neonPurple, PAL.neonPink, PAL.neonBlue, "#fff"][Math.floor(Math.random() * 4)], rng(1.5, 4));
  }
  screenShake.trauma = 1;
}

function spawnKillExplosion(x, y) {
  for (let i = 0; i < 18; i++) {
    const angle = rng(0, Math.PI * 2);
    const speed = rng(40, 160);
    spawnParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, rng(0.2, 0.6),
      [PAL.neonPink, PAL.neonOrange, "#ffee88", "#fff"][Math.floor(Math.random() * 4)], rng(1.5, 3.5));
  }
  screenShake.trauma = Math.min(screenShake.trauma + 0.4, 1);
}

/* ---------- slash arc ---------- */
function spawnSlashArc() {
  slashArcs.push({
    x: player.x + player.w + 2,
    y: player.y + player.h * 0.4,
    life: 0.22,
    maxLife: 0.22,
  });
}

/* ---------- getSpeed ---------- */
function getSpeed() {
  return Math.min(run.max, run.base + run.dist * run.scale);
}

/* ---------- spawner ---------- */
function spawnObstacle() {
  const roll = Math.random();
  const isEnemy = roll > 0.4;
  obstacles.push({
    type: isEnemy ? "enemy" : "spike",
    x: W + 20,
    y: GROUND_Y - (isEnemy ? 26 : 18),
    w: isEnemy ? 18 : 16,
    h: isEnemy ? 26 : 18,
    frame: 0, timer: 0,
  });
}

/* ---------- reset ---------- */
function resetGame() {
  run.dist = 0;
  obstacles.length = 0;
  particles.length = 0;
  slashArcs.length = 0;
  spawner.timer = 0.8;
  player.y = GROUND_Y - player.h;
  player.vy = 0;
  player.grounded = true;
  player.slashTimer = 0;
  player.slashCooldown = 0;
  player.runFrame = 0;
  player.trailX.length = 0;
  player.trailY.length = 0;
  screenShake.trauma = 0;
  state = "ready";
  stateEl.textContent = "Click to start";
}

function startGame() {
  if (state === "ready") { state = "playing"; stateEl.textContent = ""; }
}

function gameOver() {
  state = "gameover";
  stateEl.textContent = "Game Over — R to restart";
  spawnDeathExplosion(player.x + player.w / 2, player.y + player.h / 2);
}

/* ---------- input ---------- */
function handleJump() {
  if (state === "ready") startGame();
  if (state !== "playing") return;
  if (player.grounded) {
    player.vy = physics.jumpVel;
    player.grounded = false;
    spawnJumpBurst(player.x + player.w / 2, player.y + player.h);
  }
}

function handleSlash() {
  if (state === "ready") startGame();
  if (state !== "playing") return;
  if (player.slashCooldown <= 0) {
    player.slashTimer = 0.2;
    player.slashCooldown = 0.35;
    spawnSlashArc();
    spawnSlashSparks(player.x + player.w + 10, player.y + player.h * 0.4);
    screenShake.trauma = Math.min(screenShake.trauma + 0.15, 0.6);
  }
}

/* ---------- collision ---------- */
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getSlashBox() {
  return { x: player.x + player.w, y: player.y + 2, w: 26, h: 22 };
}

/* ---------- update ---------- */
function update(dt) {
  globalTime += dt;

  // decay screen shake
  screenShake.trauma = Math.max(0, screenShake.trauma - dt * 2.5);
  const shake = screenShake.trauma * screenShake.trauma;
  screenShake.x = (Math.random() * 2 - 1) * shake * 5;
  screenShake.y = (Math.random() * 2 - 1) * shake * 5;

  // particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 200 * dt; // gravity on sparks
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // slash arcs
  for (let i = slashArcs.length - 1; i >= 0; i--) {
    slashArcs[i].life -= dt;
    if (slashArcs[i].life <= 0) slashArcs.splice(i, 1);
  }

  if (state !== "playing") return;

  const speed = getSpeed();
  run.dist += speed * dt;

  // spawner
  spawner.timer -= dt;
  if (spawner.timer <= 0) {
    spawnObstacle();
    spawner.timer = Math.max(0.35, 1.0 - (speed - run.base) * 0.003);
  }

  // player physics
  player.vy += physics.gravity * dt;
  player.y += player.vy * dt;
  if (player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.grounded = true;
  }

  // run animation
  player.runAccum += dt * (speed / run.base);
  if (player.runAccum > 0.1) {
    player.runAccum = 0;
    player.runFrame = (player.runFrame + 1) % 4;
    if (player.grounded) spawnDust(player.x, player.y + player.h);
  }

  // player trail
  player.trailX.push(player.x + player.w / 2);
  player.trailY.push(player.y + player.h / 2);
  if (player.trailX.length > 8) { player.trailX.shift(); player.trailY.shift(); }

  // slash timers
  if (player.slashTimer > 0) player.slashTimer = Math.max(0, player.slashTimer - dt);
  if (player.slashCooldown > 0) player.slashCooldown -= dt;

  // obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].x -= speed * dt;
    obstacles[i].timer += dt;
    if (obstacles[i].timer > 0.15) { obstacles[i].timer = 0; obstacles[i].frame = (obstacles[i].frame + 1) % 2; }
    if (obstacles[i].x + obstacles[i].w < -10) obstacles.splice(i, 1);
  }

  // collisions
  const pBox = { x: player.x + 2, y: player.y + 2, w: player.w - 4, h: player.h - 2 };
  const slashing = player.slashTimer > 0;
  const sBox = slashing ? getSlashBox() : null;

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    if (slashing && o.type === "enemy" && rectsOverlap(sBox, o)) {
      spawnKillExplosion(o.x + o.w / 2, o.y + o.h / 2);
      obstacles.splice(i, 1);
      continue;
    }
    if (rectsOverlap(pBox, o)) { gameOver(); break; }
  }

  scoreEl.textContent = Math.floor(run.dist / 10);
}

/* ====================================================
   DRAW — all the juicy visuals
   ==================================================== */

function drawGradientSky() {
  // shift sky color based on speed
  const t = clamp((getSpeed() - run.base) / (run.max - run.base), 0, 1);
  const topR = lerp(PAL.skyTop[0], 30, t);
  const topG = lerp(PAL.skyTop[1], 5, t);
  const topB = lerp(PAL.skyTop[2], 40, t);
  const botR = lerp(PAL.skyBot[0], 40, t);
  const botG = lerp(PAL.skyBot[1], 8, t);
  const botB = lerp(PAL.skyBot[2], 60, t);

  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, rgba(topR, topG, topB, 1));
  grad.addColorStop(1, rgba(botR, botG, botB, 1));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, GROUND_Y);
}

function drawStars() {
  for (const s of stars) {
    const twinkle = Math.sin(globalTime * 3 + s.twinkle) * 0.5 + 0.5;
    ctx.globalAlpha = twinkle * 0.7 + 0.2;
    ctx.fillStyle = PAL.stars;
    const sx = (s.x - (run.dist * s.speed) % W + W) % W;
    ctx.fillRect(Math.floor(sx), Math.floor(s.y), Math.ceil(s.s), Math.ceil(s.s));
  }
  ctx.globalAlpha = 1;
}

function drawMoon() {
  const mx = W - 45, my = 28;
  ctx.fillStyle = "#22204a";
  ctx.beginPath(); ctx.arc(mx, my, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ddd8f0";
  ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill();
  // glow
  const glow = ctx.createRadialGradient(mx, my, 6, mx, my, 40);
  glow.addColorStop(0, "rgba(200, 190, 255, 0.15)");
  glow.addColorStop(1, "rgba(200, 190, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(mx, my, 40, 0, Math.PI * 2); ctx.fill();
}

function drawCityLayer(layer, parallax, color, windowColor) {
  const offset = (run.dist * parallax) % (W + 80);
  ctx.fillStyle = color;
  for (const b of layer) {
    const bx = Math.floor(((b.x - offset) % (W + 80) + W + 80) % (W + 80) - 40);
    const by = GROUND_Y - b.h;
    ctx.fillRect(bx, by, b.w, b.h);
    if (b.windows) {
      const wc = hexToRgb(windowColor);
      for (let wy = by + 3; wy < GROUND_Y - 4; wy += 5) {
        for (let wx = bx + 2; wx < bx + b.w - 2; wx += 4) {
          const on = Math.sin(wx * 13 + wy * 7 + globalTime) > 0.2;
          ctx.fillStyle = on ? rgba(wc[0], wc[1], wc[2], 0.6) : rgba(wc[0], wc[1], wc[2], 0.1);
          ctx.fillRect(wx, wy, 2, 3);
        }
      }
      ctx.fillStyle = color;
    }
  }
}

function drawGround() {
  ctx.fillStyle = PAL.ground;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // neon ground line
  const t = Math.sin(globalTime * 2) * 0.3 + 0.7;
  const blue = hexToRgb(PAL.neonBlue);
  ctx.fillStyle = rgba(blue[0], blue[1], blue[2], t * 0.7);
  ctx.fillRect(0, GROUND_Y, W, 1);

  // grid lines on ground
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = PAL.neonPurple;
  ctx.lineWidth = 0.5;
  const gridOff = (run.dist * 0.5) % 16;
  for (let x = -gridOff; x < W; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = GROUND_Y + 6; y < H; y += 6) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* --- pixel character drawing --- */
function drawPixelRunner() {
  const px = Math.floor(player.x), py = Math.floor(player.y);
  const slashing = player.slashTimer > 0;

  // afterimage trail
  for (let i = 0; i < player.trailX.length; i++) {
    const alpha = (i / player.trailX.length) * 0.25;
    const c = hexToRgb(PAL.neonBlue);
    ctx.fillStyle = rgba(c[0], c[1], c[2], alpha);
    ctx.fillRect(Math.floor(player.trailX[i]) - 3, Math.floor(player.trailY[i]) - 5, 8, 12);
  }

  // body
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(px + 2, py + 2, 10, 14);

  // cape / coat tail
  const capeOff = player.grounded ? (player.runFrame % 2 === 0 ? 0 : 1) : -1;
  ctx.fillStyle = PAL.neonPurple;
  ctx.fillRect(px, py + 4 + capeOff, 3, 12);
  ctx.fillRect(px - 1, py + 8 + capeOff, 2, 10);

  // legs (animated)
  ctx.fillStyle = "#2a2848";
  if (player.grounded) {
    const f = player.runFrame;
    if (f === 0 || f === 2) {
      ctx.fillRect(px + 3, py + 16, 3, 6);
      ctx.fillRect(px + 8, py + 16, 3, 6);
    } else if (f === 1) {
      ctx.fillRect(px + 2, py + 16, 3, 5);
      ctx.fillRect(px + 9, py + 15, 3, 6);
    } else {
      ctx.fillRect(px + 3, py + 15, 3, 6);
      ctx.fillRect(px + 8, py + 16, 3, 5);
    }
  } else {
    // airborne legs tucked
    ctx.fillRect(px + 3, py + 14, 3, 6);
    ctx.fillRect(px + 8, py + 13, 3, 6);
  }

  // head
  ctx.fillStyle = "#e0dce8";
  ctx.fillRect(px + 4, py, 8, 8);
  // eyes
  ctx.fillStyle = slashing ? PAL.neonPink : PAL.neonBlue;
  ctx.fillRect(px + 8, py + 2, 2, 2);
  ctx.fillRect(px + 8, py + 5, 2, 1);
  // hair
  ctx.fillStyle = "#2d1b4e";
  ctx.fillRect(px + 3, py - 1, 9, 3);
  ctx.fillRect(px + 2, py, 2, 4);

  // arm / sword
  if (slashing) {
    const progress = 1 - player.slashTimer / 0.2;
    // sword blade
    ctx.fillStyle = PAL.neonPink;
    ctx.fillRect(px + 12, py + 4, 14, 2);
    ctx.fillRect(px + 12, py + 2, 2, 6);
    // glow
    ctx.globalAlpha = 0.4 * (1 - progress);
    ctx.fillStyle = PAL.neonPink;
    ctx.fillRect(px + 12, py, 16, 10);
    ctx.globalAlpha = 1;
  } else {
    // held sword pointing forward
    ctx.fillStyle = "#8888aa";
    ctx.fillRect(px + 11, py + 6, 6, 1);
    ctx.fillRect(px + 15, py + 4, 1, 4);
  }

  // player glow
  const glowC = slashing ? PAL.neonPink : PAL.neonBlue;
  const gc = hexToRgb(glowC);
  const glowGrad = ctx.createRadialGradient(px + 7, py + 10, 2, px + 7, py + 10, 20);
  glowGrad.addColorStop(0, rgba(gc[0], gc[1], gc[2], 0.15));
  glowGrad.addColorStop(1, rgba(gc[0], gc[1], gc[2], 0));
  ctx.fillStyle = glowGrad;
  ctx.fillRect(px - 15, py - 12, 44, 44);
}

/* --- obstacle drawing --- */
function drawPixelEnemy(o) {
  const ox = Math.floor(o.x), oy = Math.floor(o.y);

  // enemy glow
  const gc = hexToRgb(PAL.neonPink);
  const eg = ctx.createRadialGradient(ox + 7, oy + 10, 2, ox + 7, oy + 10, 18);
  eg.addColorStop(0, rgba(gc[0], gc[1], gc[2], 0.12));
  eg.addColorStop(1, rgba(gc[0], gc[1], gc[2], 0));
  ctx.fillStyle = eg;
  ctx.fillRect(ox - 12, oy - 8, 38, 36);

  // body
  ctx.fillStyle = "#2d1640";
  ctx.fillRect(ox + 1, oy + 2, 12, 14);

  // legs
  ctx.fillStyle = "#1a0e2a";
  const lf = o.frame;
  if (lf === 0) {
    ctx.fillRect(ox + 2, oy + 16, 3, 4);
    ctx.fillRect(ox + 9, oy + 16, 3, 4);
  } else {
    ctx.fillRect(ox + 1, oy + 15, 3, 5);
    ctx.fillRect(ox + 10, oy + 16, 3, 4);
  }

  // head
  ctx.fillStyle = "#3b2060";
  ctx.fillRect(ox + 2, oy - 2, 10, 6);

  // menacing eyes
  const eyeFlicker = Math.sin(globalTime * 8 + o.x) > 0 ? 1 : 0.6;
  ctx.globalAlpha = eyeFlicker;
  ctx.fillStyle = PAL.neonPink;
  ctx.fillRect(ox + 4, oy, 2, 2);
  ctx.fillRect(ox + 8, oy, 2, 2);
  ctx.globalAlpha = 1;

  // weapon
  ctx.fillStyle = "#aa3355";
  ctx.fillRect(ox - 2, oy + 4, 4, 1);
  ctx.fillRect(ox - 3, oy + 2, 1, 5);
}

function drawPixelSpike(o) {
  const ox = Math.floor(o.x), oy = Math.floor(o.y);

  // spike glow
  const gc = hexToRgb(PAL.neonOrange);
  const sg = ctx.createRadialGradient(ox + 6, oy + 7, 1, ox + 6, oy + 7, 14);
  sg.addColorStop(0, rgba(gc[0], gc[1], gc[2], 0.15));
  sg.addColorStop(1, rgba(gc[0], gc[1], gc[2], 0));
  ctx.fillStyle = sg;
  ctx.fillRect(ox - 8, oy - 8, 28, 28);

  // base
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(ox, oy + 8, 12, 6);

  // spikes
  ctx.fillStyle = PAL.neonOrange;
  ctx.fillRect(ox + 1, oy + 4, 2, 6);
  ctx.fillRect(ox + 5, oy, 2, 10);
  ctx.fillRect(ox + 9, oy + 3, 2, 7);

  // tips glow
  const tip = Math.sin(globalTime * 6 + ox) * 0.3 + 0.7;
  ctx.globalAlpha = tip;
  ctx.fillStyle = "#ffcc44";
  ctx.fillRect(ox + 5, oy - 1, 2, 2);
  ctx.fillRect(ox + 1, oy + 3, 2, 2);
  ctx.fillRect(ox + 9, oy + 2, 2, 2);
  ctx.globalAlpha = 1;
}

/* --- slash arc --- */
function drawSlashArcs() {
  for (const arc of slashArcs) {
    const progress = 1 - arc.life / arc.maxLife;
    const alpha = (1 - progress) * 0.8;

    ctx.save();
    ctx.translate(arc.x, arc.y);
    ctx.rotate(-0.3 + progress * 1.2);

    // arc sweep
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = PAL.neonPink;
    ctx.lineWidth = 3 - progress * 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10 + progress * 12, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();

    // inner bright arc
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 8 + progress * 10, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/* --- particles --- */
function drawParticles() {
  for (const p of particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    const c = hexToRgb(p.color);
    ctx.fillStyle = rgba(c[0], c[1], c[2], alpha);
    const sz = p.size * alpha;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(sz), Math.ceil(sz));

    // bright core
    ctx.fillStyle = rgba(255, 255, 255, alpha * 0.5);
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
  }
}

/* --- speed lines --- */
function drawSpeedLines() {
  const speed = getSpeed();
  const intensity = clamp((speed - run.base) / (run.max - run.base), 0, 1);
  if (intensity < 0.1) return;

  ctx.globalAlpha = intensity * 0.25;
  ctx.strokeStyle = PAL.neonBlue;
  ctx.lineWidth = 0.5;
  const count = Math.floor(intensity * 12) + 2;
  for (let i = 0; i < count; i++) {
    const y = ((globalTime * 80 + i * 37) % GROUND_Y);
    const x1 = ((globalTime * 200 + i * 73) % (W + 40)) - 20;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x1 - 15 - intensity * 20, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* --- HUD overlay in canvas --- */
function drawCanvasHUD() {
  // speed indicator bar at top
  const speed = getSpeed();
  const pct = clamp((speed - run.base) / (run.max - run.base), 0, 1);
  const barW = W - 20;

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#111";
  ctx.fillRect(10, 4, barW, 3);
  ctx.globalAlpha = 0.8;

  const barGrad = ctx.createLinearGradient(10, 0, 10 + barW * pct, 0);
  barGrad.addColorStop(0, PAL.neonBlue);
  barGrad.addColorStop(0.5, PAL.neonPurple);
  barGrad.addColorStop(1, PAL.neonPink);
  ctx.fillStyle = barGrad;
  ctx.fillRect(10, 4, barW * pct, 3);
  ctx.globalAlpha = 1;

  // game over flash
  if (state === "gameover") {
    const flash = Math.sin(globalTime * 4) * 0.1 + 0.15;
    ctx.fillStyle = rgba(255, 62, 108, flash);
    ctx.fillRect(0, 0, W, H);
  }

  // ready screen
  if (state === "ready") {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, W, H);
    const pulse = Math.sin(globalTime * 3) * 0.2 + 0.8;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PAL.neonBlue;
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("PRESS SPACE OR CLICK", W / 2, H / 2 - 6);
    ctx.fillStyle = PAL.neonPink;
    ctx.font = "5px 'Press Start 2P', monospace";
    ctx.fillText("JUMP + SLASH TO SURVIVE", W / 2, H / 2 + 8);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }
}

/* ---------- main draw ---------- */
function draw() {
  ctx.save();
  ctx.translate(Math.floor(screenShake.x), Math.floor(screenShake.y));

  drawGradientSky();
  drawStars();
  drawMoon();
  drawCityLayer(cityBack, 0.08, PAL.city1, PAL.neonBlue);
  drawCityLayer(cityFront, 0.15, PAL.city2, PAL.neonPurple);
  drawGround();
  drawSpeedLines();

  obstacles.forEach(o => o.type === "enemy" ? drawPixelEnemy(o) : drawPixelSpike(o));
  drawPixelRunner();
  drawSlashArcs();
  drawParticles();
  drawCanvasHUD();

  ctx.restore();
}

/* ---------- loop ---------- */
function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(0.033, (timestamp - lastTime) / 1000);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

/* ---------- input ---------- */
window.addEventListener("keydown", e => {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    e.preventDefault();
    handleJump();
  }
  if (e.code === "KeyX") handleSlash();
  if (e.code === "KeyR") resetGame();
});

canvas.addEventListener("mousedown", () => handleSlash());
canvas.addEventListener("touchstart", e => { e.preventDefault(); handleSlash(); });
canvas.addEventListener("click", () => { if (state === "ready") startGame(); });

/* ---------- boot ---------- */
resetGame();
requestAnimationFrame(loop);
