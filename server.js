const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const SCRIPTS_DIR = path.join(__dirname, 'scripts_data');

// Crear la carpeta para almacenar los scripts si no existe
if (!fs.existsSync(SCRIPTS_DIR)) {
  fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
}

app.use(express.text({ limit: '100mb' }));
app.use(express.json({ limit: '100mb' }));
app.use(express.static('public'));

// Endpoint para guardar un script
app.post('/api/upload', (req, res) => {
  let source = '';
  let filename = 'script';

  if (typeof req.body === 'object' && req.body !== null) {
    source = req.body.source || '';
    filename = req.body.filename || 'script';
  } else {
    source = req.body;
  }

  if (!source || typeof source !== 'string' || source.trim().length === 0) {
    return res.status(400).json({ error: 'El script está vacío o es inválido' });
  }

  // Generar ID único de 8 caracteres
  const id = Math.random().toString(36).substring(2, 10);
  const filePath = path.join(SCRIPTS_DIR, `${id}.txt`);

  try {
    // Guardar el código en un archivo individual (preservando UTF-8 exacto)
    fs.writeFileSync(filePath, source, 'utf-8');

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');

    res.json({
      id: id,
      filename: filename,
      raw_url: `${protocol}://${host}/raw/${id}`
    });
  } catch (err) {
    console.error('Error guardando archivo:', err);
    res.status(500).json({ error: 'Error interno al guardar el script' });
  }
});

// Endpoint RAW directo para Roblox / Delta
app.get('/raw/:id', (req, res) => {
  const scriptId = req.params.id.replace(/[^a-z0-9]/gi, '');
  const filePath = path.join(SCRIPTS_DIR, `${scriptId}.txt`);

  if (!fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(404).send('-- Error: Script no encontrado o expirado');
  }

  try {
    const scriptContent = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(scriptContent);
  } catch (err) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(500).send('-- Error interno al leer el script');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
