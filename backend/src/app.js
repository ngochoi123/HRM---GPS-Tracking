const cors = require('cors');
const express = require('express');
const db = require('./config/database');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. IMPORT ROUTES
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/AdminRoutes');
const dashboardRoutes = require("./routes/dashboard");
const departmentRoutes = require("./routes/departmentRoutes");
const branchRoutes = require('./routes/branchesRoutes');
const employeeRoutes = require('./routes/EmployeeRoutes'); 
const managementRoutes = require('./routes/managementRoutes'); 
// 2. KHAI BÁO ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/departments", departmentRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/manager', managementRoutes);

// 3. TEST KẾT NỐI DB
db.authenticate()
  .then(() => console.log('✅ Kết nối Database thành công!'))
  .catch(err => console.error('❌ Lỗi kết nối Database:', err));

app.get('/', (req, res) => {
  res.send('API GPS Attendance đang hoạt động...');
});

// 4. CHẠY SERVER (LUÔN PHẢI NẰM DƯỚI CÙNG)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});