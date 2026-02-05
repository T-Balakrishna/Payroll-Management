const { LeaveRequestHistory } = require('../models');

// Get all leave request histories
// In real usage: almost always filtered by leaveRequestId (admin/debug only)
exports.getAllLeaveRequestHistories = async (req, res) => {
  try {
    const histories = await LeaveRequestHistory.findAll({
      include: [
        { model: require('../models').LeaveRequest, as: 'request' },
        { model: require('../models').Employee, as: 'actor' },
        { model: require('../models').Company, as: 'company' },
        
      ],
      order: [['actionDate', 'DESC']]
    });
    res.json(histories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single leave request history by ID
exports.getLeaveRequestHistoryById = async (req, res) => {
  try {
    const history = await LeaveRequestHistory.findByPk(req.params.id, {
      include: [
        { model: require('../models').LeaveRequest, as: 'request' },
        { model: require('../models').Employee, as: 'actor' },
        { model: require('../models').Company, as: 'company' },
        
      ]
    });

    if (!history) {
      return res.status(404).json({ message: 'Leave request history not found' });
    }

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new leave request history entry
// (normally called via LeaveRequestHistory.logAction static method)
exports.createLeaveRequestHistory = async (req, res) => {
  try {
    const history = await LeaveRequestHistory.create(req.body);
    res.status(201).json(history);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Note: No update or delete endpoints — history is immutable
// (updatedAt is disabled and records should never be modified)