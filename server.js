const express = require('express');
const path = require('path');
const { generateLuaWrapper } = require('./encoder');

const app = express();

app.use(express.text({ limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const scriptsDB = new Map();

app.post('/api/upload', (req, res) => {
  const source = req.body.source || req.body;
  if (!source || typeof source !== 'string') {
    return res.status(400).json({ error: 'Source inválida' });
  }

  const id = Math.random().toString(36).substring(2, 9);
  const protectedScript = generateLuaWrapper(source);
  scriptsDB.set(id, protectedScript);

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');

  res.json({
    id: id,
    raw_url: `${protocol}://${host}/raw/${id}`
  });
});

app.get('/raw/:id', (req, res) => {
  const script = scriptsDB.get(req.params.id);
  if (!script) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(404).send('-- Error: Script no encontrado');
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(script);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
