const { BACKUP_STATUS, USER_TYPES } = require("../constants/enums");
const { backupsRepo, usersRepo } = require("../data/store");

async function getDashboardStats() {
  const userRepository = usersRepo();
  const backupRepository = backupsRepo();

  const [companyCount, employeeCount, totalBackups, approvedBackups, pendingBackups] = await Promise.all([
    userRepository.count({ where: { type: USER_TYPES.COMPANY } }),
    userRepository.count({ where: { type: USER_TYPES.EMPLOYEE } }),
    backupRepository.count(),
    backupRepository.count({ where: { status: BACKUP_STATUS.APPROVED } }),
    backupRepository.count({ where: { status: BACKUP_STATUS.PENDING } })
  ]);

  const monthlyRows = await backupRepository
    .createQueryBuilder("backup")
    .select("TO_CHAR(DATE_TRUNC('month', backup.created_at), 'YYYY-MM')", "month")
    .addSelect("COUNT(*)::int", "count")
    .where("backup.status = :status", { status: BACKUP_STATUS.APPROVED })
    .groupBy("DATE_TRUNC('month', backup.created_at)")
    .orderBy("DATE_TRUNC('month', backup.created_at)", "ASC")
    .getRawMany();

  return {
    companyCount,
    employeeCount,
    totalBackups,
    approvedBackups,
    pendingBackups,
    monthlyApprovedBackups: monthlyRows.map((row) => ({
      month: row.month,
      count: Number(row.count)
    }))
  };
}

module.exports = {
  getDashboardStats
};
