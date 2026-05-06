const { backupDatabase } = require('../src/cronjobs/backup.job');

async function runManualBackup() {
  try {
    console.log('--- Bắt đầu chạy backup thủ công ---');
    await backupDatabase();
    console.log('--- Hoàn tất backup thủ công ---');
    process.exit(0);
  } catch (error) {
    console.error('--- Backup thủ công THẤT BẠI ---');
    console.error(error);
    process.exit(1);
  }
}

runManualBackup();
