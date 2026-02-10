/* ===== CONSTANTS & PALETTE ===== */

const W = 480, H = 270, GROUND_Y = 230;

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

const physics = { gravity: 1800, jumpVel: -620 };
const run     = { base: 130, scale: 0.03, max: 400, dist: 0 };
