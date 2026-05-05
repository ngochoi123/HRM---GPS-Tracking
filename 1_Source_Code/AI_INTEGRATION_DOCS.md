# 🚀 Tài liệu Tổng hợp Nâng cấp Hệ thống AI Quản trị Nhân sự (HR Management)

**Phiên bản:** 2.1 (Cập nhật 30/04/2026 — Đổi model `qwen2.5:3b`, mở rộng Prompt & JSON Schema)
**Mô hình AI sử dụng:** Ollama (`qwen2.5:3b` local)

> ⚠️ **LỆNH BẮT BUỘC (CRITICAL RULE):**
> Bất kỳ thay đổi nào liên quan đến cấu trúc Prompt của AI, Logic truy vấn Database (Pre-aggregation), hoặc Cấu trúc JSON Output trong source code đều **PHẢI được cập nhật đồng bộ vào file tài liệu này**. Không được để code thực tế và tài liệu bị sai lệch!

---

## 📋 1. Tiến độ Dự án (Project Tracker)

| Trạng thái | Tính năng                                 | Mô tả chi tiết                                                                                                  |
| :--------: | :---------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
|     🟢     | **Tính năng 1: Dự đoán rủi ro nghỉ việc** | Phân tích chuyên cần, đi trễ, về sớm. Tích hợp Batch Processing & Pre-aggregation. Nâng cấp Nested JSON Output. |
|     🟢     | **Tính năng 2: Phát hiện gian lận GPS**   | Chạy ngầm (Background task), dùng công thức Haversine đối chiếu tọa độ chi nhánh thực tế (`work_location`).     |
|     🟢     | **Tính năng 3: HR Decision Assistant**    | Trợ lý tự động đề xuất quyết định Khen thưởng/Kỷ luật dựa trên kết quả phân tích AI. Đã tích hợp vào `getRecommendations`. |
|     🟢     | **Tính năng 4: HR Chatbot (Employee)**   | Chatbot RAG cho nhân viên tự tra cứu thông tin cá nhân, chấm công, nghỉ phép, quy chế nhân sự. RBAC cứng + Prompt Shielding. |

---

## 🧠 2. Tối ưu Kiến trúc Backend AI (`ai.controller.js`)

### 2.0. Cấu hình Ollama

| Tham số | Giá trị | Ghi chú |
|---|---|---|
| **Model** | `qwen2.5:3b` | Nâng từ `qwen2:1.5b` → `qwen2.5:3b` (cần ~2 GB VRAM) |
| **Timeout** | `5 * 60 * 1000` (5 phút) | Biến `OLLAMA_TIMEOUT_MS` |
| **Host** | `http://localhost:11434` | Dùng `localhost` (ổn định hơn `127.0.0.1` trên Windows) |
| **Context Window** | `num_ctx: 8192` | Nâng từ 4096 → 8192 để chứa prompt + output lớn hơn |
| **Temperature** | `0.3` | Thấp để output JSON ổn định, ít "sáng tạo" |
| **BATCH_SIZE** | `3` | Giảm từ 5 → 3 (JSON output lớn hơn, tránh bị cắt xén) |
| **Keep Alive** | `10m` | Giữ model trong bộ nhớ 10 phút |

### 2.1. Cải tiến Dữ liệu Đầu vào (Pre-aggregation)

Hệ thống không gọi SQL lặp lại cho từng nhân viên, mà sử dụng **Raw SQL + GROUP BY** để gom dữ liệu:

- **Tính ngày làm việc động:** Hàm `getPastWorkingDays` chỉ đếm số ngày trong 30 ngày qua (loại bỏ Thứ 7, CN và ngày hôm nay).
- **Tham chiếu chéo (Join):** `Employee → Position → Department` để lấy chức vụ và phòng ban. Tính Thâm niên (`seniority_months`) từ `join_date`.
- **Khấu trừ phép:** Truy vấn bảng `leave_request` (`status = 'approved'`) qua `generate_series` để đếm từng ngày (loại T7/CN).
- **Tính giờ công:** `totalWorkHours` (tổng giờ), `otHours` (giờ vượt 8h/ngày), `presentCount` (hệ số công).
- **GPS Fraud:** `JOIN attendance → work_location`, dùng Haversine SQL so sánh tọa độ check-in vs vị trí được phân công.

**Dữ liệu Employee Map (`empMap`):**
```javascript
{
  full_name: 'Nguyễn Văn A',
  position: 'Nhân viên IT',        // ← MỚI (v2.1)
  department: 'Phòng Kỹ thuật',    // ← MỚI (v2.1)
  seniority_months: 24,            // ← MỚI (v2.1)
  presentCount: 18.5,              // Hệ số công (0-1 mỗi ngày)
  totalWorkHours: 148.0,           // Tổng giờ làm thực tế
  otHours: 12.5,                   // Giờ tăng ca
  approvedLeaveCount: 2,           // Ngày nghỉ có phép
  lateCount: 3,
  earlyLeaveCount: 1,
  disciplineCount: 0,
  rewardCount: 1,
  gpsFraudCount: 0
}
```

### 2.2. AI System Prompt

```
Bạn là Giám đốc Nhân sự (CHRO) với 15 năm kinh nghiệm quản trị nhân sự tại doanh nghiệp Việt Nam.
Nhiệm vụ: Phân tích chuyên sâu rủi ro nhân sự, đưa ra đánh giá chi tiết và chiến lược giữ chân nhân viên cụ thể.
Phong cách: Chuyên nghiệp, dựa trên dữ liệu, nhưng cũng thể hiện sự thấu hiểu con người.
Luôn trả lời bằng định dạng JSON Array thuần. KHÔNG bọc trong object.
```

### 2.3. Employee Data gửi vào Prompt

Mỗi nhân viên trong batch sẽ được mô tả như sau:

```
Nhân viên 1 (employee_id: "uuid"):
  - Tên: Nguyễn Văn A
  - Chức vụ: Nhân viên IT | Phòng ban: Phòng Kỹ thuật          ← MỚI
  - Thâm niên: 24 tháng                                        ← MỚI
  - Tổng ngày làm việc chuẩn (trừ T7, CN): 22 ngày
  - Ngày công thực tế: 18.5 ngày (Tỷ lệ chuyên cần: 84%)      ← MỚI (tỷ lệ %)
  - Tổng giờ làm thực tế: 148.0 giờ | Giờ tăng ca (OT): 12.5 giờ  ← MỚI
  - Ngày nghỉ có phép (đã duyệt): 2 ngày
  - Nghỉ KHÔNG lý do: 1.5 ngày
  - Đi trễ: 3 lần | Về sớm: 1 lần
  - Kỷ luật: 0 lần | Khen thưởng: 1 lần
  - Gian lận GPS (chấm công ngoài vùng cho phép): 0 lần
```

### 2.4. Quy tắc đánh giá Risk Level

```
- Nghỉ không lý do >= 3 ngày → "HIGH"
- Gian lận GPS >= 2 lần → "HIGH" (gian lận nghiêm trọng)
- Đi trễ + về sớm >= 5 lần hoặc có kỷ luật → >= "MEDIUM"
- Có khen thưởng, chuyên cần tốt, OT cao → có thể "LOW"
- Nhân viên mới (< 6 tháng) nghỉ nhiều → nguy cơ cao hơn bình thường   ← MỚI
```

### 2.5. JSON Output Schema (AI trả về)

```json
[
  {
    "employee_id": "uuid",
    "risk_level": "HIGH | MEDIUM | LOW",
    "risk_score": 85,
    "summary": "Tóm tắt 2-3 câu: tình trạng tổng quan và dấu hiệu đáng lo ngại nhất.",
    "analysis": {
      "key_concerns": ["Vấn đề 1", "Vấn đề 2", "Vấn đề 3"],
      "positive_signals": ["Điểm tích cực 1"],
      "behavior_pattern": "Mô tả xu hướng hành vi: VD 'Giảm dần động lực', 'Bất mãn gia tăng', 'Ổn định'"
    },
    "retention_strategy": [
      {
        "action": "Hành động cụ thể cần thực hiện",
        "priority": "URGENT | HIGH | MEDIUM | LOW",
        "timeline": "Trong 3 ngày | Trong 1 tuần | Trong 2 tuần | Trong 1 tháng"
      }
    ],
    "suggested_action": {
      "type": "reward | discipline | monitor | meeting",
      "reason": "Lý do ngắn gọn cho đề xuất này"
    },
    "recommendations": ["Đề xuất hành động 1", "Đề xuất hành động 2", "Đề xuất hành động 3"]
  }
]
```

### 2.6. Lưu trữ Database (`ai_alerts` table)

Cột `message` lưu JSON string bao gồm:
```json
{
  "summary": "...",
  "risk_score": 85,
  "analysis": { "key_concerns": [...], "positive_signals": [...], "behavior_pattern": "..." },
  "retention_strategy": [...],
  "suggested_action": { "type": "...", "reason": "..." },
  "recommendations": [...],
  "last_stats": {
    "presentCount": 18.5,
    "totalWorkHours": 148.0,
    "otHours": 12.5,
    "absentCount": 1.5,
    "lateCount": 3,
    "earlyLeaveCount": 1,
    "approvedLeaveCount": 2,
    "disciplineCount": 0,
    "rewardCount": 1,
    "gpsFraudCount": 0
  }
}
```

### 2.7. JSON Parse Fallback

Khi AI trả về JSON không hợp lệ, hệ thống tự tạo alert dựa trên quy tắc:
- `absentCount >= 3` → `risk_level = "HIGH"`
- `absentCount >= 1` → `risk_level = "MEDIUM"`
- Còn lại → `risk_level = "LOW"`

---

## 🖥️ 3. Frontend — AI Turnover Dashboard (`AITurnoverDashboard.jsx`)

### 3.1. Parser Function (`parseAiMessage`)

Hàm parse JSON từ cột `message` với fallback đầy đủ cho tất cả trường mới:

```javascript
parseAiMessage(msg) → {
  summary, risk_score, analysis, retention_strategy,
  suggested_action, recommendations, geo, last_stats
}
```

### 3.2. Modal "Phân tích sâu" — Các section hiển thị

| Section | Trường dữ liệu | Mô tả |
|---|---|---|
| **Profile Card** | `risk_level`, `position_name` | Ảnh avatar, tên, chức vụ, badge rủi ro |
| **Risk Score Gauge** | `risk_score` (0-100) | Thanh progress gradient (xanh → cam → đỏ) |
| **Summary Quote** | `summary` | Trích dẫn AI insight dạng italic |
| **Behavior Pattern** | `analysis.behavior_pattern` | Badge indigo mô tả xu hướng hành vi |
| **Key Concerns** | `analysis.key_concerns[]` | Danh sách bullet đỏ — vấn đề đáng lo ngại |
| **Positive Signals** | `analysis.positive_signals[]` | Danh sách bullet xanh — điểm tích cực |
| **GPS Fraud Map** | `geo` (chỉ cho `FRAUD_DETECTION`) | Mini map mock hiển thị khoảng cách |
| **Retention Strategy** | `retention_strategy[]` | Grid cards với `priority` badge + `timeline` |
| **Suggested Action** | `suggested_action` | Banner indigo: loại hành động + lý do |
| **Recommendations** | `recommendations[]` | Danh sách đánh số trong card tím/đỏ |

### 3.3. Icon Dependencies (lucide-react)

```
BrainCircuit, AlertTriangle, TrendingDown, TrendingUp, Users, Search,
ChevronRight, Clock, Sparkles, ArrowRight, Info, MessageSquareWarning,
RefreshCw, X, Terminal, Timer, ShieldAlert, UserMinus, Crosshair,
Activity, Target, ThumbsUp, ThumbsDown, Gauge, CalendarClock, Zap    ← MỚI (v2.1)
```

---

## 🔗 4. API Endpoints

| Method | Endpoint | Controller | Mô tả |
|---|---|---|---|
| `GET` | `/api/ai/test` | `testLocalAI` | Kiểm tra kết nối Ollama |
| `POST` | `/api/ai/analyze-turnover` | `analyzeTurnoverRisk` | Chạy phân tích batch (mất ~15-60s) |
| `GET` | `/api/ai/alerts` | `getAIAlerts` | Lấy danh sách cảnh báo (có RBAC) |
| `GET` | `/api/ai/recommendations` | `getRecommendations` | Chuyển đổi alerts → đề xuất KT/KL |
| `POST` | `/api/chat` | `chatbot.chat` | HR Chatbot — Nhân viên hỏi đáp (RBAC: EMPLOYEE only) |
| `GET` | `/api/chat/history` | `chatbot.getChatHistory` | Lấy lịch sử chat (RBAC: EMPLOYEE only) |

---

## 📝 5. Changelog

| Ngày | Phiên bản | Thay đổi |
|---|---|---|
| 01/05/2026 | **v2.2** | Thêm Tính năng 4: HR Chatbot (Employee). RAG approach — tiêm dữ liệu cá nhân (profile, contract, attendance, leave) vào System Prompt. Bảo mật: RBAC cứng (chỉ EMPLOYEE), Input Validation (giới hạn 1000 ký tự/tin, 20 tin nhắn), Prompt Shielding (regex phát hiện injection, đóng băng system prompt). Lưu lịch sử vào bảng `chat_histories`. API: `POST /api/chat`, `GET /api/chat/history`. |
| 30/04/2026 | **v2.1** | Đổi model `qwen2:1.5b` → `qwen2.5:3b`. Thêm data: position, department, seniority_months, attendanceRate, totalWorkHours, otHours. Mở rộng JSON schema: risk_score, analysis (key_concerns, positive_signals, behavior_pattern), retention_strategy (action, priority, timeline), suggested_action. Tăng num_ctx 4096→8192, thêm temperature 0.3, giảm BATCH_SIZE 5→3. Nâng cấp frontend modal với Risk Gauge, Concerns/Signals, Behavior Pattern, Retention Cards, Suggested Action. |
| 29/04/2026 | v2.0 | Tích hợp Batch Processing, Pre-aggregation, Nested JSON Output. |
