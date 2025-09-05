const Bus = require('../models/Bus'); // Sequelize model

// Create
exports.createBus = async (req, res) => {
  try {
    const { busNumber, busDriverName, busRouteDetails, createdBy } = req.body;
    const newBus = await Bus.create({
      busNumber,
      busDriverName,
      busRouteDetails,
      createdBy
    });

    res.status(201).json(newBus);
  } catch (error) {
    console.error("❌ Error creating bus:", error);
    res.status(500).send("Error creating bus: " + error.message);
  }
};

// Read All (only active)
exports.getAllBuses = async (req, res) => {
  try {
    const buses = await Bus.findAll({ where: { status: 'active' } });
    res.json(buses);
  } catch (error) {
    res.status(500).send("Error fetching buses: " + error.message);
  }
};

// Update
exports.updateBus = async (req, res) => {
  try {
    const bus = await Bus.findOne({ where: { busId: req.params.id, status: 'active' } });
    if (!bus) return res.status(404).send("Bus not found or inactive");

    await bus.update({ ...req.body, updatedBy: req.body.updatedBy });
    res.json(bus);
  } catch (error) {
    console.error("❌ Error updating bus:", error);
    res.status(500).send("Error updating bus: " + error.message);
  }
};

// Read One by ID (only active)
exports.getBusById = async (req, res) => {
  try {
    const bus = await Bus.findOne({ 
      where: { busId: req.params.id, status: 'active' } 
    });
    if (!bus) return res.status(404).send("Bus not found or inactive");
    res.json(bus);
  } catch (error) {
    res.status(500).send("Error fetching bus: " + error.message);
  }
};

// Soft Delete (set status to inactive)
exports.deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findOne({ 
      where: { busId: req.params.id, status: 'active' } 
    });
    if (!bus) return res.status(404).send("Bus not found or already inactive");

    await bus.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Bus deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting bus: " + error.message);
  }
};
