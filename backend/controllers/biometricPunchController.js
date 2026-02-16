import { Op } from "sequelize";
import db from '../models/index.js';
import ZKLib from 'node-zklib';

const { BiometricPunch, Employee, BiometricDevice, Company, User, Role } = db;
const normalizeRole = (value = "") => String(value).replace(/\s+/g, "").toLowerCase();
const classifyRoleType = (roleName = "") => {
  const key = normalizeRole(roleName);
  if (!key) return "Other";
  if (key.includes("nonteaching")) return "Non-Teaching";
  if (key.includes("teaching")) return "Teaching";
  return "Other";
};

const parseBooleanFilter = (value) => {
  if (value === undefined || value === null || value === "" || String(value).toLowerCase() === "all") {
    return undefined;
  }
  const normalized = String(value).toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return undefined;
};

export const getAllBiometricPunches = async (req, res) => {
  try {
    const {
      companyId,
      departmentId,
      employeeGradeId,
      roleType,
      biometricDeviceId,
      status,
      punchType,
      staffId,
      biometricNumber,
      dateFrom,
      dateTo,
      isManual,
      isLate,
      q,
    } = req.query;

    const where = {};
    if (companyId) where.companyId = companyId;
    if (biometricDeviceId) where.biometricDeviceId = biometricDeviceId;
    if (status) where.status = status;
    if (punchType) where.punchType = punchType;
    if (staffId) where.staffId = staffId;
    if (biometricNumber) where.biometricNumber = { [Op.like]: `%${biometricNumber}%` };

    const isManualFilter = parseBooleanFilter(isManual);
    if (isManualFilter !== undefined) where.isManual = isManualFilter;

    const isLateFilter = parseBooleanFilter(isLate);
    if (isLateFilter !== undefined) where.isLate = isLateFilter;

    if (dateFrom || dateTo) {
      where.punchDate = {};
      if (dateFrom) where.punchDate[Op.gte] = dateFrom;
      if (dateTo) where.punchDate[Op.lte] = dateTo;
    }

    const biometricPunches = await BiometricPunch.findAll({
      where,
      include: [
        { model: Employee, as: "employee" },
        { model: BiometricDevice, as: "device" },
        { model: Company, as: "company" },
        { model: User, as: "creator" },
      ],
      order: [["punchTimestamp", "DESC"]],
    });

    let rows = biometricPunches || [];

    if (departmentId) {
      rows = rows.filter((r) => String(r.employee?.departmentId || "") === String(departmentId));
    }

    if (employeeGradeId) {
      rows = rows.filter(
        (r) => String(r.employee?.employeeGradeId || "") === String(employeeGradeId)
      );
    }

    let roleMap = new Map();
    if (rows.length > 0) {
      const staffNumbers = [
        ...new Set(rows.map((r) => r.employee?.staffNumber).filter(Boolean)),
      ];

      if (staffNumbers.length > 0) {
        const users = await User.findAll({
          where: { userNumber: { [Op.in]: staffNumbers } },
          attributes: ["userNumber", "roleId"],
          include: [{ model: Role, as: "role", attributes: ["roleName"] }],
        });

        roleMap = new Map(
          users.map((u) => [
            String(u.userNumber),
            {
              roleName: u.role?.roleName || "",
              roleType: classifyRoleType(u.role?.roleName || ""),
            },
          ])
        );
      }
    }

    const roleTypeNormalized = normalizeRole(roleType || "");
    if (roleTypeNormalized) {
      rows = rows.filter((r) => {
        const meta = roleMap.get(String(r.employee?.staffNumber || ""));
        const current = normalizeRole(meta?.roleType || "");
        return current === roleTypeNormalized;
      });
    }

    if (q) {
      const search = String(q).trim().toLowerCase();
      if (search) {
        rows = rows.filter((r) => {
          const fullName = [
            r.employee?.firstName || "",
            r.employee?.middleName || "",
            r.employee?.lastName || "",
          ]
            .join(" ")
            .trim()
            .toLowerCase();

          return (
            fullName.includes(search) ||
            String(r.employee?.staffNumber || "").toLowerCase().includes(search) ||
            String(r.biometricNumber || "").toLowerCase().includes(search) ||
            String(r.device?.name || "").toLowerCase().includes(search) ||
            String(r.device?.location || "").toLowerCase().includes(search)
          );
        });
      }
    }

    const result = rows.map((r) => {
      const plain = r.toJSON ? r.toJSON() : r;
      const meta = roleMap.get(String(plain.employee?.staffNumber || ""));
      return {
        ...plain,
        roleName: meta?.roleName || "",
        roleType: meta?.roleType || "Other",
      };
    });

    res.json(result);
  } catch (error) {
  res.status(500).json({ error: error.message });
  }
};

// Get single biometric punch by ID
export const getBiometricPunchById = async (req, res) => {
  try {
    const biometricPunch = await BiometricPunch.findByPk(req.params.id, {
      include: [
        { model: db.Employee,       as: 'employee' },
        { model: db.BiometricDevice, as: 'device' },
        { model: db.Company,        as: 'company' },
        { model: db.User,           as: 'creator' },
      ]
    });

    if (!biometricPunch) {
      return res.status(404).json({ message: 'Biometric punch record not found' });
    }

    res.json(biometricPunch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new biometric punch record
// (usually done by device sync service, not directly by user)
export const createBiometricPunch = async (req, res) => {
  try {
    const biometricPunch = await BiometricPunch.create(req.body);
    res.status(201).json(biometricPunch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update biometric punch (e.g. manual correction, change punchType, add remarks, etc.)
export const updateBiometricPunch = async (req, res) => {
  try {
    const [updated] = await BiometricPunch.update(req.body, {
      where: { punchId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Biometric punch record not found' });
    }

    const biometricPunch = await BiometricPunch.findByPk(req.params.id);
    res.json(biometricPunch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete biometric punch record (soft delete if paranoid: true)
export const deleteBiometricPunch = async (req, res) => {
  try {
    const deleted = await BiometricPunch.destroy({
      where: { punchId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Biometric punch record not found' });
    }

    res.json({ message: 'Biometric punch record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const fetchPunches = async (req, res) => {
  try {
    const { companyId } = req.query; // Optional: sync only for one company

    const deviceQuery = { where: { status: "Active", isAutoSyncEnabled: true } };
    if (companyId) {
      deviceQuery.where.companyId = companyId;
    }

    const devices = await BiometricDevice.findAll(deviceQuery);

    const newLogs = [];

    for (const device of devices) {
      try {
        const zk = new ZKLib(device.deviceIp, 4370, 10000, 4000);
        await zk.createSocket();

        const logs = await zk.getAttendances();
        const attendanceLogs = Array.isArray(logs?.data) ? logs.data : [];

        for (const log of attendanceLogs) {
          const recordTime = new Date(log.recordTime);
          const biometricNumber = String(log.deviceUserId || "").trim();
          if (!biometricNumber || Number.isNaN(recordTime.getTime())) continue;

          // Check if already exists
          const exists = await BiometricPunch.findOne({
            where: {
              biometricNumber,
              punchTimestamp: recordTime,
              biometricDeviceId: device.deviceId,
            },
          });

          if (!exists) {
            // Find matching employee
            const employee = await Employee.findOne({
              where: { biometricNumber },
            });

            if (employee) {
              const saved = await BiometricPunch.create({
                biometricNumber,
                staffId: employee.staffId,
                punchTimestamp: recordTime,
                punchDate: recordTime.toISOString().slice(0, 10),
                biometricDeviceId: device.deviceId,
                companyId: employee.companyId,
                punchType: "Unknown",
                isManual: false,
                status: "Valid",
              });

              newLogs.push(saved);
            } else {
              console.warn(`No employee found for biometricNumber: ${biometricNumber}`);
            }
          }
        }

        await zk.disconnect();
      } catch (err) {
        console.error(`Error connecting to device ${device.deviceIp}:`, err.message);
        continue; // Skip failed device
      }
    }

    res.json({
      message: "Punches fetched and stored successfully",
      newLogsCount: newLogs.length,
      newLogs,
    });
  } catch (err) {
    console.error("Error in fetchPunches:", err);
    res.status(500).json({ error: err.message });
  }
};
