    const fsW   = require('fs').promises;
    const pathW = require('path');
    const fileW = pathW.join(__dirname, '../data/webhook.json');

    async function readW() {
      try { return JSON.parse(await fsW.readFile(fileW, 'utf-8')); }
      catch { return []; }
    }

    async function writeW(data) {
      await fsW.writeFile(fileW, JSON.stringify(data, null, 2));
    }

    exports.fetchAll = async () => await readW();
    exports.create   = async (entry) => {
      const arr = await readW();
      arr.push(entry);
      await writeW(arr);
      return entry;
    };