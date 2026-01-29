const { EmployeeLoan } = require('../models');

// Get all employee loans (in practice: filter by companyId / employeeId / status)
exports.getAllEmployeeLoans = async (req, res) => {
  try {
    const employeeLoans = await EmployeeLoan.findAll({
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').Employee, as: 'approver' }
      ]
    });
    res.json(employeeLoans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single employee loan by ID
exports.getEmployeeLoanById = async (req, res) => {
  try {
    const employeeLoan = await EmployeeLoan.findByPk(req.params.id, {
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').Employee, as: 'approver' }
      ]
    });

    if (!employeeLoan) {
      return res.status(404).json({ message: 'Employee loan not found' });
    }

    res.json(employeeLoan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new employee loan record
exports.createEmployeeLoan = async (req, res) => {
  try {
    const employeeLoan = await EmployeeLoan.create(req.body);
    res.status(201).json(employeeLoan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update employee loan (e.g. change status, add paidInstallments, remarks, etc.)
exports.updateEmployeeLoan = async (req, res) => {
  try {
    const [updated] = await EmployeeLoan.update(req.body, {
      where: { employeeLoanId: req.params.id }   // ← using employeeLoanId
    });

    if (!updated) {
      return res.status(404).json({ message: 'Employee loan not found' });
    }

    const employeeLoan = await EmployeeLoan.findByPk(req.params.id);
    res.json(employeeLoan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete / cancel employee loan (soft delete not present, but you can add paranoid: true)
exports.deleteEmployeeLoan = async (req, res) => {
  try {
    const deleted = await EmployeeLoan.destroy({
      where: { employeeLoanId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Employee loan not found' });
    }

    res.json({ message: 'Employee loan record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};