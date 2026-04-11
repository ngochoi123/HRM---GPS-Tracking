const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const FONTS_DIR = path.join(__dirname, '../fonts');

// Cấu hình transporter với Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

/**
 * Tạo buffer PDF quyết định (font TTF trong src/fonts để hiển thị tiếng Việt).
 */
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
      console.warn(
        '[emailService] Chưa có file .ttf trong src/fonts (ví dụ Times-New-Roman.ttf). PDF có thể hiển thị sai dấu tiếng Việt.'
      );
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
    doc.text(
      `${issuePlace}, ${formatVietnameseCalendarDate(issue_date)}`,
      rightX,
      y,
      { width: rightW, align: 'center' }
    );
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
      doc.text(
        `Điều 1. Khen thưởng: ${employeeName} theo hình thức «${form}» trong năm ${yearRef}.`,
        leftX,
        y,
        { width: 495, align: 'left' }
      );
      y += 16;
      if (amountNum > 0) {
        doc.text(
          `- Mức khen thưởng: ${new Intl.NumberFormat('vi-VN').format(amountNum)} VNĐ`,
          leftX,
          y,
          { width: 495, align: 'left' }
        );
        y += 14;
      }
      doc.text(`- Lý do, thành tích: ${reason}`, leftX, y, { width: 495, align: 'left' });
      y += 28;
    } else {
      doc.text(
        `Điều 1. Áp dụng hình thức kỷ luật «${form}» đối với ông/bà ${employeeName}.`,
        leftX,
        y,
        { width: 495, align: 'left' }
      );
      y += 16;
      doc.text(`- Lý do chi tiết: ${reason}`, leftX, y, { width: 495, align: 'left' });
      y += 14;
      if (amountNum > 0) {
        doc.text(
          `- Số tiền (nếu có): ${new Intl.NumberFormat('vi-VN').format(amountNum)} VNĐ`,
          leftX,
          y,
          { width: 495, align: 'left' }
        );
        y += 14;
      }
      y += 14;
    }

    doc.text(
      'Điều 2. Quyết định có hiệu lực kể từ ngày ký. Phòng Kế toán, Phòng Hành chính — Nhân sự và các phòng/ban có liên quan chịu trách nhiệm thi hành quyết định này.',
      leftX,
      y,
      { width: 495, align: 'left' }
    );
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
  const amountNum = Number(amount) || 0;
  const accent = isReward ? '#059669' : '#dc2626';
  const accentBg = isReward ? '#ecfdf5' : '#fef2f2';
  const title = isReward ? 'THÔNG BÁO QUYẾT ĐỊNH KHEN THƯỞNG' : 'THÔNG BÁO QUYẾT ĐỊNH KỶ LUẬT';
  const amountRow =
    amountNum > 0
      ? `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:38%;">Số tiền</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${escapeHtml(
            new Intl.NumberFormat('vi-VN').format(amountNum)
          )} VNĐ</td>
        </tr>`
      : '';

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; background:#f3f4f6; padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:${accent};color:#fff;padding:22px 24px;text-align:center;">
          <h1 style="margin:0;font-size:20px;letter-spacing:0.5px;">${title}</h1>
          <p style="margin:10px 0 0;font-size:14px;opacity:0.95;">Ban hành kèm bản quyết định định dạng PDF</p>
        </div>
        <div style="padding:24px;color:#1f2937;line-height:1.65;font-size:15px;">
          <p>Kính gửi <strong>${escapeHtml(employeeName)}</strong>,</p>
          <p>Phòng Hành chính — Nhân sự trân trọng thông báo: Công ty đã ban hành quyết định hành chính liên quan đến Anh/Chị. Dưới đây là tóm tắt nội dung; văn bản chính thức đính kèm file PDF.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;background:${accentBg};border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:38%;">Họ và tên</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${escapeHtml(employeeName)}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Số quyết định</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${escapeHtml(decision_number)}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Hình thức</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${escapeHtml(form)}</td>
            </tr>
            ${amountRow}
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;vertical-align:top;">Ngày hiệu lực</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${escapeHtml(
                formatVietnameseCalendarDate(issue_date)
              )}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;color:#6b7280;vertical-align:top;">Lý do chi tiết</td>
              <td style="padding:10px 12px;">${escapeHtml(reason).replace(/\n/g, '<br/>')}</td>
            </tr>
          </table>
          <p style="margin-bottom:0;">Trân trọng,<br/><strong>Phòng Hành chính — Nhân sự</strong><br/><span style="color:#6b7280;font-size:13px;">Email được gửi tự động từ hệ thống Quản lý Nhân sự GPS</span></p>
        </div>
      </div>
    </div>
  `;
}

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

    const info = await transporter.sendMail({
      from: `"Hệ thống Quản lý Nhân sự GPS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: htmlContent,
    });

    console.log(`Đã gửi email cấp tài khoản tới: ${email} - ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Lỗi khi gửi email tài khoản:', error);
    throw new Error('Không thể gửi email thông báo tài khoản');
  }
};

/**
 * Gửi email quyết định; pdfBuffer đã được tạo sẵn (đính kèm theo số quyết định).
 */
const sendDecisionEmail = async (email, employeeName, decisionData, pdfBuffer) => {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    throw new Error('sendDecisionEmail: thiếu pdfBuffer hợp lệ');
  }

  const { decision_number, decision_type } = decisionData;
  const isReward = decision_type === 'reward';
  const subject = isReward
    ? `[Khen thưởng] Quyết định ${decision_number} — ${employeeName}`
    : `[Kỷ luật] Quyết định ${decision_number} — ${employeeName}`;
  const htmlContent = buildDecisionEmailHtml(employeeName, decisionData, isReward);
  const attachmentName = safePdfFilename(decision_number);

  const info = await transporter.sendMail({
    from: `"Hệ thống Quản lý Nhân sự GPS" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: htmlContent,
    attachments: [
      {
        filename: attachmentName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  console.log(`Đã gửi email quyết định (${attachmentName}) tới: ${email} — ${info.messageId}`);
  return true;
};

module.exports = {
  sendOTPEmail,
  sendAccountEmail,
  sendDecisionEmail,
  generateDecisionPdfBuffer,
};
