const db = require('../config/database');
const { sendOTPEmail } = require('../services/emailService');

// Nơi lưu trữ OTP tạm thời (RAM ảo)
global.otpStorage = global.otpStorage || {}; 

// ==========================================
// 1. HÀM ĐĂNG NHẬP (Lúc nãy bạn bị xóa mất, mình viết lại cho chuẩn)
// ==========================================
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });
    }

    // Truy vấn kiểm tra username và password (dùng hàm crypt của PostgreSQL)
    const query = `
      SELECT e.id, e.full_name, e.work_email, ua.username, ua.role_code, ua.status 
      FROM user_account ua
      JOIN employee e ON ua.employee_id = e.id
      WHERE (ua.username = :username OR e.work_email = :username OR e.personal_email = :username)
      AND ua.password_hash = crypt(:password, ua.password_hash)
      AND ua.status = 'active'
    `;

    const users = await db.query(query, {
      replacements: { username, password },
      type: db.QueryTypes.SELECT
    });

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác, hoặc tài khoản đã bị khóa!' });
    }

    const user = users[0];

    // Trả về thông tin user cho Frontend
    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        name: user.full_name,
        email: user.work_email,
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

    // Tạo mã OTP 6 số ngẫu nhiên
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

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

// ==========================================
// EXPORTS CÁC HÀM RA CHO ROUTER SỬ DỤNG
// ==========================================
module.exports = {
  login, // Đã sửa lại thành login (chữ l thường)
  forgotPassword,
  verifyOTP,
  resetPassword
};