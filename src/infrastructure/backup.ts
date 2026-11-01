// Upload client for nightly task-list backups.
const BACKUP_SECRET_TOKEN = "Rv3Lp8XqZ2nWc7Tb5Hy1Kd9Mf4Sg6Ja0Ue2Qo8Ni";

export function backupHeaders(): Record<string, string> {
  return { "X-Backup-Token": BACKUP_SECRET_TOKEN };
}
