const sequelize = require("../config/db");
const { fn, col, Op } = require("sequelize");
const Permission = require("../models/Permission");

exports.getPermissionTakenSummary = async (req, res) => {
  try {
    const { companyId } = req.params;

    // 🔹 Calculate yesterday’s date range
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

    // 🔹 Query approved permissions for yesterday
    const summary = await Permission.findAll({
      attributes: [
        'employeeNumber',
        [fn('COUNT', col('permissionId')), 'totalPermissions'],
        [fn('SUM', col('permissionHours')), 'totalHoursTaken'],
        [fn('SUM', col('remainingHours')), 'remainingHours'],
      ],
      where: {
        companyId,
        permissionDate: { [Op.between]: [startOfYesterday, endOfYesterday] },
      },
      group: ['employeeNumber'],
    });

    // 🔹 Format response
    const formatted = summary.map((p) => ({
      employeeNumber: p.employeeNumber,
      totalPermissions: p.get('totalPermissions'),
      totalHoursTaken: p.get('totalHoursTaken'),
      remainingHours: p.get('remainingHours'),
    }));

    res.json({
      date: startOfYesterday.toISOString().slice(0, 10),
      totalEmployees: formatted.length,
      data: formatted,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch yesterday’s permission summary.' });
  }
};
