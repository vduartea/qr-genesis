/**
 * Optional API router. Add Express endpoints here only if your SPA
 * needs server-side helpers that don't already exist in Supabase.
 *
 * Most data access should go directly to Supabase from the browser
 * using the anon key (RLS protects it). Avoid duplicating logic here.
 */

const express = require('express');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

module.exports = router;