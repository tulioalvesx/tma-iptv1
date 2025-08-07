const fsA   = require('fs').promises;
const pathA = require('path');
const fileA = pathA.join(__dirname, '../data/analytics.json');

async function readA() {
  try { return JSON.parse(await fsA.readFile(fileA, 'utf-8')); }
  catch { return {}; }
}
async function writeA(data) {
  await fsA.writeFile(fileA, JSON.stringify(data, null, 2));
}

exports.fetchAll = async () => {
  return await readA();
};

exports.increment = async (date) => {
  const data = await readA();
  data[date] = (data[date] || 0) + 1;
  await writeA(data);
};
