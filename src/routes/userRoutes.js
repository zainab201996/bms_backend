const express = require("express");
const { createCompany, createEmployee, getCompanies, getUsers, uploadCompaniesCsv } = require("../controllers/userController");
const { allowRoles } = require("../middleware/auth");
const { USER_TYPES } = require("../constants/enums");

const router = express.Router();

router.get("/", allowRoles(USER_TYPES.ADMIN), getUsers);
router.get("/companies", allowRoles(USER_TYPES.ADMIN), getCompanies);
router.post("/companies-csv", allowRoles(USER_TYPES.ADMIN), uploadCompaniesCsv);
router.post("/companies", allowRoles(USER_TYPES.ADMIN), createCompany);
router.post("/employees", allowRoles(USER_TYPES.ADMIN), createEmployee);

module.exports = router;
