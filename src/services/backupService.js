const path = require("path");
const { BACKUP_STATUS, USER_TYPES } = require("../constants/enums");
const { AUDIT_ACTIONS, AUDIT_TABLES } = require("../constants/auditLog");
const { backupsRepo, addAuditLog, usersRepo } = require("../data/store");
const { assertPathInsideBackupsRoot } = require("../config/paths");
const { sendBackupSubmissionEmail } = require("./emailService");

async function createBackup({ companyUser, absoluteFilePath }) {
  const normalized = path.resolve(absoluteFilePath);
  assertPathInsideBackupsRoot(normalized);
  if (!normalized.toLowerCase().endsWith(".zip")) {
    throw new Error("Only ZIP file names are allowed");
  }

  const repo = backupsRepo();
  const backup = repo.create({
    company_id: companyUser.id,
    uploaded_by: companyUser.id,
    status: BACKUP_STATUS.PENDING,
    file_path: normalized,
    renewed_file_path: null,
    remarks: null
  });
  const saved = await repo.save(backup);
  await addAuditLog(companyUser.id, AUDIT_ACTIONS.BACKUP_CREATED, {
    id: saved.id,
    table: AUDIT_TABLES.BACKUPS
  });
  return saved;
}

async function listBackupsForUser(user) {
  const repo = backupsRepo();
  let backups;
  if (user.type === USER_TYPES.ADMIN) {
    backups = await repo.find({ order: { updated_at: "DESC" } });
  } else if (user.type === USER_TYPES.COMPANY) {
    backups = await repo.find({
      where: { company_id: user.id },
      order: { updated_at: "DESC" }
    });
  } else {
    backups = await repo.find({
      where: { status: BACKUP_STATUS.APPROVED },
      order: { updated_at: "DESC" }
    });
  }

  return backups;
}

async function getBackupForDownload(user, backupId) {
  const repo = backupsRepo();
  const backup = await repo.findOne({ where: { id: backupId } });
  if (!backup) throw new Error("Backup not found");

  if (user.type === USER_TYPES.COMPANY && backup.company_id !== user.id) {
    throw new Error("Company can only access own backups");
  }
  if (user.type === USER_TYPES.EMPLOYEE && backup.status !== BACKUP_STATUS.APPROVED) {
    throw new Error("Employee can only access approved backups");
  }

  assertPathInsideBackupsRoot(path.resolve(backup.file_path));

  return backup;
}

async function getRenewedBackupForDownload(user, backupId) {
  const repo = backupsRepo();
  const backup = await repo.findOne({ where: { id: backupId } });
  if (!backup) throw new Error("Backup not found");
  if (!backup.renewed_file_path) throw new Error("No renewed backup file for this record");

  if (user.type === USER_TYPES.COMPANY && backup.company_id !== user.id) {
    throw new Error("Company can only access own backups");
  }
  if (user.type === USER_TYPES.EMPLOYEE) {
    throw new Error("Renewed file download is not available for this role");
  }
  if (user.type !== USER_TYPES.ADMIN && user.type !== USER_TYPES.COMPANY) {
    throw new Error("Access denied");
  }

  assertPathInsideBackupsRoot(path.resolve(backup.renewed_file_path));

  return backup;
}

async function adminUpdateStatus({ adminUser, backupId, nextStatus, remarks }) {
  const repo = backupsRepo();
  const backup = await repo.findOne({ where: { id: backupId } });
  if (!backup) throw new Error("Backup not found");
  if (!remarks || !remarks.trim()) throw new Error("Remarks are required");
  if (backup.status !== BACKUP_STATUS.PENDING) throw new Error("Only PENDING backups can be reviewed");
  if (![BACKUP_STATUS.APPROVED, BACKUP_STATUS.REJECTED].includes(nextStatus)) {
    throw new Error("Invalid status transition");
  }

  backup.status = nextStatus;
  backup.remarks = remarks.trim();
  const saved = await repo.save(backup);
  await addAuditLog(adminUser.id, AUDIT_ACTIONS.BACKUP_UPDATED, {
    id: saved.id,
    table: AUDIT_TABLES.BACKUPS
  });
  return saved;
}

async function employeeSubmitRenewal({ employeeUser, backupId, renewedAbsolutePath }) {
  const repo = backupsRepo();
  const backup = await repo.findOne({ where: { id: backupId } });
  if (!backup) throw new Error("Backup not found");
  if (backup.status !== BACKUP_STATUS.APPROVED) throw new Error("Only APPROVED backups can be submitted");
  const normalized = path.resolve(renewedAbsolutePath);
  assertPathInsideBackupsRoot(normalized);
  if (!normalized.toLowerCase().endsWith(".zip")) {
    throw new Error("Renewed backup file must be a ZIP");
  }

  backup.status = BACKUP_STATUS.SUBMITTED;
  backup.renewed_file_path = normalized;
  const saved = await repo.save(backup);

  const company = await usersRepo().findOne({ where: { id: saved.company_id } });
  await sendBackupSubmissionEmail({
    to: company?.email,
    backupId: saved.id
  });

  await addAuditLog(employeeUser.id, AUDIT_ACTIONS.BACKUP_UPDATED, {
    id: saved.id,
    table: AUDIT_TABLES.BACKUPS
  });
  return {
    backup: saved,
    notification: {
      sent: true,
      recipient: company?.email
    }
  };
}

module.exports = {
  createBackup,
  listBackupsForUser,
  getBackupForDownload,
  getRenewedBackupForDownload,
  adminUpdateStatus,
  employeeSubmitRenewal
};
