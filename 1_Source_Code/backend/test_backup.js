const { backupDatabase } = require('./src/cronjobs/backup.job');

async function test() {
    try {
        console.log('Testing backup...');
        const filePath = await backupDatabase();
        console.log('Backup successful:', filePath);
    } catch (err) {
        console.error('Backup failed:', err);
    }
}

test();
