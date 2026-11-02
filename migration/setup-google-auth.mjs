/**
 * LUMENGRID — Setup OAuth Google (1x só)
 *
 * Uso: node setup-google-auth.mjs
 *
 * Pré-req: GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env
 * (console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client ID → Desktop app)
 */

import 'dotenv/config';
import { google } from 'googleapis';
import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH  = join(__dirname, '.env');

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error(`
❌  Faltam GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env

Como criar (5 minutos):
  1. Acesse: console.cloud.google.com
  2. Selecione ou crie um projeto
  3. APIs & Services → Enable APIs → ative "Google Sheets API" e "Google Drive API"
  4. APIs & Services → Credentials → "+ Create Credentials" → OAuth 2.0 Client ID
  5. Application type: "Desktop app" → Create
  6. Copie Client ID e Client Secret → cole no .env:
       GOOGLE_CLIENT_ID=...
       GOOGLE_CLIENT_SECRET=...
  7. Rode novamente: node setup-google-auth.mjs
`);
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3456/callback';

const oauth2 = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
});

console.log('\n🔐 Abrindo navegador para autenticação Google...\n');
exec(`open "${authUrl}"`);
console.log('Se não abriu, acesse:\n' + authUrl + '\n');

// Servidor local para capturar o callback
const server = createServer(async (req, res) => {
  if (!req.url.startsWith('/callback')) return;

  const code = new URL(req.url, 'http://localhost:3456').searchParams.get('code');

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h2>✅ Autenticado! Pode fechar esta aba.</h2>');
  server.close();

  try {
    const { tokens } = await oauth2.getToken(code);

    // Salva tokens no .env
    let envContent = readFileSync(ENV_PATH, 'utf-8');

    const set = (key, val) => {
      if (envContent.includes(`${key}=`)) {
        envContent = envContent.replace(new RegExp(`^${key}=.*`, 'm'), `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
    };

    set('GOOGLE_ACCESS_TOKEN',  tokens.access_token || '');
    set('GOOGLE_REFRESH_TOKEN', tokens.refresh_token || '');
    set('GOOGLE_TOKEN_EXPIRY',  tokens.expiry_date  || '');

    writeFileSync(ENV_PATH, envContent.trim() + '\n', 'utf-8');

    console.log('✅ Tokens salvos no .env!');
    console.log('\n🚀 Agora rode:  node auto-import.mjs\n');
  } catch (err) {
    console.error('❌ Erro ao obter tokens:', err.message);
  }
});

server.listen(3456, () => {
  console.log('Aguardando callback na porta 3456...');
});
