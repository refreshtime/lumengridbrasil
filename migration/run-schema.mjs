import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
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

const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

console.log('Conectando ao banco...');
await client.connect();
console.log('Conectado. Rodando schema...');
await client.query(sql);
console.log('Schema criado com sucesso!');
await client.end();
