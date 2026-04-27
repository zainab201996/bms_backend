const {
  companyCsvCreateFromContent,
  employeeCreate,
  listUsers,
  listCompanies,
  updateUser,
  deleteUser
} = require("../services/userService");

async function getUsers(req, res) {
  try {
    const users = await listUsers();
    return res.json({ users });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch users" });
  }
}

async function getCompanies(req, res) {
  try {
    const companies = await listCompanies();
    return res.json({ companies });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch companies" });
  }
}

async function uploadCompaniesCsv(req, res) {
  try {
    const csvContent = req.body?.csvContent;
    if (!csvContent || typeof csvContent !== "string") {
      return res.status(400).json({ error: "csvContent string is required" });
    }
    const created = await companyCsvCreateFromContent(csvContent, req.user.id);
    return res.status(201).json({ created });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function createEmployee(req, res) {
  try {
    const user = await employeeCreate(
      {
        name: req.body?.name,
        email: req.body?.email
      },
      req.user.id
    );
    return res.status(201).json({ user });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function patchUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const user = await updateUser(
      id,
      {
        name: req.body?.name,
        email: req.body?.email,
        location: req.body?.location,
        software_types: req.body?.software_types,
        company_stage: req.body?.company_stage
      },
      req.user.id
    );
    return res.json({ user });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function removeUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    await deleteUser(id, req.user);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

module.exports = {
  createEmployee,
  getCompanies,
  getUsers,
  uploadCompaniesCsv,
  patchUser,
  removeUser
};
