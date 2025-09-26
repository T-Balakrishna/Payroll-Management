const { Op } = require("sequelize");
const Punch = require("../models/Punch");
const ZKLib = require("node-zklib");
const Biometric = require("../models/Biometric"); // import your model

// Fetch from biometric & save
exports.fetchPunches = async (req, res) => {
  try {
    const zk = new ZKLib("172.17.1.5", 4370, 10000, 4000);
    await zk.createSocket();

    const logs = await zk.getAttendances();
    const newLogs = [];

    for (const log of logs.data) {
      const recordTime = new Date(log.recordTime); 

      const exists = await Punch.findOne({
        where: {
          biometricNumber: parseInt(log.deviceUserId, 10), // 👈 typecast to INT
          punchTimestamp: recordTime
        }
      });

      if (!exists) {
        // find employeeNumber from Biometric table using biometricNumber
        const bioRecord = await Biometric.findOne({
          where: { biometricNumber: log.deviceUserId }
        });

        const employeeNum = bioRecord ? bioRecord.employeeNumber : null;

        const saved = await Punch.create({
          biometricNumber: parseInt(log.deviceUserId, 10), // 👈 typecast to INT
          employeeNumber: employeeNum,
          punchTimestamp: recordTime,
          deviceIp: log.ip
        });

        newLogs.push(saved);
      }
    }

    await zk.disconnect();
    res.json({ message: "Punches fetched and stored", newLogs });
  } catch (err) {
    console.error("❌ Error fetching punches:", err);
    res.status(500).send("Error fetching punches: " + err.message);
  }
};

// Get today’s punches (all employees)
exports.getTodayPunches = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const punches = await Punch.findAll({
      where: {
        punchTimestamp: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
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
    const punches = await Punch.findAll({
      where: { biometricNumber: parseInt(bioNumber, 10) }, // 👈 typecast to INT
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
    const punches = await Punch.findAll({
      order: [["punchTimestamp", "DESC"]]
    });

    if (!punches.length) {
      return res.status(404).json({ message: "No punches found for this user" });
    }

    res.json(punches);
  } catch (err) {
    console.error("❌ Error fetching punches:", err);
    res.status(500).send("Error: " + err.message);
  }
};
