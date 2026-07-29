import { Op } from "sequelize";
import { hashPassword } from "../utils/password.js";

const INITIAL_COMPANY = {
  companyId: 1,
  companyName: "National Engineering College",
  companyAcr: "NEC",
  status: "Active",
};

const INITIAL_ROLE = {
  roleId: 1,
  roleName: "Super Admin",
  status: "Active",
};

const INITIAL_USER = {
  userId: 1,
  roleId: 1,
  companyId: 1,
  userMail: "sks@nec.edu.in",
  userNumber: "sad1",
  password: "123",
};

export const seedInitialUser = async (db) => {
  const { User, Role, Company } = db;

  try {
    if (!User || !Role || !Company) {
      console.warn("[Seeder] Required models missing; skipping seed.");
      return;
    }

    const [company] = await Company.findOrCreate({
      where: { companyId: INITIAL_COMPANY.companyId },
      defaults: INITIAL_COMPANY,
    });

    const [role] = await Role.findOrCreate({
      where: { roleId: INITIAL_ROLE.roleId },
      defaults: INITIAL_ROLE,
    });

    const hashedPassword = await hashPassword(INITIAL_USER.password);
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { userId: INITIAL_USER.userId },
          { userMail: INITIAL_USER.userMail },
          { userNumber: INITIAL_USER.userNumber },
        ],
      },
    });

    if (existingUser) {
      await existingUser.update({
        userNumber: INITIAL_USER.userNumber,
        userMail: INITIAL_USER.userMail,
        companyId: company.companyId,
        roleId: role.roleId,
        password: hashedPassword,
        status: "Active",
      });
    } else {
      await User.create({
        ...INITIAL_USER,
        companyId: company.companyId,
        roleId: role.roleId,
        password: hashedPassword,
        status: "Active",
      });
    }

    console.log("[Seeder] Initial super admin user ensured.");
  } catch (error) {
    console.error("[Seeder] Failed:", error.message);
  }
};
