const service = require('../services/groupService');

exports.getAll = async (req, res) => {
  res.json(await service.fetchAll());
};


exports.getById = async (req, res) => {
  const item = await service.fetchById(req.params.id);
  res.json(item);
};

exports.create = async (req, res) => {
  const newItem = await service.create(req.body);
  res.status(201).json(newItem);
};

exports.update = async (req, res) => {
  const updated = await service.update(req.params.id, req.body);
  res.json(updated);
};

exports.remove = async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
};
