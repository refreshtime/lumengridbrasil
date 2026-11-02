# LumenGrid — Migração Google Sheets → Supabase

## Pré-requisitos

- Node.js 18+ instalado
- Conta Supabase criada (supabase.com — free tier)
- Projeto Google Cloud com Sheets API habilitada

---

## Passo 1 — Criar projeto Supabase

1. Acesse [supabase.com](https://supabase.com) → New Project
2. Nome: `lumengrid` · Região: South America (São Paulo)
3. Anote: **Project URL** e **anon key** (Settings → API)
4. Anote também a **service_role key** (usada só no script de migração)

---

## Passo 2 — Criar o schema

1. No Supabase Dashboard → **SQL Editor**
2. Cole o conteúdo de `schema.sql`
3. Clique em **Run** — deve criar 23 tabelas, 3 views, RLS e triggers

---

## Passo 3 — Configurar credenciais do Google

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto (ou use um existente)
3. Ative a **Google Sheets API**
4. Crie uma **Service Account** → gere uma chave JSON
5. Salve o JSON como `google-service-account.json` nesta pasta
6. Compartilhe cada planilha com o e-mail da service account (permissão de leitura)

---

## Passo 4 — Configurar variáveis

```bash
cp .env.example .env
```

Edite `.env` com:
- `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` (do passo 1)
- `SHEET_ID_*` (IDs das planilhas — parte da URL do Google Sheets)

---

## Passo 5 — Instalar dependências

```bash
npm install
```

---

## Passo 6 — Backup primeiro (sem tocar no banco)

```bash
node import-sheets.js --backup-only
```

Salva JSONs em `../BACKUPS/sheets_YYYYMMDD/`. Verifique se os dados estão corretos.

---

## Passo 7 — Importar para o Supabase

```bash
# Teste com dry-run (não escreve no banco)
DRY_RUN=true node import-sheets.js

# Importação real
node import-sheets.js

# Ou apenas uma planilha
node import-sheets.js --sheet crm
node import-sheets.js --sheet fin
node import-sheets.js --sheet contratos
node import-sheets.js --sheet parceiros
```

---

## Passo 8 — Validar

```bash
node validate.js
```

Compara contagens Sheet vs banco. Todos devem mostrar `✅ OK`.

---

## Passo 9 — Configurar admin.html

Edite as variáveis no topo de `../admin.html`:

```js
window.LG_SUPABASE_URL  = 'https://XXXX.supabase.co';
window.LG_SUPABASE_KEY  = 'eyJ...'; // anon key (NÃO a service_role)
window.LG_ADMIN_PASS    = 'sua-senha-segura';
```

Acesse `lumengridbrasil.com.br/admin.html` — o painel de busca estará funcional.

---

## O que NÃO muda (Princípio Zero Perda de Dados)

- Todas as Google Sheets continuam funcionando normalmente
- Todos os `.gs` backends continuam operando
- Todos os HTMLs existentes continuam apontando para os .gs
- O banco opera como **espelho de leitura** até a Fase 3
- Rollback: se qualquer problema, continue usando as Sheets — o admin.html simplesmente fica sem dados

---

## Fase 3 (próxima etapa — aprovação individual por ferramenta)

Cada ferramenta será conectada ao Supabase com fallback para o .gs existente:

| Ferramenta | Integração |
|-----------|-----------|
| `margem.html` | Busca kits do banco (fallback array local) |
| `gerador-solar-v3.html` | Busca kits do banco (fallback array local) |
| `CRM_LumenGrid.html` | Lê/escreve leads no Supabase (fallback CRM_Codigo.gs) |
| `contrato.html` | Escrita dupla: banco + Sheet |
| `dashboard.html` | Lê financeiro do banco |
| Portais parceiros | Lê/escreve indicações no banco |
