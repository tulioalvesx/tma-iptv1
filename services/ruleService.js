const fs = require('fs').promises;
const path = require('path');
const file = path.join(__dirname, '../data/rules.json');

async function readAll() {
  try {
    const raw = await fs.readFile(file, 'utf-8');
    const parsed = JSON.parse(raw);
    // aceita array OU {rules:[...]}
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.rules)) return parsed.rules;
    return [];
  } catch { return []; }
}
async function writeAll(arr){
  // salva como array (simples)
  await fs.writeFile(file, JSON.stringify(arr, null, 2));
}

exports.fetchAll = readAll;
exports.create   = async (entry) => {
  const list = await readAll();
  if (!entry.id) entry.id = String(Date.now());
  list.push(entry);
  await writeAll(list);
  return entry;
};
exports.update = async (id, patch) => {
  const list = await readAll();
  const i = list.findIndex(r => String(r.id) === String(id));
  if (i === -1) return null;
  list[i] = { ...list[i], ...patch, id: String(id) };
  await writeAll(list);
  return list[i];
};
exports.remove = async (id) => {
  const list = await readAll();
  const next = list.filter(r => String(r.id) !== String(id));
  if (next.length === list.length) return false;
  await writeAll(next);
  return true;
};
