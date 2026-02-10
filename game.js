/* ===== GAME LOGIC, LOOP & INPUT ===== */
/* Depends on: config.js, utils.js, particles.js, renderer.js */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const stateEl = document.getElementById("state");

ctx.imageSmoothingEnabled = false;

/* ---------- game state ---------- */
let lastTime = 0, state = "ready", globalTime = 0;

const player = {
  x: 50, y: GROUND_Y - 48, w: 32, h: 48,
  vy: 0, grounded: true,
  slashTimer: 0, slashCooldown: 0,
  runFrame: 0, runAccum: 0,
  trailX: [], trailY: [],
};

const spawner = { timer: 0 };
const obstacles = [];

/* ---------- spawner ---------- */
function spawnObstacle() {
  const roll = Math.random();
  const isEnemy = roll > 0.4;
  obstacles.push({
    type: isEnemy ? "enemy" : "spike",
    x: W + 20,
    y: GROUND_Y - (isEnemy ? 44 : 30),
    w: isEnemy ? 28 : 24,
    h: isEnemy ? 44 : 30,
    frame: 0, timer: 0,
  });
}

/* ---------- reset / state ---------- */
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

/* ---------- input handlers ---------- */
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
function getSlashBox() {
  return { x: player.x + player.w, y: player.y + 4, w: 36, h: 32 };
}

/* ---------- update ---------- */
function update(dt) {
  globalTime += dt;

  updateScreenShake(dt);
  updateParticles(dt);
  updateSlashArcs(dt);

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

/* ---------- game loop ---------- */
function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(0.033, (timestamp - lastTime) / 1000);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

/* ---------- input bindings ---------- */
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
