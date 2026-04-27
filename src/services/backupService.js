const path = require("path");
const { BACKUP_STATUS, USER_TYPES } = require("../constants/enums");
const { AUDIT_ACTIONS, AUDIT_TABLES } = require("../constants/auditLog");
const { backupsRepo, addAuditLog, usersRepo } = require("../data/store");
const { assertPathInsideBackupsRoot } = require("../config/paths");
const { sendBackupSubmissionEmail } = require("./emailService");

async function listBackupsWithNames(where) {
  const repo = backupsRepo();
  const backups = await repo.find({
    where,
    order: { updated_at: "DESC" },
    relations: ["uploader", "renewedByUser"]
  });
  return backups.map((backup) => ({
    id: Number(backup.id),
    company_id: Number(backup.company_id),
    uploaded_by: Number(backup.uploaded_by),
    status: backup.status,
    file_path: backup.file_path,
    renewed_file_path: backup.renewed_file_path,
    renewed_by: backup.renewed_by === null ? null : Number(backup.renewed_by),
    remarks: backup.remarks,
    company_remarks: backup.company_remarks || null,
    payment_screenshot_path: backup.payment_screenshot_path || null,
    created_at: backup.created_at,
    updated_at: backup.updated_at,
    company_name: backup.uploader?.name || null,
    renewed_by_name: backup.renewedByUser?.name || null
  }));
}

async function createBackup({ companyUser, absoluteFilePath, companyRemarks, paymentScreenshotPath }) {
  const normalized = path.resolve(absoluteFilePath);
  assertPathInsideBackupsRoot(normalized);
  if (!normalized.toLowerCase().endsWith(".zip")) {
    throw new Error("Only ZIP file names are allowed");
  }

  const normalizedPaymentScreenshotPath = paymentScreenshotPath ? path.resolve(paymentScreenshotPath) : null;
  if (normalizedPaymentScreenshotPath) {
    assertPathInsideBackupsRoot(normalizedPaymentScreenshotPath);
  }

  const repo = backupsRepo();
  const backup = repo.create({
    company_id: companyUser.id,
    uploaded_by: companyUser.id,
    status: BACKUP_STATUS.PENDING,
    file_path: normalized,
    renewed_file_path: null,
    renewed_by: null,
    remarks: null,
    company_remarks: companyRemarks ? String(companyRemarks).trim() : null,
    payment_screenshot_path: normalizedPaymentScreenshotPath
  });
  const saved = await repo.save(backup);
  await addAuditLog(companyUser.id, AUDIT_ACTIONS.BACKUP_CREATED, {
    id: saved.id,
    table: AUDIT_TABLES.BACKUPS
  });
  return saved;
}

async function listBackupsForUser(user) {
  if (user.type === USER_TYPES.ADMIN) {
    return listBackupsWithNames({});
  }
  if (user.type === USER_TYPES.COMPANY) {
    return listBackupsWithNames({ uploaded_by: user.id });
  }
  return listBackupsWithNames([
    { status: BACKUP_STATUS.APPROVED },
    { status: BACKUP_STATUS.SUBMITTED, renewed_by: user.id }
  ]);
}

async function getBackupForDownload(user, backupId) {
  const repo = backupsRepo();
  const backup = await repo.findOne({ where: { id: backupId } });
  if (!backup) throw new Error("Backup not found");

  if (user.type === USER_TYPES.COMPANY && backup.company_id !== user.id) {
    throw new Error("Company can only access own backups");
  }
  if (
    user.type === USER_TYPES.EMPLOYEE &&
    backup.status !== BACKUP_STATUS.APPROVED &&
    backup.renewed_by !== user.id
  ) {
    throw new Error("Employee can only access approved or self-renewed backups");
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
  if (user.type === USER_TYPES.EMPLOYEE && backup.renewed_by !== user.id) {
    throw new Error("Employee can only access renewed files uploaded by self");
  }
  if (
    user.type !== USER_TYPES.ADMIN &&
    user.type !== USER_TYPES.COMPANY &&
    user.type !== USER_TYPES.EMPLOYEE
  ) {
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
  backup.renewed_by = employeeUser.id;
  const saved = await repo.save(backup);

  const company = await usersRepo().findOne({ where: { id: saved.company_id } });
  await sendBackupSubmissionEmail({
    to: company?.email,
    backupId: saved.id
  });

  await addAuditLog(employeeUser.id, AUDIT_ACTIONS.BACKUP_UPDATED, {
    id: saved.id,
    table: AUDIT_TABLES.BACKUPS,
    renewed_by: employeeUser.id,
    previous_status: BACKUP_STATUS.APPROVED,
    next_status: BACKUP_STATUS.SUBMITTED
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
