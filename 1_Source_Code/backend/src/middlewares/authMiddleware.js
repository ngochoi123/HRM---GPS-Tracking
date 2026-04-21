const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Không tìm thấy mã xác thực. Vui lòng đăng nhập lại!' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err.message);
      return res.status(403).json({ 
        success: false, 
        message: 'Mã xác thực đã hết hạn hoặc không hợp lệ!' 
      });
    }

    // Gắn thông tin user vào request để dùng ở các controller
    // user = { id, username, role, department_id }
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
