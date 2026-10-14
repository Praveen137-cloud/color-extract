/**
 * Unit Test for ColorExtractor module
 */

const ColorExtractor = require('../js/color-extractor.js');
const assert = require('assert');

console.log('Testing ColorExtractor algorithms...\n');

// Test 1: Color conversions
console.log('Test 1: Color format conversions');
const hex1 = ColorExtractor.rgbToHex(108, 138, 114);
assert.strictEqual(hex1, '#6C8A72', `Expected #6C8A72, got ${hex1}`);

const hexBlack = ColorExtractor.rgbToHex(0, 0, 0);
assert.strictEqual(hexBlack, '#000000', 'Black conversion failed');

const hexWhite = ColorExtractor.rgbToHex(255, 255, 255);
assert.strictEqual(hexWhite, '#FFFFFF', 'White conversion failed');

const hsl1 = ColorExtractor.rgbToHsl(255, 0, 0);
assert.strictEqual(hsl1.h, 0);
assert.strictEqual(hsl1.s, 100);
assert.strictEqual(hsl1.l, 50);
console.log('  Passed: Color conversions');

// Test 2: Perceptual Color Distance
console.log('Test 2: Perceptual Color Distance');
const dIdentical = ColorExtractor.colorDistance(100, 150, 200, 100, 150, 200);
assert.strictEqual(dIdentical, 0, 'Identical colors should have distance 0');

const dBlackWhite = ColorExtractor.colorDistance(0, 0, 0, 255, 255, 255);
assert(dBlackWhite > 400, 'Black to white distance should be large');
console.log(`  Passed: Distance black-white = ${dBlackWhite.toFixed(2)}`);

// Test 3: K-Means with 5 distinct color clusters
console.log('Test 3: K-Means on synthetic 5-color dataset');
const syntheticPixels = [];

// 5 distinct colors with known distributions:
// 40% Navy Blue: [20, 30, 90]
// 25% Coral Red: [240, 60, 60]
// 15% Forest Green: [30, 130, 40]
// 10% Gold Yellow: [240, 200, 30]
// 10% Snow White: [250, 250, 250]

for (let i = 0; i < 400; i++) {
  syntheticPixels.push([20 + Math.random() * 5, 30 + Math.random() * 5, 90 + Math.random() * 5]);
}
for (let i = 0; i < 250; i++) {
  syntheticPixels.push([240 + Math.random() * 5, 60 + Math.random() * 5, 60 + Math.random() * 5]);
}
for (let i = 0; i < 150; i++) {
  syntheticPixels.push([30 + Math.random() * 5, 130 + Math.random() * 5, 40 + Math.random() * 5]);
}
for (let i = 0; i < 100; i++) {
  syntheticPixels.push([240 + Math.random() * 5, 200 + Math.random() * 5, 30 + Math.random() * 5]);
}
for (let i = 0; i < 100; i++) {
  syntheticPixels.push([250 + Math.random() * 4, 250 + Math.random() * 4, 250 + Math.random() * 4]);
}

const clusters = ColorExtractor.runKMeans(syntheticPixels, 5);
assert.strictEqual(clusters.length, 5, `Expected 5 clusters, got ${clusters.length}`);

console.log('Extracted Clusters:');
let sumPct = 0;
clusters.forEach((c, idx) => {
  const hex = ColorExtractor.rgbToHex(c.r, c.g, c.b);
  const name = ColorExtractor.getClosestColorName(c.r, c.g, c.b);
  sumPct += c.percentage;
  console.log(`  [${idx + 1}] ${hex} (${name}) ~ ${c.percentage}% (count: ${c.count})`);
});

assert(Math.abs(sumPct - 100) < 0.5, `Percentages should sum to ~100%, got ${sumPct}`);
console.log('  Passed: K-Means synthetic dataset');

// Test 4: Image with limited colors (e.g. 2 colors only)
console.log('Test 4: Limited color dataset (graceful fallback to 5 entries)');
const twoColorPixels = [];
for (let i = 0; i < 500; i++) twoColorPixels.push([0, 0, 0]);
for (let i = 0; i < 500; i++) twoColorPixels.push([255, 0, 0]);

const limitedClusters = ColorExtractor.runKMeans(twoColorPixels, 5);
assert.strictEqual(limitedClusters.length, 5, 'Should return exactly 5 clusters even for 2-color images');
console.log('  Passed: Gracefully handles limited color images');

console.log('\nAll ColorExtractor unit tests passed successfully!\n');
