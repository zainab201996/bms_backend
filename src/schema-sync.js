const { AppDataSource } = require("./data-source");

/**
 * Guard for environments where TypeORM synchronize doesn't add new nullable columns reliably.
 */
async function ensureBackupSchemaColumns() {
  await AppDataSource.query(
    "ALTER TABLE backups ADD COLUMN IF NOT EXISTS renewed_by integer"
  );
}

module.exports = {
  ensureBackupSchemaColumns
};
