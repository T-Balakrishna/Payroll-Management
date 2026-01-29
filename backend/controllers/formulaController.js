const { Formula } = require('../models');

// Get all formulas (in practice: filter by companyId + isActive)
exports.getAllFormulas = async (req, res) => {
  try {
    const formulas = await Formula.findAll({
      include: [
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').SalaryComponent, as: 'targetComponent' },
        { model: require('../models').User, as: 'creator' },    // note: your model uses 'id' here
        { model: require('../models').User, as: 'updater' },
      ]
    });
    res.json(formulas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single formula by ID
exports.getFormulaById = async (req, res) => {
  try {
    const formula = await Formula.findByPk(req.params.id, {
      include: [
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').SalaryComponent, as: 'targetComponent' },
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
      ]
    });

    if (!formula) {
      return res.status(404).json({ message: 'Formula not found' });
    }

    res.json(formula);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new formula
exports.createFormula = async (req, res) => {
  try {
    const formula = await Formula.create(req.body);
    res.status(201).json(formula);
  } catch (error) {
    res.status(400).json({ error: error.message }); // 400 better for validation errors
  }
};

// Update formula
exports.updateFormula = async (req, res) => {
  try {
    const [updated] = await Formula.update(req.body, {
      where: { formulaId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Formula not found' });
    }

    const formula = await Formula.findByPk(req.params.id);
    res.json(formula);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete formula (soft delete via paranoid: true)
exports.deleteFormula = async (req, res) => {
  try {
    const deleted = await Formula.destroy({
      where: { formulaId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Formula not found' });
    }

    res.json({ message: 'Formula deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};