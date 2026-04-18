const express = require("express");
const { allowRoles } = require("../middleware/auth");
const { USER_TYPES } = require("../constants/enums");
const { getAllLogs } = require("../data/store");

function serializeLog(row) {
  const user = row.user;
  const meta = row.metadata || {};
  return {
    id: row.id,
    action: row.action,
    performedBy: user
      ? {
          id: user.id,
          name: user.name,
          username: user.username,
          type: user.type
        }
      : row.user_id != null
        ? { id: row.user_id, name: null, username: null, type: null }
        : null,
    date: row.timestamp,
    metadata:
      meta.id != null || meta.table
        ? {
            id: meta.id != null ? Number(meta.id) : null,
            table: meta.table ?? null
          }
        : null
  };
}

const router = express.Router();

router.get("/", allowRoles(USER_TYPES.ADMIN), async (_req, res) => {
  try {
    const rows = await getAllLogs();
    return res.json({ logs: rows.map(serializeLog) });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch logs" });
  }
});

module.exports = router;
