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

// 1. Rebranding: Cambiar Marca a JP SCRIPTS y reemplazar links de Discord
function personalizarScript(code) {
  let modifiedCode = code;

  // Reemplazar enlaces de invitación de Discord por el tuyo
  const discordRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li|com\/invite))\/[a-zA-Z0-9_-]+/gi;
  modifiedCode = modifiedCode.replace(discordRegex, 'discord.gg/MD6aTg6Hjw');

  // Reemplazar títulos de interfaz y ventanas por "JP SCRIPTS"
  modifiedCode = modifiedCode.replace(/(\b(Title|Name|WindowName|HubName)\s*[:=]\s*["'])[^"']+(["'])/gi, '$1JP SCRIPTS$3');

  // Reemplazar textos en la inicialización de librerías UI
  modifiedCode = modifiedCode.replace(/(:(MakeWindow|CreateWindow|CreateLib|NewWindow|AddWindow)\s*\(\s*\{?\s*["'])[^"']+(["'])/gi, '$1JP SCRIPTS$3');

  return modifiedCode;
}

// 2. Escáner de Ultra-Precisión: Muestra alertas y las líneas exactas detectadas
function analizarSeguridad(code) {
  const alertas = [];
  const lines = code.split(/\r?\n/);

  // Palabras asociadas a robo / transferencias
  const palabrasRobo = [
    'trade', 'traderequest', 'accepttrade', 'confirmtrade', 
    'sendmail', 'gift', 'giftpet', 'sendgems', 'transfer', 
    'dropitem', 'sendpets', 'bankdeposit', 'stealloot',
    'machine', 'fuse', 'deposit', 'pawn', 'vault', 'inventory',
    'brainrot', 'steal', 'claim', 'give', 'offer', 'swap'
  ];

  // A. Búsqueda de Webhook y Exfiltración de Datos
  lines.forEach((lineText, idx) => {
    const numLinea = idx + 1;
    const cleanLine = lineText.toLowerCase();

    // Detección de Webhooks o Peticiones HTTP Sospechosas
    const tieneWebhook = /discord\.com\/api\/webhooks/i.test(lineText) || 
                         /discordapp\.com\/api\/webhooks/i.test(lineText) || 
                         /your webhook/i.test(lineText);

    const esEnvioHttp = /httpPost|PostAsync|request\s*\(/i.test(lineText);
    const contienePalabraSospechosa = cleanLine.includes('brainrot') || 
                                     cleanLine.includes('cookie') || 
                                     cleanLine.includes('server') || 
                                     cleanLine.includes('webhook');

    if (tieneWebhook || (esEnvioHttp && contienePalabraSospechosa)) {
      alertas.push({
        tipo: 'WEBHOOK / STEALER',
        mensaje: `🚨 **Línea ${numLinea}**: Detección de Webhook o exfiltración de datos hacia servidor externo.`,
        linea: lineText.trim()
      });
    }

    // Detección de Robo / Auto-Trade vía FireServer o InvokeServer
    if (/:(FireServer|InvokeServer)\s*\(/i.test(lineText)) {
      const coincidePalabra = palabrasRobo.some(p => cleanLine.includes(p));
      if (coincidePalabra) {
        alertas.push({
          tipo: 'ROBO / AUTO-TRADE',
          mensaje: `🚨 **Línea ${numLinea}**: Envío automático de evento al servidor con función de transferencia/robo.`,
          linea: lineText.trim()
        });
      }
    }

    // Detección de Bucle sospechoso con llamadas al servidor
    if (/(for\s+|while\s+).*:?(FireServer|InvokeServer)/i.test(lineText)) {
      alertas.push({
        tipo: 'BUCLE DE EXPULSIÓN/ENVÍO',
        mensaje: `🚨 **Línea ${numLinea}**: Bucle que ejecuta peticiones automáticas al servidor.`,
        linea: lineText.trim()
      });
    }

    // Detección de Código Cerrado (loadstring)
    if (/loadstring\s*\(/i.test(lineText)) {
      alertas.push({
        tipo: 'LOADSTRING / SCRIPT CERRADO',
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

// Endpoint para recibir y procesar scripts
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

  // Rebranding
  const codePersonalizado = personalizarScript(source);

  // Análisis
  const analist = analizarSeguridad(codePersonalizado);

  // Guardar archivo
  const id = Math.random().toString(36).substring(2, 10);
  const filePath = path.join(SCRIPTS_DIR, `${id}.txt`);

  try {
    fs.writeFileSync(filePath, codePersonalizado, 'utf-8');

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');

    res.json({
      id: id,
      filename: filename,
      raw_url: `${protocol}://${host}/raw/${id}`,
      seguridad: analist
    });
  } catch (err) {
    console.error('Error guardando archivo:', err);
    res.status(500).json({ error: 'Error interno al guardar el script' });
  }
});

// Endpoint RAW directo
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
