import db from '../models/index.js';
const { LeaveRequestHistory } = db;
// Get all leave request histories
// In real usage: almost always filtered by leaveRequestId (admin/debug only)
export const getAllLeaveRequestHistories = async (req, res) => {
  try {
    const where = {};
    if (req.query.companyId) where.companyId = req.query.companyId;
    if (req.query.actionBy) where.actionBy = req.query.actionBy;
    if (req.query.leaveRequestId) where.leaveRequestId = req.query.leaveRequestId;

    const requestInclude = {
      model: db.LeaveRequest,
      as: 'request',
      include: [
        {
          model: db.Employee,
          as: 'employee',
          ...(req.query.departmentId
            ? { where: { departmentId: req.query.departmentId }, required: true }
            : { required: false }),
        },
        { model: db.LeaveType, as: 'leaveType', required: false },
      ],
    };

    const histories = await LeaveRequestHistory.findAll({
      where,
      include: [
        requestInclude,
        { model: db.Employee, as: 'actor' },
      ],
      order: [['actionDate', 'DESC']]
    });
    res.json(histories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single leave request history by ID
export const getLeaveRequestHistoryById = async (req, res) => {
  try {
    const history = await LeaveRequestHistory.findByPk(req.params.id, {
      include: [
        { model: db.LeaveRequest, as: 'request' },
        { model: db.Employee, as: 'actor' },
        { model: db.Company, as: 'company' },
        
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
export const createLeaveRequestHistory = async (req, res) => {
  try {
    const history = await LeaveRequestHistory.create(req.body);
    res.status(201).json(history);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Note: No update or delete endpoints — history is immutable
// (updatedAt is disabled and records should never be modified)
