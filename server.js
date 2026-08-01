const express = require('express');
const path = require('path');

const app = express();

app.use(express.text({ limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Endpoint para decodificar y servir en RAW directo
app.get('/raw', (req, res) => {
  const code = req.query.code;
  if (!code) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(400).send('-- Error: Código no proporcionado');
  }

  try {
    const rawLua = Buffer.from(code, 'base64').toString('utf-8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(rawLua);
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(400).send('-- Error al decodificar script');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
