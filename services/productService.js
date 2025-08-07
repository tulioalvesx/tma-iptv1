const fs   = require('fs').promises;
const path = require('path');
const file = path.join(__dirname, '../data/products.json');

async function read() {
     const arr = JSON.parse(await fs.readFile(file, 'utf-8'));
     return { products: Array.isArray(arr) ? arr : [] };
   }
async function write(data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

exports.fetchAll = async () => {
  const json = await read();
  return json.products;
};

exports.fetchById = async (id) => {
  const items = await exports.fetchAll();
  return items.find(p => String(p.id) === String(id));
};

exports.create = async (payload) => {
  const json = await read();
  json.products.push(payload);
  await write(json);
  return payload;
};

exports.update = async (id, payload) => {
  const json = await read();
  const idx = json.products.findIndex(p => String(p.id) === String(id));
  if (idx < 0) throw new Error('Not Found');
  json.products[idx] = { ...json.products[idx], ...payload };
  await write(json);
  return json.products[idx];
};

exports.remove = async (id) => {
  const json = await read();
  json.products = json.products.filter(p => String(p.id) !== String(id));
  await write(json);
};
