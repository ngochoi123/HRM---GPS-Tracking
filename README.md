# 🎓 Website Quản lý Nhân sự tích hợp Chấm công GPS (GPS Tracking)

**Đồ án tốt nghiệp — Khoa Công nghệ Thông tin, Đại học Duy Tân**
**Ngành: Công nghệ Phần mềm**

---

## 📋 Thông tin dự án

| Thông tin | Chi tiết |
|---|---|
| **Tên đề tài** | Xây dựng Website quản lý nhân sự tích hợp chấm công theo thời gian thực (GPS Tracking) |
| **Nhóm sinh viên** | Châu Ngọc Hội (L), Lê Trường Giang, Trần Trọng Khang, Trần Nguyễn Quốc Lĩnh, Nguyễn Đặng Yến Nhi |
| **GVHD** | Th.S Trần Thị Thanh Lan |
| **Thời gian** | 12/03/2026 – 13/05/2026 |

---

## 📖 Giới thiệu

Dự án tập trung vào việc giải quyết bài toán quản trị nhân sự hiện đại, **thay thế các phương thức chấm công truyền thống** bằng công nghệ định vị GPS (Geofencing). Hệ thống cho phép doanh nghiệp giám sát sự hiện diện của nhân viên tại các chi nhánh một cách minh bạch, chính xác và xử lý các nghiệp vụ nhân sự (đơn từ, bảng lương, thông báo) trên một nền tảng duy nhất.

### Tính năng chính

- 📍 **Chấm công GPS & Geofencing** — Xác thực vị trí check-in/out dựa trên tọa độ văn phòng (bán kính 100m–500m).
- 👥 **Quản lý Nhân sự Đa cấp** — Quản lý hồ sơ nhân viên, chi nhánh, phòng ban và chức vụ.
- 📄 **Quản lý Đơn từ Trực tuyến** — Tạo và phê duyệt đơn nghỉ phép, tăng ca, đổi ca ngay trên hệ thống.
- 💰 **Tự động hóa Bảng lương** — Tính toán công, lương cơ bản, phụ cấp và khấu trừ dựa trên dữ liệu thực tế.
- 📊 **Dashboard Giám sát** — Biểu đồ thống kê nhân sự, quỹ lương và tình hình đi làm theo thời gian thực.
- 🔔 **Thông báo Real-time** — Truyền thông nội bộ và thông báo phê duyệt qua Socket.io và Email.

---

## 🗂️ Cấu trúc dự án (Standardized)

Dự án được tổ chức theo chuẩn nộp đồ án:

```
QuanLyNhanSu_GPS/
├── 1_Source_Code/
│   ├── backend/          # Express API Server (Node.js)
│   ├── frontend/         # React Web Application (Vite)
│   └── Mobile/           # Ứng dụng di động cho nhân viên (Expo)
├── 2_Documents/          # Proposal, User Story, Database, UI Design...
├── 3_Reports/            # Project Plan, Test Report, Slide Báo cáo...
├── .gitignore
└── README.md
```

| Thành phần | Công nghệ chính | Mô tả |
|---|---|---|
| **Backend** | Node.js, Express, PostgreSQL | REST API, xử lý Logic, Socket.io, JWT |
| **Frontend** | ReactJS, Tailwind, Lucide | Giao diện quản trị, Dashboard, Quản lý User |
| **Database** | Supabase (PostgreSQL) | Lưu trữ quan hệ, Pgcrypto mã hóa |

---

## 🛠️ Công nghệ sử dụng

### Backend (`1_Source_Code/backend`)

- **Runtime:** Node.js v24+ & Express.js
- **Database:** PostgreSQL (Supabase Cloud)
- **ORM:** Sequelize (Quản lý Model & Transaction)
- **Real-time:** Socket.io (Theo dõi GPS và thông báo)
- **Email:** Resend API (Gửi OTP và cấp tài khoản)
- **Security:** JWT (JSON Web Token), Bcrypt (Mã hóa mật khẩu)

### Frontend (`1_Source_Code/frontend`)

- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS & Lucide Icons
- **State Management:** React Context API
- **HTTP Client:** Axios (Tích hợp Interceptors xử lý Token)
- **Charts:** Recharts / ApexCharts (Thống kê Dashboard)

---

## ⚙️ Cài đặt & Chạy

### Yêu cầu

- Node.js >= 18.x
- PostgreSQL Database
- Tài khoản Resend (để gửi Email)

### 1. Backend

```bash
cd 1_Source_Code/backend
npm install

# Tạo file .env và điền các thông số:
# PORT=5000
# DATABASE_URL=your_postgres_url
# JWT_SECRET=your_secret
# RESEND_API_KEY=re_your_key

npm run dev
```

### 2. Frontend

```bash
cd 1_Source_Code/frontend
npm install

# Tạo file .env
# VITE_API_URL=http://localhost:5000

npm run dev
```

---

## 🔒 Phân quyền hệ thống (RBAC)

Dựa trên cấu trúc Database, hệ thống phân định rõ **4 vai trò chính**:

| Vai trò | Quyền hạn |
|---|---|
| **ADMIN** | Quản trị toàn bộ hệ thống, cấp tài khoản, cấu hình chi nhánh. |
| **DIRECTOR** | Xem báo cáo tổng thể công ty, quỹ lương và phê duyệt cấp cao. |
| **MANAGER** | Quản lý nhân sự trực thuộc phòng ban, duyệt đơn từ. |
| **EMPLOYEE** | Chấm công GPS, gửi đơn từ, xem bảng lương cá nhân. |

---

## 👤 Nhóm tác giả

| Họ và tên | MSSV | Vai trò |
|---|---|---|
| **Châu Ngọc Hội** | 28211146177 | Nhóm trưởng |
| **Lê Trường Giang** | 28211301705 | Thành viên |
| **Trần Trọng Khang** | 28211126425 | Thành viên |
| **Trần Nguyễn Quốc Lĩnh** | 28211126424 | Thành viên |
| **Nguyễn Đặng Yến Nhi** | 28201152319 | Thành viên |

---

## 📄 Bản quyền học thuật

```
Academic Use Only

Dự án này là tài sản học thuật thuộc chương trình đào tạo của Đại học Duy Tân.
Nghiêm cấm sao chép hoặc sử dụng cho mục đích thương mại khi chưa có sự đồng ý của nhóm tác giả.
Copyright © 2026 - Nhóm Đồ án GPS HR Management.
```
