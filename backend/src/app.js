const express = require('express');
const cors = require('cors');
const db = require('./config/database');
const http = require('http'); // 1. Thêm http
const { Server } = require('socket.io'); // 2. Thêm Server từ socket.io
require('dotenv').config();

const app = express();


const corsOptions = {
  origin: [
    'https://hrmgpsattendance.web.app', 
    'http://localhost:3000',            
    'http://localhost:5173'             
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true 
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ limit: '100mb', extended: true, parameterLimit: 100000 }));
app.use('/uploads', express.static('uploads'));

// ================= 2. KHỞI TẠO SOCKET.IO =================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Gắn io vào app để các Controller có thể lấy ra dùng
app.set('socketio', io);

// Quản lý kết nối Socket
io.on('connection', (socket) => {
  console.log('⚡ Một thiết bị đã kết nối Socket:', socket.id);

  socket.on('join_branch_room', (branchId) => {
    const room = `branch_${String(branchId)}`;
    socket.join(room);
    const inRoom = io.sockets.adapter.rooms.get(room)?.size ?? 0;
    console.log('[Socket] join_branch_room', { branchId, branchIdType: typeof branchId, room, socketId: socket.id, clientsInRoom: inRoom });
  });

  socket.on('disconnect', () => {
    console.log('❌ Thiết bị ngắt kết nối:', socket.id);
  });
});

// Auto check-out sau 5 phút rời vùng (Haversine + outOfZoneTrackers) xử lý trong track_location → geofencingService.js
const { registerGeofencingSocket } = require('./services/geofencingService');
registerGeofencingSocket(io);

// ================= 3. IMPORT ROUTES =================
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/AdminRoutes');
const directorRoutes = require('./routes/directorRoutes');
const employeeRoutes = require('./routes/EmployeeRoutes');
const managementRoutes = require('./routes/managementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const payrollRoutes = require('./routes/payrollRoutes');

// ================= 4. USE ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/director', directorRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/manager', managementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payroll', payrollRoutes);

// --- ROUTES TEST ---
app.get('/', (req, res) => {
  res.send('🚀 API GPS Attendance đang hoạt động...');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API đang hoạt động tốt!' });
});

// ================= 5. GLOBAL ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error('🔥 GLOBAL ERROR:', err);
  res.status(500).json({
    message: 'Lỗi server',
    error: err.message
  });
}); 

// ================= 6. CONNECT DB & START SERVER =================
// Đảm bảo có dòng process.env.PORT này để Render tự động cấp port
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const dbUrl = process.env.DATABASE_URL || '';
const isSupabaseConnection = /supabase\.com/i.test(dbUrl);
const dbProviderLabel = isSupabaseConnection ? 'Supabase (Cloud PostgreSQL)' : 'PostgreSQL Local';
const runtimeLabel = isProduction ? 'Production' : 'Development';

// Bật Server lên TRƯỚC
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server đã mở cổng thành công tại port ${PORT}`);
  
  // Sau đó mới kết nối Database
  db.authenticate()
    .then(() => {
      console.log(`✅ [${runtimeLabel}] Đã kết nối Database: ${dbProviderLabel}`);
    })
    .catch(err => {
      console.error(`❌ [${runtimeLabel}] Lỗi kết nối Database (${dbProviderLabel}):`, err.message);
    });
});