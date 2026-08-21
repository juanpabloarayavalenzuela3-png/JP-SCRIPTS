const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

// Aumentar el límite de tamaño a 50MB por archivo
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1540178315610955906/KsUMMM2-3Q6XuxVDmDuRp0vHyyBBl-T8pvfK5DieSydJywWjNGmTOmzZtuyRt1IeDdBt';
const ADMIN_PASSWORD = 'JP SOURCES';

app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.post('/api/upload-webhook', upload.array('files'), async (req, res) => {
  try {
    const userPass = req.body.password;
    const files = req.files;

    if (userPass !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No se envió ningún archivo.' });
    }

    const form = new FormData();
    form.append('content', `📄 **Archivo:** \`${files[0].originalname}\``);
    form.append('files[0]', files[0].buffer, { filename: files[0].originalname });

    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    if (discordResponse.ok) {
      return res.json({ success: true });
    } else {
      const errorText = await discordResponse.text();
      console.error('Error Webhook Discord:', errorText);
      return res.status(discordResponse.status).json({ error: 'Discord rechazó el archivo.' });
    }

  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: 'Error del servidor o archivo muy pesado.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
