const { DataSource } = require("typeorm");
const { env } = require("./config/env");
const { UserEntity } = require("./entities/User");
const { BackupEntity } = require("./entities/Backup");
const { LogEntity } = require("./entities/Log");

const AppDataSource = new DataSource({
  type: "postgres",
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities: [UserEntity, BackupEntity, LogEntity],
  synchronize: true
});

module.exports = {
  AppDataSource
};
