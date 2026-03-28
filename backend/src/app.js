const express = require('express');
const cors = require('cors');
const db = require('./config/database');
require('dotenv').config();

const app = express();

// --- 1. MIDDLEWARE PHẢI ĐẶT TRƯỚC ROUTES ---
app.use(cors());
// Tăng limit để nhận được nội dung thông báo có chứa ảnh (Base64)
app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ limit: '100mb', extended: true, parameterLimit: 100000 }));

// --- 2. IMPORT ROUTES ---
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/AdminRoutes');
const dashboardRoutes = require("./routes/dashboard");
const departmentRoutes = require("./routes/departmentRoutes");
const branchRoutes = require('./routes/branchesRoutes');
const employeeRoutes = require('./routes/EmployeeRoutes'); 
const managementRoutes = require('./routes/managementRoutes'); 
const notificationRoutes = require('./routes/notificationRoutes');
// 2. KHAI BÁO ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/departments", departmentRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/manager', managementRoutes);

// --- 4. KẾT NỐI DB & START SERVER ---
db.authenticate()
  .then(() => console.log('✅ Kết nối Database thành công!'))
  .catch(err => console.error('❌ Lỗi kết nối Database:', err));

app.get('/', (req, res) => res.send('API GPS Attendance đang hoạt động...'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));