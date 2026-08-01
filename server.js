const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DB_FILE = path.join(__dirname, 'database.json');

// Si no existe la base de datos, la crea
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

app.use(express.text({ limit: '100mb' }));
app.use(express.json({ limit: '100mb' }));
app.use(express.static('public'));

app.post('/api/upload', (req, res) => {
  const source = req.body.source || req.body;
  if (!source || typeof source !== 'string') {
    return res.status(400).json({ error: 'Código inválido' });
  }

  // Ofuscación básica compatible con Roblox (Base64 wrapper en Lua)
  const encodedLua = Buffer.from(source).toString('base64');
  const protectedScript = `-- Protected RAW\nlocal b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'\nfunction dec(data) data = string.gsub(data, '[^'..b..'=]', '') return (data:gsub('.', function(x) if (x == '=') then return '' end local r,f='',(b:find(x)-1) for i=6,1,-1 do r=r..(f%2^i>=2^(i-1) and '1' or '0') end return r end):gsub('%d%d%d%d%d%d%d%d', function(x) return string.char(tonumber(x,2)) end)) end\nloadstring(dec("${encodedLua}"))()`;

  const id = Math.random().toString(36).substring(2, 8);

  // Leer y guardar en disco
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    db[id] = protectedScript;
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');

    res.json({
      id: id,
      raw_url: `${protocol}://${host}/raw/${id}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Error guardando el script' });
  }
});

app.get('/raw/:id', (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const script = db[req.params.id];

    if (!script) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(404).send('-- Error: Script no encontrado');
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(script);
  } catch (err) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send('-- Error interno del servidor');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
