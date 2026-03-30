const express = require('express');
const cors = require('cors');
const db = require('./config/database');
require('dotenv').config();

const app = express();

// ================= 1. MIDDLEWARE =================
app.use(cors());

// Tăng limit để nhận được nội dung thông báo có chứa ảnh (Base64)
// (Đã xóa các dòng bị lặp lại để code gọn gàng hơn)
app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ limit: '100mb', extended: true, parameterLimit: 100000 }));
app.use('/uploads', express.static('uploads'));

// ================= 2. IMPORT ROUTES =================
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const directorRoutes = require('./routes/directorRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const managementRoutes = require('./routes/managementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const GiamDocRoutes = require('./routes/GiamDocRoutes');

// ================= 3. USE ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/director', directorRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/manager', managementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/giamdoc', GiamDocRoutes);

// --- ROUTES TEST ---
app.get('/', (req, res) => {
  res.send('🚀 API GPS Attendance đang hoạt động...');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API đang hoạt động tốt!' });
});

// ================= 4. GLOBAL ERROR HANDLER =================
// 👉 Đã đóng ngoặc hàm này đúng cách để không nuốt code bên dưới
app.use((err, req, res, next) => {
  console.error('🔥 GLOBAL ERROR:', err);
  res.status(500).json({
    message: 'Lỗi server',
    error: err.message
  });
}); 

// ================= 5. CONNECT DB & START SERVER =================
const PORT = process.env.PORT || 5000;

db.authenticate()
  .then(() => {
    console.log('✅ Kết nối Database thành công!');
    // Nên để app.listen bên trong then() để đảm bảo DB kết nối xong mới mở cổng
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối Database:', err);
  });