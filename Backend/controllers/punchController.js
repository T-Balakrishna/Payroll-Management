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
    const { companyId } = req.query;

    let where = {};
    if (companyId) {
      where.companyId = companyId;
    }

    const punches = await Punch.findAll({
      where,
      order: [["punchTimestamp", "DESC"]]
    });

    if (!punches.length) {
      return res.status(404).json({ message: "No punches found" });
    }

    res.json(punches);
  } catch (err) {
    console.error("❌ Error fetching punches:", err);
    res.status(500).send("Error: " + err.message);
  }
};