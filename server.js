const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Webhook de Discord integrada
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1540178315610955906/KsUMMM2-3Q6XuxVDmDuRp0vHyyBBl-T8pvfK5DieSydJywWjNGmTOmzZtuyRt1IeDdBt';

// Contraseña requerida para enviar archivos
const ADMIN_PASSWORD = 'JP SOURCES';

app.use(express.static('public'));

// Endpoint para recibir los archivos y reenviarlos intactos a Discord
app.post('/api/upload-webhook', upload.array('files'), async (req, res) => {
  try {
    const userPass = req.body.password;
    const files = req.files;

    // Verificar contraseña
    if (userPass !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No se seleccionó ningún archivo.' });
    }

    const form = new FormData();
    form.append('content', `📦 **Nuevos archivos enviados** (${files.length} archivo/s)`);

    // Adjuntar los archivos tal cual fueron recibidos (sin modificar nada)
    files.forEach((file, index) => {
      form.append(`files[${index}]`, file.buffer, { filename: file.originalname });
    });

    // Enviar directamente a Discord
    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    if (discordResponse.ok) {
      return res.json({ success: true, total: files.length });
    } else {
      const errorText = await discordResponse.text();
      console.error('Error Webhook Discord:', errorText);
      return res.status(500).json({ error: 'Discord rechazó la solicitud.' });
    }

  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

