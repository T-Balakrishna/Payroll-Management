const { Company } = require('../models');

// Get all companies
// (In multi-tenant systems this is usually restricted to super-admins only)
exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      include: [
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
        // You can optionally include these — but be careful with performance
        // { model: require('../models').Employee, as: 'employees' },
        // { model: require('../models').Department, as: 'departments' },
        // { model: require('../models').BiometricDevice, as: 'devices' },
      ]
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single company by ID
exports.getCompanyById = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: [
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
        // { model: require('../models').Employee, as: 'employees' },
        // { model: require('../models').Department, as: 'departments' },
      ]
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new company
// (Typically restricted to system administrators / onboarding flow)
exports.createCompany = async (req, res) => {
  try {
    const company = await Company.create(req.body);
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update company
exports.updateCompany = async (req, res) => {
  try {
    const [updated] = await Company.update(req.body, {
      where: { companyId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const company = await Company.findByPk(req.params.id);
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete company (soft delete supported via paranoid: true)
// WARNING: In real systems, company deletion is extremely rare and usually restricted
exports.deleteCompany = async (req, res) => {
  try {
    const deleted = await Company.destroy({
      where: { companyId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};