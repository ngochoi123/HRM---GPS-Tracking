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
  
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>${title}</h2>
      <p>Kính gửi ${escapeHtml(employeeName)},</p>
      <p>Hệ thống gửi đính kèm bản PDF quyết định liên quan đến bạn.</p>
    </div>
  `;
}

// ==========================================
// 3. CÁC HÀM XUẤT RA (EXPORTS) ĐỂ CONTROLLER GỌI
// ==========================================

const sendOTPEmail = async (toEmail, otpCode) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
        <h2 style="color: #1da053; text-align: center;">XÁC MINH OTP</h2>
        <p>Chào bạn, mã OTP của bạn là:</p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; background: #f3f4f6; padding: 10px 20px;">
            ${otpCode}
          </span>
        </div>
      </div>
    </div>
  `;

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
  const subject = 'Cấp tài khoản hệ thống HR People Tech';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>THÔNG TIN TÀI KHOẢN</h2>
      <p>Chào <strong>${fullName}</strong>,</p>
      <p>Tên đăng nhập: <strong>${username}</strong></p>
      <p>Mật khẩu: <strong style="color: #ef4444;">${password}</strong></p>
    </div>
  `;

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