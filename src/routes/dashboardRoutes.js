const express = require("express");
const { allowRoles } = require("../middleware/auth");
const { USER_TYPES } = require("../constants/enums");
const { dashboardStats } = require("../controllers/dashboardController");

const router = express.Router();

router.get(
  "/dashboard-stats",
  allowRoles(USER_TYPES.ADMIN, USER_TYPES.COMPANY, USER_TYPES.EMPLOYEE),
  dashboardStats
);

module.exports = router;
