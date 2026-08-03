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

// Función para reemplazar marca y Discord en el código Lua
function personalizarScript(code) {
  let modifiedCode = code;

  // 1. Reemplazar cualquier enlace de Discord por el tuyo
  const discordRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li|com\/invite))\/[a-zA-Z0-9_-]+/gi;
  modifiedCode = modifiedCode.replace(discordRegex, 'discord.gg/MD6aTg6Hjw');

  // 2. Reemplazar CUALQUIER nombre de ventana/UI (Title, Name, WindowName, HubName) por "JP SCRIPTS"
  modifiedCode = modifiedCode.replace(/(\b(Title|Name|WindowName|HubName)\s*[:=]\s*["'])[^"']+(["'])/gi, '$1JP SCRIPTS$3');

  // 3. Reemplazar llamadas a librerías de UI donde el primer texto es el nombre de la interfaz
  modifiedCode = modifiedCode.replace(/(:(MakeWindow|CreateWindow|CreateLib|NewWindow|AddWindow)\s*\(\s*\{?\s*["'])[^"']+(["'])/gi, '$1JP SCRIPTS$3');

  return modifiedCode;
}

// Escáner especializado en Auto-Trade Stealers y Robo de Objetos
function analizarSeguridad(code) {
  const alertas = [];
  const cleanCode = code.toLowerCase();

  const remotosRobo = [
    'trade', 'traderequest', 'accepttrade', 'confirmtrade', 'additem', 
    'sendmail', 'gift', 'giftpet', 'sendgems', 'transfer', 'dropitem',
    'deposit', 'withdraw', 'sendpets', 'bankdeposit'
  ];

  const tieneRemotos = /:(fireserver|invokeserver)\s*\(/i.test(code);
  const detectaPalabrasTrade = remotosRobo.some(word => cleanCode.includes(word));

  if (tieneRemotos && detectaPalabrasTrade) {
    alertas.push("🚨 **ALERTA DE AUTO-TRADE / ROBO DE OBJETOS**: El script intenta activar eventos de Trade, Regalo o Gemas.");
  }

  const fuerzaAceptacion = /(accept|confirm|ready).*(fireserver|invokeserver|mousebutton1click)/i.test(code);
  if (fuerzaAceptacion) {
    alertas.push("⚠️ **ACEPTACIÓN AUTOMÁTICA**: Detectada lógica para aceptar/confirmar intercambios automáticamente.");
  }

  const paralizaJugador = /walkspeed\s*=\s*0/i.test(code) || /jumppower\s*=\s*0/i.test(code);
  const ocultaUI = /enabled\s*=\s*false/i.test(code) && (cleanCode.includes('trade') || cleanCode.includes('gui'));

  if (paralizaJugador || ocultaUI) {
    alertas.push("🔒 **INMOVILIZACIÓN / OCULTAMIENTO**: Intenta congelar a tu personaje o GUI durante el tradeo.");
  }

  const tieneLoadstring = /loadstring\s*\(\s*(game|httpget|cloneref|request)/i.test(code) || 
                          /loadstring\s*\(\s*game:httpget/i.test(code) ||
                          /loadstring\s*\(/i.test(code);

  if (tieneLoadstring) {
    alertas.push("👁️ **SCRIPT ANIDADO**: Contiene un `loadstring(...)` interno que ejecuta código remoto secundario.");
  }

  return {
    esPeligroso: alertas.length > 0,
    detalles: alertas
  };
}

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

  // 1. Aplicar Rebranding
  const codePersonalizado = personalizarScript(source);

  // 2. Analizar la seguridad del script
  const analist = analizarSeguridad(codePersonalizado);

  // Generar ID único
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
