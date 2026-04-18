const { USER_TYPES } = require("../constants/enums");
const { AppDataSource } = require("../data-source");
const { hashPassword } = require("../utils/security");

function usersRepo() {
  return AppDataSource.getRepository("User");
}

function backupsRepo() {
  return AppDataSource.getRepository("Backup");
}

function logsRepo() {
  return AppDataSource.getRepository("Log");
}

/**
 * Audit row: `action` is a human-readable label (e.g. "User Created").
 * `metadata` stores { table, id } for the affected row in that table.
 */
async function addAuditLog(performedByUserId, action, metadata = {}) {
  if (!action || typeof action !== "string") {
    throw new Error("Audit log requires an action label");
  }
  const { id, table } = metadata;
  const n = Number(id);
  if (!Number.isFinite(n)) {
    throw new Error("Audit metadata requires a numeric id for the affected row");
  }
  if (!table || typeof table !== "string") {
    throw new Error("Audit metadata requires a table name");
  }
  const repo = logsRepo();
  const log = repo.create({
    user_id: performedByUserId,
    action,
    metadata: { id: n, table }
  });
  return repo.save(log);
}

async function addUser(record) {
  const repo = usersRepo();
  const user = repo.create(record);
  return repo.save(user);
}

async function seedInitialUsers() {
  const repo = usersRepo();
  const existingAdmin = await repo.findOne({
    where: { username: "admin", type: USER_TYPES.ADMIN }
  });
  if (existingAdmin) {
    return existingAdmin;
  }

  const admin = repo.create({
    name: "System Admin",
    email: "admin@portal.local",
    username: "admin",
    password_hash: hashPassword("Test@1234"),
    type: USER_TYPES.ADMIN
  });
  return repo.save(admin);
}

async function getAllLogs({ limit = 1000 } = {}) {
  return logsRepo().find({
    relations: ["user"],
    order: { timestamp: "DESC" },
    take: limit
  });
}

module.exports = {
  usersRepo,
  backupsRepo,
  logsRepo,
  addAuditLog,
  addUser,
  seedInitialUsers,
  getAllLogs
};
