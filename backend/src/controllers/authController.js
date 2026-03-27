const db = require('../config/database');
const { sendOTPEmail } = require('../services/emailService');

// Nơi lưu trữ OTP tạm thời (RAM ảo)
global.otpStorage = global.otpStorage || {}; 

// ==========================================
// 1. HÀM ĐĂNG NHẬP (Đã bổ sung chốt chặn đổi mật khẩu lần đầu)
// ==========================================
const jwt = require('jsonwebtoken'); // 1. NHỚ PHẢI CÓ DÒNG NÀY Ở ĐẦU FILE

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });
    }

    const query = `
      SELECT 
        e.id as employee_id, e.full_name, e.work_email, 
        ua.id as user_id, ua.username, ua.role_code, ua.status, ua.require_pass_change,
        ua.password_hash -- Lấy cái này để verify
      FROM user_account ua
      JOIN employee e ON ua.employee_id = e.id
      WHERE (ua.username = :username OR e.work_email = :username OR e.personal_email = :username)
      AND ua.status = 'active'
    `;

    const users = await db.query(query, { replacements: { username }, type: db.QueryTypes.SELECT });

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại!' });
    }

    const user = users[0];

    // 2. Kiểm tra mật khẩu bằng SQL crypt
    const passQuery = `SELECT crypt(:password, :hash) = :hash as valid`;
    const [passCheck] = await db.query(passQuery, { 
      replacements: { password, hash: user.password_hash },
      type: db.QueryTypes.SELECT 
    });

    if (!passCheck.valid) {
      return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác!' });
    }

    // 3. SINH TOKEN (Quan trọng để không bị lỗi ReferenceError)
    const token = jwt.sign(
      { id: user.user_id, username: user.username, role: user.role_code },
      process.env.JWT_SECRET || 'your_jwt_secret', 
      { expiresIn: '24h' }
    );

    // 4. CHIA NGẢ ĐƯỜNG ĐĂNG NHẬP
    if (user.require_pass_change) {
      return res.status(200).json({ 
        success: true,
        require_pass_change: true,
        message: "Vui lòng đổi mật khẩu trước khi sử dụng hệ thống.",
        token: token, // Bây giờ token đã có giá trị
        user: {
          username: user.username,
          role: user.role_code
        }
      });
    }

    // Đăng nhập bình thường
    res.status(200).json({
      success: true,
      require_pass_change: false,
      token: token,
      user: {
        id: user.employee_id,
        name: user.full_name,
        username: user.username,
        role: user.role_code
      }
    });

  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};

// ==========================================
// 2. HÀM QUÊN MẬT KHẨU (Gửi OTP)
// ==========================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email!' });
    }

    const [employee] = await db.query('SELECT * FROM employee WHERE personal_email = :email LIMIT 1', {
        replacements: { email: email },
        type: db.QueryTypes.SELECT
    });

    if (!employee) {
        return res.status(404).json({ 
            success: false, 
            message: 'Tài khoản không tồn tại trong hệ thống' 
        });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Khởi tạo global.otpStorage nếu chưa có (Tránh lỗi undefined)
    if (!global.otpStorage) global.otpStorage = {};

    // Lưu OTP vào bộ nhớ tạm với thời hạn 5 phút
    global.otpStorage[email] = {
      otp: otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000 
    };

    // Gọi hàm gửi Email 
    await sendOTPEmail(email, otpCode);

    res.status(200).json({ success: true, message: 'Mã OTP đã được gửi đến email của bạn!' });

  } catch (error) {
    console.error('Lỗi API forgotPassword:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi gửi email' });
  }
};

// ==========================================
// 3. HÀM XÁC THỰC OTP
// ==========================================
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ email và mã OTP!' });
    }

    const record = global.otpStorage[email];

    if (!record) {
      return res.status(400).json({ success: false, message: 'Mã OTP không tồn tại hoặc chưa được yêu cầu!' });
    }

    if (Date.now() > record.expiresAt) {
      delete global.otpStorage[email];
      return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn! Vui lòng gửi lại mã mới.' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Mã OTP không chính xác!' });
    }

    delete global.otpStorage[email]; // Dùng xong thì xóa

    res.status(200).json({ success: true, message: 'Xác thực mã OTP thành công!' });
  } catch (error) {
    console.error('Lỗi API verifyOTP:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi xác thực OTP' });
  }
};

// ==========================================
// 4. HÀM ĐẶT LẠI MẬT KHẨU (Gọi thẳng SQL)
// ==========================================
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ thông tin!' });
    }

    const query = `
      UPDATE user_account 
      SET password_hash = crypt(:newPassword, gen_salt('bf')) 
      WHERE employee_id = (
        SELECT id FROM employee 
        WHERE work_email = :email OR personal_email = :email
        LIMIT 1
      )
    `;

    const [result, metadata] = await db.query(query, {
      replacements: { newPassword: newPassword, email: email }
    });

    if (metadata.rowCount === 0) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy tài khoản liên kết với email này!' });
    }

    res.status(200).json({ success: true, message: 'Mật khẩu đã được cập nhật thành công!' });
  } catch (error) {
    console.error('Lỗi API resetPassword:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đổi mật khẩu' });
  }
};

const changePasswordFirstLogin = async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  try {
    // 1. Kiểm tra tài khoản và mật khẩu cũ có khớp không
    const checkQuery = `
      SELECT id FROM user_account 
      WHERE username = :username 
      AND password_hash = crypt(:oldPassword, password_hash)
    `;
    const [user] = await db.query(checkQuery, {
      replacements: { username, oldPassword },
      type: db.QueryTypes.SELECT
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Mật khẩu cũ không chính xác!" });
    }

    // 2. Cập nhật mật khẩu mới và tắt cờ bắt buộc đổi mật khẩu
    const updateQuery = `
      UPDATE user_account 
      SET password_hash = crypt(:newPassword, gen_salt('bf')),
          require_pass_change = false
      WHERE id = :id
    `;
    await db.query(updateQuery, {
      replacements: { newPassword, id: user.id }
    });

    res.status(200).json({ success: true, message: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại." });
  } catch (error) {
    console.error("Lỗi đổi mật khẩu lần đầu:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ" });
  }
};

// ==========================================
// EXPORTS CÁC HÀM RA CHO ROUTER SỬ DỤNG
// ==========================================
module.exports = {
  login, 
  changePasswordFirstLogin,
  forgotPassword,
  verifyOTP,
  resetPassword
};