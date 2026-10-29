import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Minimal pure-Node script to generate valid PNG icon files without external native dependencies
function createPng(width, height, drawFn) {
  // RGBA buffer
  const stride = width * 4;
  const rawData = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (stride + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([139, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crcVal = crc32(typeAndData);
  chunk.writeUInt32BE(crcVal, 8 + len);
  return chunk;
}

// Icon drawer: cute cargo ship with colorful stacked containers on sky blue backdrop
function drawPortIcon(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;

  // Background: Vibrant sea sky gradient
  const bgR = Math.round(56 + (14 - 56) * (ny * 0.4));
  const bgG = Math.round(189 + (165 - 189) * (ny * 0.4));
  const bgB = Math.round(248 + (233 - 248) * (ny * 0.4));

  // Ship hull
  // Hull bottom: y from 0.62 to 0.76, shaped like cargo boat
  const inHullY = ny >= 0.60 && ny <= 0.78;
  const hullLeft = 0.20 + (ny - 0.60) * 0.4;
  const hullRight = 0.80 - (ny - 0.60) * 0.2;
  const inHull = inHullY && nx >= hullLeft && nx <= hullRight;

  // Ocean wave at bottom
  const inOcean = ny > 0.75 + Math.sin(nx * 12) * 0.02;

  // Cargo boxes (3 columns x 2 rows)
  let inBoxColor = null;
  const boxTop = 0.38;
  const boxBottom = 0.60;
  if (ny >= boxTop && ny <= boxBottom && nx >= 0.26 && nx <= 0.74) {
    const col = Math.floor((nx - 0.26) / 0.16);
    const row = Math.floor((ny - boxTop) / 0.11);
    const localX = (nx - 0.26) % 0.16;
    const localY = (ny - boxTop) % 0.11;
    if (localX > 0.015 && localX < 0.145 && localY > 0.015 && localY < 0.095) {
      if (col === 0 && row === 0) inBoxColor = [239, 68, 68]; // Red
      else if (col === 1 && row === 0) inBoxColor = [245, 158, 11]; // Amber
      else if (col === 2 && row === 0) inBoxColor = [16, 185, 129]; // Emerald
      else if (col === 0 && row === 1) inBoxColor = [59, 130, 246]; // Blue
      else if (col === 1 && row === 1) inBoxColor = [168, 85, 247]; // Purple
      else inBoxColor = [236, 72, 153]; // Pink
    }
  }

  // Crane cabin / arm
  const inCraneArm = ny >= 0.22 && ny <= 0.26 && nx >= 0.30 && nx <= 0.82;
  const inCranePillar = ny >= 0.22 && ny <= 0.55 && nx >= 0.76 && nx <= 0.82;

  if (inOcean) {
    return [37, 99, 235, 255]; // Deep rich blue ocean
  }
  if (inCraneArm || inCranePillar) {
    return [251, 191, 36, 255]; // Bright yellow crane
  }
  if (inBoxColor) {
    return [...inBoxColor, 255];
  }
  if (inHull) {
    return [30, 41, 59, 255]; // Sleek navy vessel hull
  }

  // Sun
  const dx = nx - 0.25;
  const dy = ny - 0.25;
  if (dx * dx + dy * dy < 0.014) {
    return [253, 224, 71, 255]; // Yellow sun
  }

  return [bgR, bgG, bgB, 255];
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Generate PNGs
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), createPng(192, 192, (x, y, w, h) => drawPortIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), createPng(512, 512, (x, y, w, h) => drawPortIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), createPng(512, 512, (x, y, w, h) => drawPortIcon(x, y, w, h, true)));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPng(180, 180, (x, y, w, h) => drawPortIcon(x, y, w, h, false)));

// SVG Icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="60%" stop-color="#bae6fd" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#sky)" />
  <circle cx="120" cy="120" r="48" fill="#fde047" />
  
  <!-- Clouds -->
  <path d="M180 150 a25 25 0 0 1 40 -10 a35 35 0 0 1 60 5 a25 25 0 0 1 20 25 l-120 0 z" fill="#ffffff" opacity="0.85" />
  <path d="M340 120 a20 20 0 0 1 32 -8 a28 28 0 0 1 48 4 a20 20 0 0 1 16 20 l-96 0 z" fill="#ffffff" opacity="0.75" />

  <!-- Harbor Crane -->
  <rect x="390" y="120" width="28" height="190" rx="6" fill="#f59e0b" />
  <rect x="170" y="120" width="250" height="22" rx="5" fill="#f59e0b" />
  <line x1="280" y1="142" x2="280" y2="200" stroke="#475569" stroke-width="6" />
  <rect x="264" y="200" width="32" height="24" rx="4" fill="#ef4444" />

  <!-- Cargo Containers on Ship -->
  <rect x="140" y="220" width="60" height="42" rx="6" fill="#ef4444" />
  <rect x="206" y="220" width="60" height="42" rx="6" fill="#10b981" />
  <rect x="140" y="268" width="60" height="42" rx="6" fill="#3b82f6" />
  <rect x="206" y="268" width="60" height="42" rx="6" fill="#f59e0b" />
  <rect x="272" y="268" width="60" height="42" rx="6" fill="#a855f7" />

  <!-- Ship Hull -->
  <path d="M90 310 L370 310 L340 380 L140 380 Z" fill="#1e293b" />
  <rect x="100" y="295" width="260" height="15" rx="4" fill="#e11d48" />

  <!-- Sea Water -->
  <path d="M0 370 Q128 355 256 370 T512 370 L512 512 L0 512 Z" fill="url(#sea)" />
  <path d="M0 420 Q128 405 256 420 T512 420 L512 512 L0 512 Z" fill="#0284c7" opacity="0.4" />

  <!-- Math Emblem Badge -->
  <circle cx="430" cy="430" r="54" fill="#fbbf24" stroke="#ffffff" stroke-width="8" />
  <text x="430" y="445" font-family="Arial, sans-serif" font-size="44" font-weight="900" fill="#1e293b" text-anchor="middle">×</text>
</svg>`;

fs.writeFileSync(path.join(outDir, 'icon.svg'), svg);
console.log('Icons generated successfully!');
