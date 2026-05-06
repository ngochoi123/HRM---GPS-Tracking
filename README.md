# 🎓 HỆ THỐNG QUẢN TRỊ NHÂN SỰ TÍCH HỢP CHẤM CÔNG GPS (GPS TRACKING)

<div align="center">
  <img src="1_Source_Code/frontend/public/logo.png" alt="HRM GPS Logo" width="180"/>
  
  <br/>
  
  <a href="https://hrmgpsattendance.web.app">
    <img src="https://img.shields.io/badge/🚀_Website-HRM_GPS-00C853?style=for-the-badge" alt="Website"/>
  </a>
  <a href="https://kltn-gps-api.onrender.com">
    <img src="https://img.shields.io/badge/🖥️_API_Docs-Backend-1976D2?style=for-the-badge" alt="API Documentation"/>
  </a>
</div>

<div align="center">
  <p><i>"Giải pháp công nghệ quản trị nhân sự hiện đại và chấm công qua định vị GPS (Geofencing)"</i></p>
</div>

---

### 📌 Thông tin dự án (Project Information)

| **Danh mục** | **Chi tiết** |
| :--- | :--- |
| **Tên đề tài** | Xây dựng Website quản lý nhân sự tích hợp chấm công theo thời gian thực (GPS Tracking) |
| **Khoa/Ngành** | Khoa Công nghệ Thông tin, Đại học Duy Tân - Ngành Công nghệ Phần mềm |
| **GVHD** | Th.S Trần Thị Thanh Lan |
| **Thời gian** | 12/03/2026 – 13/05/2026 |
| 🌐 **Frontend (Demo)** | [hrmgpsattendance.web.app](https://hrmgpsattendance.web.app) |
| ⚙️ **Backend (Demo)** | [kltn-gps-api.onrender.com](https://kltn-gps-api.onrender.com) |

**Tài khoản trải nghiệm:**
- **Email:** `[EMAIL_ADDRESS]` (Chưa update)
- **Mật khẩu:** `12345678`

---

## 📖 Tổng Quan Dự Án

Dự án tập trung vào việc giải quyết bài toán quản trị nhân sự hiện đại, **thay thế các phương thức chấm công truyền thống** bằng công nghệ định vị GPS (Geofencing). Hệ thống bao gồm các nền tảng:

*   💻 **Web App (Frontend):** Dành cho Quản lý (Manager/Admin) theo dõi, báo cáo và duyệt đơn từ.
*   📱 **Mobile App (Android/iOS):** Ứng dụng di động mượt mà cho Nhân viên (Employee) thực hiện check-in/out và theo dõi cá nhân.
*   ⚙️ **Core API (Backend):** Hệ thống API xử lý chấm công GPS, tự động hóa bảng lương và Real-time Notification.

---

## ✨ Tính năng chính

- 📍 **Chấm công GPS & Geofencing** — Xác thực vị trí check-in/out dựa trên tọa độ văn phòng (bán kính 100m–500m) theo thời gian thực.
- 📄 **Quản lý Hợp đồng lao động** — Tự động hóa quy trình quản lý hợp đồng: Tự động mã hóa số hợp đồng, cảnh báo hợp đồng sắp hết hạn và hỗ trợ gia hạn hợp đồng thông minh.
- 📝 **Quản lý Đơn từ Tổng hợp** — Một giao diện duy nhất tích hợp toàn bộ quy trình: Đăng ký nghỉ phép, Tăng ca và Giải trình chấm công (quên check-in/out).
- 💰 **Tự động hóa Bảng lương** — Tính toán công, lương cơ bản, phụ cấp và các khoản khấu trừ dựa trên dữ liệu thực tế từ hệ thống chấm công.
- 📊 **Thống kê & Báo cáo nâng cao (Dashboard)** — Hệ thống báo cáo Real-time 5 phân hệ: Đơn từ, Hợp đồng, Biến động nhân sự, Lương & Chi phí, và Chuyên cần (có xếp hạng đi trễ).
- 🔔 **Thông báo Real-time** — Tương tác đa kênh qua Socket.io và Email cho các sự kiện phê duyệt và truyền thông nội bộ.

---

## 🗂️ Cấu Trúc Toàn Bộ Dự Án (Workspace)

Dự án được tổ chức theo cấu trúc chuẩn:

```text
QuanLyNhanSu_GPS/
├── 1_Source_Code/
│   ├── backend/          # Express API Server (Node.js, PostgreSQL)
│   ├── frontend/         # React Web Application (Vite, Tailwind)
│   └── Mobile/           # Ứng dụng di động (React Native & Expo)
├── 2_Documents/          # Tài liệu đặc tả, Database, Design...
├── 3_Reports/            # Kế hoạch dự án, Test Report, Slide...
├── .gitignore
└── README.md
```

---

## 🛠️ Công Nghệ Sử Dụng

### 🛰️ Core & Real-time (Backend)
- **Runtime:** `Node.js v24+`
- **Framework:** `Express.js`
- **Database:** `PostgreSQL` (Supabase Cloud) & `Sequelize ORM`
- **Real-time:** `Socket.io`
- **Khác:** `JWT`, `Bcrypt`, `Resend API` & `Brevo` (Email)

### 🎨 Giao diện (Frontend & Mobile)
- **Web:** `React.js` (Vite), `Tailwind CSS`, `Lucide Icons`, `Recharts`
- **Mobile:** `React Native` (Expo), `React Navigation`, `Expo Location` (GPS), `React Native Maps`
- **State Management:** `Context API`

---

## 🚀 Hướng Dẫn Cài Đặt

Dự án yêu cầu cài đặt riêng biệt cho từng Module:

### 1. Khởi tạo Backend (BE)
```bash
cd 1_Source_Code/backend
npm install
# Cấu hình .env dựa trên .env.example
npm run dev
```

### 2. Khởi tạo Frontend (FE)
```bash
cd 1_Source_Code/frontend
npm install
# Cấu hình .env dựa trên .env.production
npm run dev
```

### 3. Khởi tạo Mobile App (Mobile)
```bash
cd 1_Source_Code/Mobile
npm install
# Khởi chạy Metro Bundler
npx expo start
```
> [!TIP]
> Sử dụng ứng dụng **Expo Go** trên điện thoại (iOS/Android) để quét mã QR và chạy ứng dụng trực tiếp.

---

## 🔒 Phân quyền hệ thống (RBAC)

| Vai trò      | Quyền hạn                                                   |
| ------------ | ----------------------------------------------------------- |
| **ADMIN**    | Quản trị toàn hệ thống, cấu hình chi nhánh & tham số lương. |
| **DIRECTOR** | Giám sát báo cáo tổng thể, quỹ lương và phê duyệt cấp cao.  |
| **MANAGER**  | Quản lý nhân sự phòng ban, phê duyệt đơn từ & bảng công.    |
| **EMPLOYEE** | Chấm công GPS, gửi đơn từ, xem HĐLD & bảng lương cá nhân.   |

---

## 🤝 Đội ngũ Phát triển

| Họ và tên                 | MSSV        | Vai trò     |
| ------------------------- | ----------- | ----------- |
| **Châu Ngọc Hội**         | 28211146177 | Nhóm trưởng |
| **Lê Trường Giang**       | 28211301705 | Thành viên  |
| **Trần Trọng Khang**      | 28211126425 | Thành viên  |
| **Trần Nguyễn Quốc Lĩnh** | 28211126424 | Thành viên  |
| **Nguyễn Đặng Yến Nhi**   | 28201152319 | Thành viên  |

---

## 📄 Bản quyền học thuật

```
Academic Use Only

Dự án này là tài sản học thuật thuộc chương trình đào tạo của Đại học Duy Tân.
Nghiêm cấm sao chép hoặc sử dụng cho mục đích thương mại khi chưa có sự đồng ý của nhóm tác giả.
Copyright © 2026 - Nhóm Đồ án GPS HR Management.
```
