const { AppDataSource } = require("./data-source");

/**
 * Guard for environments where TypeORM synchronize doesn't add new nullable columns reliably.
 */
async function ensureBackupSchemaColumns() {
  await AppDataSource.query(
    "ALTER TABLE backups ADD COLUMN IF NOT EXISTS renewed_by integer"
  );
  await AppDataSource.query(
    "ALTER TABLE backups ADD COLUMN IF NOT EXISTS company_remarks varchar"
  );
  await AppDataSource.query(
    "ALTER TABLE backups ADD COLUMN IF NOT EXISTS payment_screenshot_path varchar"
  );
}

async function ensureUserSchemaColumns() {
  await AppDataSource.query(
    "DO $$ BEGIN CREATE TYPE company_stage_enum AS ENUM ('ONBOARDING', 'ACTIVE', 'PAYMENT_PENDING', 'SUSPENDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;"
  );
  await AppDataSource.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS software_types text"
  );
  await AppDataSource.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_stage company_stage_enum"
  );
  await AppDataSource.query(
    "UPDATE users SET company_stage = 'ONBOARDING' WHERE type = 'COMPANY' AND company_stage IS NULL"
  );
}

module.exports = {
  ensureBackupSchemaColumns,
  ensureUserSchemaColumns
};
