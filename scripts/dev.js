// Tiny dependency-free static dev server for the single-file app.
// Usage: npm run dev  (serves index.html on http://localhost:3000)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const port = Number(process.env.PORT) || 3000;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent((req.url || '/').split('?')[0]);
    if (rel === '/' || rel === '') rel = '/index.html';
    // Prevent path traversal outside the project root.
    const filePath = normalize(join(root, rel));
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const ext = filePath.slice(filePath.lastIndexOf('.'));
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Mochi's Academy running at http://localhost:${port}`);
});
