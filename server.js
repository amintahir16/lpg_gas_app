// Custom server entry-point for cPanel's "Setup Node.js App" (Passenger).
//
// cPanel Passenger expects the configured Application startup file to export
// (or actively bind) the HTTP server. Next.js 16 ships with a built-in
// production server that you'd normally start with `next start`, but on
// shared cPanel hosting we don't get to run that command directly — Passenger
// runs whatever startup file we point it at and provides a port via the
// `PORT` env var.
//
// This file uses Next's programmatic API so Passenger can boot the same
// production server `next start` would have launched. The pre-built `.next`
// directory must already exist (run `npm run build` locally before uploading
// or run it once on the server before starting the app).

const http = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      handle(req, res).catch((err) => {
        console.error('Request handling failed:', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });
    });

    server.listen(port, () => {
      console.log(
        `> Next.js server ready on http://${hostname}:${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`
      );
    });

    server.on('error', (err) => {
      console.error('HTTP server error:', err);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('Next.js failed to prepare:', err);
    process.exit(1);
  });
