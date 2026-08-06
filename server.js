const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const SCRIPTS_DIR = path.join(__dirname, 'scripts_data');

if (!fs.existsSync(SCRIPTS_DIR)) {
  fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
}

app.use(express.text({ limit: '100mb' }));
app.use(express.json({ limit: '100mb' }));
app.use(express.static('public'));

// 1. Rebranding Aggresive: Cambia marcas y Discord a JP SCRIPTS
function personalizarScript(code) {
  let modifiedCode = code;

  // Reemplazar invitaciones de Discord
  const discordRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li|com\/invite))\/[a-zA-Z0-9_-]+/gi;
  modifiedCode = modifiedCode.replace(discordRegex, 'https://discord.gg/MD6aTg6Hjw');

  // Reemplazar títulos en propiedades de UI
  modifiedCode = modifiedCode.replace(/(\b(Title|TitleName|WindowName|HubName|Name|Header)\s*[:=]\s*["'])[^"']+(["'])/gi, '$1JP SCRIPTS$3');

  // Reemplazar llamados de funciones en librerías UI
  modifiedCode = modifiedCode.replace(/(:(CreateWindow|CreateLib|MakeWindow|NewWindow|AddWindow|Init)\s*\(\s*["'])[^"']+(["'])/gi, '$1JP SCRIPTS$3');

  // Reemplazar asignaciones a TextLabels (.Text = "...")
  modifiedCode = modifiedCode.replace(/(\.Text\s*=\s*["'])[^"']+(["'])/gi, (match, p1, p2) => {
    if (match.includes('http') || match.includes('discord.gg')) return match;
    return `${p1}JP SCRIPTS${p2}`;
  });

  return modifiedCode;
}

// 2. Escáner de Seguridad (Anti-Stealer y Trampas)
function analizarSeguridad(code) {
  const alertas = [];
  const lines = code.split(/\r?\n/);
  const palabrasRobo = ['trade', 'traderequest', 'accepttrade', 'confirmtrade', 'sendmail', 'gift', 'giftpet', 'sendgems', 'transfer', 'dropitem', 'sendpets', 'bankdeposit', 'stealloot', 'machine', 'fuse', 'deposit', 'pawn', 'vault', 'inventory', 'brainrot', 'steal', 'claim', 'give', 'offer', 'swap', 'moreira'];

  lines.forEach((lineText, idx) => {
    const numLinea = idx + 1;
    const cleanLine = lineText.toLowerCase();

    const esWebhookVar = /webhook/i.test(lineText);
    const esDiscordUrl = /discord\.com\/api/i.test(lineText) || /discordapp\.com\/api/i.test(lineText);
    const esEnvioHttp = /httpService|postasync|getasync|request\s*\(/i.test(lineText);

    if (esWebhookVar || esDiscordUrl) {
      alertas.push({
        tipo: 'WEBHOOK DETECTADO',
        mensaje: `🚨 **Línea ${numLinea}**: Uso de Webhook o canal de exfiltración de Discord.`,
        linea: lineText.trim()
      });
    } else if (esEnvioHttp && (cleanLine.includes('brainrot') || cleanLine.includes('server') || cleanLine.includes('player') || cleanLine.includes('data'))) {
      alertas.push({
        tipo: 'ENVÍO DE DATOS EXTERNO',
        mensaje: `🚨 **Línea ${numLinea}**: Envío masivo de datos mediante peticiones HTTP.`,
        linea: lineText.trim()
      });
    }

    const congelaJugador = /walkspeed\s*=\s*0|jumppower\s*=\s*0|anchored\s*=\s*true/i.test(lineText);
    const destruyeItems = /:destroy\s*\(\s*\)/i.test(lineText) && (cleanLine.includes('tool') || cleanLine.includes('backpack'));

    if (congelaJugador || destruyeItems) {
      alertas.push({
        tipo: 'TRAMPA / BLOQUEO DE JUGADOR',
        mensaje: `🚨 **Línea ${numLinea}**: El script inmoviliza al jugador o elimina objetos de su inventario.`,
        linea: lineText.trim()
      });
    }

    if (/:(FireServer|InvokeServer)\s*\(/i.test(lineText)) {
      const coincidePalabra = palabrasRobo.some(p => cleanLine.includes(p));
      if (coincidePalabra) {
        alertas.push({
          tipo: 'ROBO / AUTO-TRADE',
          mensaje: `🚨 **Línea ${numLinea}**: Llamada remota automática enviada al servidor.`,
          linea: lineText.trim()
        });
      }
    }

    if (/loadstring\s*\(/i.test(lineText)) {
      alertas.push({
        tipo: 'SCRIPT CERRADO',
        mensaje: `👁️ **Línea ${numLinea}**: Ejecución de código externo no verificado (\`loadstring\`).`,
        linea: lineText.trim()
      });
    }
  });

  return {
    esPeligroso: alertas.length > 0,
    detalles: alertas
  };
}

// Endpoint de subida
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

  const codePersonalizado = personalizarScript(source);
  const analist = analizarSeguridad(codePersonalizado);

  const id = Math.random().toString(36).substring(2, 10);
  const filePath = path.join(SCRIPTS_DIR, `${id}.txt`);

  try {
    fs.writeFileSync(filePath, codePersonalizado, 'utf-8');

    const host = req.get('host');
    const protocol = 'https';

    res.json({
      id: id,
      filename: filename,
      raw_url: `${protocol}://${host}/raw/${id}`,
      loadstring: `loadstring(game:HttpGet("${protocol}://${host}/raw/${id}"))()`,
      seguridad: analist
    });
  } catch (err) {
    console.error('Error guardando archivo:', err);
    res.status(500).json({ error: 'Error interno al guardar el script' });
  }
});

// Endpoint RAW compatible con Roblox
app.get('/raw/:id', (req, res) => {
  const scriptId = req.params.id.replace(/[^a-z0-9]/gi, '');
  const filePath = path.join(SCRIPTS_DIR, `${scriptId}.txt`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('-- Error: Script no encontrado o expirado');
  }

  try {
    const scriptContent = fs.readFileSync(filePath, 'utf-8');
    res.status(200).send(scriptContent);
  } catch (err) {
    res.status(500).send('-- Error interno al leer el script');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
