import db from '../models/index.js';
const { Bus } = db;
// Get all buses (in real usage: almost always filter by companyId)
export const getAllBuses = async (req, res) => {
  try {
    const buses = await Bus.findAll({
      include: [
        { model: db.Company, as: 'company' },
        
        // { model: db.Employee, as: 'assignedEmployees' }  // ← uncomment only if you really need the full list of assigned employees here
      ]
    });
    res.json(buses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single bus by ID
export const getBusById = async (req, res) => {
  try {
    const bus = await Bus.findByPk(req.params.id, {
      include: [
        { model: db.Company, as: 'company' },
        
        // { model: db.Employee, as: 'assignedEmployees' }
      ]
    });

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    res.json(bus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new bus
export const createBus = async (req, res) => {
  try {
    const bus = await Bus.create(req.body);
    res.status(201).json(bus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update bus
export const updateBus = async (req, res) => {
  try {
    const [updated] = await Bus.update(req.body, {
      where: { busId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const bus = await Bus.findByPk(req.params.id);
    res.json(bus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete bus (soft delete supported via paranoid: true)
export const deleteBus = async (req, res) => {
  try {
    const deleted = await Bus.destroy({
      where: { busId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    res.json({ message: 'Bus deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};