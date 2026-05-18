const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config({ path: '../../.env' }); // Adjust if needed
const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // Use the OOB method if possible, though Google has deprecated it. Let's try localhost if OOB fails.

// Alternatively, use http://localhost:3000/oauth2callback
const REDIRECT_URI_LOCAL = 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'https://developers.google.com/oauthplayground' // Default for playground, but we can't use our own client id there easily unless configured.
);

// We'll use http://localhost:3000 to be safer
const client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'http://localhost:3000'
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Forces to get refresh token
});

console.log('Vui lòng mở link sau trong trình duyệt để cấp quyền:');
console.log('\n' + authUrl + '\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Sau khi đăng nhập và đồng ý, hệ thống có thể chuyển bạn đến localhost. Hãy copy tham số "code=" trên thanh địa chỉ và dán vào đây: ', async (code) => {
  try {
    const { tokens } = await client.getToken(code);
    console.log('\n✅ Lấy token thành công!');
    console.log('Refresh Token của bạn là:\n');
    console.log(tokens.refresh_token);
    
    console.log('\nĐang tự động cập nhật file .env...');
    const envPath = path.resolve(__dirname, '../../../.env');
    let envData = fs.readFileSync(envPath, 'utf8');
    
    if (envData.includes('GOOGLE_REFRESH_TOKEN=')) {
      envData = envData.replace(/GOOGLE_REFRESH_TOKEN=.*/g, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      envData += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    }
    
    fs.writeFileSync(envPath, envData);
    console.log('✅ Đã cập nhật xong GOOGLE_REFRESH_TOKEN vào .env. Hãy chạy lại lệnh backup!');
    
  } catch (err) {
    console.error('Lỗi khi lấy token:', err.message);
  }
  rl.close();
});
