/**
 * Generate sample test images for ColorSnap
 * Uses pure Node.js with built-in zlib module (Zero npm dependencies)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SAMPLES_DIR = path.resolve(__dirname, '../assets/samples');

if (!fs.existsSync(SAMPLES_DIR)) {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcInput);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, pixelFn) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const rowStride = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowStride);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a !== undefined ? a : 255;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// 1. Forest Meadow Landscape PNG
console.log('Generating nature-meadow.png...');
const meadowPng = createPng(400, 300, (x, y, w, h) => {
  if (y < h * 0.4) {
    // Sky gradient: Azure blue (#38BDF8 to #E0F2FE)
    const t = y / (h * 0.4);
    return [
      Math.round(56 + t * 168),
      Math.round(189 + t * 53),
      Math.round(248 + t * 6),
      255
    ];
  } else if (y < h * 0.6) {
    // Distant mountain: Deep Navy / Slate (#1E293B)
    return [30, 41, 59, 255];
  } else if (y < h * 0.8) {
    // Forest canopy: Emerald (#15803D)
    return [21, 128, 61, 255];
  } else {
    // Meadow flowers: Golden Sun (#EAB308) and Lime (#65A30D)
    if ((x + y) % 20 < 4) {
      return [234, 179, 8, 255]; // Golden flower
    }
    return [101, 163, 13, 255]; // Meadow
  }
});
fs.writeFileSync(path.join(SAMPLES_DIR, 'nature-meadow.png'), meadowPng);

// 2. Transparent Badge PNG (Testing alpha channel transparency filtering!)
console.log('Generating transparent-badge.png...');
const badgePng = createPng(300, 300, (x, y, w, h) => {
  const dx = x - w / 2;
  const dy = y - h / 2;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Outside circle: 100% transparent (alpha = 0)
  if (dist > 120) {
    return [0, 0, 0, 0];
  }

  // Ring 1: Crimson Ruby (#DC2626)
  if (dist > 90) {
    return [220, 38, 38, 255];
  }

  // Ring 2: Tangerine Orange (#F97316)
  if (dist > 60) {
    return [249, 115, 22, 255];
  }

  // Ring 3: Amber Gold (#FBBF24)
  if (dist > 30) {
    return [251, 191, 36, 255];
  }

  // Center: Royal Indigo (#4F46E5)
  return [79, 70, 229, 255];
});
fs.writeFileSync(path.join(SAMPLES_DIR, 'transparent-badge.png'), badgePng);

// 3. Sunset Horizon JPEG-compatible or PNG
console.log('Generating sunset-horizon.png...');
const sunsetPng = createPng(400, 300, (x, y, w, h) => {
  const t = y / h;
  // Multi-stop dusk: #312E81 -> #BE185D -> #F97316 -> #FEF08A
  if (t < 0.3) {
    return [49, 46, 129, 255]; // Deep Indigo
  } else if (t < 0.6) {
    return [190, 24, 93, 255];  // Vivid Fuchsia
  } else if (t < 0.8) {
    return [249, 115, 22, 255]; // Sunset Orange
  } else if (t < 0.95) {
    return [254, 240, 138, 255]; // Golden Horizon
  } else {
    return [15, 23, 42, 255];   // Dark Earth Ground
  }
});
fs.writeFileSync(path.join(SAMPLES_DIR, 'sunset-horizon.png'), sunsetPng);

console.log('Sample images successfully created in assets/samples/');
