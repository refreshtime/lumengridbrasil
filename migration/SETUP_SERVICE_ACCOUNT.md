# Auto-Import Permanente — Service Account Google (5 min)

Mais simples que OAuth: sem fluxo de browser, sem token que expira.

---

## 1. Criar Service Account

1. Acesse: **console.cloud.google.com**
2. Selecione o projeto "LumenGrid" (ou crie se não existir)
3. Menu lateral → **APIs & Services → Library**
   - Ative **Google Sheets API** (se ainda não estiver)
   - Ative **Google Drive API** (se ainda não estiver)
4. Menu lateral → **APIs & Services → Credentials**
5. Clique **"+ CREATE CREDENTIALS" → Service account**
   - Nome: `lumengrid-import`
   - Clique **Create and continue** → **Done**
6. Na lista de service accounts, clique no que acabou de criar
7. Aba **Keys** → **Add Key → Create new key → JSON** → **Create**
8. Vai baixar um arquivo `.json` — salve como:

```
/Users/Hingrid/Documents/LUMENGRID/migration/google-service-account.json
```

---

## 2. Pegar o e-mail da Service Account

No passo 6 acima, copie o campo **"Email"** — vai ser algo como:
```
lumengrid-import@seuprojet.iam.gserviceaccount.com
```

---

## 3. Compartilhar o Drive com a Service Account

Abra o Google Drive → encontre a pasta raiz onde ficam as planilhas da LumenGrid.

Clique com botão direito → **Compartilhar** → cole o e-mail da service account → permissão **Viewer** → **Enviar**.

> Se as planilhas estiverem em drives diferentes, compartilhe cada uma individualmente.

---

## 4. Testar

```bash
cd /Users/Hingrid/Documents/LUMENGRID/migration
node auto-import.mjs --dry-run
```

Deve listar as planilhas encontradas sem escrever nada no banco.

Depois, sem `--dry-run`:

```bash
node auto-import.mjs
```

---

## 5. Ativar o cron diário (já está instalado)

O LaunchAgent já está em `~/Library/LaunchAgents/br.lumengrid.auto-import.plist` e roda todo dia às 7h15.

Se precisar recarregar:

```bash
launchctl unload ~/Library/LaunchAgents/br.lumengrid.auto-import.plist
launchctl load   ~/Library/LaunchAgents/br.lumengrid.auto-import.plist
```

Log em: `BACKUPS/import.log`

---

A partir daí: toda planilha nova ou modificada no Drive é importada automaticamente toda manha. Nenhuma acao manual necessaria.
