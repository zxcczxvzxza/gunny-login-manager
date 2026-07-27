// One-time migration: export a license key's accounts + templates from the old
// MongoDB (`qltk` db) into the local-store JSON schema used by Gunny Login Manager.
//
// Usage:
//   node scripts/export-accounts-from-mongo.mjs                 # auto-pick key if only one has accounts
//   node scripts/export-accounts-from-mongo.mjs --key TT-XXXX-XXXX-XXXX
//   node scripts/export-accounts-from-mongo.mjs --keyId <objectId>
//   node scripts/export-accounts-from-mongo.mjs --out ./migration-output
//
// MONGODB_URI is read from .env / environment. The `mongodb` dependency must still
// be installed when this runs (it is removed from the app later in Phase 4).

import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--key') args.key = argv[++i];
    else if (a === '--keyId') args.keyId = argv[++i];
    else if (a === '--out') args.out = argv[++i];
  }
  return args;
}

// Where the running app reads its data. app.getName() resolves to the package.json
// productName ("Gunny Login Manager"), so userData is %APPDATA%/Gunny Login Manager.
function defaultOutDir() {
  const appData =
    process.env.APPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Roaming');
  return path.join(appData, 'Gunny Login Manager');
}

async function resolveKeyId(db, args) {
  const keysCol = db.collection('keys');
  const accountsCol = db.collection('accounts');

  if (args.keyId) return new ObjectId(args.keyId);

  if (args.key) {
    const doc = await keysCol.findOne({ keys: args.key.trim() });
    if (!doc) throw new Error(`Không tìm thấy key "${args.key}" trong collection keys.`);
    return doc._id;
  }

  // No key specified: list keys with their account counts, auto-pick if exactly one has accounts.
  const keys = await keysCol.find({}).toArray();
  const withCounts = [];
  for (const k of keys) {
    const count = await accountsCol.countDocuments({ keyId: k._id });
    withCounts.push({ id: k._id, keys: k.keys, email: k.email || '', count });
  }
  withCounts.sort((a, b) => b.count - a.count);

  console.log('\nCác key tìm thấy (accounts):');
  for (const k of withCounts) {
    console.log(`  ${k.keys}  | email=${k.email || '-'} | accounts=${k.count} | _id=${k.id}`);
  }

  const nonEmpty = withCounts.filter((k) => k.count > 0);
  if (nonEmpty.length === 1) {
    console.log(`\n→ Tự động chọn key duy nhất có accounts: ${nonEmpty[0].keys}\n`);
    return nonEmpty[0].id;
  }
  throw new Error(
    'Không xác định được key. Chạy lại với --key TT-XXXX-XXXX-XXXX hoặc --keyId <id>.'
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI (kiểm tra .env).');

  const outDir = args.out ? path.resolve(args.out) : defaultOutDir();
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('qltk');
    const keyId = await resolveKeyId(db, args);

    const accounts = await db.collection('accounts').find({ keyId }).toArray();
    const templates = await db.collection('templates').find({ keyId }).toArray();

    // Old Mongo _id -> new uuid, so template.accountIds can be remapped.
    const idMap = new Map();
    const localAccounts = accounts.map((a) => {
      const newId = crypto.randomUUID();
      idMap.set(a._id.toString(), newId);
      return {
        _id: newId,
        username: a.username,
        password: a.password,
        // Coerce to numbers: the auto filter uses strict `accountType === 1`
        // and sorting does `server - server`; string-typed legacy records would break both.
        server: Number(a.server),
        accountType: Number(a.accountType),
        note: a.note || '',
      };
    });

    const localTemplates = templates.map((t) => ({
      _id: crypto.randomUUID(),
      name: t.name,
      accountIds: (t.accountIds || [])
        .map((id) => idMap.get(id.toString()))
        .filter(Boolean),
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    }));

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(
      path.join(outDir, 'accounts.json'),
      JSON.stringify(localAccounts, null, 2),
      'utf8'
    );
    await fs.writeFile(
      path.join(outDir, 'templates.json'),
      JSON.stringify(localTemplates, null, 2),
      'utf8'
    );

    console.log(`Đã xuất ${localAccounts.length} accounts, ${localTemplates.length} templates.`);
    console.log(`→ ${outDir}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('[migration] LỖI:', err.message);
  process.exit(1);
});
