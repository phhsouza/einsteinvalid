// Baixa snapshot de usuarios/ e setores/ do Firebase Realtime Database
// e escreve em backups/YYYY-MM-DD.json (data em America/Sao_Paulo).
// Requer variável FIREBASE_SERVICE_ACCOUNT no ambiente (JSON completo da chave).

import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!svcJson) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT env var');
  process.exit(1);
}

let svc;
try {
  svc = JSON.parse(svcJson);
} catch (e) {
  console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON:', e.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(svc),
  databaseURL: 'https://einsteinvalid-default-rtdb.firebaseio.com',
});

const db = admin.database();

const [uSnap, sSnap] = await Promise.all([
  db.ref('usuarios').once('value'),
  db.ref('setores').once('value'),
]);

const backup = {
  version: 1,
  exportedAt: Date.now(),
  exportedBy: 'github-action',
  usuarios: uSnap.val() || {},
  setores: sSnap.val() || {},
};

// Data do dia em America/Sao_Paulo (formato YYYY-MM-DD)
const dateStr = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const outDir = 'backups';
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${dateStr}.json`);
fs.writeFileSync(outPath, JSON.stringify(backup, null, 2));

const nUsers = Object.keys(backup.usuarios).length;
const nSectors = Object.keys(backup.setores).length;
console.log(`✓ Backup salvo: ${outPath}`);
console.log(`  Usuários: ${nUsers}`);
console.log(`  Setores:  ${nSectors}`);

await admin.app().delete();
