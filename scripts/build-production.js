/**
 * Production Bundler Script
 * Embeds css/style.css, js/color-extractor.js, js/utils.js, and js/app.js
 * directly into index.html so it is 100% self-contained and bulletproof
 * on any hosting platform (Vercel, Netlify, GitHub Pages, or offline).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const htmlPath = path.join(ROOT, 'index.html');
const cssPath = path.join(ROOT, 'css/style.css');
const extractorPath = path.join(ROOT, 'js/color-extractor.js');
const utilsPath = path.join(ROOT, 'js/utils.js');
const appPath = path.join(ROOT, 'js/app.js');

let html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const extractorJs = fs.readFileSync(extractorPath, 'utf8');
const utilsJs = fs.readFileSync(utilsPath, 'utf8');
const appJs = fs.readFileSync(appPath, 'utf8');

// Replace external stylesheet link with complete inlined CSS
const styleTag = `<style>\n${css}\n</style>`;
html = html.replace(/<link rel="stylesheet" href="css\/style\.css">[\s\S]*?<\/style>/, styleTag);

// Replace external script tags with inlined scripts
const scriptsTags = `<script>\n${extractorJs}\n</script>\n<script>\n${utilsJs}\n</script>\n<script>\n${appJs}\n</script>`;
html = html.replace(
  /<script src="js\/color-extractor\.js"><\/script>\s*<script src="js\/utils\.js"><\/script>\s*<script src="js\/app\.js"><\/script>/,
  scriptsTags
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Production index.html generated with 100% self-contained assets!');
