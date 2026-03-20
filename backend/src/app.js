const cors = require('cors');
const express = require('express');
const db = require('./config/database');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/AdminRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);


// Test Connection
db.authenticate()
  .then(() => console.log('✅ Kết nối Database thành công!'))
  .catch(err => console.error('❌ Lỗi kết nối Database:', err));

// Route cơ bản
app.get('/', (req, res) => {
  res.send('API GPS Attendance đang hoạt động...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});