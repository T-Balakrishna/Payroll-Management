import db from '../models/index.js';
const { SalaryGenerationDetail } = db;
// Get all salary generation details
// In real usage: almost always filtered by salaryGenerationId
export const getAllSalaryGenerationDetails = async (req, res) => {
  try {
    const details = await SalaryGenerationDetail.findAll({
      include: [
        { model: db.SalaryGeneration, as: 'salaryGeneration' },
        { model: db.SalaryComponent, as: 'salaryComponent' },
        { model: db.Company, as: 'company' },
        
      ]
    });
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single salary generation detail by ID
export const getSalaryGenerationDetailById = async (req, res) => {
  try {
    const detail = await SalaryGenerationDetail.findByPk(req.params.id, {
      include: [
        { model: db.SalaryGeneration, as: 'salaryGeneration' },
        { model: db.SalaryComponent, as: 'salaryComponent' },
        { model: db.Company, as: 'company' },
        
      ]
    });

    if (!detail) {
      return res.status(404).json({ message: 'Salary generation detail not found' });
    }

    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new salary generation detail entry
// (usually created automatically during salary generation process)
export const createSalaryGenerationDetail = async (req, res) => {
  try {
    const detail = await SalaryGenerationDetail.create(req.body);
    res.status(201).json(detail);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update salary generation detail
// (e.g. adjust amount, add remarks — rare after generation)
export const updateSalaryGenerationDetail = async (req, res) => {
  try {
    const [updated] = await SalaryGenerationDetail.update(req.body, {
      where: { salaryGenerationDetailId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Salary generation detail not found' });
    }

    const detail = await SalaryGenerationDetail.findByPk(req.params.id);
    res.json(detail);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete salary generation detail (soft delete via paranoid: true)
// Usually rare — prefer keeping history intact
export const deleteSalaryGenerationDetail = async (req, res) => {
  try {
    const deleted = await SalaryGenerationDetail.destroy({
      where: { salaryGenerationDetailId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Salary generation detail not found' });
    }

    res.json({ message: 'Salary generation detail deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};