import db from '../models/index.js';
const { SalaryRevisionHistory } = db;
// Get all salary revision histories
// In real usage: almost always filtered by staffId, companyId, revisionDate, revisionType
export const getAllSalaryRevisionHistories = async (req, res) => {
  try {
    const histories = await SalaryRevisionHistory.findAll({
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.Company, as: 'company' },
        { model: db.EmployeeSalaryMaster, as: 'oldSalaryMaster' },
        { model: db.EmployeeSalaryMaster, as: 'newSalaryMaster' },
        { model: db.User, as: 'approver' },
        { model: db.User, as: 'processor' },
        
      ],
      order: [['revisionDate', 'DESC']]
    });
    res.json(histories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single salary revision history by ID
export const getSalaryRevisionHistoryById = async (req, res) => {
  try {
    const history = await SalaryRevisionHistory.findByPk(req.params.id, {
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.Company, as: 'company' },
        { model: db.EmployeeSalaryMaster, as: 'oldSalaryMaster' },
        { model: db.EmployeeSalaryMaster, as: 'newSalaryMaster' },
        { model: db.User, as: 'approver' },
        { model: db.User, as: 'processor' },
        
      ]
    });

    if (!history) {
      return res.status(404).json({ message: 'Salary revision history not found' });
    }

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new salary revision history entry
// (usually created automatically when a salary revision is processed)
export const createSalaryRevisionHistory = async (req, res) => {
  try {
    const history = await SalaryRevisionHistory.create(req.body);
    res.status(201).json(history);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update salary revision history
// (rare — usually immutable after creation, but kept for consistency)
export const updateSalaryRevisionHistory = async (req, res) => {
  try {
    const [updated] = await SalaryRevisionHistory.update(req.body, {
      where: { salaryRevisionHistoryId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Salary revision history not found' });
    }

    const history = await SalaryRevisionHistory.findByPk(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete salary revision history (soft delete via paranoid: true)
// Usually rare — history should be kept for audit trail
export const deleteSalaryRevisionHistory = async (req, res) => {
  try {
    const deleted = await SalaryRevisionHistory.destroy({
      where: { salaryRevisionHistoryId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Salary revision history not found' });
    }

    res.json({ message: 'Salary revision history deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};