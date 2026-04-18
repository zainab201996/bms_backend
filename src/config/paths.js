const path = require("path");
const fs = require("fs");

// backend/src/config -> repo root is three levels up (BMS/)
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const BACKUPS_ROOT = process.env.BACKUPS_ROOT
  ? path.resolve(process.env.BACKUPS_ROOT)
  : path.join(REPO_ROOT, "backups");

const COMPANY_DIR = path.join(BACKUPS_ROOT, "company");
const RENEWED_DIR = path.join(BACKUPS_ROOT, "renewed");

function ensureBackupDirectories() {
  fs.mkdirSync(COMPANY_DIR, { recursive: true });
  fs.mkdirSync(RENEWED_DIR, { recursive: true });
}

/**
 * Reject paths outside BACKUPS_ROOT (e.g. tampered DB values).
 */
function assertPathInsideBackupsRoot(absolutePath) {
  const resolved = path.resolve(absolutePath);
  const root = path.resolve(BACKUPS_ROOT);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid backup file path");
  }
}

module.exports = {
  REPO_ROOT,
  BACKUPS_ROOT,
  COMPANY_DIR,
  RENEWED_DIR,
  ensureBackupDirectories,
  assertPathInsideBackupsRoot
};
