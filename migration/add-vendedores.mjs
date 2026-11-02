import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.hbhkftdsfmlxgxsblerc.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '+#x8TsNZhtB6/P&',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  family: 4
});

const sql = `
CREATE TABLE IF NOT EXISTS vendedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cpf TEXT,
  cnpj_mei TEXT,
  email TEXT,
  telefone TEXT,
  territorio TEXT,
  comissao_pct NUMERIC(5,2) DEFAULT 5.00,
  ativo BOOLEAN DEFAULT TRUE,
  raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendedores_cpf ON vendedores(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendedores_nome ON vendedores(nome);
`;

console.log('Conectando ao banco...');
await client.connect();
console.log('Criando tabela vendedores...');
await client.query(sql);
console.log('Tabela vendedores criada com sucesso!');
await client.end();
