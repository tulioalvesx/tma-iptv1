// services/ruleService.js
const fs   = require('fs').promises;
const path = require('path');
const file = path.join(__dirname, '../data/rules.json');

async function readAll() {
  try { return JSON.parse(await fs.readFile(file, 'utf-8')); }
  catch { return []; } // se não existir, retorna array vazio
}
async function writeAll(arr) {
  await fs.writeFile(file, JSON.stringify(arr, null, 2));
}

exports.fetchAll = readAll;

exports.create = async (entry) => {
  const arr = await readAll();
  if (!entry.id) entry.id = String(Date.now());
  arr.push(entry);
  await writeAll(arr);
  return entry;
};

exports.update = async (id, patch) => {
  const arr = await readAll();
  const idx = arr.findIndex(r => String(r.id) === String(id));
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...patch, id: String(id) };
  await writeAll(arr);
  return arr[idx];
};

exports.remove = async (id) => {
  const arr  = await readAll();
  const next = arr.filter(r => String(r.id) !== String(id));
  if (next.length === arr.length) return false;
  await writeAll(next);
  return true;
};
