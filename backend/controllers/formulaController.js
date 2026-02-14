import db from '../models/index.js';
const { Formula } = db;
// Get all formulas (in practice: filter by companyId + isActive)
export const getAllFormulas = async (req, res) => {
  try {
    const formulas = await Formula.findAll({
      include: [
        { model: db.Company, as: 'company' },
        { model: db.SalaryComponent, as: 'targetComponent' },
        { model: db.User, as: 'creator' },    // note: your model uses 'id' here
        { model: db.User, as: 'updater' },
      ]
    });
    res.json(formulas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single formula by ID
export const getFormulaById = async (req, res) => {
  try {
    const formula = await Formula.findByPk(req.params.id, {
      include: [
        { model: db.Company, as: 'company' },
        { model: db.SalaryComponent, as: 'targetComponent' },
        
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
export const createFormula = async (req, res) => {
  try {
    const formula = await Formula.create(req.body);
    res.status(201).json(formula);
  } catch (error) {
    res.status(400).json({ error: error.message }); // 400 better for validation errors
  }
};

// Update formula
export const updateFormula = async (req, res) => {
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
export const deleteFormula = async (req, res) => {
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