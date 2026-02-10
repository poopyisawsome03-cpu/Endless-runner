/* ===== PARTICLE & VFX SYSTEMS ===== */

const particles = [];
const slashArcs = [];
const screenShake = { x: 0, y: 0, trauma: 0 };

/* ---------- core spawn ---------- */
function spawnParticle(x, y, vx, vy, life, color, size) {
  particles.push({ x, y, vx, vy, life, maxLife: life, color, size });
}

/* ---------- particle effects ---------- */
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

/* ---------- update particles & shake ---------- */
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 200 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateSlashArcs(dt) {
  for (let i = slashArcs.length - 1; i >= 0; i--) {
    slashArcs[i].life -= dt;
    if (slashArcs[i].life <= 0) slashArcs.splice(i, 1);
  }
}

function updateScreenShake(dt) {
  screenShake.trauma = Math.max(0, screenShake.trauma - dt * 2.5);
  const shake = screenShake.trauma * screenShake.trauma;
  screenShake.x = (Math.random() * 2 - 1) * shake * 5;
  screenShake.y = (Math.random() * 2 - 1) * shake * 5;
}
