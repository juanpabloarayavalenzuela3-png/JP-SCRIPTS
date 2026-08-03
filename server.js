// Función para reemplazar CUALQUIER nombre de Hub/Script y enlaces de Discord
function personalizarScript(code) {
  let modifiedCode = code;

  // 1. Reemplazar cualquier enlace de Discord por el tuyo
  const discordRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li|com\/invite))\/[a-zA-Z0-9_-]+/gi;
  modifiedCode = modifiedCode.replace(discordRegex, 'discord.gg/MD6aTg6Hjw');

  // 2. Reemplazar CUALQUIER nombre de ventana/UI (Title, Name, Window, Header, etc.) por "JP SCRIPTS"
  // Funciona con librerías como Orion, Kavo, Rayfield, Fluent, WindUI, etc.
  modifiedCode = modifiedCode.replace(/(\b(Title|Name|WindowName|HubName)\s*[:=]\s*["'])[^"']+(["'])/gi, '$1JP SCRIPTS$3');

  // 3. Reemplazar llamadas a librerías de UI donde el primer texto es el nombre de la interfaz
  // Ejemplo: MakeWindow({Name = "blees"}), CreateLib("blees"), Library.New("blees")
  modifiedCode = modifiedCode.replace(/(:(MakeWindow|CreateWindow|CreateLib|NewWindow|AddWindow)\s*\(\s*\{?\s*["'])[^"']+(["'])/gi, '$1JP SCRIPTS$3');

  return modifiedCode;
}
