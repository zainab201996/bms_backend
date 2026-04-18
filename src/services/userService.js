const { USER_TYPES } = require("../constants/enums");
const { AUDIT_ACTIONS, AUDIT_TABLES } = require("../constants/auditLog");
const { usersRepo, addUser, addAuditLog } = require("../data/store");
const { hashPassword, randomTempPassword } = require("../utils/security");
const { parseCompanyCsvRows } = require("../utils/csv");

function normalizeText(value) {
  return (value || "").trim();
}

function buildUsernameBase(name, email) {
  const safeName = normalizeText(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const emailPrefix = normalizeText(email).split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return `${safeName || "user"}_${emailPrefix || "account"}`;
}

async function generateUniqueUsername(name, email) {
  const base = buildUsernameBase(name, email);
  const repo = usersRepo();
  let sequence = 1;

  while (true) {
    const candidate = `${base}_${sequence}`;
    const existing = await repo.findOne({ where: { username: candidate } });
    if (!existing) return candidate;
    sequence += 1;
  }
}

async function companyCsvCreate(rows, actorUserId) {
  const created = [];
  const repo = usersRepo();

  for (const row of rows) {
    const name = normalizeText(row.name || row.company_name || row.company || row["company name"]);
    const email = normalizeText(row.email).toLowerCase();
    const location = normalizeText(row.address || row.location);

    if (!name || !email) {
      throw new Error("Each company row must include name and email");
    }

    const existingByEmail = await repo.findOne({ where: { email } });
    if (existingByEmail) {
      throw new Error(`Company already exists for email: ${email}`);
    }

    const tempPassword = randomTempPassword();
    const generatedUsername = await generateUniqueUsername(name, email);
    const user = await addUser({
      name,
      email,
      username: generatedUsername,
      password_hash: hashPassword(tempPassword),
      type: USER_TYPES.COMPANY,
      location
    });
    created.push({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      password: tempPassword,
      type: user.type
    });

    if (actorUserId != null) {
      await addAuditLog(actorUserId, AUDIT_ACTIONS.USER_CREATED, {
        id: user.id,
        table: AUDIT_TABLES.USERS
      });
    }
  }

  return created;
}

async function employeeCreate({ name, email }, actorUserId) {
  const repo = usersRepo();
  const normalizedName = normalizeText(name);
  const normalizedEmail = normalizeText(email).toLowerCase();

  if (!normalizedName || !normalizedEmail) {
    throw new Error("Employee name and email are required");
  }

  const existingByEmail = await repo.findOne({ where: { email: normalizedEmail } });
  if (existingByEmail) {
    throw new Error(`User already exists for email: ${normalizedEmail}`);
  }

  const tempPassword = randomTempPassword();
  const generatedUsername = await generateUniqueUsername(normalizedName, normalizedEmail);
  const user = await addUser({
    name: normalizedName,
    email: normalizedEmail,
    username: generatedUsername,
    password_hash: hashPassword(tempPassword),
    type: USER_TYPES.EMPLOYEE
  });

  if (actorUserId != null) {
    await addAuditLog(actorUserId, AUDIT_ACTIONS.USER_CREATED, {
      id: user.id,
      table: AUDIT_TABLES.USERS
    });
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    password: tempPassword,
    type: user.type
  };
}

async function companyCsvCreateFromContent(csvContent, actorUserId) {
  const rows = parseCompanyCsvRows(csvContent);
  return companyCsvCreate(rows, actorUserId);
}

async function listUsers() {
  const users = await usersRepo().find({
    order: { id: "ASC" }
  });
  return users.map((u) => toPublicUser(u));
}

function toPublicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    type: u.type,
    location: u.location || null
  };
}

async function updateUser(targetId, { name, email, location }, actorUserId) {
  const repo = usersRepo();
  const user = await repo.findOne({ where: { id: targetId } });
  if (!user) {
    throw new Error("User not found");
  }

  if (email !== undefined) {
    const nextEmail = normalizeText(email).toLowerCase();
    if (!nextEmail) {
      throw new Error("Email cannot be empty");
    }
    const existing = await repo.findOne({ where: { email: nextEmail } });
    if (existing && existing.id !== user.id) {
      throw new Error("Email already in use");
    }
    user.email = nextEmail;
  }

  if (name !== undefined) {
    user.name = normalizeText(name);
    if (!user.name) {
      throw new Error("Name cannot be empty");
    }
  }

  if (location !== undefined) {
    if (user.type !== USER_TYPES.COMPANY) {
      throw new Error("Address is only applicable to company users");
    }
    user.location = normalizeText(location) || null;
  }

  const saved = await repo.save(user);
  if (actorUserId != null) {
    await addAuditLog(actorUserId, AUDIT_ACTIONS.USER_UPDATED, {
      id: saved.id,
      table: AUDIT_TABLES.USERS
    });
  }
  return toPublicUser(saved);
}

async function deleteUser(targetId, adminUser) {
  const id = Number(targetId);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid user id");
  }
  if (id === adminUser.id) {
    throw new Error("Cannot delete your own account");
  }

  const repo = usersRepo();
  const user = await repo.findOne({ where: { id } });
  if (!user) {
    throw new Error("User not found");
  }

  if (user.type === USER_TYPES.ADMIN) {
    const adminCount = await repo.count({ where: { type: USER_TYPES.ADMIN } });
    if (adminCount <= 1) {
      throw new Error("Cannot delete the only administrator");
    }
  }

  await addAuditLog(adminUser.id, AUDIT_ACTIONS.USER_DELETED, {
    id: user.id,
    table: AUDIT_TABLES.USERS
  });

  await repo.remove(user);
}

module.exports = {
  employeeCreate,
  companyCsvCreateFromContent,
  companyCsvCreate,
  listUsers,
  updateUser,
  deleteUser
};
