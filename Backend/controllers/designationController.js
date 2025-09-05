const Designation = require('../models/Designation'); // Sequelize model

// Create
exports.createDesignation = async (req, res) => {
  try {
    const { designationName, designationAckr, createdBy } = req.body;
    const newDesignation = await Designation.create({
      designationName,
      designationAckr,
      createdBy
    });

    res.status(201).json(newDesignation);
  } catch (error) {
    console.error("❌ Error creating designation:", error);
    res.status(500).send("Error creating designation: " + error.message);
  }
};

// Read All (only active)
exports.getAllDesignations = async (req, res) => {
  try {
    const designations = await Designation.findAll({ where: { status: 'active' } });
    res.json(designations);
  } catch (error) {
    res.status(500).send("Error fetching designations: " + error.message);
  }
};

// Read One by ID (only active)
exports.getDesignationById = async (req, res) => {
  try {
    const designation = await Designation.findOne({ 
      where: { designationId: req.params.id, status: 'active' } 
    });
    if (!designation) return res.status(404).send("Designation not found or inactive");
    res.json(designation);
  } catch (error) {
    res.status(500).send("Error fetching designation: " + error.message);
  }
};

// Update
exports.updateDesignation = async (req, res) => {
  try {
    const designation = await Designation.findOne({ where: { designationId: req.params.id, status: 'active' } });
    if (!designation) return res.status(404).send("Designation not found or inactive");

    await designation.update({ ...req.body, updatedBy: req.body.updatedBy });
    res.json(designation);
  } catch (error) {
    console.error("❌ Error updating designation:", error);
    res.status(500).send("Error updating designation: " + error.message);
  }
};

// Soft Delete (set status to inactive)
exports.deleteDesignation = async (req, res) => {
  try {
    const designation = await Designation.findOne({ where: { designationId: req.params.id, status: 'active' } });
    if (!designation) return res.status(404).send("Designation not found or already inactive");

    await designation.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Designation deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting designation: " + error.message);
  }
};
