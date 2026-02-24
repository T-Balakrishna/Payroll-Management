import { Op } from "sequelize";

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
  userMail: "2312080@nec.edu.in",
  userNumber: "cset23",
  password: "$2b$10$h.pGuNnEZJRJcWzZcnw.xObKoFwjF/xnfDwZyqDfRoHia7VI9DT5W",
};

export const seedInitialUser = async (db) => {
  const { User, Role, Company } = db;

  try {
    if (!User || !Role || !Company) {
      console.warn("[Seeder] Required models missing; skipping seed.");
      return;
    }

    /* ---------------------------
       1️⃣  Seed Company
    ----------------------------*/
    const existingCompany = await Company.findByPk(INITIAL_COMPANY.companyId);

    if (!existingCompany) {
      await Company.create(INITIAL_COMPANY);
      console.log("[Seeder] Company created (NEC).");
    } else {
      console.log("[Seeder] Company already exists.");
    }

    /* ---------------------------
       2️⃣  Seed Role
    ----------------------------*/
    const existingRole = await Role.findByPk(INITIAL_ROLE.roleId);

    if (!existingRole) {
      await Role.create(INITIAL_ROLE);
      console.log("[Seeder] Role created (Super Admin).");
    } else {
      console.log("[Seeder] Role already exists.");
    }

    /* ---------------------------
       3️⃣  Seed User
    ----------------------------*/
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
      console.log("[Seeder] Initial user already exists.");
      return;
    }

    await User.create({
      ...INITIAL_USER,
      status: "Active",
    });

    console.log("[Seeder] Initial user created successfully.");
  } catch (error) {
    console.error("[Seeder] Failed:", error.message);
  }
};