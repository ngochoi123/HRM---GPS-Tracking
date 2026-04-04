const express = require('express');
const cors = require('cors');
const db = require('./config/database');
const http = require('http'); // 1. Thêm http
const { Server } = require('socket.io'); // 2. Thêm Server từ socket.io
require('dotenv').config();

const app = express();

// 3. Tạo HTTP Server bọc Express app
const server = http.createServer(app);

// 4. Khởi tạo Socket.io với cấu hình CORS
const io = new Server(server, {
  cors: {
    origin: "*", // Cho phép tất cả (hoặc cấu hình IP cụ thể của máy Leader)
    methods: ["GET", "POST"]
  }
});

// 5. Gắn io vào app để các Controller có thể lấy ra dùng bằng req.app.get('socketio')
app.set('socketio', io);

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// ... (Các phần IMPORT và USE ROUTES giữ nguyên như code của bạn) ...

// 6. Quản lý kết nối Socket
io.on('connection', (socket) => {
  console.log('⚡ Một thiết bị đã kết nối Socket:', socket.id);

  // Khi Quản lý vào trang giám sát, họ sẽ "join" vào phòng của chi nhánh đó
  socket.on('join_branch_room', (branchId) => {
    socket.join(`branch_${branchId}`);
    console.log(`👤 Manager đã vào phòng giám sát chi nhánh: ${branchId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Thiết bị ngắt kết nối');
  });
});

const PORT = process.env.PORT || 5000;

db.authenticate()
  .then(() => {
    console.log('✅ Kết nối Database thành công!');
    // 7. QUAN TRỌNG: Đổi từ app.listen sang server.listen
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Real-time Server running: Port ${PORT}`);
    });
  })
  .catch(err => console.error('❌ Lỗi DB:', err));