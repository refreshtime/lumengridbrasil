-- ============================================================================
--  LUMENGRID — Schema PostgreSQL (Supabase)
--  Execute no Supabase Dashboard → SQL Editor
--  Idempotente: pode rodar múltiplas vezes sem erro
-- ============================================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- busca por similaridade (ilike rápido)

-- ────────────────────────────────────────────────────────────────────────────
-- CORE
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  nome          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','viewer','partner')),
  password_hash TEXT,
  ativo         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- CRM
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                TEXT NOT NULL,
  telefone            TEXT,
  email               TEXT,
  cidade              TEXT,
  kwh                 NUMERIC(10,2),
  tipo_telhado        TEXT,
  sistema             TEXT CHECK (sistema IN ('on-grid','hibrido','wallbox','outro')),
  origem              TEXT,
  responsavel         TEXT,
  valor               NUMERIC(12,2),
  stage               TEXT DEFAULT 'Novo Lead',
  kwp                 NUMERIC(8,3),
  valor_projeto       NUMERIC(12,2),
  custo_equipamento   NUMERIC(12,2),
  custo_instalacao    NUMERIC(12,2),
  impostos            NUMERIC(12,2),
  margem_bruta        NUMERIC(12,2),
  pos_venda           TEXT,
  pct_comissao        NUMERIC(6,4),
  comissao_estimada   NUMERIC(12,2),
  lucro_empresa       NUMERIC(12,2),
  parceiro            TEXT,
  docs_folder         TEXT,
  -- dados brutos da Sheet migrada (preservação total)
  raw_json            JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_nome    ON leads USING gin(nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_tel     ON leads(telefone);
CREATE INDEX IF NOT EXISTS idx_leads_stage   ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_parceiro ON leads(parceiro);

CREATE TABLE IF NOT EXISTS lead_proposals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id       UUID REFERENCES leads(id) ON DELETE CASCADE,
  tipo          TEXT CHECK (tipo IN ('on-grid','hibrido')),
  kwp           NUMERIC(8,3),
  mod_qty       INT,
  mod_model     TEXT,
  mod_power     INT,
  inv_model     TEXT,
  inv_qty       INT,
  inv_power     INT,
  valor         NUMERIC(12,2),
  gen_kwh       NUMERIC(10,2),
  eco_monthly   NUMERIC(10,2),
  payback       NUMERIC(6,2),
  consultor     TEXT,
  bat_kwh       NUMERIC(8,2),
  bat_model     TEXT,
  bat_qty       INT,
  conexao       TEXT,
  inst_type     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id    UUID REFERENCES leads(id) ON DELETE CASCADE,
  texto      TEXT NOT NULL,
  usuario    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id    UUID REFERENCES leads(id) ON DELETE CASCADE,
  texto      TEXT NOT NULL,
  usuario    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_documents (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id    UUID REFERENCES leads(id) ON DELETE CASCADE,
  tipo       TEXT,
  nome       TEXT,
  link       TEXT,
  file_id    TEXT,
  usuario    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- CONTRATOS
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contracts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  num_contrato     TEXT UNIQUE,
  data_emissao     DATE,
  cliente          TEXT NOT NULL,
  cpf_cnpj         TEXT,
  telefone         TEXT,
  email            TEXT,
  tipo_sistema     TEXT,
  kvp              NUMERIC(8,3),
  valor_total      NUMERIC(12,2),
  forma_pagamento  TEXT,
  consultor        TEXT,
  status           TEXT DEFAULT 'Emitido',
  pasta_drive      TEXT,
  lead_id          UUID REFERENCES leads(id) ON DELETE SET NULL,
  raw_json         JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_cliente     ON contracts USING gin(cliente gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contracts_num         ON contracts(num_contrato);
CREATE INDEX IF NOT EXISTS idx_contracts_data        ON contracts(data_emissao);

CREATE TABLE IF NOT EXISTS contract_sales (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id      UUID REFERENCES contracts(id) ON DELETE CASCADE,
  data             DATE,
  modulo           TEXT,
  qtd_modulos      INT,
  inversor         TEXT,
  qtd_inversores   INT,
  bateria          TEXT,
  estrutura        TEXT,
  valor            NUMERIC(12,2),
  forma_pagamento  TEXT,
  consultor        TEXT
);

CREATE TABLE IF NOT EXISTS contract_purchases (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id  UUID REFERENCES contracts(id) ON DELETE CASCADE,
  data         DATE,
  custo_kit    NUMERIC(12,2),
  fornecedor   TEXT,
  observacoes  TEXT
);

-- ────────────────────────────────────────────────────────────────────────────
-- FINANCEIRO
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS financial_entries (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo                  TEXT NOT NULL CHECK (tipo IN ('receita','despesa','previsao')),
  situacao              TEXT DEFAULT 'Em aberto',
  descricao             TEXT NOT NULL,
  cliente_fornecedor    TEXT,
  categoria             TEXT,
  grupo_dre             TEXT,
  centro_custo          TEXT,
  contract_id           UUID REFERENCES contracts(id) ON DELETE SET NULL,
  num_contrato          TEXT,
  data_emissao          DATE,
  data_competencia      DATE,
  data_vencimento       DATE,
  valor_previsto        NUMERIC(12,2),
  parcela               INT,
  qtd_parcelas          INT,
  forma_pagamento       TEXT,
  conta                 TEXT,
  observacoes           TEXT,
  criado_por            TEXT,
  ativo                 BOOLEAN DEFAULT TRUE,
  raw_json              JSONB,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_cliente      ON financial_entries USING gin(cliente_fornecedor gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fin_tipo         ON financial_entries(tipo);
CREATE INDEX IF NOT EXISTS idx_fin_competencia  ON financial_entries(data_competencia);
CREATE INDEX IF NOT EXISTS idx_fin_contrato     ON financial_entries(num_contrato);

CREATE TABLE IF NOT EXISTS financial_settlements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id         UUID REFERENCES financial_entries(id) ON DELETE CASCADE,
  data_caixa       DATE,
  valor_principal  NUMERIC(12,2),
  juros_multa      NUMERIC(12,2) DEFAULT 0,
  desconto         NUMERIC(12,2) DEFAULT 0,
  tarifa           NUMERIC(12,2) DEFAULT 0,
  valor_liquido    NUMERIC(12,2),
  conta            TEXT,
  metodo           TEXT,
  comprovante      TEXT,
  conciliado       BOOLEAN DEFAULT FALSE,
  observacao       TEXT,
  criado_por       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entidade        TEXT NOT NULL,
  entidade_id     UUID,
  campo           TEXT,
  valor_anterior  TEXT,
  valor_novo      TEXT,
  usuario         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- PARCEIROS
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partners (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome       TEXT NOT NULL,
  slug       TEXT UNIQUE,
  email      TEXT,
  telefone   TEXT,
  ativo      BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_referrals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id          UUID REFERENCES partners(id) ON DELETE CASCADE,
  lead_id             UUID REFERENCES leads(id) ON DELETE SET NULL,
  nome                TEXT NOT NULL,
  telefone            TEXT,
  email               TEXT,
  endereco            TEXT,
  cidade              TEXT,
  data_indicacao      DATE DEFAULT CURRENT_DATE,
  status              TEXT DEFAULT 'Novo',
  kwp                 NUMERIC(8,3),
  valor_projeto       NUMERIC(12,2),
  custo_equipamento   NUMERIC(12,2),
  custo_instalacao    NUMERIC(12,2),
  homologacao         NUMERIC(12,2),
  impostos            NUMERIC(12,2),
  margem_liquida      NUMERIC(12,2),
  pct_comissao        NUMERIC(6,4),
  comissao_estimada   NUMERIC(12,2),
  comissao_paga       NUMERIC(12,2) DEFAULT 0,
  comissao_pendente   NUMERIC(12,2),
  lucro_empresa       NUMERIC(12,2),
  observacoes         TEXT,
  raw_json            JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_nome      ON partner_referrals USING gin(nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_referrals_partner   ON partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status    ON partner_referrals(status);

CREATE TABLE IF NOT EXISTS partner_notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id  UUID REFERENCES partners(id) ON DELETE CASCADE,
  mensagem    TEXT NOT NULL,
  lida        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- OPERACIONAL
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visit_checklists (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_visita        DATE,
  instalador         TEXT,
  cliente            TEXT,
  endereco           TEXT,
  cidade_uf          TEXT,
  tipo_projeto       TEXT,
  dados_telhado      JSONB DEFAULT '{}',
  dados_eletrica     JSONB DEFAULT '{}',
  dados_inversor     JSONB DEFAULT '{}',
  adequacoes         JSONB DEFAULT '{}',
  custo_instalacao   NUMERIC(12,2),
  custo_homologacao  NUMERIC(12,2),
  parecer_geral      TEXT,
  pasta_fotos        TEXT,
  lead_id            UUID REFERENCES leads(id) ON DELETE SET NULL,
  raw_json           JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_cliente ON visit_checklists USING gin(cliente gin_trgm_ops);

CREATE TABLE IF NOT EXISTS homologation_records (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instalador          TEXT,
  cliente             TEXT,
  endereco            TEXT,
  concessionaria      TEXT,
  data_instalacao     DATE,
  tipo_ligacao        TEXT,
  email_cliente       TEXT,
  telefone_cliente    TEXT,
  coordenadas         TEXT,
  inversor_info       JSONB DEFAULT '{}',
  modulo_info         JSONB DEFAULT '{}',
  pasta_drive         TEXT,
  videos              JSONB DEFAULT '[]',
  lead_id             UUID REFERENCES leads(id) ON DELETE SET NULL,
  raw_json            JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homo_cliente ON homologation_records USING gin(cliente gin_trgm_ops);

CREATE TABLE IF NOT EXISTS internal_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data          DATE DEFAULT CURRENT_DATE,
  nome          TEXT,
  tipo          TEXT,
  urgencia      TEXT DEFAULT 'Normal',
  descricao     TEXT,
  link_arquivo  TEXT,
  status        TEXT DEFAULT 'Pendente',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_leads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT,
  sobrenome     TEXT,
  email         TEXT,
  telefone      TEXT,
  estado        TEXT,
  cidade        TEXT,
  faixa_conta   TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  click_id      TEXT,
  importado_crm BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- PRECIFICAÇÃO DE KITS
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kit_pricing_ongrid (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  placas   INT NOT NULL,
  inversor TEXT,
  modulo   TEXT,
  equip    NUMERIC(12,2),
  promo    NUMERIC(12,2),
  src      TEXT DEFAULT 'manual',
  ativo    BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kit_og_placas ON kit_pricing_ongrid(placas) WHERE ativo = TRUE;

CREATE TABLE IF NOT EXISTS kit_pricing_hybrid (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  placas      INT NOT NULL,
  inversor    TEXT,
  modulo      TEXT,
  bats        INT DEFAULT 0,
  bat_modelo  TEXT,
  equip       NUMERIC(12,2),
  status      TEXT DEFAULT 'disponivel',
  ativo       BOOLEAN DEFAULT TRUE,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kit_hy_placas ON kit_pricing_hybrid(placas) WHERE ativo = TRUE;

-- ────────────────────────────────────────────────────────────────────────────
-- VIEWS ANALÍTICAS
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_project_margin AS
SELECT
  c.id,
  c.cliente,
  c.num_contrato,
  c.kvp,
  c.valor_total,
  COALESCE(SUM(cp.custo_kit), 0)                          AS custo_kit,
  c.valor_total - COALESCE(SUM(cp.custo_kit), 0)          AS margem_bruta,
  CASE WHEN c.valor_total > 0
       THEN ROUND((c.valor_total - COALESCE(SUM(cp.custo_kit),0)) / c.valor_total * 100, 2)
       ELSE 0 END                                          AS margem_pct,
  c.data_emissao,
  c.consultor,
  c.status
FROM contracts c
LEFT JOIN contract_purchases cp ON cp.contract_id = c.id
GROUP BY c.id;

CREATE OR REPLACE VIEW v_partner_commissions AS
SELECT
  p.nome                              AS parceiro,
  pr.nome                             AS cliente,
  pr.status,
  pr.valor_projeto,
  pr.pct_comissao,
  pr.comissao_estimada,
  pr.comissao_paga,
  COALESCE(pr.comissao_estimada, 0)
    - COALESCE(pr.comissao_paga, 0)   AS comissao_pendente,
  pr.data_indicacao,
  pr.updated_at
FROM partners p
JOIN partner_referrals pr ON pr.partner_id = p.id
WHERE pr.status NOT IN ('Cancelado','Descartado');

CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT
  DATE_TRUNC('month', data_competencia)  AS mes,
  SUM(CASE WHEN tipo = 'receita' THEN valor_previsto ELSE 0 END) AS receita_prevista,
  SUM(CASE WHEN tipo = 'despesa' THEN valor_previsto ELSE 0 END) AS despesa_prevista,
  COUNT(CASE WHEN tipo = 'receita' THEN 1 END)                   AS qtd_receitas,
  COUNT(CASE WHEN tipo = 'despesa' THEN 1 END)                   AS qtd_despesas
FROM financial_entries
WHERE ativo = TRUE
GROUP BY 1
ORDER BY 1 DESC;

-- ────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Ativa proteção: só usuários autenticados leem/escrevem
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_proposals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_history          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_sales        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_purchases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audit_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_checklists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE homologation_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_pricing_ongrid    ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_pricing_hybrid    ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados têm acesso total
-- (ajuste depois para roles mais granulares se necessário)
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'leads','lead_proposals','lead_history','lead_notes','lead_documents',
    'contracts','contract_sales','contract_purchases',
    'financial_entries','financial_settlements','financial_audit_log',
    'partners','partner_referrals','partner_notifications',
    'visit_checklists','homologation_records',
    'internal_requests','website_leads',
    'kit_pricing_ongrid','kit_pricing_hybrid','users'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS auth_all ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY auth_all ON %I FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)',
      tbl
    );
  END LOOP;
END $$;

-- Kits: leitura pública (anon) para que os geradores HTML possam ler sem login
DROP POLICY IF EXISTS anon_read_kits_og ON kit_pricing_ongrid;
CREATE POLICY anon_read_kits_og ON kit_pricing_ongrid
  FOR SELECT TO anon USING (ativo = TRUE);

DROP POLICY IF EXISTS anon_read_kits_hy ON kit_pricing_hybrid;
CREATE POLICY anon_read_kits_hy ON kit_pricing_hybrid
  FOR SELECT TO anon USING (ativo = TRUE);

-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGERS — updated_at automático
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'leads','lead_proposals','contracts',
    'financial_entries','partner_referrals',
    'kit_pricing_ongrid','kit_pricing_hybrid'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl
    );
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- DADOS INICIAIS — Parceiros conhecidos
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO partners (nome, slug, ativo) VALUES
  ('Michael',  'michael',  TRUE),
  ('Jessica',  'jessica',  TRUE),
  ('Orlando',  'orlando',  TRUE),
  ('DDEG',     'ddeg',     TRUE)
ON CONFLICT (slug) DO NOTHING;
