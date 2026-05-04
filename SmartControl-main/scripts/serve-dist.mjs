import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const port = Number(process.env.PORT || 4173);
const basePath = (process.env.VITE_BASE_PATH || '/SmartControl/').replace(/\/?$/, '/');
const distDir = path.resolve('dist');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const sendFile = async (res, filePath) => {
  const ext = path.extname(filePath);
  const body = await readFile(filePath);
  res.writeHead(200, {
    'content-type': contentTypes[ext] || 'application/octet-stream',
  });
  res.end(body);
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

    if (url.pathname === '/') {
      res.writeHead(302, { location: basePath });
      res.end();
      return;
    }

    if (!url.pathname.startsWith(basePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const relativePath = decodeURIComponent(url.pathname.slice(basePath.length));
    const requestedPath = path.normalize(relativePath || 'index.html');
    const filePath = path.join(distDir, requestedPath);

    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    await sendFile(res, filePath);
  } catch {
    await sendFile(res, path.join(distDir, 'index.html'));
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`SmartControl dist em http://127.0.0.1:${port}${basePath}`);
});
