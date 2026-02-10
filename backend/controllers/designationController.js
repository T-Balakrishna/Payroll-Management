const { Designation } = require('../models');

// Get all designations (in practice: almost always filtered by companyId)
exports.getAllDesignations = async (req, res) => {
  try {
    const designations = await Designation.findAll({
      include: [
        { model: require('../models').Company, as: 'company' },
        
        // { model: require('../models').Employee, as: 'employees' }   // ← include only when really needed (can be large)
      ]
    });
    res.json(designations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single designation by ID
exports.getDesignationById = async (req, res) => {
  try {
    const designation = await Designation.findByPk(req.params.id, {
      include: [
        { model: require('../models').Company, as: 'company' },
        
        // { model: require('../models').Employee, as: 'employees' }
      ]
    });

    if (!designation) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    res.json(designation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new designation
exports.createDesignation = async (req, res) => {
  try {
    const designation = await Designation.create(req.body);
    res.status(201).json(designation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update designation
exports.updateDesignation = async (req, res) => {
  try {
    const [updated] = await Designation.update(req.body, {
      where: { designationId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    const designation = await Designation.findByPk(req.params.id);
    res.json(designation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete designation (soft delete via paranoid: true)
exports.deleteDesignation = async (req, res) => {
  try {
    const deleted = await Designation.destroy({
      where: { designationId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    res.json({ message: 'Designation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};