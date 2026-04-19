# 🎓 Website Quản lý Nhân sự tích hợp Chấm công GPS (GPS Tracking)

**Đồ án tốt nghiệp — Khoa Công nghệ Thông tin, Đại học Duy Tân**
**Ngành: Công nghệ Phần mềm**

---

## 📋 Thông tin dự án

| Thông tin          | Chi tiết                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| **Tên đề tài**     | Xây dựng Website quản lý nhân sự tích hợp chấm công theo thời gian thực (GPS Tracking)           |
| **Nhóm sinh viên** | Châu Ngọc Hội (L), Lê Trường Giang, Trần Trọng Khang, Trần Nguyễn Quốc Lĩnh, Nguyễn Đặng Yến Nhi |
| **GVHD**           | Th.S Trần Thị Thanh Lan                                                                          |
| **Thời gian**      | 12/03/2026 – 13/05/2026                                                                          |

---

## 📖 Giới thiệu

Dự án tập trung vào việc giải quyết bài toán quản trị nhân sự hiện đại, **thay thế các phương thức chấm công truyền thống** bằng công nghệ định vị GPS (Geofencing). Hệ thống cho phép doanh nghiệp giám sát sự hiện diện của nhân viên tại các chi nhánh một cách minh bạch, chính xác và xử lý các nghiệp vụ nhân sự (đơn từ, bảng lương, thông báo) trên một nền tảng duy nhất.

### Tính năng chính

Hệ thống cung cấp một giải pháp quản trị nhân sự toàn diện với các phân hệ cốt lõi:

- 📍 **Chấm công GPS & Geofencing** — Xác thực vị trí check-in/out dựa trên tọa độ văn phòng (bán kính 100m–500m) theo thời gian thực.
- 📄 **Quản lý Hợp đồng lao động** — Tự động hóa quy trình quản lý hợp đồng: Tự động mã hóa số hợp đồng, cảnh báo hợp đồng sắp hết hạn và hỗ trợ gia hạn hợp đồng thông minh.
- 📝 **Quản lý Đơn từ Tổng hợp** — Một giao diện duy nhất tích hợp toàn bộ quy trình: Đăng ký nghỉ phép, Tăng ca và Giải trình chấm công (quên check-in/out).
- 💰 **Tự động hóa Bảng lương** — Tính toán công, lương cơ bản, phụ cấp và các khoản khấu trừ dựa trên dữ liệu thực tế từ hệ thống chấm công.
- 📊 **Thống kê & Báo cáo nâng cao (Dashboard)** — Hệ thống báo cáo Real-time 5 phân hệ: Đơn từ, Hợp đồng, Biến động nhân sự, Lương & Chi phí, và Chuyên cần (có xếp hạng đi trễ).
- 🔔 **Thông báo Real-time** — Tương tác đa kênh qua Socket.io và Email cho các sự kiện phê duyệt và truyền thông nội bộ.

---

## 🗂️ Cấu trúc dự án (Standardized)

Dự án được tổ chức theo cấu trúc chuẩn:

```
QuanLyNhanSu_GPS/
├── 1_Source_Code/
│   ├── backend/          # Express API Server (Node.js)
│   ├── frontend/         # React Web Application (Vite)
│   └── Mobile/           # Ứng dụng di động (React Native & Expo)
├── 2_Documents/          # Tài liệu đặc tả, Database, Design...
├── 3_Reports/            # Kế hoạch dự án, Test Report, Slide...
├── .gitignore
└── README.md
```

| Thành phần     | Công nghệ chính              | Mô tả                                     |
| -------------- | ---------------------------- | ----------------------------------------- |
| **Backend**    | Node.js, Express, PostgreSQL | REST API, Logic xử lý, Socket.io, JWT     |
| **Frontend**   | ReactJS, Tailwind, Lucide    | Giao diện Quản trị & Dashboard            |
| **Mobile App** | React Native, Expo, Maps     | Ứng dụng dành cho Nhân viên (iOS/Android) |
| **Database**   | Supabase (PostgreSQL)        | Lưu trữ quan hệ, Bảo mật dữ liệu          |

---

## 🛠️ Công nghệ sử dụng

### Backend (`1_Source_Code/backend`)

- **Runtime:** Node.js v24+
- **Framework:** Express.js
- **Database:** PostgreSQL (Supabase Cloud)
- **ORM:** Sequelize (Transaction management)
- **Real-time:** Socket.io
- **Email:** Resend API & Brevo
- **Security:** JWT, Bcrypt

### Frontend (`1_Source_Code/frontend`)

- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS & Lucide Icons
- **State:** Context API
- **HTTP Client:** Axios Interceptors
- **Charts:** Recharts / ApexCharts

### Mobile App (`1_Source_Code/Mobile`)

- **Framework:** React Native (Expo)
- **Navigation:** Expo Router & React Navigation
- **Location:** Expo Location (GPS Tracking)
- **UI:** React Native Reanimated & Vector Icons
- **Maps:** React Native Maps

---

## ⚙️ Cài đặt & Chạy

### 🌐 Demo Trực tuyến

- **Frontend (Firebase):** [https://hrmgpsattendance.web.app](https://hrmgpsattendance.web.app)
- **Backend (Render):** [https://kltn-gps-api.onrender.com](https://kltn-gps-api.onrender.com)

### Tài khoản trải nghiệm:

- **Email:** `[EMAIL_ADDRESS]` (Chưa update)
- **Mật khẩu:** `12345678`

### 1. Backend

```bash
cd 1_Source_Code/backend
npm install
# Configure .env based on .env.example
npm run dev
```

### 2. Frontend (Web)

```bash
cd 1_Source_Code/frontend
npm install
# Configure .env based on .env.production
npm run dev
```

### 3. Mobile App (Employee)

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

## 👤 Nhóm tác giả

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
