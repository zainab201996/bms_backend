/** DB table names for audit metadata. */
const AUDIT_TABLES = {
  USERS: "users",
  BACKUPS: "backups"
};

/** Human-readable action labels (what appears in logs.action). */
const AUDIT_ACTIONS = {
  USER_CREATED: "User Created",
  USER_UPDATED: "User Updated",
  USER_DELETED: "User Deleted",
  BACKUP_CREATED: "Backup Created",
  BACKUP_UPDATED: "Backup Updated"
};

module.exports = {
  AUDIT_TABLES,
  AUDIT_ACTIONS
};
