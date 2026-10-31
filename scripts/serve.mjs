// Minimal static server for the playground (fetch() does not work from file://):  npm run web
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const port = Number(process.env.PORT ?? 5173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.woff': 'font/woff' };
const server = createServer(async (req, res) => {
  try {
    let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (p.includes('..')) throw new Error('bad path');
    if (p === '/examples/index.json') { res.writeHead(200, { 'content-type': types['.json'] }); return res.end(JSON.stringify((await readdir(join(root, 'examples'))).sort())); }
    if (p.endsWith('/')) p += 'index.html';
    const body = await readFile(join(root, p));
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
// if the port is taken (another dev server, an old playground), try the next ones
function listen(p, triesLeft = 20) {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE' && triesLeft > 0) { console.log(`port ${p} is busy, trying ${p + 1}`); listen(p + 1, triesLeft - 1); }
    else throw e;
  });
  server.listen(p, () => console.log(`bhatkhande-flow playground: http://localhost:${p}`));
}
listen(port);
