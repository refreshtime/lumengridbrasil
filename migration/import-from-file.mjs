/**
 * Importa usando base64 de arquivo (evita limite de arg shell)
 * Uso: node import-from-file.mjs <table> <sheetId> <sheetTitle> <b64file>
 */
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const [,, table, sheetId, sheetTitle, b64file] = process.argv;
const b64 = readFileSync(b64file, 'utf-8').trim();

// Redireciona para parse-and-insert passando os mesmos args
process.argv = [process.argv[0], process.argv[1], table, sheetId, sheetTitle, b64];

await import('./parse-and-insert.mjs');
