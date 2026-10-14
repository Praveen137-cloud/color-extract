/**
 * Production Build Script for Vercel / Netlify / CI
 * Compiles and outputs production-ready static assets into `dist/`
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// 1. Clean and create dist directory
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST, { recursive: true });

// 2. Helper: Copy directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 3. Copy css, js, and assets to dist
copyDirSync(path.join(ROOT, 'css'), path.join(DIST, 'css'));
copyDirSync(path.join(ROOT, 'js'), path.join(DIST, 'js'));
copyDirSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));

// 4. Copy index.html and ensure self-contained fallback
const htmlPath = path.join(ROOT, 'index.html');
const destHtmlPath = path.join(DIST, 'index.html');
fs.copyFileSync(htmlPath, destHtmlPath);

console.log('Build completed successfully! Assets output to dist/');
