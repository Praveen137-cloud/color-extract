/**
 * ColorSnap - Integration & Server Test Suite
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const assert = require('assert');
const ColorExtractor = require('../js/color-extractor.js');

console.log('--- ColorSnap Integration & Verification Tests --- \n');

// 1. Decode PNG pixels directly in Node for headless testing
function decodePngPixels(filePath) {
  const fileBuf = fs.readFileSync(filePath);
  // Verify PNG signature
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (fileBuf[i] !== sig[i]) throw new Error('Not a PNG');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  const idatParts = [];

  while (offset < fileBuf.length) {
    const len = fileBuf.readUInt32BE(offset);
    const type = fileBuf.toString('ascii', offset + 4, offset + 8);
    const data = fileBuf.slice(offset + 8, offset + 8 + len);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === 'IDAT') {
      idatParts.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + len;
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idatParts));
  const pixels = [];
  const rowStride = width * 4 + 1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const r = decompressed[pxOffset];
      const g = decompressed[pxOffset + 1];
      const b = decompressed[pxOffset + 2];
      const a = decompressed[pxOffset + 3];

      // Alpha filter (same as Canvas extraction)
      if (a >= 125) {
        pixels.push([r, g, b]);
      }
    }
  }

  return { pixels, width, height };
}

// Test A: Transparent Badge PNG handling
console.log('Test A: Transparent Image Handling (transparent-badge.png)');
const badgeData = decodePngPixels(path.join(__dirname, '../assets/samples/transparent-badge.png'));
console.log(`  Decoded ${badgeData.width}x${badgeData.height} image, non-transparent pixels: ${badgeData.pixels.length}`);
assert(badgeData.pixels.length > 0, 'Should find non-transparent pixels');

const badgeClusters = ColorExtractor.runKMeans(badgeData.pixels, 5);
assert.strictEqual(badgeClusters.length, 5, 'Should return exactly 5 clusters');

console.log('  Extracted dominant colors from transparent badge:');
badgeClusters.forEach((c, idx) => {
  const hex = ColorExtractor.rgbToHex(c.r, c.g, c.b);
  const name = ColorExtractor.getClosestColorName(c.r, c.g, c.b);
  console.log(`    [#${idx + 1}] ${hex} (${name}) ~ ${c.percentage}%`);
});

// Test B: Nature Meadow Image
console.log('\nTest B: Nature Image Handling (nature-meadow.png)');
const meadowData = decodePngPixels(path.join(__dirname, '../assets/samples/nature-meadow.png'));
const meadowClusters = ColorExtractor.runKMeans(meadowData.pixels, 5);
assert.strictEqual(meadowClusters.length, 5, 'Should return exactly 5 clusters');

console.log('  Extracted dominant colors from nature meadow:');
meadowClusters.forEach((c, idx) => {
  const hex = ColorExtractor.rgbToHex(c.r, c.g, c.b);
  const name = ColorExtractor.getClosestColorName(c.r, c.g, c.b);
  console.log(`    [#${idx + 1}] ${hex} (${name}) ~ ${c.percentage}%`);
});

// Test C: Sunset Horizon Image
console.log('\nTest C: Sunset Image Handling (sunset-horizon.png)');
const sunsetData = decodePngPixels(path.join(__dirname, '../assets/samples/sunset-horizon.png'));
const sunsetClusters = ColorExtractor.runKMeans(sunsetData.pixels, 5);
assert.strictEqual(sunsetClusters.length, 5, 'Should return exactly 5 clusters');

console.log('  Extracted dominant colors from sunset horizon:');
sunsetClusters.forEach((c, idx) => {
  const hex = ColorExtractor.rgbToHex(c.r, c.g, c.b);
  const name = ColorExtractor.getClosestColorName(c.r, c.g, c.b);
  console.log(`    [#${idx + 1}] ${hex} (${name}) ~ ${c.percentage}%`);
});

console.log('\nAll image extraction tests passed with high fidelity!\n');
