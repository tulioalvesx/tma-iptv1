const service = require('../services/analyticsService');

exports.getAll = async (req, res) => {
  const data = await service.fetchAll();
  const hoje = new Date().toISOString().slice(0, 10);
  const dias = Object.entries(data)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, total]) => ({ dia, total }));
  res.json({ hoje, dias });
};
