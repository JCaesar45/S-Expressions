import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSexpr, SExprError } from './src/parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/parse', (req, res) => {
  const { source } = req.body ?? {};

  if (typeof source !== 'string') {
    return res.status(400).json({
      ok: false,
      error: 'Request body must include a "source" string.'
    });
  }

  try {
    const result = parseSexpr(source);
    res.json({ ok: true, result });
  } catch (err) {
    if (err instanceof SExprError) {
      return res.status(422).json({
        ok: false,
        error: err.message,
        position: err.position
      });
    }
    res.status(500).json({ ok: false, error: 'Internal parser failure.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'sexpr-workbench', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`sexpr-workbench listening on http://localhost:${PORT}`);
});
