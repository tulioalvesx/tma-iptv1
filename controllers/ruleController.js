// controllers/ruleController.js
const service = require('../services/ruleService');

exports.getAll = async (req, res) => {
  const rules = await service.fetchAll();
  res.json(rules);
};

exports.create = async (req, res) => {
  const rule = await service.create(req.body);
  res.status(201).json(rule);
};

exports.update = async (req, res) => {
  const updated = await service.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Regra não encontrada' });
  res.json(updated);
};

exports.remove = async (req, res) => {
  const ok = await service.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Regra não encontrada' });
  res.json({ ok: true });
};
