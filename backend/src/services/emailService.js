const nodemailer = require('nodemailer');

// Cấu hình transporter với Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Hàm gửi OTP
const sendOTPEmail = async (toEmail, otpCode) => {
  try {
    const mailOptions = {
      from: `"Hệ thống Quản lý Nhân sự GPS" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Mã xác nhận OTP Đặt lại mật khẩu',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1da053; text-align: center;">YÊU CẦU ĐẶT LẠI MẬT KHẨU</h2>
            <p>Chào bạn,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email này.</p>
            <p>Mã xác nhận (OTP) của bạn là:</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827; background: #f3f4f6; padding: 10px 20px; border-radius: 8px;">
                ${otpCode}
              </span>
            </div>
            <p style="color: #dc2626; font-size: 14px;"><i>*Mã này sẽ hết hạn trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai!</i></p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #6b7280; text-align: center;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Đã gửi email thành công: ' + info.response);
    return true;
  } catch (error) {
    console.error('Lỗi khi gửi email: ', error);
    throw new Error('Không thể gửi email OTP');
  }
};


const sendAccountEmail = async (email, fullName, username, password) => {
  try {
    const subject = 'Cấp tài khoản hệ thống HR People Tech';
    
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #8b5cf6; padding: 20px; text-align: center; color: white;">
          <h2>CHÀO MỪNG GIA NHẬP HỆ THỐNG</h2>
        </div>
        <div style="padding: 20px; color: #374151; line-height: 1.6;">
          <p>Xin chào <strong>${fullName}</strong>,</p>
          <p>Bộ phận Admin vừa cấp cho bạn một tài khoản để truy cập vào hệ thống Quản lý Nhân sự của công ty. Dưới đây là thông tin đăng nhập của bạn:</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;">👤 <strong>Tên đăng nhập:</strong> <span style="color: #8b5cf6;">${username}</span></p>
            <p style="margin: 0;">🔑 <strong>Mật khẩu tạm thời:</strong> <span style="color: #ef4444; font-weight: bold;">${password}</span></p>
          </div>

          <p><em>⚠️ Lưu ý: Vì lý do bảo mật, hệ thống sẽ yêu cầu bạn đổi mật khẩu ngay trong lần đăng nhập đầu tiên.</em></p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:3000/login" style="background-color: #8b5cf6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">Đăng nhập ngay</a>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
          Đây là email tự động, vui lòng không trả lời email này.
        </div>
      </div>
    `;

    // 🛑 ĐÃ MỞ COMMENT: Lệnh gửi mail thực tế
    const info = await transporter.sendMail({
      from: `"Hệ thống Quản lý Nhân sự GPS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: htmlContent
    });
    
    console.log(`Đã gửi email cấp tài khoản tới: ${email} - ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Lỗi khi gửi email tài khoản:', error);
    throw new Error('Không thể gửi email thông báo tài khoản');
  }
};


module.exports = {
  sendOTPEmail,
  sendAccountEmail
};
