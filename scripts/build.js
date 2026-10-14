/**
 * Production Build Script for Vercel / Netlify / CI
 * Compiles and outputs production-ready static assets into `dist/` and `public/`
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');

function prepareDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

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

prepareDirectory(DIST);
prepareDirectory(PUBLIC);

const htmlPath = path.join(ROOT, 'index.html');

// Populate dist/
copyDirSync(path.join(ROOT, 'css'), path.join(DIST, 'css'));
copyDirSync(path.join(ROOT, 'js'), path.join(DIST, 'js'));
copyDirSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
fs.copyFileSync(htmlPath, path.join(DIST, 'index.html'));

// Populate public/
copyDirSync(path.join(ROOT, 'css'), path.join(PUBLIC, 'css'));
copyDirSync(path.join(ROOT, 'js'), path.join(PUBLIC, 'js'));
copyDirSync(path.join(ROOT, 'assets'), path.join(PUBLIC, 'assets'));
fs.copyFileSync(htmlPath, path.join(PUBLIC, 'index.html'));

console.log('Build completed successfully! Assets output to dist/ and public/');
