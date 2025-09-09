const { Op } = require("sequelize");
const Punch = require("../models/Punch");
const ZKLib = require("node-zklib");

// const user = localStorage.getItem('adminName')
// Fetch from biometric & save
exports.fetchPunches = async (req, res) => {
  try {
    const zk = new ZKLib("172.17.1.5", 4370, 10000, 4000); // Change IP
    await zk.createSocket();

    const logs = await zk.getAttendances();
    const newLogs = [];

    for (const log of logs.data) {
      const exists = await Punch.findOne({
        where: {
          biometricNumber: log.deviceUserId,
          punchTimestamp: log.recordTime
        }
      });

      if (!exists) {
        const saved = await Punch.create({
          biometricNumber: log.deviceUserId,
          employeeNumber:"dummy",
          punchTimestamp: log.recordTime,
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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const punches = await Punch.findAll({
      where: {
        recordTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      order: [["recordTime", "ASC"]]
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
    const { id } = req.params; // biometricNumber
    const punches = await AttendanceLog.findAll({
      where: { biometricNumber: id },
      order: [["recordTime", "DESC"]]
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
