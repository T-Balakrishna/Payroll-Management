const { Op } = require("sequelize");
const Punch = require("../models/Punch");
const BiometricDevice = require("../models/BiometricDevice");
const ZKLib = require("node-zklib");
const Employee = require("../models/Employee")

// Fetch from biometric & save
exports.fetchPunches = async (req, res) => {
  try {
    const { companyId } = req.query; // Optional companyId to filter devices
    let deviceQuery = {};
    if (companyId) {
      deviceQuery.where = { companyId,status:active };
    }

    const devices = await BiometricDevice.findAll(deviceQuery);
    const newLogs = [];

    for (const device of devices) {
      try {
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
              console.warn(`⚠️ No employee found for biometricNumber: ${log.deviceUserId}`);
            }
          }
        }

        await zk.disconnect();
      } catch (err) {
        console.error(`❌ Error connecting to device ${device.deviceIp}:`, err.message);
        continue; // Skip to next device if this one fails
      }
    }

    res.json({ message: "✅ Punches fetched and stored successfully", newLogs });
  } catch (err) {
    console.error("❌ Error fetching punches:", err);
    res.status(500).send("Error fetching punches: " + err.message);
  }
};


// Get today’s punches (all employees)
exports.getTodayPunches = async (req, res) => {
  try {
    const { companyId } = req.query;
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

    const punches = await Punch.findAll({
      where,
      order: [["punchTimestamp", "DESC"]]
    });

    res.json(punches);
  } catch (err) {
    console.error("❌ Error fetching today’s punches:", err);
    res.status(500).send("Error: " + err.message);
  }
};

// Get all punches of a specific biometricNumber
exports.getPunchesById = async (req, res) => {
  try {
    const { bioNumber } = req.params;
    const { companyId } = req.query;

    let where = { biometricNumber: bioNumber };
    if (companyId) {
      where.companyId = companyId;
    }

    const punches = await Punch.findAll({
      where,
      order: [["punchTimestamp", "DESC"]]
    });

    if (!punches.length) {
      return res.status(404).json({ message: "No punches found for this user" });
    }

    res.json(punches);
  } catch (err) {
    console.error("❌ Error fetching punches by ID:", err);
    res.status(500).send("Error: " + err.message);
  }
};

exports.getPunches = async (req, res) => {
  try {
    const { 
      companyId, 
      employeeNumber, 
      departmentId, 
      date, 
      startDate, 
      endDate 
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
        attributes: []  // No need for extra attrs, just for filtering
      });
    }

    const punches = await Punch.findAll({
      where: punchWhere,
      include,
      order: [["punchTimestamp", "DESC"]],
      raw: true  // Serialize to plain objects
    });

    // Always return array, even if empty
    res.json(punches);
  } catch (err) {
    console.error("❌ Error fetching punches:", err);
    res.status(500).json({ message: err.message });
  }
};