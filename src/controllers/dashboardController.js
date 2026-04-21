const { getDashboardStats } = require("../services/dashboardService");

async function dashboardStats(req, res) {
  try {
    const stats = await getDashboardStats(req.user);
    return res.json(stats);
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
}

module.exports = {
  dashboardStats
};
