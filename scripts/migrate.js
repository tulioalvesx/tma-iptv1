// scripts/migrate.js
// Usage: node scripts/migrate.js
// Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Reads JSON files from ./data (groups.json, products.json, downloads.json) and upserts to DB.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

function readJsonSafe(p) {
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.warn('Failed to read', p, e.message);
    return null;
  }
}

async function upsert(table, items) {
  if (!Array.isArray(items) || items.length === 0) return;
  const { error } = await supabase.from(table).upsert(items, { onConflict: 'id' });
  if (error) throw error;
  console.log(`Upserted ${items.length} records into ${table}`);
}

(async () => {
  const dataDir = path.join(process.cwd(), 'data');
  const groups = readJsonSafe(path.join(dataDir, 'groups.json')) || [];
  const products = readJsonSafe(path.join(dataDir, 'products.json')) || [];
  const downloadsWrap = readJsonSafe(path.join(dataDir, 'downloads.json'));
  const downloads = downloadsWrap && Array.isArray(downloadsWrap.files) ? downloadsWrap.files : [];

  await upsert('groups', groups);
  await upsert('products', products);
  await upsert('downloads', downloads);

  console.log('Migration completed.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
