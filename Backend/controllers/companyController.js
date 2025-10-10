const Company = require('../models/Company');

// Create a new company
exports.createCompany = async (req, res) => {
  try {
    const { companyAcr, companyName, createdBy } = req.body;
    const newCompany = await Company.create({ companyAcr, companyName, createdBy });
    res.status(201).json(newCompany);
  } catch (error) {
    console.error("❌ Error creating company:", error);
    res.status(500).send("Error creating company: " + error.message);
  }
};

// Get all active companies
exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({ where: { status: 'active' } });
    res.json(companies);
  } catch (error) {
    res.status(500).send("Error fetching companies: " + error.message);
  }
};

// Get one company by ID
exports.getCompanyById = async (req, res) => {
  try {
    const company = await Company.findOne({ where: { companyId: req.params.id, status: 'active' } });
    if (!company) return res.status(404).send("Company not found or inactive");
    res.json(company);
  } catch (error) {
    res.status(500).send("Error fetching company: " + error.message);
  }
};

// Update a company
exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findOne({ where: { companyId: req.params.id, status: 'active' } });
    if (!company) return res.status(404).send("Company not found or inactive");

    await company.update({ ...req.body, updatedBy: req.body.updatedBy });
    res.json(company);
  } catch (error) {
    console.error("❌ Error updating company:", error);
    res.status(500).send("Error updating company: " + error.message);
  }
};

// Soft delete company (set status to inactive)
exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findOne({ where: { companyId: req.params.id, status: 'active' } });
    if (!company) return res.status(404).send("Company not found or already inactive");

    await company.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Company deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting company: " + error.message);
  }
};

exports.setPermissionHours = async (req, res) => {
  try {
    const { companyId, permissionHoursPerMonth,updatedBy} = req.body;
    const company = await Company.findOne({ where: { companyId, status: 'active' } });
    if (!company) return res.status(404).send("Company not found or inactive");
    await company.update({ permissionHoursPerMonth, updatedBy: updatedBy });
    res.json({ message: "Permission hours updated successfully", company });
  } catch (error) {
    console.error("❌ Error setting permission hours:", error);
    res.status(500).send("Error setting permission hours: " + error.message);
  }
};

