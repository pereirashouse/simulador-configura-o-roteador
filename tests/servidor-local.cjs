const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  const pathname = new URL(request.url, 'http://127.0.0.1:4173').pathname;
  if (pathname === '/favicon.ico') {
    response.writeHead(204);
    response.end();
    return;
  }
  if (pathname !== '/' && pathname !== '/index.html') {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(request.method === 'HEAD' ? undefined : html);
});
server.on('error', (error) => {
  console.error('Servidor de testes indisponível:', error.message);
  process.exit(1);
});
server.listen(4173, '127.0.0.1', () => console.log('Servidor de testes pronto em 127.0.0.1:4173'));
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
