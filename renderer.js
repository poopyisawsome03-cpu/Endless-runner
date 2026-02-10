/* ===== ALL DRAWING / RENDERING ===== */

/* ---------- background data ---------- */
const stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * W,
  y: Math.random() * (GROUND_Y - 20),
  s: Math.random() * 1.5 + 0.5,
  twinkle: Math.random() * Math.PI * 2,
  speed: Math.random() * 0.3 + 0.1,
}));

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

/* ---------- sky ---------- */
function drawGradientSky() {
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

/* ---------- stars ---------- */
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

/* ---------- moon ---------- */
function drawMoon() {
  const mx = W - 45, my = 28;
  ctx.fillStyle = "#22204a";
  ctx.beginPath(); ctx.arc(mx, my, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ddd8f0";
  ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill();
  const glow = ctx.createRadialGradient(mx, my, 6, mx, my, 40);
  glow.addColorStop(0, "rgba(200, 190, 255, 0.15)");
  glow.addColorStop(1, "rgba(200, 190, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(mx, my, 40, 0, Math.PI * 2); ctx.fill();
}

/* ---------- city layers ---------- */
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

/* ---------- ground ---------- */
function drawGround() {
  ctx.fillStyle = PAL.ground;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  const t = Math.sin(globalTime * 2) * 0.3 + 0.7;
  const blue = hexToRgb(PAL.neonBlue);
  ctx.fillStyle = rgba(blue[0], blue[1], blue[2], t * 0.7);
  ctx.fillRect(0, GROUND_Y, W, 1);

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

/* ---------- player sprite ---------- */
function drawPixelRunner() {
  const px = Math.floor(player.x), py = Math.floor(player.y);
  const slashing = player.slashTimer > 0;

  // afterimage trail
  for (let i = 0; i < player.trailX.length; i++) {
    const alpha = (i / player.trailX.length) * 0.25;
    const c = hexToRgb(PAL.neonBlue);
    ctx.fillStyle = rgba(c[0], c[1], c[2], alpha);
    ctx.fillRect(Math.floor(player.trailX[i]) - 6, Math.floor(player.trailY[i]) - 10, 16, 24);
  }

  // body
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(px + 4, py + 14, 20, 20);

  // cape / coat tail
  const capeOff = player.grounded ? (player.runFrame % 2 === 0 ? 0 : 2) : -2;
  ctx.fillStyle = PAL.neonPurple;
  ctx.fillRect(px, py + 10 + capeOff, 5, 22);
  ctx.fillRect(px - 2, py + 18 + capeOff, 4, 18);

  // legs (animated)
  ctx.fillStyle = "#2a2848";
  if (player.grounded) {
    const f = player.runFrame;
    if (f === 0 || f === 2) {
      ctx.fillRect(px + 6, py + 34, 6, 14);
      ctx.fillRect(px + 18, py + 34, 6, 14);
    } else if (f === 1) {
      ctx.fillRect(px + 4, py + 34, 6, 12);
      ctx.fillRect(px + 20, py + 32, 6, 14);
    } else {
      ctx.fillRect(px + 6, py + 32, 6, 14);
      ctx.fillRect(px + 18, py + 34, 6, 12);
    }
  } else {
    ctx.fillRect(px + 6, py + 30, 6, 14);
    ctx.fillRect(px + 18, py + 28, 6, 14);
  }

  // boots
  ctx.fillStyle = "#1a0e2a";
  if (player.grounded) {
    ctx.fillRect(px + 5, py + 44, 8, 4);
    ctx.fillRect(px + 17, py + 44, 8, 4);
  }

  // head
  ctx.fillStyle = "#e0dce8";
  ctx.fillRect(px + 6, py, 18, 14);
  // eyes
  ctx.fillStyle = slashing ? PAL.neonPink : PAL.neonBlue;
  ctx.fillRect(px + 16, py + 4, 4, 4);
  ctx.fillRect(px + 16, py + 10, 4, 2);
  // hair
  ctx.fillStyle = "#2d1b4e";
  ctx.fillRect(px + 4, py - 2, 20, 6);
  ctx.fillRect(px + 2, py, 4, 8);
  // bandana
  ctx.fillStyle = PAL.neonPink;
  ctx.fillRect(px + 6, py + 6, 18, 2);
  ctx.fillRect(px - 2, py + 6, 6, 2);
  ctx.fillRect(px - 4, py + 8, 4, 2);

  // arm / sword
  if (slashing) {
    const progress = 1 - player.slashTimer / 0.2;
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(px + 24, py + 14, 6, 4);
    ctx.fillStyle = PAL.neonPink;
    ctx.fillRect(px + 26, py + 8, 22, 3);
    ctx.fillRect(px + 26, py + 6, 3, 10);
    ctx.fillStyle = "#fff";
    ctx.fillRect(px + 46, py + 8, 4, 3);
    ctx.globalAlpha = 0.4 * (1 - progress);
    ctx.fillStyle = PAL.neonPink;
    ctx.fillRect(px + 24, py + 2, 28, 18);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(px + 22, py + 16, 4, 6);
    ctx.fillStyle = "#8888aa";
    ctx.fillRect(px + 22, py + 12, 10, 2);
    ctx.fillRect(px + 30, py + 10, 2, 6);
  }

  // player glow
  const glowC = slashing ? PAL.neonPink : PAL.neonBlue;
  const gc = hexToRgb(glowC);
  const glowGrad = ctx.createRadialGradient(px + 16, py + 24, 4, px + 16, py + 24, 36);
  glowGrad.addColorStop(0, rgba(gc[0], gc[1], gc[2], 0.18));
  glowGrad.addColorStop(1, rgba(gc[0], gc[1], gc[2], 0));
  ctx.fillStyle = glowGrad;
  ctx.fillRect(px - 22, py - 14, 72, 72);
}

/* ---------- enemy sprite ---------- */
function drawPixelEnemy(o) {
  const ox = Math.floor(o.x), oy = Math.floor(o.y);

  const gc = hexToRgb(PAL.neonPink);
  const eg = ctx.createRadialGradient(ox + 14, oy + 22, 4, ox + 14, oy + 22, 32);
  eg.addColorStop(0, rgba(gc[0], gc[1], gc[2], 0.14));
  eg.addColorStop(1, rgba(gc[0], gc[1], gc[2], 0));
  ctx.fillStyle = eg;
  ctx.fillRect(ox - 18, oy - 12, 64, 68);

  ctx.fillStyle = "#2d1640";
  ctx.fillRect(ox + 2, oy + 10, 24, 20);

  ctx.fillStyle = "#3b2060";
  ctx.fillRect(ox + 4, oy + 12, 20, 4);
  ctx.fillRect(ox + 6, oy + 24, 16, 3);

  ctx.fillStyle = "#1a0e2a";
  const lf = o.frame;
  if (lf === 0) {
    ctx.fillRect(ox + 4, oy + 30, 6, 10);
    ctx.fillRect(ox + 18, oy + 30, 6, 10);
  } else {
    ctx.fillRect(ox + 2, oy + 28, 6, 12);
    ctx.fillRect(ox + 20, oy + 30, 6, 10);
  }

  ctx.fillStyle = "#2d1640";
  ctx.fillRect(ox + 3, oy + 38, 8, 6);
  ctx.fillRect(ox + 17, oy + 38, 8, 6);

  ctx.fillStyle = "#3b2060";
  ctx.fillRect(ox + 4, oy - 2, 20, 12);
  ctx.fillStyle = PAL.neonPink;
  ctx.fillRect(ox + 2, oy - 6, 3, 6);
  ctx.fillRect(ox + 23, oy - 6, 3, 6);

  const eyeFlicker = Math.sin(globalTime * 8 + o.x) > 0 ? 1 : 0.6;
  ctx.globalAlpha = eyeFlicker;
  ctx.fillStyle = PAL.neonPink;
  ctx.fillRect(ox + 7, oy + 2, 4, 4);
  ctx.fillRect(ox + 17, oy + 2, 4, 4);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#aa3355";
  ctx.fillRect(ox - 4, oy + 10, 6, 2);
  ctx.fillRect(ox - 6, oy + 6, 2, 10);
  ctx.fillStyle = PAL.neonPink;
  ctx.fillRect(ox - 6, oy + 4, 2, 4);
}

/* ---------- spike sprite ---------- */
function drawPixelSpike(o) {
  const ox = Math.floor(o.x), oy = Math.floor(o.y);

  const gc = hexToRgb(PAL.neonOrange);
  const sg = ctx.createRadialGradient(ox + 12, oy + 15, 2, ox + 12, oy + 15, 26);
  sg.addColorStop(0, rgba(gc[0], gc[1], gc[2], 0.18));
  sg.addColorStop(1, rgba(gc[0], gc[1], gc[2], 0));
  ctx.fillStyle = sg;
  ctx.fillRect(ox - 14, oy - 14, 52, 52);

  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(ox, oy + 18, 24, 12);
  ctx.fillStyle = "#3a2a16";
  ctx.fillRect(ox + 2, oy + 16, 20, 4);

  ctx.fillStyle = PAL.neonOrange;
  ctx.fillRect(ox + 1, oy + 8, 4, 12);
  ctx.fillRect(ox + 7, oy + 2, 4, 18);
  ctx.fillRect(ox + 13, oy + 5, 4, 15);
  ctx.fillRect(ox + 19, oy + 8, 4, 12);

  ctx.fillStyle = "#ffdd55";
  ctx.fillRect(ox + 1, oy + 6, 4, 4);
  ctx.fillRect(ox + 7, oy, 4, 4);
  ctx.fillRect(ox + 13, oy + 3, 4, 4);
  ctx.fillRect(ox + 19, oy + 6, 4, 4);

  const tip = Math.sin(globalTime * 6 + ox) * 0.3 + 0.7;
  ctx.globalAlpha = tip;
  ctx.fillStyle = "#ffcc44";
  ctx.fillRect(ox + 8, oy - 2, 3, 3);
  ctx.fillRect(ox + 2, oy + 5, 3, 3);
  ctx.fillRect(ox + 14, oy + 2, 3, 3);
  ctx.fillRect(ox + 20, oy + 5, 3, 3);
  ctx.globalAlpha = 1;
}

/* ---------- slash arcs ---------- */
function drawSlashArcs() {
  for (const arc of slashArcs) {
    const progress = 1 - arc.life / arc.maxLife;
    const alpha = (1 - progress) * 0.8;

    ctx.save();
    ctx.translate(arc.x, arc.y);
    ctx.rotate(-0.3 + progress * 1.2);

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = PAL.neonPink;
    ctx.lineWidth = 3 - progress * 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10 + progress * 12, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 8 + progress * 10, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/* ---------- particles ---------- */
function drawParticles() {
  for (const p of particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    const c = hexToRgb(p.color);
    ctx.fillStyle = rgba(c[0], c[1], c[2], alpha);
    const sz = p.size * alpha;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(sz), Math.ceil(sz));

    ctx.fillStyle = rgba(255, 255, 255, alpha * 0.5);
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
  }
}

/* ---------- speed lines ---------- */
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

/* ---------- HUD overlay ---------- */
function drawCanvasHUD() {
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

  if (state === "gameover") {
    const flash = Math.sin(globalTime * 4) * 0.1 + 0.15;
    ctx.fillStyle = rgba(255, 62, 108, flash);
    ctx.fillRect(0, 0, W, H);
  }

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
