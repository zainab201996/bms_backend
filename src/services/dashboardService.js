const { BACKUP_STATUS, USER_TYPES } = require("../constants/enums");
const { backupsRepo, usersRepo } = require("../data/store");

async function getDashboardStats(user) {
  const userRepository = usersRepo();
  const backupRepository = backupsRepo();

  if (user.type === USER_TYPES.COMPANY) {
    const [pendingBackups, approvedBackups, submittedBackups] = await Promise.all([
      backupRepository.count({
        where: { company_id: user.id, status: BACKUP_STATUS.PENDING }
      }),
      backupRepository.count({
        where: { company_id: user.id, status: BACKUP_STATUS.APPROVED }
      }),
      backupRepository.count({
        where: { company_id: user.id, status: BACKUP_STATUS.SUBMITTED }
      })
    ]);

    return {
      pendingBackups,
      approvedBackups,
      submittedBackups
    };
  }

  if (user.type === USER_TYPES.EMPLOYEE) {
    const [approvedBackups, submittedBackups] = await Promise.all([
      backupRepository.count({
        where: { status: BACKUP_STATUS.APPROVED }
      }),
      backupRepository.count({
        where: { status: BACKUP_STATUS.SUBMITTED }
      })
    ]);

    return {
      approvedBackups,
      submittedBackups
    };
  }

  const [companyCount, employeeCount, totalBackups, approvedBackups, pendingBackups, submittedBackups] = await Promise.all([
    userRepository.count({ where: { type: USER_TYPES.COMPANY } }),
    userRepository.count({ where: { type: USER_TYPES.EMPLOYEE } }),
    backupRepository.count(),
    backupRepository.count({ where: { status: BACKUP_STATUS.APPROVED } }),
    backupRepository.count({ where: { status: BACKUP_STATUS.PENDING } }),
    backupRepository.count({ where: { status: BACKUP_STATUS.SUBMITTED } })
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
    submittedBackups,
    monthlyApprovedBackups: monthlyRows.map((row) => ({
      month: row.month,
      count: Number(row.count)
    }))
  };
}

module.exports = {
  getDashboardStats
};
