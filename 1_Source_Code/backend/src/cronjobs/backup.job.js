// ═══════════════════════════════════════════════════════════════════════════════
// backup.job.js — Tự động sao lưu PostgreSQL và upload lên Google Drive
// ═══════════════════════════════════════════════════════════════════════════════
// Lịch mặc định: 2:00 sáng mỗi Chủ Nhật hàng tuần
// Luồng:         pg_dump → Lưu file .sql → Upload Google Drive → Xóa file local
// Bảo mật:       Mật khẩu DB & Folder ID lấy từ .env
// ═══════════════════════════════════════════════════════════════════════════════

'use strict';

const cron = require('node-cron');
const { exec } = require('child_process');
const path   = require('path');
const fs     = require('fs');
require('dotenv').config();
const { uploadFileToDrive, pruneOldDriveBackups } = require('./uploadDrive');

// Bật/tắt upload Google Drive (mặc định: bật nếu có GOOGLE_DRIVE_FOLDER_ID)
const ENABLE_DRIVE_UPLOAD = !!process.env.GOOGLE_DRIVE_FOLDER_ID;

// ─── Cấu hình ───────────────────────────────────────────────────────────────
// Đường dẫn đến pg_dump (điều chỉnh nếu PostgreSQL cài ở phiên bản/thư mục khác)
const PG_DUMP_PATH  = process.env.PG_DUMP_PATH || '"C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe"';
const DB_HOST       = process.env.DB_HOST       || 'localhost';
const DB_PORT       = process.env.DB_PORT       || '5432';
const DB_USER       = process.env.DB_USER       || 'postgres';
const DB_PASSWORD   = process.env.DB_PASSWORD   || '';
const DB_NAME       = process.env.DB_NAME       || 'attendance_db';

// Thư mục lưu file backup (nằm ngoài src, cùng cấp với folder backend)
const BACKUP_DIR    = path.resolve(__dirname, '..', '..', '..', 'backups');

// Số file backup tối đa giữ lại (tự động xóa file cũ nhất khi vượt quá)
const MAX_BACKUPS   = 10;

// Cron schedule — mặc định: 2:00 sáng mỗi Chủ Nhật
// Cú pháp: 'giây phút giờ ngày tháng thứ'
// '0 2 * * 0'  → 02:00 AM, mỗi Chủ Nhật
// '0 2 * * *'  → 02:00 AM, mỗi ngày
// '0 */6 * * *' → Mỗi 6 tiếng
const CRON_SCHEDULE = process.env.BACKUP_CRON || '0 2 * * 0';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Đảm bảo thư mục backup tồn tại */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 [Backup] Đã tạo thư mục backup tại: ${BACKUP_DIR}`);
  }
}

/**
 * Xóa các file backup cũ nhất nếu vượt quá giới hạn MAX_BACKUPS
 */
function pruneOldBackups() {
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => a.time - b.time); // Sắp xếp cũ → mới

    while (files.length > MAX_BACKUPS) {
      const oldest = files.shift();
      fs.unlinkSync(path.join(BACKUP_DIR, oldest.name));
      console.log(`🗑️  [Backup] Đã xóa file backup cũ: ${oldest.name}`);
    }
  } catch (e) {
    console.error('[Backup] Lỗi khi dọn file cũ:', e.message);
  }
}

// ─── Hàm backup chính ────────────────────────────────────────────────────────

/**
 * Thực thi pg_dump để export toàn bộ database ra file .sql
 * @returns {Promise<string>} Đường dẫn file backup vừa tạo
 */
function backupDatabase() {
  return new Promise((resolve, reject) => {
    ensureBackupDir();

    // Tên file theo ngày-giờ để tránh trùng
    const now      = new Date();
    const dateStr  = now.toISOString().replace(/:/g, '-').split('.')[0]; // 2026-05-05T02-00-00
    const fileName = `backup_${DB_NAME}_${dateStr}.sql`;
    const filePath = path.join(BACKUP_DIR, fileName);

    console.log(`\n🔄 [Backup] Bắt đầu sao lưu database "${DB_NAME}"...`);
    console.log(`   → File đích: ${filePath}`);

    const cmd = `${PG_DUMP_PATH} -U ${DB_USER} -h ${DB_HOST} -p ${DB_PORT} -d ${DB_NAME} -f "${filePath}"`;

    exec(
      cmd,
      { env: { ...process.env, PGPASSWORD: DB_PASSWORD } },
      async (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ [Backup] Sao lưu THẤT BẠI:`, error.message);
          // Xóa file bị lỗi nếu pg_dump tạo ra file rỗng/không hợp lệ
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          return reject(error);
        }

        // pg_dump đẩy log (không phải lỗi) vào stderr
        if (stderr) {
          console.log(`   [pg_dump log]: ${stderr.trim()}`);
        }

        const sizeKB = Math.round(fs.statSync(filePath).size / 1024);
        console.log(`✅ [Backup] THÀNH CÔNG — ${fileName} (${sizeKB} KB)`);

        // Dọn file backup cũ trên ổ cứng local
        pruneOldBackups();

        // ── Upload lên Google Drive (nếu đã cấu hình) ──
        if (ENABLE_DRIVE_UPLOAD) {
          try {
            await uploadFileToDrive(filePath, fileName);
            // Dọn file backup cũ trên Drive
            await pruneOldDriveBackups(MAX_BACKUPS);
            // Xóa file local sau khi đã upload thành công để tiết kiệm ổ đĩa
            fs.unlink(filePath, (err) => {
              if (err) console.error(`[Dọn dẹp] Lỗi xóa file local: ${err.message}`);
              else console.log(`🗑️  [Dọn dẹp] Đã xóa file local: ${fileName}`);
            });
          } catch (driveErr) {
            // Upload thất bại → giữ file local làm fallback, KHÔNG reject
            console.error(`⚠️  [Google Drive] Upload thất bại, file vẫn còn tại: ${filePath}`);
            console.error(`   Lý do: ${driveErr.message}`);
          }
        } else {
          console.log(`ℹ️  [Backup] GOOGLE_DRIVE_FOLDER_ID chưa cấu hình — bỏ qua upload Drive.`);
        }

        resolve(filePath);
      }
    );
  });
}

// ─── Khởi động CronJob ───────────────────────────────────────────────────────

/**
 * Đăng ký cron job tự động backup theo lịch CRON_SCHEDULE.
 * Gọi hàm này 1 lần trong app.js khi server khởi động.
 */
function startBackupJob() {
  if (!cron.validate(CRON_SCHEDULE)) {
    console.error(`❌ [Backup] Lịch cron không hợp lệ: "${CRON_SCHEDULE}". Job bị bỏ qua.`);
    return;
  }

  cron.schedule(CRON_SCHEDULE, async () => {
    console.log(`\n⏰ [Backup] Cron kích hoạt lúc ${new Date().toLocaleString('vi-VN')}`);
    try {
      await backupDatabase();
    } catch (err) {
      // Lỗi đã được log trong backupDatabase(), không cần throw thêm
    }
  });

  console.log(`🗓️  [Backup] CronJob đã kích hoạt — Lịch: "${CRON_SCHEDULE}" (2:00 AM Chủ Nhật hàng tuần)`);
}

module.exports = { startBackupJob, backupDatabase };
