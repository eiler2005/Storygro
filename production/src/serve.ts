import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { REEL_ROOT } from './tools.ts';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
};

/** Local server: /rc/* is the framework, /spec/* the folder of the reel. Loopback only. */
export function serve(specDir: string, port = 0): Promise<{ server: Server; origin: string }> {
  const mounts: [string, string][] = [
    ['/rc/', REEL_ROOT],
    ['/spec/', specDir],
  ];
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    const m = mounts.find(([p]) => path.startsWith(p));
    const file = m ? normalize(join(m[1], path.slice(m[0].length))) : '';
    if (!m || !file.startsWith(m[1]) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    const size = statSync(file).size;
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const start = Number(range[1] || 0);
      const end = range[2] ? Number(range[2]) : size - 1;
      res.writeHead(206, {
        'content-type': type,
        'content-range': `bytes ${start}-${end}/${size}`,
        'accept-ranges': 'bytes',
        'content-length': end - start + 1,
      });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, {
      'content-type': type,
      'content-length': size,
      'accept-ranges': 'bytes',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(port, '127.0.0.1', () => {
      const a = server.address();
      resolve({ server, origin: `http://127.0.0.1:${typeof a === 'object' && a ? a.port : port}` });
    }),
  );
}
