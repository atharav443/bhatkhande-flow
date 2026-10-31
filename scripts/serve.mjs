// Small static file server for the playground in web/.
// Needed because fetch() does not work from a file:// page.
//
//   npm run web            (builds web/ first, then runs this)
//   PORT=8080 npm run web  (start on another port)
//
// If the port is busy, the next free port is used.

import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const FIRST_PORT = Number(process.env.PORT ?? 5173);
const PORTS_TO_TRY = 20;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.woff': 'font/woff',
};

async function handle(request, response) {
  try {
    let path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (path.includes('..')) throw new Error('path outside web/');

    // the playground asks for the list of examples to fill its drop-down
    if (path === '/examples/index.json') {
      const names = (await readdir(join(WEB_ROOT, 'examples'))).sort();
      response.writeHead(200, { 'content-type': CONTENT_TYPES['.json'] });
      response.end(JSON.stringify(names));
      return;
    }

    if (path.endsWith('/')) path += 'index.html';
    const body = await readFile(join(WEB_ROOT, path));
    response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(path)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
}

const server = createServer(handle);

function listen(port, triesLeft) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && triesLeft > 0) {
      console.log(`port ${port} is busy, trying ${port + 1}`);
      listen(port + 1, triesLeft - 1);
    } else {
      throw error;
    }
  });
  server.listen(port, () => console.log(`bhatkhande-flow playground: http://localhost:${port}`));
}

listen(FIRST_PORT, PORTS_TO_TRY);
