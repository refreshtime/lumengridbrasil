# Próximos Passos — Ecossistema LumenGrid
*Documento de continuidade — onde parar e como continuar*

---

## Situação atual (o que já existe)

As Fases 0, 1 e 2 estão **prontas em código**. O banco ainda não foi criado porque precisa da sua ação manual em dois sites. Nada do que existe hoje foi quebrado.

```
✅ migration/schema.sql        — schema completo do banco (23 tabelas)
✅ migration/import-sheets.js  — importa suas Sheets para o banco
✅ migration/validate.js       — confirma que os dados chegaram
✅ admin.html                  — painel de busca + gestão de kits
✅ portal.html                 — link pro admin adicionado
✅ CLAUDE.md                   — regra permanente registrada
⏳ Banco Supabase              — precisa ser criado por você (Passo 1)
⏳ Google Service Account      — precisa ser criada por você (Passo 3)
```

---

## PASSO 1 — Criar o banco Supabase
**Quem faz:** Você, no site do Supabase
**Custo:** Grátis (free tier: 500MB, backups diários, sem cartão)
**Tempo:** ~5 minutos

### O que fazer:
1. Acesse **supabase.com** e crie uma conta (pode logar com Google)
2. Clique em **New Project**
   - Nome: `lumengrid`
   - Database Password: crie uma senha forte (anote em local seguro)
   - Region: **South America (São Paulo)**
3. Aguarde ~2 minutos o projeto inicializar
4. Vá em **Settings → API** e anote:
   - **Project URL** → parece `https://abcdefgh.supabase.co`
   - **anon public key** → chave longa começando com `eyJ...`
   - **service_role key** → outra chave longa (use só no script de migração, nunca no HTML público)

### O que o Claude faz depois:
Nada novo — o `schema.sql` já está pronto. Você só cola no Supabase.

---

## PASSO 2 — Criar o schema no banco
**Quem faz:** Você, dentro do Supabase
**Custo:** Grátis
**Tempo:** 2 minutos

### O que fazer:
1. No Supabase Dashboard → clique em **SQL Editor** (ícone de código no menu lateral)
2. Clique em **New query**
3. Abra o arquivo `migration/schema.sql` (está na sua pasta LUMENGRID/migration/)
4. Copie todo o conteúdo e cole no editor do Supabase
5. Clique em **Run** (ou Ctrl+Enter)
6. Deve aparecer "Success" — isso cria as 23 tabelas, índices, RLS e triggers

> Se aparecer algum erro vermelho, copie a mensagem de erro e cole para o Claude resolver.

---

## PASSO 3 — Configurar acesso às Google Sheets
**Quem faz:** Você, no Google Cloud Console
**Custo:** Grátis
**Tempo:** ~10 minutos (parte mais técnica)

Isso é necessário para que o script de migração consiga LER suas Sheets automaticamente.

### O que fazer:
1. Acesse **console.cloud.google.com** (logue com sua conta Google)
2. Crie um projeto novo (botão no topo → "New Project") ou use um existente
   - Nome: `lumengrid-migration`
3. No menu lateral → **APIs & Services → Library**
   - Pesquise "Google Sheets API" → clique → **Enable**
4. No menu lateral → **APIs & Services → Credentials**
   - Clique em **Create Credentials → Service Account**
   - Nome: `lumengrid-sheets-reader`
   - Role: `Viewer` (só leitura)
   - Clique em **Done**
5. Clique na service account criada → aba **Keys** → **Add Key → Create new key → JSON**
   - Vai baixar um arquivo `.json` — salve como `google-service-account.json` dentro da pasta `LUMENGRID/migration/`
6. Anote o **e-mail** da service account (parece `lumengrid-sheets-reader@seu-projeto.iam.gserviceaccount.com`)
7. Para cada uma das suas Google Sheets:
   - Abra a planilha → **Compartilhar** → cole o e-mail da service account → permissão **Leitor** → Enviar

> **Não precisa pagar nada.** A API do Google Sheets é gratuita para esse volume de uso.

### O que o Claude faz depois:
Nada — o script já está pronto. Só precisa do arquivo JSON no lugar certo.

---

## PASSO 4 — Configurar o arquivo .env
**Quem faz:** Você, editando um arquivo de texto
**Custo:** Grátis
**Tempo:** 5 minutos

### O que fazer:
1. Abra o arquivo `LUMENGRID/migration/.env.example` em qualquer editor de texto (TextEdit, VS Code, etc.)
2. Copie o conteúdo e salve como `.env` (sem o `.example`) na mesma pasta
3. Preencha os campos:

```
SUPABASE_URL=https://XXXX.supabase.co          ← do Passo 1
SUPABASE_SERVICE_KEY=eyJ...                     ← service_role key do Passo 1
GOOGLE_SA_KEY_FILE=./google-service-account.json ← já está correto
SHEET_ID_CRM=1LTv6dFRT56533gfPc5elNfxiddsUzgYyLbCLsNykyRQ  ← já pré-preenchido
SHEET_ID_FIN=1yCgNm9BMHjnrOFs9_txBpik3nnR4GVivs8F3m-QqiWw  ← já pré-preenchido
SHEET_ID_CONTRATOS=145EgaXS8Jz1i5NEAWPhHJ9SoOE-Tzs9247vYsrxIR2o ← já pré-preenchido
SHEET_ID_PARCEIROS=1PoXQTLBfciYHSqQZn1ryHEx_0C6TQn5jDDyGNavGLuo ← já pré-preenchido
```

Os IDs das outras planilhas (LEADS, CHECKLIST, VIDEOS) você pega na URL de cada sheet.

> **Não suba o `.env` para o git.** Ele já está no `.gitignore`.

---

## PASSO 5 — Instalar Node.js (se não tiver)
**Quem faz:** Você
**Custo:** Grátis
**Tempo:** 5 minutos

### Verificar se já tem:
Abra o Terminal (Cmd+Espaço → Terminal) e digite:
```
node --version
```
Se aparecer `v18.x.x` ou maior, pode pular este passo.

### Se não tiver:
1. Acesse **nodejs.org** → clique em **LTS** → baixe o instalador para macOS
2. Instale normalmente
3. Feche e reabra o Terminal

---

## PASSO 6 — Rodar o script de importação
**Quem faz:** Você, no Terminal
**Custo:** Grátis
**Tempo:** 2-5 minutos

Abra o Terminal e rode os comandos na ordem:

```bash
# Navegar até a pasta
cd /Users/Hingrid/Documents/LUMENGRID/migration

# Instalar dependências (só precisa fazer uma vez)
npm install

# PRIMEIRO: só fazer backup local (não mexe no banco ainda)
node import-sheets.js --backup-only
```

Verifique a pasta `LUMENGRID/BACKUPS/sheets_YYYYMMDD/` — deve ter vários arquivos `.json` com seus dados.

Se os dados estiverem corretos:
```bash
# Importar para o Supabase
node import-sheets.js
```

> Se aparecer qualquer erro vermelho, copie e cole para o Claude.

---

## PASSO 7 — Validar
**Quem faz:** Você, no Terminal
**Custo:** Grátis
**Tempo:** 1 minuto

```bash
node validate.js
```

Deve aparecer uma tabela com ✅ OK em todos os itens. Se tiver ❌ em algum, cole a saída para o Claude ajustar.

---

## PASSO 8 — Ativar o admin.html
**Quem faz:** Claude (você só fornece as chaves)
**Custo:** Grátis
**Tempo:** 2 minutos com Claude

### O que você precisa ter em mãos:
- A **Project URL** do Supabase (do Passo 1)
- A **anon key** do Supabase (do Passo 1)
- Uma senha que você queira usar para acessar o admin

### O que fazer:
Abra uma conversa com o Claude e diga:
> "Preencha as variáveis do admin.html com esses dados:
> URL: https://xxxx.supabase.co
> Key: eyJ...
> Senha: minhasenha"

O Claude edita o arquivo e faz o `git push`. Pronto — o admin estará em `lumengridbrasil.com.br/admin.html`.

---

## FASE 3 — Cadeia automática (fase futura)
**Quem faz:** Claude, com sua aprovação ferramenta por ferramenta
**Custo:** Zero (nenhum serviço novo — só conecta o que já existe ao banco)
**Tempo:** ~1 sessão por ferramenta

Quando o banco estiver funcionando e validado, você pode pedir ao Claude:

> "Conecta o CRM ao Supabase com fallback para o Google Sheets"
> "Conecta o gerador de proposta ao Supabase"
> "Quando fechar venda no CRM, criar lançamento financeiro automaticamente"

Cada integração mantém o fallback — se o Supabase estiver offline, continua usando o Google Sheets.

---

## Resumo: o que precisa de você vs o que o Claude faz

| Tarefa | Quem faz | Onde | Custo |
|--------|----------|------|-------|
| Criar conta Supabase | **Você** | supabase.com | Grátis |
| Criar projeto Supabase | **Você** | supabase.com | Grátis |
| Rodar schema.sql | **Você** | Supabase Dashboard | Grátis |
| Criar Service Account Google | **Você** | console.cloud.google.com | Grátis |
| Baixar chave JSON | **Você** | Google Cloud | Grátis |
| Compartilhar Sheets com service account | **Você** | Google Sheets | Grátis |
| Preencher o .env | **Você** | TextEdit / VS Code | Grátis |
| Instalar Node.js | **Você** | nodejs.org | Grátis |
| Rodar npm install + import + validate | **Você** | Terminal | Grátis |
| Preencher admin.html com as chaves | **Claude** | — | Já incluso |
| Fase 3 — conectar cada ferramenta | **Claude** | — | Já incluso |
| Qualquer erro ou ajuste no caminho | **Claude** | — | Já incluso |

**Nenhuma assinatura nova é necessária.**
- Supabase free tier: suficiente para o volume da LumenGrid por anos
- Google Sheets API: gratuita
- Node.js: gratuito
- Claude Code: você já usa
- GitHub Pages: você já usa

---

## Se travar em algum passo

Cole para o Claude exatamente:
1. Em qual passo você está
2. O que você fez
3. O erro ou mensagem que apareceu (print ou copia o texto)

O Claude resolve sem precisar de nenhum outro serviço.
