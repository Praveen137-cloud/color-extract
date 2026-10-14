/**
 * ColorSnap - Universal Node.js Server & Vercel Handler
 * Provides both standalone HTTP server and Vercel Serverless Function entrypoint.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Cache critical assets in memory for high-speed edge delivery
const INDEX_HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const STYLE_CSS = fs.existsSync(path.join(__dirname, 'css', 'style.css'))
  ? fs.readFileSync(path.join(__dirname, 'css', 'style.css'), 'utf8')
  : '';

const EXTRACTOR_JS = fs.existsSync(path.join(__dirname, 'js', 'color-extractor.js'))
  ? fs.readFileSync(path.join(__dirname, 'js', 'color-extractor.js'), 'utf8')
  : '';

const UTILS_JS = fs.existsSync(path.join(__dirname, 'js', 'utils.js'))
  ? fs.readFileSync(path.join(__dirname, 'js', 'utils.js'), 'utf8')
  : '';

const APP_JS = fs.existsSync(path.join(__dirname, 'js', 'app.js'))
  ? fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8')
  : '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function handler(req, res) {
  let urlPath = (req.url || '/').split('?')[0];

  // Root or index
  if (urlPath === '/' || urlPath === '' || urlPath === '/index.html') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.end(INDEX_HTML);
  }

  // Fast in-memory responses for core assets
  if (urlPath === '/css/style.css' && STYLE_CSS) {
    res.writeHead(200, {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.end(STYLE_CSS);
  }

  if (urlPath === '/js/color-extractor.js' && EXTRACTOR_JS) {
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.end(EXTRACTOR_JS);
  }

  if (urlPath === '/js/utils.js' && UTILS_JS) {
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.end(UTILS_JS);
  }

  if (urlPath === '/js/app.js' && APP_JS) {
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.end(APP_JS);
  }

  // File system lookup for samples, assets, etc.
  const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  const candidatePath = path.join(__dirname, safePath);

  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    const ext = path.extname(candidatePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff'
    });
    return fs.createReadStream(candidatePath).pipe(res);
  }

  // Single page app fallback: return index.html
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(INDEX_HTML);
}

module.exports = handler;

// Local development support
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const server = http.createServer(handler);
  server.listen(PORT, () => {
    console.log(`ColorSnap running at http://localhost:${PORT}`);
  });
}
