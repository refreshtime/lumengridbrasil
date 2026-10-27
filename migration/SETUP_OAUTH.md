# Setup OAuth Google — 5 minutos

## 1. Criar credenciais (1x só)

1. Acesse: **console.cloud.google.com**
2. No topo, selecione o projeto ou crie um novo (ex: "LumenGrid")
3. Menu lateral → **APIs & Services → Library**
   - Busque e ative: **Google Sheets API**
   - Busque e ative: **Google Drive API**
4. Menu lateral → **APIs & Services → Credentials**
5. Clique em **"+ CREATE CREDENTIALS"** → **OAuth 2.0 Client ID**
   - Application type: **Desktop app**
   - Name: `LumenGrid Import`
   - Clique **Create**
6. Copie o **Client ID** e **Client Secret** que aparecem

## 2. Colar no .env

Abra `/Users/Hingrid/Documents/LUMENGRID/migration/.env` e adicione:

```
GOOGLE_CLIENT_ID=SEU_CLIENT_ID_AQUI
GOOGLE_CLIENT_SECRET=SEU_CLIENT_SECRET_AQUI
```

## 3. Autenticar (1x só)

```bash
cd /Users/Hingrid/Documents/LUMENGRID/migration
node setup-google-auth.mjs
```

Vai abrir o navegador → login com **comercial@lumengridbrasil.com.br** → autorizar.
O token fica salvo automaticamente no `.env`.

## 4. Testar

```bash
node auto-import.mjs --dry-run   # simula sem escrever
node auto-import.mjs             # importa de verdade
```

## 5. Ativar cron diário (7h15 todo dia)

```bash
cp br.lumengrid.auto-import.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/br.lumengrid.auto-import.plist
```

A partir daí: toda planilha nova ou modificada no Drive é importada automaticamente toda manhã.
Log em: `BACKUPS/import.log`
