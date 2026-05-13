/**
 * Express server for cPanel "Setup Node.js App" (Node.js 18).
 *
 * Serves the Vite-built SPA from /dist and provides a SPA fallback so
 * client-side routes (TanStack Router) reload correctly.
 *
 * NOTE: This server is a STATIC HOST ONLY. The QR redirect endpoints
 * (/q/:id, /r/:id), tenant resolution by Host, and scan tracking still
 * live on the Lovable / Cloudflare Workers deployment, because they
 * require server-side 302 responses and request-time Host inspection
 * that a client-side SPA cannot provide without latency penalties.
 *
 * Generate QR codes pointing at your Lovable deployment domain (or the
 * tenant's verified custom_domain) — that side handles the redirect.
 * This Express app handles the dashboard / app UI only.
 *
 * CommonJS on purpose: package.json does NOT set "type": "module", and
 * cPanel's Node 18 selector treats .js as CommonJS by default.
 */

const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Mount API routes (only if you add any).
try {
  const apiRouter = require('./routes/index.cjs');
  app.use('/api', apiRouter);
} catch (err) {
  if (err && err.code !== 'MODULE_NOT_FOUND') throw err;
  // No ./routes/index.js yet — that's fine, SPA-only deploy.
}

// Serve compiled SPA assets.
app.use(
  express.static(DIST_DIR, {
    index: false,
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      // Hashed Vite assets can be cached aggressively.
      if (/\.(js|css|woff2?|png|jpe?g|svg|webp|avif)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// SPA fallback: every non-file, non-/api request returns index.html.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(DIST_DIR, 'index.html'), (err) => {
    if (err) next(err);
  });
});

app.use((err, _req, res, _next) => {
  console.error('[server] error', err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT} (serving ${DIST_DIR})`);
});