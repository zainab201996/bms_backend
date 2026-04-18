const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const { COMPANY_DIR, RENEWED_DIR, ensureBackupDirectories } = require("../config/paths");

const zipFilter = (_req, file, cb) => {
  if (file.originalname && file.originalname.toLowerCase().endsWith(".zip")) {
    return cb(null, true);
  }
  return cb(new Error("Only ZIP files are allowed"));
};

function uniqueZipName(originalname) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.zip`;
  const base = path.basename(originalname || "backup.zip").replace(/[^a-zA-Z0-9._-]/g, "_");
  if (base.toLowerCase().endsWith(".zip")) {
    const stem = base.slice(0, -4);
    return `${stem}-${suffix}`;
  }
  return `backup-${suffix}`;
}

const companyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureBackupDirectories();
    cb(null, COMPANY_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, uniqueZipName(file.originalname));
  }
});

const renewedStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureBackupDirectories();
    cb(null, RENEWED_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, uniqueZipName(file.originalname));
  }
});

const limits = { fileSize: 500 * 1024 * 1024 };

const uploadCompanyZip = multer({
  storage: companyStorage,
  fileFilter: zipFilter,
  limits
}).single("file");

const uploadRenewedZip = multer({
  storage: renewedStorage,
  fileFilter: zipFilter,
  limits
}).single("file");

function handleMulterError(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || "Upload failed" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "ZIP file is required (field name: file)" });
      }
      return next();
    });
  };
}

module.exports = {
  uploadCompanyZip: handleMulterError(uploadCompanyZip),
  uploadRenewedZip: handleMulterError(uploadRenewedZip)
};
