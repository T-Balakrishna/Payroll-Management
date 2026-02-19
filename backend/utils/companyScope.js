import db from "../models/index.js";

const normalizeRoleKey = (value = "") => String(value).toLowerCase().replace(/[\s_-]/g, "");

const toIntOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const resolveCompanyContext = async (req, options = {}) => {
  const {
    requireCompanyId = true,
    payloadCompanyId,
  } = options;

  const requestedCompanyId = toIntOrNull(
    payloadCompanyId ?? req.body?.companyId ?? req.query?.companyId
  );

  const actorUserId = toIntOrNull(
    req.user?.id ?? req.body?.updatedBy ?? req.body?.createdBy ?? req.body?.userId
  );

  let actor = null;
  let isSuperAdmin = false;

  if (actorUserId) {
    actor = await db.User.findByPk(actorUserId, {
      attributes: ["userId", "companyId", "roleId"],
      include: [{ model: db.Role, as: "role", attributes: ["roleId", "roleName"] }],
    });

    if (!actor) {
      return { ok: false, status: 400, message: "Invalid actor user reference" };
    }

    const roleKey = normalizeRoleKey(actor.role?.roleName || "");
    isSuperAdmin = roleKey.includes("superadmin");
  }

  let effectiveCompanyId = requestedCompanyId;

  if (actor && !isSuperAdmin) {
    effectiveCompanyId = toIntOrNull(actor.companyId);
    if (!effectiveCompanyId) {
      return { ok: false, status: 400, message: "Admin user must be mapped to a valid companyId" };
    }
  } else if (isSuperAdmin && !requestedCompanyId && requireCompanyId) {
    return {
      ok: false,
      status: 400,
      message: "companyId is required in payload for Super Admin requests",
    };
  }

  if (requireCompanyId && !effectiveCompanyId) {
    return { ok: false, status: 400, message: "companyId is required" };
  }

  return {
    ok: true,
    actor,
    isSuperAdmin,
    requestedCompanyId,
    effectiveCompanyId,
  };
};
