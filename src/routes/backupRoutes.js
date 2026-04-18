const express = require("express");
const {
  listBackups,
  uploadBackup,
  reviewBackup,
  downloadBackup,
  downloadRenewedBackup,
  submitRenewal
} = require("../controllers/backupController");
const { uploadCompanyZip, uploadRenewedZip } = require("../middleware/uploadBackup");
const { allowRoles } = require("../middleware/auth");
const { USER_TYPES } = require("../constants/enums");

const router = express.Router();

router.get("/", listBackups);
router.post("/", allowRoles(USER_TYPES.COMPANY), uploadCompanyZip, uploadBackup);
router.patch("/:id/review", allowRoles(USER_TYPES.ADMIN), reviewBackup);
router.get("/:id/download", allowRoles(USER_TYPES.ADMIN, USER_TYPES.COMPANY, USER_TYPES.EMPLOYEE), downloadBackup);
router.get(
  "/:id/renewed-download",
  allowRoles(USER_TYPES.ADMIN, USER_TYPES.COMPANY),
  downloadRenewedBackup
);
router.post("/:id/renewal", allowRoles(USER_TYPES.EMPLOYEE), uploadRenewedZip, submitRenewal);

module.exports = router;
