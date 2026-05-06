// ─────────────────────────────────────────────────────────────────────────────
// attendanceService.ts — Service gọi API chấm công cho Mobile (Expo / RN)
// ─────────────────────────────────────────────────────────────────────────────
//
// ⚠️  Lưu ý BASE URL:
//   - KHÔNG dùng http://localhost:5000 hay http://127.0.0.1:5000
//   - Phải dùng IP LAN, ví dụ: http://192.168.1.X:5000/api
//   - Xem chi tiết tại @/config/env.ts
//
// Tất cả các hàm đều yêu cầu truyền vào `token` (JWT Bearer).
// Token được lấy từ AsyncStorage với key 'userToken'.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import { API_URL } from '@/config/env';

// ─── Kiểu dữ liệu trả về ─────────────────────────────────────────────────────

export interface AttendanceSummaryResponse {
  success: boolean;
  message?: string;
  data?: {
    attendanceToday: {
      check_in_time: string | null;
      check_out_time: string | null;
      check_in_latitude: number | null;
      check_in_longitude: number | null;
      check_out_latitude: number | null;
      check_out_longitude: number | null;
      status: string | null;
      total_work_hours: number | null;
    } | null;
    workLocation: {
      work_location_id: number;
      location_name: string;
      latitude: number;
      longitude: number;
      radius_meters: number;
      wifi_ip_required?: boolean;
      client_ip_allowed?: boolean;
    } | null;
    workLocations: {
      work_location_id: number;
      location_name: string;
      latitude: number;
      longitude: number;
      radius_meters: number;
    }[];
  };
}

export interface AttendanceHistoryResponse {
  success: boolean;
  message?: string;
  data?: {
    rows: {
      attendance_date: string;
      check_in_time: string | null;
      check_out_time: string | null;
      status: string | null;
      total_work_hours: number | null;
    }[];
    summary: {
      totalHours: number;
      daysWorked: number;
      workingDaysInMonth: number | null;
      lateOrEarlyCount: number;
      compliancePercent: number;
    } | null;
  };
}

export interface CheckInOutResponse {
  success: boolean;
  message?: string;
  data?: {
    check_in_time?: string;
    check_out_time?: string;
    status?: string;
    total_work_hours?: number;
    fraud_detected?: boolean;
    fraud_reason?: string;
  };
}

// ─── Payload ─────────────────────────────────────────────────────────────────

export interface AttendancePayload {
  /** Vĩ độ GPS hiện tại của nhân viên */
  latitude: number;
  /** Kinh độ GPS hiện tại của nhân viên */
  longitude: number;
  /** Cờ xác định vị trí có phải do ứng dụng giả lập (Mock GPS) hay không */
  is_mocked?: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Lấy tóm tắt chấm công hôm nay + cấu hình vùng làm việc.
 *
 * Route: GET /api/employee/attendance/summary/:id
 *
 * @param employeeId  ID nhân viên (từ JWT / AsyncStorage)
 * @param token       JWT Bearer token
 */
export async function getAttendanceSummary(
  employeeId: string | number,
  token: string,
): Promise<AttendanceSummaryResponse> {
  const res = await axios.get<AttendanceSummaryResponse>(
    `${API_URL}/employee/attendance/summary/${employeeId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      // Timeout 10 giây để tránh treo UI khi mạng yếu
      timeout: 10_000,
    },
  );
  return res.data;
}

/**
 * Lấy lịch sử chấm công theo tháng.
 *
 * Route: GET /api/employee/attendance/history/:id?month=M&year=YYYY
 *
 * @param employeeId  ID nhân viên
 * @param token       JWT Bearer token
 * @param month       Tháng (1-12), mặc định tháng hiện tại nếu bỏ qua
 * @param year        Năm (YYYY), mặc định năm hiện tại nếu bỏ qua
 */
export async function getAttendanceHistory(
  employeeId: string | number,
  token: string,
  { month, year }: { month?: number; year?: number } = {},
): Promise<AttendanceHistoryResponse> {
  const res = await axios.get<AttendanceHistoryResponse>(
    `${API_URL}/employee/attendance/history/${employeeId}`,
    {
      params: { month, year },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    },
  );
  return res.data;
}

/**
 * Chấm công VÀO CA (Check-In).
 *
 * Route: POST /api/employee/attendance/checkin/:id
 * Body:  { latitude: number, longitude: number }
 *
 * Backend sẽ:
 *   1. Xác thực JWT
 *   2. Kiểm tra vị trí GPS so với vùng chấm công (geofence)
 *   3. Phát hiện gian lận GPS (speed anomaly, fake GPS)
 *   4. Ghi nhận giờ vào ca nếu hợp lệ
 *
 * @param employeeId  ID nhân viên
 * @param token       JWT Bearer token
 * @param payload     Tọa độ GPS hiện tại
 */
export async function checkIn(
  employeeId: string | number,
  token: string,
  payload: AttendancePayload,
): Promise<CheckInOutResponse> {
  const res = await axios.post<CheckInOutResponse>(
    `${API_URL}/employee/attendance/checkin/${employeeId}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    },
  );
  return res.data;
}

/**
 * Chấm công RA CA (Check-Out).
 *
 * Route: POST /api/employee/attendance/checkout/:id
 * Body:  { latitude: number, longitude: number }
 *
 * @param employeeId  ID nhân viên
 * @param token       JWT Bearer token
 * @param payload     Tọa độ GPS hiện tại
 */
export async function checkOut(
  employeeId: string | number,
  token: string,
  payload: AttendancePayload,
): Promise<CheckInOutResponse> {
  const res = await axios.post<CheckInOutResponse>(
    `${API_URL}/employee/attendance/checkout/${employeeId}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    },
  );
  return res.data;
}

// ─── Named export object (dùng như attendanceService.checkIn(...)) ────────────

export const attendanceService = {
  getSummary:  getAttendanceSummary,
  getHistory:  getAttendanceHistory,
  checkIn,
  checkOut,
};
