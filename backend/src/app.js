const express = require('express');
const cors = require('cors');
const db = require('./config/database');
const http = require('http'); // 1. Thêm http
const { Server } = require('socket.io'); // 2. Thêm Server từ socket.io
require('dotenv').config();

const app = express();

// ================= 1. MIDDLEWARE =================
// Thay dòng app.use(cors()) cũ bằng đoạn sau:
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));
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

// ================= 4. USE ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/director', directorRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/manager', managementRoutes);
app.use('/api/notifications', notificationRoutes);

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

db.authenticate()
  .then(() => {
    console.log('✅ Kết nối Database thành công!');
    // Dùng server.listen (của HTTP) chứ KHÔNG dùng app.listen để Socket hoạt động
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Real-time Server running trên port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối Database:', err);
  });