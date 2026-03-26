import db from '../models/index.js';
import { invalidateCacheByPrefixes } from '../services/cacheService.js';
import { CACHE_PREFIXES } from '../services/cacheKeys.js';
const { Company } = db;

const COMPANY_RELATED_CACHE_PREFIXES = [
  CACHE_PREFIXES.companies,
  CACHE_PREFIXES.departments,
  CACHE_PREFIXES.designations,
  CACHE_PREFIXES.leaveTypes,
  CACHE_PREFIXES.shiftTypes,
  CACHE_PREFIXES.employeeGrades,
];
// Get all companies
// (In multi-tenant systems this is usually restricted to super-admins only)
export const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      include: [
        
        // You can optionally include these — but be careful with performance
        // { model: db.Employee, as: 'employees' },
        // { model: db.Department, as: 'departments' },
        // { model: db.BiometricDevice, as: 'devices' },
      ]
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single company by ID
export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: [
        
        // { model: db.Employee, as: 'employees' },
        // { model: db.Department, as: 'departments' },
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
export const createCompany = async (req, res) => {
  try {
    const company = await Company.create(req.body);
    await invalidateCacheByPrefixes(...COMPANY_RELATED_CACHE_PREFIXES);
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update company
export const updateCompany = async (req, res) => {
  try {
    const [updated] = await Company.update(req.body, {
      where: { companyId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const company = await Company.findByPk(req.params.id);
    await invalidateCacheByPrefixes(...COMPANY_RELATED_CACHE_PREFIXES);
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete company (soft delete supported via paranoid: true)
// WARNING: In real systems, company deletion is extremely rare and usually restricted
export const deleteCompany = async (req, res) => {
  try {
    const deleted = await Company.destroy({
      where: { companyId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Company not found' });
    }

    await invalidateCacheByPrefixes(...COMPANY_RELATED_CACHE_PREFIXES);
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
