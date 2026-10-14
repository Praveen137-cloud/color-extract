/**
 * Server End-to-End HTTP Test
 */

const http = require('http');
const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');

console.log('Testing ColorSnap Static HTTP Server...\n');

const TEST_PORT = 3891;
const serverProcess = spawn('node', ['server/server.js'], {
  env: { ...process.env, PORT: TEST_PORT },
  cwd: path.resolve(__dirname, '..')
});

serverProcess.stdout.on('data', (d) => {
  // console.log(`[Server] ${d}`);
});

serverProcess.stderr.on('data', (d) => {
  console.error(`[Server Err] ${d}`);
});

function makeRequest(pathName) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${TEST_PORT}${pathName}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

// Give server 500ms to bind
setTimeout(async () => {
  try {
    // 1. Root index.html
    console.log('1. Testing GET / (index.html)');
    const rootRes = await makeRequest('/');
    assert.strictEqual(rootRes.statusCode, 200);
    assert(rootRes.headers['content-type'].includes('text/html'));
    assert(rootRes.body.includes('ColorSnap'));
    console.log('   Passed: 200 OK and contains ColorSnap branding');

    // 2. CSS stylesheet
    console.log('2. Testing GET /css/style.css');
    const cssRes = await makeRequest('/css/style.css');
    assert.strictEqual(cssRes.statusCode, 200);
    assert(cssRes.headers['content-type'].includes('text/css'));
    assert(cssRes.body.includes('--brand-primary'));
    console.log('   Passed: 200 OK and valid CSS tokens');

    // 3. JavaScript assets
    console.log('3. Testing GET /js/color-extractor.js');
    const jsExtractor = await makeRequest('/js/color-extractor.js');
    assert.strictEqual(jsExtractor.statusCode, 200);
    assert(jsExtractor.headers['content-type'].includes('javascript'));
    console.log('   Passed: 200 OK for color-extractor.js');

    console.log('4. Testing GET /js/utils.js');
    const jsUtils = await makeRequest('/js/utils.js');
    assert.strictEqual(jsUtils.statusCode, 200);
    assert(jsUtils.headers['content-type'].includes('javascript'));
    console.log('   Passed: 200 OK for utils.js');

    console.log('5. Testing GET /js/app.js');
    const jsApp = await makeRequest('/js/app.js');
    assert.strictEqual(jsApp.statusCode, 200);
    assert(jsApp.headers['content-type'].includes('javascript'));
    console.log('   Passed: 200 OK for app.js');

    // 4. Sample image
    console.log('6. Testing GET /assets/samples/nature-meadow.png');
    const imgRes = await makeRequest('/assets/samples/nature-meadow.png');
    assert.strictEqual(imgRes.statusCode, 200);
    assert.strictEqual(imgRes.headers['content-type'], 'image/png');
    console.log('   Passed: 200 OK for image/png');

    // 5. 404 Not Found
    console.log('7. Testing 404 for non-existent file');
    const notFoundRes = await makeRequest('/non-existent-file-xyz.html');
    assert.strictEqual(notFoundRes.statusCode, 404);
    console.log('   Passed: 404 handled gracefully');

    // 6. Security path traversal
    console.log('8. Testing Path Traversal security check');
    const secureRes = await makeRequest('/../../../../etc/passwd');
    assert(secureRes.statusCode === 403 || secureRes.statusCode === 404);
    console.log('   Passed: Directory traversal prevented');

    console.log('\nAll server HTTP tests passed successfully!\n');
    serverProcess.kill();
    process.exit(0);
  } catch (err) {
    console.error('Server test failure:', err);
    serverProcess.kill();
    process.exit(1);
  }
}, 600);
