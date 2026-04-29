const fs = require("fs");
const path = require("path");
const { BACKUP_STATUS } = require("../constants/enums");
const {
  createBackup,
  listBackupsForUser,
  getBackupForDownload,
  getRenewedBackupForDownload,
  getPaymentScreenshotForDownload,
  adminUpdateStatus,
  employeeSubmitRenewal
} = require("../services/backupService");

async function listBackups(req, res) {
  try {
    const backups = await listBackupsForUser(req.user);
    return res.json({ backups });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch backups" });
  }
}

async function uploadBackup(req, res) {
  try {
    if (!req.paymentScreenshot?.path) {
      return res.status(400).json({ error: "Payment screenshot is required before backup upload" });
    }
    const absolutePath = path.resolve(req.file.path);
    const paymentScreenshotPath = req.paymentScreenshot?.path
      ? path.resolve(req.paymentScreenshot.path)
      : null;
    const backup = await createBackup({
      companyUser: req.user,
      absoluteFilePath: absolutePath,
      companyRemarks: req.body?.remarks,
      paymentScreenshotPath
    });
    return res.status(201).json({ backup });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function reviewBackup(req, res) {
  try {
    const backupId = Number(req.params.id);
    const { status, remarks } = req.body || {};
    if (![BACKUP_STATUS.APPROVED, BACKUP_STATUS.REJECTED].includes(status)) {
      return res.status(400).json({ error: "status must be APPROVED or REJECTED" });
    }
    const backup = await adminUpdateStatus({
      adminUser: req.user,
      backupId,
      nextStatus: status,
      remarks
    });
    return res.json({ backup });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

function downloadErrorStatus(message) {
  if (message === "Backup not found") return 404;
  if (message === "No renewed backup file for this record") return 404;
  if (message === "No payment attachment for this record") return 404;
  if (message === "File not found on server") return 404;
  return 403;
}

async function downloadBackup(req, res) {
  try {
    const backup = await getBackupForDownload(req.user, Number(req.params.id));
    const abs = path.resolve(backup.file_path);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ error: "File not found on server" });
    }
    return res.download(abs, path.basename(abs));
  } catch (error) {
    return res.status(downloadErrorStatus(error.message)).json({ error: error.message });
  }
}

async function downloadRenewedBackup(req, res) {
  try {
    const backup = await getRenewedBackupForDownload(req.user, Number(req.params.id));
    const abs = path.resolve(backup.renewed_file_path);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ error: "File not found on server" });
    }
    return res.download(abs, path.basename(abs));
  } catch (error) {
    return res.status(downloadErrorStatus(error.message)).json({ error: error.message });
  }
}

async function downloadPaymentAttachment(req, res) {
  try {
    const backup = await getPaymentScreenshotForDownload(req.user, Number(req.params.id));
    const abs = path.resolve(backup.payment_screenshot_path);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ error: "File not found on server" });
    }
    return res.download(abs, path.basename(abs));
  } catch (error) {
    return res.status(downloadErrorStatus(error.message)).json({ error: error.message });
  }
}

async function submitRenewal(req, res) {
  try {
    const result = await employeeSubmitRenewal({
      employeeUser: req.user,
      backupId: Number(req.params.id),
      renewedAbsolutePath: path.resolve(req.file.path)
    });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

module.exports = {
  listBackups,
  uploadBackup,
  reviewBackup,
  downloadBackup,
  downloadRenewedBackup,
  downloadPaymentAttachment,
  submitRenewal
};
