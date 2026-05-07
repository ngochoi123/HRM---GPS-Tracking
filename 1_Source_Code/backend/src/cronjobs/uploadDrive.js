
'use strict';

const { google } = require('googleapis');
const fs         = require('fs');
require('dotenv').config();

// ─── Cấu hình ────────────────────────────────────────────────────────────────
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const FOLDER_ID     = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

// ─── Khởi tạo Google Auth ────────────────────────────────────────────────────
let driveService = null;

function getDriveService() {
  if (driveService) return driveService;

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error('Thiếu cấu hình OAuth2 (Client ID, Secret hoặc Refresh Token) trong .env');
  }

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

  driveService = google.drive({ version: 'v3', auth: oauth2Client });
  return driveService;
}

// ─── Hàm upload ─────────────────────────────────────────────────────────────

/**
 * Upload một file lên Google Drive vào folder đã cấu hình.
 */
async function uploadFileToDrive(filePath, fileName) {
  const drive = getDriveService();

  console.log(`☁️  [Google Drive] Đang tải "${fileName}" lên Drive (OAuth2)...`);

  const response = await drive.files.create({
    requestBody: {
      name:    fileName,
      parents: [FOLDER_ID]
    },
    media: {
      mimeType: 'application/octet-stream',
      body:     fs.createReadStream(filePath)
    }
  });

  console.log(`✅ [Google Drive] Upload THÀNH CÔNG — ID: ${response.data.id}`);
  return response.data.id;
}

/**
 * Tự động xóa các file backup cũ trên Drive.
 */
async function pruneOldDriveBackups(maxKeep = 10) {
  try {
    const drive = getDriveService();

    const res = await drive.files.list({
      q:       `'${FOLDER_ID}' in parents and name contains 'backup_' and trashed = false`,
      fields:  'files(id, name, createdTime)',
      orderBy: 'createdTime asc'
    });

    const files = res.data.files || [];
    const toDelete = files.slice(0, Math.max(0, files.length - maxKeep));

    for (const f of toDelete) {
      await drive.files.delete({ fileId: f.id });
      console.log(`🗑️  [Google Drive] Đã xóa file cũ: "${f.name}"`);
    }
  } catch (e) {
    console.error('[Google Drive] Lỗi khi dọn file cũ:', e.message);
  }
}

module.exports = { uploadFileToDrive, pruneOldDriveBackups };
