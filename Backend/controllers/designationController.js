const Designation = require('../models/Designation'); // Sequelize model

// ✅ Create
exports.createDesignation = async (req, res) => {
  try {
    const { designationName, designationAckr, companyId, createdBy } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const newDesignation = await Designation.create({
      designationName,
      designationAckr: designationAckr?.toUpperCase(),
      companyId,
      status: "active",
      createdBy,
    });

    res.status(201).json(newDesignation);
  } catch (error) {
    console.error("❌ Error creating designation:", error);
    res.status(500).send("Error creating designation: " + error.message);
  }
};

// ✅ Read All (filter by company if given, only active)
exports.getAllDesignations = async (req, res) => {
  try {
    const whereClause = { status: "active" };
    if (req.query.companyId) {
      whereClause.companyId = req.query.companyId;
    }

    const designations = await Designation.findAll({ where: whereClause });
    res.json(designations);
  } catch (error) {
    res.status(500).send("Error fetching designations: " + error.message);
  }
};

// ✅ Read One by ID
exports.getDesignationById = async (req, res) => {
  try {
    const designation = await Designation.findOne({
      where: { designationId: req.params.id, status: "active" },
    });
    if (!designation) return res.status(404).send("Designation not found or inactive");
    res.json(designation);
  } catch (error) {
    res.status(500).send("Error fetching designation: " + error.message);
  }
};

// ✅ Update
exports.updateDesignation = async (req, res) => {
  try {
    const designation = await Designation.findOne({
      where: { designationId: req.params.id, status: "active" },
    });
    if (!designation) return res.status(404).send("Designation not found or inactive");

    await designation.update({
      ...req.body,
      designationAckr: req.body.designationAckr?.toUpperCase(),
      updatedBy: req.body.updatedBy,
    });

    res.json(designation);
  } catch (error) {
    console.error("❌ Error updating designation:", error);
    res.status(500).send("Error updating designation: " + error.message);
  }
};

// ✅ Soft Delete (set status to inactive)
exports.deleteDesignation = async (req, res) => {
  try {
    const designation = await Designation.findOne({
      where: { designationId: req.params.id, status: "active" },
    });
    if (!designation) return res.status(404).send("Designation not found or already inactive");

    await designation.update({ status: "inactive", updatedBy: req.body.updatedBy });
    res.json({ message: "Designation deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting designation: " + error.message);
  }
};
