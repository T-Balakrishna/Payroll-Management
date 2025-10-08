const { Op } = require("sequelize");
const Punch = require("../models/Punch");
const BiometricDevice = require("../models/BiometricDevice");
const ZKLib = require("node-zklib");
const Employee = require("../models/Employee");

// Helper: Wrap query with timeout
const withQueryTimeout = (promise, timeoutMs = 30000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Fetch from biometric & save (unchanged)
exports.fetchPunches = async (req, res) => {
  try {
    const { companyId } = req.query; // Optional companyId to filter devices
    let deviceQuery = {};
    if (companyId) {
      deviceQuery.where = { companyId };
    }
    const devices = await BiometricDevice.findAll(deviceQuery);
    const newLogs = [];

    for (const device of devices) {
      const zk = new ZKLib(device.deviceIp, 4370, 10000, 4000);
      await zk.createSocket();
      const logs = await zk.getAttendances();

      for (const log of logs.data) {
        const recordTime = new Date(log.recordTime); 

        const exists = await Punch.findOne({
          where: {
            biometricNumber: log.deviceUserId,
            punchTimestamp: recordTime
          }
        });

        if (!exists) {
          // find employeeNumber and companyId from Employee table using biometricNumber
          const bioRecord = await Employee.findOne({
            where: { biometricNumber: log.deviceUserId }
          });

          if (bioRecord) {
            const saved = await Punch.create({
              biometricNumber: log.deviceUserId,
              employeeNumber: bioRecord.employeeNumber,
              punchTimestamp: recordTime,
              deviceIp: device.deviceIp,
              companyId: bioRecord.companyId,
            });

            newLogs.push(saved);
          } else {
            console.warn(`No employee found for biometricNumber: ${log.deviceUserId}`);
          }
        }
      }

      await zk.disconnect();
    }

    res.json({ message: "Punches fetched and stored", newLogs });
  } catch (err) {
    console.error("❌ Error fetching punches:", err);
    res.status(500).send("Error fetching punches: " + err.message);
  }
};

// Get today’s punches (with limit)
exports.getTodayPunches = async (req, res) => {
  try {
    const { companyId, limit = 10000, offset = 0 } = req.query;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let where = {
      punchTimestamp: {
        [Op.between]: [startOfDay, endOfDay]
      }
    };
    if (companyId) {
      where.companyId = companyId;
    }

    const punches = await withQueryTimeout(
      Punch.findAll({
        where,
        order: [["punchTimestamp", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        raw: true
      })
    );

    res.json(punches);
  } catch (err) {
    console.error("❌ Error fetching today’s punches:", err);
    res.status(500).json({ message: "Error fetching today’s punches: " + err.message });
  }
};

// Get all punches of a specific biometricNumber (with limit)
exports.getPunchesById = async (req, res) => {
  try {
    const { bioNumber } = req.params;
    const { companyId, limit = 10000, offset = 0 } = req.query;

    let where = { biometricNumber: bioNumber };
    if (companyId) {
      where.companyId = companyId;
    }

    const punches = await withQueryTimeout(
      Punch.findAll({
        where,
        order: [["punchTimestamp", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        raw: true
      })
    );

    if (!punches.length) {
      return res.status(404).json({ message: "No punches found for this user" });
    }

    res.json(punches);
  } catch (err) {
    console.error("❌ Error fetching punches by ID:", err);
    res.status(500).json({ message: "Error fetching punches by ID: " + err.message });
  }
};

// Get punches with filters (optimized with pagination, timeout, and better includes)
exports.getPunches = async (req, res) => {
  try {
    const { 
      companyId, 
      employeeNumber, 
      departmentId, 
      date, 
      startDate, 
      endDate,
      limit = 10000,  // Default cap to prevent overload
      offset = 0
    } = req.query;

    // Validate required param
    if (!companyId) {
      return res.status(400).json({ message: 'companyId is required' });
    }

    // Build where clause for Punch
    let punchWhere = { companyId: parseInt(companyId) };

    // Employee filter (single or array)
    if (employeeNumber) {
      if (Array.isArray(employeeNumber)) {
        punchWhere.employeeNumber = { [Op.in]: employeeNumber };
      } else {
        punchWhere.employeeNumber = employeeNumber;
      }
    }

    // Time filters on punchTimestamp
    if (date) {
      // For daily: full day range
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      punchWhere.punchTimestamp = { [Op.between]: [startOfDay, endOfDay] };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      punchWhere.punchTimestamp = { [Op.between]: [start, end] };
    }

    // Department filter: Include Employee and filter on departmentId
    let include = [];
    let employeeWhere = {};
    if (departmentId) {
      if (Array.isArray(departmentId)) {
        employeeWhere.departmentId = { [Op.in]: departmentId.map(id => parseInt(id)) };
      } else {
        employeeWhere.departmentId = parseInt(departmentId);
      }
      include.push({
        model: Employee,
        required: true,  // INNER JOIN for filtering
        where: employeeWhere,
        attributes: []  // No extra attrs for performance
      });
    }

    const queryOptions = {
      where: punchWhere,
      include,
      order: [["punchTimestamp", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      raw: true  // Serialize to plain objects
    };

    // Optional: Raw SQL fallback for extreme cases (uncomment if Sequelize too slow)
    // const [results] = await sequelize.query(
    //   `SELECT * FROM Punches p ${include.length ? 'INNER JOIN Employees e ON p.employeeNumber = e.employeeNumber' : ''} 
    //    WHERE ${/* build WHERE dynamically */} 
    //    ORDER BY p.punchTimestamp DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    //   { type: sequelize.QueryTypes.SELECT }
    // );

    const punches = await withQueryTimeout(Punch.findAll(queryOptions));

    // Always return array, even if empty
    res.json(punches);
  } catch (err) {
    console.error("❌ Error fetching punches:", err);  // Full error in logs
    res.status(500).json({ message: `Error fetching punches: ${err.message}` });
  }
};