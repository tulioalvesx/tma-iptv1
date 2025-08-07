const fsG   = require('fs').promises;
const pathG = require('path');
const fileG = pathG.join(__dirname, '../data/groups.json');

async function readG() {
     const arr = JSON.parse(await fsG.readFile(fileG, 'utf-8'));
     return { groups: Array.isArray(arr) ? arr : [] };
   }
   
async function writeG(data) {
  await fsG.writeFile(fileG, JSON.stringify(data, null, 2));
}

exports.fetchAll = async () => {
  const json = await readG();
  return json.groups;
};

exports.fetchById = async (id) => {
  const items = await exports.fetchAll();
  return items.find(p => String(p.id) === String(id));
};

exports.create = async (payload) => {
  const json = await readG();
  json.groups.push(payload);
  await writeG(json);
  return payload;
};

exports.update = async (id, payload) => {
  const json = await readG();
  const idx = json.groups.findIndex(p => String(p.id) === String(id));
  if (idx < 0) throw new Error('Not Found');
  json.groups[idx] = { ...json.groups[idx], ...payload };
  await writeG(json);
  return json.groups[idx];
};

exports.remove = async (id) => {
  const json = await readG();
  json.groups = json.groups.filter(p => String(p.id) !== String(id));
  await writeG(json);
};
