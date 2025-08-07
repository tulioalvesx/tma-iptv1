const fsD   = require('fs').promises;
const pathD = require('path');
const fileD = pathD.join(__dirname, '../data/downloads.json');

async function readD() {
  try { return JSON.parse(await fsD.readFile(fileD, 'utf-8')); }
  catch { return { files: [] }; }
}
async function writeD(data) {
  await fsD.writeFile(fileD, JSON.stringify(data, null, 2));
}

exports.fetchAll = async () => {
  const json = await readD();
  return json.files;
};

exports.fetchById = async (id) => {
  const items = await exports.fetchAll();
  return items.find(p => String(p.id) === String(id));
};

exports.create = async (payload) => {
  const json = await readD();
  json.files.push(payload);
  await writeD(json);
  return payload;
};

exports.update = async (id, payload) => {
  const json = await readD();
  const idx = json.files.findIndex(p => String(p.id) === String(id));
  if (idx < 0) throw new Error('Not Found');
  json.files[idx] = { ...json.files[idx], ...payload };
  await writeD(json);
  return json.files[idx];
};

exports.remove = async (id) => {
  const json = await readD();
  json.files = json.files.filter(p => String(p.id) !== String(id));
  await writeD(json);
};
