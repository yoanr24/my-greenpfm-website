// scripts/compute-donor-positions.js
// Computes donor chip positions sitting on Rwanda's border.
// Run: node scripts/compute-donor-positions.js
'use strict';

const fs   = require('fs');
const path = require('path');

const pathData = fs.readFileSync(path.join(__dirname, '..', 'data', 'rwanda-path.js'), 'utf8');
const match    = pathData.match(/window\.__RWANDA_PATH = "([^"]+)"/);
if (!match) { console.error('Could not parse rwanda-path.js'); process.exit(1); }

// Parse M x y L x y ... into polygon point array
const points = [];
const re = /[ML]\s+([\d.]+)\s+([\d.]+)/g;
let m;
while ((m = re.exec(match[1])) !== null) {
  points.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
}
console.log('Polygon vertices:', points.length);

// Rwanda visual center
const CX = 419, CY = 265;

// Ray from (cx,cy) at angle hits polygon → return first intersection point
function rayBorder(cx, cy, angle) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let bestT = Infinity, best = null;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i], p2 = points[(i + 1) % points.length];
    const ex = p2.x - p1.x, ey = p2.y - p1.y;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-10) continue;
    const fx = p1.x - cx, fy = p1.y - cy;
    const t = (fx * ey - fy * ex) / denom;
    const s = (fx * dy - fy * dx) / denom;
    if (t > 1 && s >= -0.001 && s <= 1.001 && t < bestT) {
      bestT = t;
      best = { x: cx + t * dx, y: cy + t * dy };
    }
  }
  return best;
}

// Angles derived from original rough positions — preserves intended clock-face placement.
// angle = atan2(dy, dx) in SVG space (y increases downward).
const donors = [
  { id: 'AFD',        origX: 155, origY: 250 },
  { id: 'AfDB',       origX: 285, origY:  42 },
  { id: 'EIB',        origX: 405, origY:  33 },
  { id: 'GIZ',        origX: 530, origY:  42 },
  { id: 'LuxDev',     origX: 685, origY: 140 },
  { id: 'GGGI',       origX: 702, origY: 270 },
  { id: 'World Bank', origX: 685, origY: 395 },
  { id: 'IMF',        origX: 435, origY: 500 },
  { id: 'EU',         origX: 268, origY: 492 },
];

// Chip offset beyond border point (px). Chip radius = 28.
// OFFSET=30 → inner chip edge is 2px inside border (slight overlap — "standing on" effect).
const OFFSET = 30;

console.log('\nComputed border positions (chip center = border + direction * ' + OFFSET + 'px):\n');

donors.forEach(function (d) {
  const angle   = Math.atan2(d.origY - CY, d.origX - CX);
  const border  = rayBorder(CX, CY, angle);
  if (!border) {
    console.log('  { id: \'' + d.id + '\', *** NO INTERSECTION FOUND *** }');
    return;
  }
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const cx = Math.round(border.x + dx * OFFSET);
  const cy = Math.round(border.y + dy * OFFSET);
  // Keep x/y in reasonable bounds (don't go off-SVG)
  const x  = Math.max(28, Math.min(872, cx));
  const y  = Math.max(28, Math.min(512, cy));
  console.log(
    '  { id: \'' + d.id.padEnd(12) + '\', x: ' +
    String(x).padStart(3) + ', y: ' + String(y).padStart(3) +
    ', color: \'...\' },  // border=(' +
    Math.round(border.x) + ',' + Math.round(border.y) + ')  angle=' +
    Math.round(angle * 180 / Math.PI) + '°'
  );
});
