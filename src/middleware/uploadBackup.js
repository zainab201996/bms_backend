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

function uniqueAttachmentName(originalname, fallbackExt = ".bin") {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const sanitized = path.basename(originalname || `attachment${fallbackExt}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = path.extname(sanitized) || fallbackExt;
  const stem = path.basename(sanitized, ext) || "attachment";
  return `${stem}-${suffix}${ext.toLowerCase()}`;
}

const companyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureBackupDirectories();
    cb(null, COMPANY_DIR);
  },
  filename: (_req, file, cb) => {
    if (file.fieldname === "file") {
      cb(null, uniqueZipName(file.originalname));
      return;
    }
    cb(null, uniqueAttachmentName(file.originalname, ".png"));
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

const companyFileFilter = (_req, file, cb) => {
  if (file.fieldname === "file") {
    return zipFilter(_req, file, cb);
  }
  if (file.fieldname === "paymentScreenshot") {
    const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
    const ext = (path.extname(file.originalname || "").toLowerCase() || "").replace(".", "");
    const allowedImageExt = new Set(["png", "jpg", "jpeg", "webp"]);
    if (allowedImageTypes.has(file.mimetype) || allowedImageExt.has(ext)) {
      return cb(null, true);
    }
    return cb(new Error("Payment screenshot must be PNG, JPG, JPEG, or WEBP"));
  }
  return cb(new Error("Unexpected upload field"));
};

const uploadCompanyZip = multer({
  storage: companyStorage,
  fileFilter: companyFileFilter,
  limits
}).fields([
  { name: "file", maxCount: 1 },
  { name: "paymentScreenshot", maxCount: 1 }
]);

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
      const uploadedZip = req.file || req.files?.file?.[0];
      if (!uploadedZip) {
        return res.status(400).json({ error: "ZIP file is required (field name: file)" });
      }
      req.file = uploadedZip;
      if (req.files?.paymentScreenshot?.[0]) {
        req.paymentScreenshot = req.files.paymentScreenshot[0];
      }
      return next();
    });
  };
}

module.exports = {
  uploadCompanyZip: handleMulterError(uploadCompanyZip),
  uploadRenewedZip: handleMulterError(uploadRenewedZip)
};
