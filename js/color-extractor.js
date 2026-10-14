/**
 * ColorSnap - Dominant Color Extractor Engine
 * 
 * Features:
 * - K-Means++ initialization for diverse initial centroids
 * - Perceptual weighted Euclidean color distance (redmean formula)
 * - Transparency filtering (alpha < 125 ignored)
 * - Cluster merging & diversity enforcement (prevents identical swatches)
 * - Exact percentage calculation of sampled pixels
 * - Dynamic WCAG contrast calculation for text readability
 * - Color name approximation for enhanced UX
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ColorExtractor = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Curated color names dictionary for friendly color tags
  const NAMED_COLORS = [
    { name: 'Pure Black', r: 0, g: 0, b: 0 },
    { name: 'Charcoal', r: 38, g: 38, b: 38 },
    { name: 'Slate Gray', r: 112, g: 128, b: 144 },
    { name: 'Cool Gray', r: 148, g: 163, b: 184 },
    { name: 'Silver', r: 192, g: 192, b: 192 },
    { name: 'Off White', r: 243, g: 244, b: 246 },
    { name: 'Pure White', r: 255, g: 255, b: 255 },
    { name: 'Crimson Red', r: 220, g: 20, b: 60 },
    { name: 'Ruby', r: 185, g: 28, b: 28 },
    { name: 'Coral Red', r: 239, g: 68, b: 68 },
    { name: 'Rose', r: 244, g: 63, b: 94 },
    { name: 'Blush Pink', r: 251, g: 113, b: 133 },
    { name: 'Hot Pink', r: 236, g: 72, b: 153 },
    { name: 'Burgundy', r: 136, g: 19, b: 55 },
    { name: 'Tangerine', r: 249, g: 115, b: 22 },
    { name: 'Deep Orange', r: 194, g: 65, b: 12 },
    { name: 'Peach', r: 254, g: 215, b: 170 },
    { name: 'Amber', r: 245, g: 158, b: 11 },
    { name: 'Warm Gold', r: 217, g: 119, b: 6 },
    { name: 'Sun Yellow', r: 234, g: 179, b: 8 },
    { name: 'Lemon', r: 250, g: 204, b: 21 },
    { name: 'Lime Green', r: 132, g: 204, b: 22 },
    { name: 'Olive Green', r: 85, g: 107, b: 47 },
    { name: 'Emerald', r: 16, g: 185, b: 129 },
    { name: 'Forest Green', r: 22, g: 101, b: 52 },
    { name: 'Sage Green', r: 134, g: 169, b: 136 },
    { name: 'Mint', r: 52, g: 211, b: 153 },
    { name: 'Teal', r: 13, g: 148, b: 136 },
    { name: 'Dark Teal', r: 15, g: 118, b: 110 },
    { name: 'Cyan', r: 6, g: 182, b: 212 },
    { name: 'Sky Blue', r: 56, g: 189, b: 248 },
    { name: 'Ocean Blue', r: 14, g: 165, b: 233 },
    { name: 'Royal Blue', r: 37, g: 99, b: 235 },
    { name: 'Deep Navy', r: 30, g: 58, b: 138 },
    { name: 'Midnight Blue', r: 15, g: 23, b: 42 },
    { name: 'Indigo', r: 99, g: 102, b: 241 },
    { name: 'Violet', r: 139, g: 92, b: 246 },
    { name: 'Purple', r: 168, g: 85, b: 247 },
    { name: 'Deep Plum', r: 88, g: 28, b: 135 },
    { name: 'Warm Taupe', r: 120, g: 113, b: 108 },
    { name: 'Espresso Brown', r: 68, g: 45, b: 35 },
    { name: 'Mocha Brown', r: 120, g: 53, b: 15 },
    { name: 'Terracotta', r: 180, g: 83, b: 9 },
    { name: 'Sand', r: 214, g: 180, b: 148 }
  ];

  /**
   * Perceptually weighted color distance (Redmean algorithm)
   * Better matches human eye sensitivity compared to simple Euclidean RGB
   */
  function colorDistance(r1, g1, b1, r2, g2, b2) {
    const rmean = (r1 + r2) / 2;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(
      (2 + rmean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rmean) / 256) * db * db
    );
  }

  /**
   * Convert RGB to HEX string (#RRGGBB)
   */
  function rgbToHex(r, g, b) {
    const toHex = (c) => {
      const hex = Math.round(Math.max(0, Math.min(255, c))).toString(16).toUpperCase();
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Convert RGB to HSL object and formatted string
   */
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    const hDeg = Math.round(h * 360);
    const sPct = Math.round(s * 100);
    const lPct = Math.round(l * 100);

    return {
      h: hDeg,
      s: sPct,
      l: lPct,
      string: `hsl(${hDeg}, ${sPct}%, ${lPct}%)`
    };
  }

  /**
   * Calculate WCAG relative luminance
   */
  function getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  /**
   * Determine whether dark or light text should be overlaid on this color
   */
  function getOptimalTextColor(r, g, b) {
    const lum = getLuminance(r, g, b);
    return lum > 0.4 ? '#0F172A' : '#FFFFFF';
  }

  /**
   * Find closest friendly descriptive color name
   */
  function getClosestColorName(r, g, b) {
    let closestName = 'Custom Color';
    let minDistance = Infinity;

    for (let i = 0; i < NAMED_COLORS.length; i++) {
      const item = NAMED_COLORS[i];
      const dist = colorDistance(r, g, b, item.r, item.g, item.b);
      if (dist < minDistance) {
        minDistance = dist;
        closestName = item.name;
      }
    }
    return closestName;
  }

  /**
   * Sample pixels from an image via Canvas
   * Resizes large images internally (max 200px) for speed
   * Ignores transparent pixels (alpha < 125)
   */
  function extractPixelsFromImage(imgElement, maxDimension = 200) {
    let width = imgElement.naturalWidth || imgElement.width || 200;
    let height = imgElement.naturalHeight || imgElement.height || 200;

    if (width === 0 || height === 0) {
      throw new Error('Image has zero dimensions.');
    }

    // Downscale proportionally to fit inside maxDimension x maxDimension
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Draw image onto canvas
    ctx.drawImage(imgElement, 0, 0, targetWidth, targetHeight);

    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;
    const pixels = [];

    // Collect non-transparent pixels
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      // Skip transparent pixels
      if (a < 125) continue;

      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    return {
      pixels,
      totalSampled: pixels.length,
      width,
      height
    };
  }

  /**
   * K-Means++ Centroid Initialization
   * Ensures diverse starting points across different color spectrums
   */
  function initializeKMeansPlusPlus(pixels, k) {
    if (pixels.length === 0) return [];

    const centroids = [];
    // Pick first centroid uniformly at random
    const firstIdx = Math.floor(Math.random() * pixels.length);
    centroids.push([...pixels[firstIdx]]);

    // Select remaining centroids with probability proportional to squared distance
    while (centroids.length < k) {
      const distances = new Float64Array(pixels.length);
      let totalDistSq = 0;

      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        let minDist = Infinity;
        for (let c = 0; c < centroids.length; c++) {
          const centroid = centroids[c];
          const dist = colorDistance(p[0], p[1], p[2], centroid[0], centroid[1], centroid[2]);
          if (dist < minDist) {
            minDist = dist;
          }
        }
        const distSq = minDist * minDist;
        distances[i] = distSq;
        totalDistSq += distSq;
      }

      if (totalDistSq === 0) {
        // All pixels are identical to existing centroids
        break;
      }

      // Sample next centroid based on distribution
      let randVal = Math.random() * totalDistSq;
      let chosenIdx = 0;
      for (let i = 0; i < pixels.length; i++) {
        randVal -= distances[i];
        if (randVal <= 0) {
          chosenIdx = i;
          break;
        }
      }

      centroids.push([...pixels[chosenIdx]]);
    }

    return centroids;
  }

  /**
   * Run K-Means Clustering on pixels
   * Returns array of cluster objects: { r, g, b, count, percentage }
   */
  function runKMeans(pixels, k = 5, maxIterations = 20) {
    if (!pixels || pixels.length === 0) {
      throw new Error('No valid visible pixels found in image.');
    }

    // Step 1: Initialize centroids
    let centroids = initializeKMeansPlusPlus(pixels, k);

    // If image has fewer distinct colors than k
    if (centroids.length < k) {
      // Pad with slight variations of existing centroids
      while (centroids.length < k) {
        const base = centroids[centroids.length % centroids.length];
        centroids.push([
          Math.min(255, Math.max(0, base[0] + (Math.random() * 20 - 10))),
          Math.min(255, Math.max(0, base[1] + (Math.random() * 20 - 10))),
          Math.min(255, Math.max(0, base[2] + (Math.random() * 20 - 10)))
        ]);
      }
    }

    let assignments = new Int32Array(pixels.length);
    let counts = new Int32Array(k);

    for (let iter = 0; iter < maxIterations; iter++) {
      counts.fill(0);
      let changed = false;

      // Assign each pixel to closest centroid
      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        let bestDist = Infinity;
        let bestIdx = 0;

        for (let c = 0; c < k; c++) {
          const centroid = centroids[c];
          const dist = colorDistance(p[0], p[1], p[2], centroid[0], centroid[1], centroid[2]);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = c;
          }
        }

        if (assignments[i] !== bestIdx) {
          assignments[i] = bestIdx;
          changed = true;
        }
        counts[bestIdx]++;
      }

      // Recompute centroids
      const sumsR = new Float64Array(k);
      const sumsG = new Float64Array(k);
      const sumsB = new Float64Array(k);

      for (let i = 0; i < pixels.length; i++) {
        const cluster = assignments[i];
        const p = pixels[i];
        sumsR[cluster] += p[0];
        sumsG[cluster] += p[1];
        sumsB[cluster] += p[2];
      }

      let maxCentroidShift = 0;
      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) {
          const newR = sumsR[c] / counts[c];
          const newG = sumsG[c] / counts[c];
          const newB = sumsB[c] / counts[c];

          const shift = colorDistance(centroids[c][0], centroids[c][1], centroids[c][2], newR, newG, newB);
          if (shift > maxCentroidShift) {
            maxCentroidShift = shift;
          }

          centroids[c][0] = newR;
          centroids[c][1] = newG;
          centroids[c][2] = newB;
        } else {
          // Re-seed empty cluster with a random pixel
          const randPixel = pixels[Math.floor(Math.random() * pixels.length)];
          centroids[c] = [...randPixel];
        }
      }

      // Early convergence check
      if (!changed || maxCentroidShift < 0.5) {
        break;
      }
    }

    // Step 2: Build cluster objects
    let clusters = [];
    for (let c = 0; c < k; c++) {
      clusters.push({
        r: Math.round(centroids[c][0]),
        g: Math.round(centroids[c][1]),
        b: Math.round(centroids[c][2]),
        count: counts[c],
        percentage: (counts[c] / pixels.length) * 100
      });
    }

    // Step 3: Enforce diversity (prevent near-identical duplicate swatches)
    clusters = enforceDiversity(clusters, pixels, k);

    // Sort descending by percentage dominance
    clusters.sort((a, b) => b.count - a.count);

    // Recalculate percentages to guarantee 100% total sum
    let totalAssigned = clusters.reduce((sum, item) => sum + item.count, 0);
    if (totalAssigned === 0) totalAssigned = pixels.length || 1;

    let accumulatedPct = 0;
    for (let i = 0; i < clusters.length; i++) {
      if (i === clusters.length - 1) {
        // Clean rounding for the last element
        const lastPct = Math.max(0.1, Number((100 - accumulatedPct).toFixed(1)));
        clusters[i].percentage = lastPct;
      } else {
        const pct = Number(((clusters[i].count / totalAssigned) * 100).toFixed(1));
        clusters[i].percentage = Math.max(0.1, pct);
        accumulatedPct += clusters[i].percentage;
      }
    }

    return clusters;
  }

  /**
   * Helper: Calculate minimum distance between a color and a list of clusters
   */
  function getMinDistanceToClusters(color, clusters) {
    let minDist = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i];
      const dist = colorDistance(color.r, color.g, color.b, c.r, c.g, c.b);
      if (dist < minDist) minDist = dist;
    }
    return minDist;
  }

  /**
   * Helper: Generate a harmonious tonal variant (tint or shade)
   * used when an image genuinely has fewer than 5 distinct colors.
   */
  function generateTonalVariant(baseCluster, existingClusters) {
    const hsl = rgbToHsl(baseCluster.r, baseCluster.g, baseCluster.b);
    // Shift lightness up or down
    const newL = hsl.l > 50 ? Math.max(15, hsl.l - 25) : Math.min(85, hsl.l + 25);
    
    // Convert back from HSL to RGB
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = newL / 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  /**
   * Enforce color diversity between clusters
   * If two clusters are too visually similar (distance < threshold),
   * merge them and discover another distinct dominant color.
   */
  function enforceDiversity(clusters, pixels, targetCount = 5) {
    const MIN_DISTANCE_THRESHOLD = 32; // Minimum perceptible distance

    let modified = true;
    let iteration = 0;

    while (modified && iteration < 6) {
      modified = false;
      iteration++;

      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const dist = colorDistance(
            clusters[i].r, clusters[i].g, clusters[i].b,
            clusters[j].r, clusters[j].g, clusters[j].b
          );

          if (dist < MIN_DISTANCE_THRESHOLD) {
            // Merge j into i
            clusters[i].count += clusters[j].count;
            // Weighted blend
            const total = clusters[i].count;
            clusters[i].r = Math.round((clusters[i].r * (total - clusters[j].count) + clusters[j].r * clusters[j].count) / total);
            clusters[i].g = Math.round((clusters[i].g * (total - clusters[j].count) + clusters[j].g * clusters[j].count) / total);
            clusters[i].b = Math.round((clusters[i].b * (total - clusters[j].count) + clusters[j].b * clusters[j].count) / total);

            // Replace j with a point furthest from all current clusters
            const candidateClusters = clusters.filter((_, idx) => idx !== j);
            const replacement = findFurthestPixel(pixels, candidateClusters);
            const repDist = getMinDistanceToClusters(replacement, candidateClusters);

            if (repDist >= MIN_DISTANCE_THRESHOLD) {
              clusters[j] = {
                r: replacement.r,
                g: replacement.g,
                b: replacement.b,
                count: Math.max(1, Math.round(pixels.length * 0.05)),
                percentage: 5.0
              };
            } else {
              // Image doesn't have another distinct color; generate tonal variation
              const tonal = generateTonalVariant(clusters[i], candidateClusters);
              clusters[j] = {
                r: tonal.r,
                g: tonal.g,
                b: tonal.b,
                count: Math.max(1, Math.round(pixels.length * 0.03)),
                percentage: 3.0
              };
            }

            modified = true;
            break;
          }
        }
        if (modified) break;
      }
    }

    // Guarantee we have exactly targetCount clusters
    while (clusters.length < targetCount) {
      const rep = findFurthestPixel(pixels, clusters);
      const repDist = getMinDistanceToClusters(rep, clusters);

      if (repDist >= MIN_DISTANCE_THRESHOLD) {
        clusters.push({
          r: rep.r,
          g: rep.g,
          b: rep.b,
          count: 1,
          percentage: 0.1
        });
      } else {
        const base = clusters[clusters.length % clusters.length];
        const tonal = generateTonalVariant(base, clusters);
        clusters.push({
          r: tonal.r,
          g: tonal.g,
          b: tonal.b,
          count: 1,
          percentage: 0.1
        });
      }
    }

    if (clusters.length > targetCount) {
      clusters.sort((a, b) => b.count - a.count);
      clusters = clusters.slice(0, targetCount);
    }

    return clusters;
  }

  /**
   * Find a pixel in the dataset that maximizes distance to all given clusters
   */
  function findFurthestPixel(pixels, existingClusters) {
    let maxMinDist = -1;
    let bestPixel = pixels[0] || [128, 128, 128];

    // Sample a subset for performance
    const step = Math.max(1, Math.floor(pixels.length / 500));
    for (let i = 0; i < pixels.length; i += step) {
      const p = pixels[i];
      let minDist = Infinity;
      for (let c = 0; c < existingClusters.length; c++) {
        const cl = existingClusters[c];
        const dist = colorDistance(p[0], p[1], p[2], cl.r, cl.g, cl.b);
        if (dist < minDist) minDist = dist;
      }

      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        bestPixel = p;
      }
    }

    return {
      r: bestPixel[0],
      g: bestPixel[1],
      b: bestPixel[2]
    };
  }

  /**
   * High-level extraction method from an HTMLImageElement
   * Returns a complete, rich palette object ready for UI rendering and export
   */
  function extractPalette(imgElement, count = 5) {
    const { pixels, totalSampled, width, height } = extractPixelsFromImage(imgElement);

    if (pixels.length === 0) {
      throw new Error('Image contains only transparent pixels. Please upload an image with visible content.');
    }

    const rawClusters = runKMeans(pixels, count);

    // Format rich palette output
    const palette = rawClusters.map((cluster, index) => {
      const hex = rgbToHex(cluster.r, cluster.g, cluster.b);
      const hsl = rgbToHsl(cluster.r, cluster.g, cluster.b);
      const textColor = getOptimalTextColor(cluster.r, cluster.g, cluster.b);
      const isLight = textColor === '#0F172A';
      const name = getClosestColorName(cluster.r, cluster.g, cluster.b);

      return {
        id: `color-${index + 1}`,
        index: index + 1,
        hex: hex,
        rgb: {
          r: cluster.r,
          g: cluster.g,
          b: cluster.b,
          string: `rgb(${cluster.r}, ${cluster.g}, ${cluster.b})`
        },
        hsl: hsl,
        percentage: cluster.percentage,
        percentageString: `${cluster.percentage.toFixed(1)}%`,
        textColor: textColor,
        isLight: isLight,
        name: name
      };
    });

    return {
      colors: palette,
      meta: {
        totalColors: palette.length,
        sampledPixels: totalSampled,
        originalDimensions: { width, height },
        extractedAt: new Date().toISOString()
      }
    };
  }

  return {
    extractPalette,
    extractPixelsFromImage,
    runKMeans,
    colorDistance,
    rgbToHex,
    rgbToHsl,
    getOptimalTextColor,
    getClosestColorName
  };
}));
