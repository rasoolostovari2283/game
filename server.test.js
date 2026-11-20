const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const { createAppServer, resolveRequestFile, getContentType } = require('./server.js');

test('resolveRequestFile maps root to index.html and blocks traversal', () => {
  const root = __dirname;
  assert.equal(resolveRequestFile('/', root), path.join(root, 'index.html'));
  assert.equal(resolveRequestFile('/?foo=bar', root), path.join(root, 'index.html'));
  assert.equal(resolveRequestFile('/css/style.css?v=1', root), path.join(root, 'css', 'style.css'));
  assert.equal(resolveRequestFile('/../etc/passwd', root), null);
  assert.equal(resolveRequestFile('/%2e%2e/secret', root), null);
  assert.equal(resolveRequestFile('/%E0%A4%A', root), null);
});

test('getContentType returns expected MIME types', () => {
  assert.equal(getContentType('index.html'), 'text/html; charset=utf-8');
  assert.equal(getContentType('js/game.js'), 'text/javascript; charset=utf-8');
  assert.equal(getContentType('assets/cars/cyber_hatch.jpg'), 'image/jpeg');
  assert.equal(getContentType('unknown.bin'), 'application/octet-stream');
});

test('createAppServer serves index.html and returns 404 for missing files', async () => {
  const server = createAppServer(__dirname);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const okRes = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/`, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }).on('error', reject);
    });

    assert.equal(okRes.status, 200);
    assert.match(okRes.headers['content-type'], /text\/html/);
    assert.match(okRes.body, /SHABGARD/);

    const missingRes = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/does-not-exist.txt`, (res) => {
        res.resume();
        res.on('end', () => resolve({ status: res.statusCode }));
      }).on('error', reject);
    });

    assert.equal(missingRes.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
