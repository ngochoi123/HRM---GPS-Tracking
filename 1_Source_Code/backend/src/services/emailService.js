/*
 * Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.
 * All rights reserved.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

// Thư mục chứa font tiếng Việt
const FONTS_DIR = path.join(__dirname, '..', 'fonts');

// ==========================================
// 1. HÀM GỬI MAIL CỐT LÕI (Nodemailer cho Local / Brevo cho Prod)
// ==========================================
async function transportMail({ to, subject, html, attachments = [] }) {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // --- MÔI TRƯỜNG LOCAL (Dùng Nodemailer + Gmail) ---
    console.log(`📧 [Local] Đang gửi email tới: ${to} qua Nodemailer...`);
    
    // Khởi tạo transporter từ .env
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"Hệ thống Quản lý Nhân sự GPS" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments: attachments.map(att => ({
        filename: att.filename || 'document.pdf',
        content: att.content // Buffer hoặc string
      }))
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ [Local] Gửi email thành công! Message ID:", info.messageId);
      return info;
    } catch (error) {
      console.error("❌ [Local] Lỗi gửi email qua Nodemailer:", error.message);
      throw error;
    }
  } else {
    // --- MÔI TRƯỜNG PRODUCTION (Dùng Brevo API) ---
    console.log(`🚀 [Prod] Đang gửi email tới: ${to} qua Brevo API...`);
    
    const payload = {
      sender: { 
        name: "Hệ thống Quản lý Nhân sự GPS", 
        email: "peopelteach@gmail.com" 
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
    };

    if (attachments && attachments.length > 0) {
      payload.attachment = attachments.map(att => {
        let base64Content = att.content;
        
        if (Buffer.isBuffer(att.content)) {
          base64Content = att.content.toString('base64');
        } else if (typeof att.content === 'string' && !/^[A-Za-z0-9+/=]+$/.test(att.content)) {
          base64Content = Buffer.from(att.content).toString('base64');
        }

        return {
          name: att.filename || att.name || 'document.pdf',
          content: base64Content
        };
      });
    }

    try {
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      console.log("✅ [Prod] Gửi email thành công! Message ID:", response.data.messageId);
      return response.data;
    } catch (error) {
      console.error("❌ [Prod] Lỗi gửi email qua Brevo API:");
      if (error.response) {
        console.error(error.response.data);
      } else {
        console.error(error.message);
      }
      throw error;
    }
  }
}

// ==========================================
// 2. CÁC HÀM TIỆN ÍCH XỬ LÝ DỮ LIỆU & PDF
// ==========================================
function resolveVietnameseFontPath() {
  const preferred = path.join(FONTS_DIR, 'Times-New-Roman.ttf');
  if (fs.existsSync(preferred)) return preferred;
  if (!fs.existsSync(FONTS_DIR)) return null;
  const ttf = fs.readdirSync(FONTS_DIR).find((f) => f.toLowerCase().endsWith('.ttf'));
  return ttf ? path.join(FONTS_DIR, ttf) : null;
}

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatVietnameseCalendarDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return `ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

function safePdfFilename(decisionNumber) {
  const base = String(decisionNumber || 'Quyet-dinh').replace(/[/\\?%*:|"<>]/g, '_');
  return `${base}.pdf`;
}

function generateDecisionPdfBuffer(employeeName, decisionData) {
  const fontPath = resolveVietnameseFontPath();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const fontMain = 'VNBody';
    if (fontPath) {
      doc.registerFont(fontMain, fontPath);
    } else {
      console.warn('[emailService] Chưa có file .ttf trong src/fonts. PDF có thể hiển thị sai dấu tiếng Việt.');
    }

    const useFont = fontPath ? fontMain : 'Helvetica';
    const company = process.env.COMPANY_NAME || '................................';
    const issuePlace = process.env.DECISION_ISSUE_PLACE || '..........';
    const { decision_number, decision_type, form, amount, reason, issue_date } = decisionData;
    const isReward = decision_type === 'reward';
    const amountNum = Number(amount) || 0;
    const yearRef = (() => {
      const d = new Date(issue_date);
      return Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    })();

    const leftX = 50;
    const rightX = 290;
    const rightW = 245;
    let y = 50;

    doc.font(useFont).fontSize(11);
    doc.text(`CÔNG TY ${company}`, leftX, y, { width: 220, align: 'left' });
    doc.fontSize(10).text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', rightX, y, { width: rightW, align: 'center' });
    y += 28;
    doc.text('Độc lập - Tự do - Hạnh phúc', rightX, y, { width: rightW, align: 'center' });
    y += 18;
    const lineY = y;
    doc
      .moveTo(rightX + 30, lineY)
      .lineTo(rightX + rightW - 30, lineY)
      .dash(4, { space: 3 })
      .strokeColor('#333333')
      .stroke()
      .undash();
    y += 20;

    doc.fontSize(11);
    doc.text(`Số: ${decision_number}`, leftX, y, { width: 220, align: 'left' });
    doc.text(`${issuePlace}, ${formatVietnameseCalendarDate(issue_date)}`, rightX, y, { width: rightW, align: 'center' });
    y += 36;

    doc.fontSize(13).text('QUYẾT ĐỊNH', leftX, y, { width: 495, align: 'center' });
    y += 22;
    const subjectLine = isReward
      ? `V/v: Khen thưởng cá nhân xuất sắc năm ${yearRef}`
      : `V/v: Xử lý kỷ luật lao động năm ${yearRef}`;
    doc.fontSize(12).text(subjectLine, leftX, y, { width: 495, align: 'center' });
    y += 20;
    doc.text('CÔNG TY', leftX, y, { width: 495, align: 'center' });
    y += 28;

    doc.fontSize(11).text('Căn cứ:', leftX, y, { width: 495, align: 'left' });
    y += 16;
    const basis = [
      'Căn cứ Bộ luật Lao động 2019;',
      `Căn cứ vào Điều lệ hoạt động của Công ty ${company};`,
      'Để động viên, khuyến khích CBNV toàn Công ty;',
      'Xét đề nghị của Trưởng phòng Hành chính — Nhân sự.',
    ];
    if (!isReward) {
      basis[2] = 'Để duy trì kỷ luật lao động, nề nếp làm việc tại Công ty;';
    }
    basis.forEach((line) => {
      doc.text(`- ${line}`, leftX, y, { width: 495, align: 'left' });
      y += 14;
    });
    y += 10;

    doc.fontSize(12).text('QUYẾT ĐỊNH:', leftX, y, { width: 495, align: 'center' });
    y += 22;

    doc.fontSize(11);
    if (isReward) {
      doc.text(`Điều 1. Khen thưởng: ${employeeName} theo hình thức «${form}» trong năm ${yearRef}.`, leftX, y, { width: 495, align: 'left' });
      y += 16;
      if (amountNum > 0) {
        doc.text(`- Mức khen thưởng: ${new Intl.NumberFormat('vi-VN').format(amountNum)} VNĐ`, leftX, y, { width: 495, align: 'left' });
        y += 14;
      }
      doc.text(`- Lý do, thành tích: ${reason}`, leftX, y, { width: 495, align: 'left' });
      y += 28;
    } else {
      doc.text(`Điều 1. Áp dụng hình thức kỷ luật «${form}» đối với ông/bà ${employeeName}.`, leftX, y, { width: 495, align: 'left' });
      y += 16;
      doc.text(`- Lý do chi tiết: ${reason}`, leftX, y, { width: 495, align: 'left' });
      y += 14;
      if (amountNum > 0) {
        doc.text(`- Số tiền (nếu có): ${new Intl.NumberFormat('vi-VN').format(amountNum)} VNĐ`, leftX, y, { width: 495, align: 'left' });
        y += 14;
      }
      y += 14;
    }

    doc.text('Điều 2. Quyết định có hiệu lực kể từ ngày ký. Phòng Kế toán, Phòng Hành chính — Nhân sự và các phòng/ban có liên quan chịu trách nhiệm thi hành quyết định này.', leftX, y, { width: 495, align: 'left' });
    y += 56;
    doc.text('Nơi nhận:', leftX, y, { width: 200 });
    y += 14;
    doc.text('- Như Điều 2;', leftX, y);
    y += 14;
    doc.text('- Lưu: HCNS.', leftX, y);
    y += 40;
    doc.text('TM. BAN GIÁM ĐỐC', rightX, y, { width: rightW, align: 'center' });
    y += 14;
    doc.text('GIÁM ĐỐC', rightX, y, { width: rightW, align: 'center' });

    doc.end();
  });
}

function buildDecisionEmailHtml(employeeName, decisionData, isReward) {
  const { decision_number, form, amount, reason, issue_date } = decisionData;
  const title = isReward ? 'THÔNG BÁO QUYẾT ĐỊNH KHEN THƯỞNG' : 'THÔNG BÁO QUYẾT ĐỊNH KỶ LUẬT';
  const titleColor = isReward ? '#1da053' : '#dc2626';
  
  const content = `
    <h2 style="color: ${titleColor}; margin-top: 0;">${title}</h2>
    <p>Kính gửi <strong>${escapeHtml(employeeName)}</strong>,</p>
    <p>Hệ thống Quản lý Nhân sự HR PeopleTech xin thông báo về quyết định nhân sự liên quan đến bạn với các thông tin chi tiết như sau:</p>
    
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; border: 1px solid #e5e7eb; margin: 20px 0;">
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Số quyết định:</strong> ${escapeHtml(decision_number)}</li>
        <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Ngày ban hành:</strong> ${formatVietnameseCalendarDate(issue_date)}</li>
        <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Hình thức:</strong> ${escapeHtml(form)}</li>
        ${amount && Number(amount) > 0 ? `
        <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Số tiền:</strong> <span style="color: #1da053; font-weight: bold;">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}</span></li>
        ` : ''}
        <li style="padding: 8px 0;"><strong>Lý do:</strong> ${escapeHtml(reason)}</li>
      </ul>
    </div>

    <p style="margin-top: 25px; padding: 15px; background-color: #fffbeb; border-left: 4px solid #f59e0b; font-weight: bold; color: #92400e;">
      ⚠️ Chi tiết quyết định có chữ ký và con dấu đã được đính kèm bằng file PDF trong email này. Vui lòng tải xuống để xem.
    </p>
  `;

  return _wrapEmailLayout(content);
}

/**
 * Helper để bọc layout chung cho Email (Header, Body, Footer)
 */
function _wrapEmailLayout(content) {
  return `
    <div style="background-color: #f4f4f4; padding: 30px 0; font-family: 'Arial', sans-serif; color: #333333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="padding: 25px; text-align: center; border-bottom: 1px solid #eeeeee;">
          <img src="https://example.com/logo-hr-peopletech.png" alt="HR PeopleTech Logo" style="width: 150px; display: block; margin: 0 auto;">
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px; line-height: 1.6;">
          ${content}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 25px; text-align: center; color: #6b7280; font-size: 13px;">
          <p style="margin: 0 0 10px 0; font-weight: 500;">Đây là email tự động từ Hệ thống Quản lý Nhân sự HR PeopleTech.</p>
          <p style="margin: 0 0 15px 0;">Vui lòng không trả lời trực tiếp email này.</p>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 10px;">
            <p style="margin: 0;"><strong>Công ty Công nghệ HR PeopleTech</strong></p>
            <p style="margin: 5px 0 0 0;">Địa chỉ: 123 Đường Công Nghệ, Quận 1, TP. Hồ Chí Minh</p>
            <p style="margin: 2px 0 0 0;">Hotline: 028.1234.5678 | Website: peopletech.vn</p>
          </div>
        </div>
      </div>
    </div>
  `;
}


// ==========================================
// 3. CÁC HÀM XUẤT RA (EXPORTS) ĐỂ CONTROLLER GỌI
// ==========================================

const sendOTPEmail = async (toEmail, otpCode) => {
  const content = `
    <h2 style="color: #1da053; margin-top: 0; text-align: center; text-transform: uppercase;">Xác minh mã OTP</h2>
    <p>Xin chào,</p>
    <p>Bạn đã yêu cầu cấp mã xác thực để đặt lại mật khẩu trên hệ thống HR PeopleTech. Vui lòng sử dụng mã OTP dưới đây để hoàn tất quy trình:</p>
    
    <div style="background-color: #f0fdf4; border: 2px dashed #1da053; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
      <span style="font-size: 36px; font-weight: bold; color: #1da053; letter-spacing: 8px; font-family: monospace;">${otpCode}</span>
    </div>
    
    <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 15px; margin-top: 20px;">
      <p style="margin: 0; color: #e11d48; font-weight: bold;">⚠️ Cảnh báo bảo mật:</p>
      <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #4b5563;">
        <li>Mã này có hiệu lực trong vòng <strong>5 phút</strong>.</li>
        <li><strong>Tuyệt đối không chia sẻ mã này</strong> cho bất kỳ ai, kể cả nhân viên hỗ trợ kỹ thuật.</li>
      </ul>
    </div>
    <p style="margin-top: 25px; color: #6b7280; font-size: 14px;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ với bộ phận nhân sự để được hỗ trợ.</p>
  `;

  const htmlContent = _wrapEmailLayout(content);


  try {
    await transportMail({ to: toEmail, subject: 'Mã xác nhận OTP Đặt lại mật khẩu', html: htmlContent });
    console.log(`✅ Đã gửi email OTP thành công tới: ${toEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Lỗi gửi OTP:', error);
    throw error;
  }
};

const sendAccountEmail = async (email, fullName, username, password) => {
  const subject = 'Chào mừng gia nhập hệ thống HR PeopleTech';
  
  const content = `
    <h2 style="color: #1da053; margin-top: 0; text-transform: uppercase;">Chào mừng gia nhập hệ thống</h2>
    <p>Xin chào <strong>${escapeHtml(fullName)}</strong>,</p>
    <p>Chào mừng bạn đã chính thức trở thành một thành viên của HR PeopleTech. Tài khoản truy cập hệ thống Quản lý Nhân sự của bạn đã được khởi tạo thành công.</p>
    
    <div style="background-color: #f9fafb; border-radius: 10px; padding: 25px; border: 1px solid #e5e7eb; margin: 30px 0;">
      <h3 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Thông tin đăng nhập:</h3>
      <p style="margin: 15px 0 10px 0;">Tên đăng nhập: <strong style="color: #1da053;">${escapeHtml(username)}</strong></p>
      <p style="margin: 0;">Mật khẩu: <strong style="color: #ea580c; font-size: 18px;">${escapeHtml(password)}</strong></p>
    </div>

    <div style="text-align: center; margin: 35px 0;">
      <a href="#" style="background-color: #1da053; color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 2px 4px rgba(29, 160, 83, 0.3);">Đăng nhập ngay</a>
    </div>

    <p style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; color: #166534; font-size: 14px; text-align: center; font-style: italic;">
      💡 Nhắc nhở: Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên để bảo đảm an toàn cho tài khoản của bạn.
    </p>
  `;

  const htmlContent = _wrapEmailLayout(content);


  try {
    await transportMail({ to: email, subject: subject, html: htmlContent });
    console.log(`✅ Đã gửi email cấp tài khoản tới: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Lỗi kích hoạt luồng gửi email:', error);
    return false;
  }
};

const sendDecisionEmail = async (email, employeeName, decisionData, pdfBuffer) => {
  const { decision_number, decision_type } = decisionData;
  const isReward = decision_type === 'reward';
  
  const subject = isReward
    ? `[Khen thưởng] Quyết định ${decision_number} — ${employeeName}`
    : `[Kỷ luật] Quyết định ${decision_number} — ${employeeName}`;
    
  const htmlContent = buildDecisionEmailHtml(employeeName, decisionData, isReward);
  const attachmentName = safePdfFilename(decision_number);

  const attachments = [
    {
      filename: attachmentName,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }
  ];

  try {
    await transportMail({ to: email, subject: subject, html: htmlContent, attachments });
    console.log(`✅ Đã gửi email quyết định tới: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Lỗi gửi quyết định:', error);
    throw error;
  }
};

module.exports = {
  sendOTPEmail,
  sendAccountEmail,
  sendDecisionEmail,
  generateDecisionPdfBuffer,
};