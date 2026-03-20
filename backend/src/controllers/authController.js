const { sendOTPEmail } = require('../services/emailService');

// Nơi lưu trữ OTP tạm thời (Trong thực tế nên dùng Redis hoặc lưu vào bảng trong Database)
global.otpStorage = global.otpStorage || {}; 

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email!' });
    }

    // 1. Tạo mã OTP 6 số ngẫu nhiên
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Lưu OTP vào bộ nhớ tạm với thời hạn 5 phút
    global.otpStorage[email] = {
      otp: otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 phút (tính bằng milliseconds)
    };

    // 3. Gọi hàm gửi Email (đã viết ở file emailService.js)
    await sendOTPEmail(email, otpCode);

    res.status(200).json({ 
      success: true, 
      message: 'Mã OTP đã được gửi đến email của bạn!' 
    });

  } catch (error) {
    console.error('Lỗi API forgotPassword:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi gửi email' });
  }
};
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
const bcrypt = require('bcryptjs'); // Hoặc dùng thư viện mã hóa của bạn

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // 1. Mã hóa mật khẩu mới (Nếu bạn dùng pgAdmin crypt thì dùng SQL, ở đây mình ví dụ logic)
    // Giả sử dùng Sequelize hoặc SQL thuần:
    // UPDATE user_account SET password_hash = crypt(newPassword, gen_salt('bf')) 
    // WHERE employee_id = (SELECT id FROM employee WHERE personal_email = email)

    console.log(`Đang đổi mật khẩu cho email: ${email}`);

    res.status(200).json({ 
      success: true, 
      message: 'Mật khẩu đã được cập nhật thành công!' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Đừng quên thêm resetPassword vào module.exports và file Routes nhé!
// 2. SỬA LẠI KHÚC EXPORTS Ở DƯỚI CÙNG ĐỂ THÊM verifyOTP VÀO:
module.exports = {
  // login, (nếu bạn có hàm login ở đây)
  forgotPassword,
  verifyOTP,
  resetPassword
};