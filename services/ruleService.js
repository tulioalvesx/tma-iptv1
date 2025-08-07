const fs   = require('fs').promises;
const path = require('path');
const file = path.join(__dirname, '../data/rules.json');

async function readR() {
  try { return JSON.parse(await fs.readFile(file, 'utf-8')); }
  catch { return []; }
}
exports.fetchAll = readR;