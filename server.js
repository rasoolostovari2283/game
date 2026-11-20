const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function resolveRequestFile(urlPath, rootDir = ROOT_DIR) {
  let reqPath = (urlPath || '/').split('?')[0];
  try {
    reqPath = decodeURIComponent(reqPath);
  } catch {
    return null;
  }
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }
  const normalizedRoot = path.resolve(rootDir);
  const candidate = path.resolve(normalizedRoot, '.' + reqPath);
  if (candidate !== normalizedRoot && !candidate.startsWith(normalizedRoot + path.sep)) {
    return null;
  }
  return candidate;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function createAppServer(rootDir = ROOT_DIR) {
  return http.createServer((req, res) => {
    const filePath = resolveRequestFile(req.url, rootDir);
    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Request');
      return;
    }

    const contentType = getContentType(filePath);

    fs.readFile(filePath, (err, content) => {
      if (err) {
        const status = err.code === 'ENOENT' || err.code === 'EISDIR' ? 404 : 500;
        res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(status === 404 ? 'Not Found' : 'Internal Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store'
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(content);
      }
    });
  });
}

if (require.main === module) {
  const server = createAppServer();
  server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}/`);
  });
}

module.exports = { createAppServer, resolveRequestFile, getContentType };
