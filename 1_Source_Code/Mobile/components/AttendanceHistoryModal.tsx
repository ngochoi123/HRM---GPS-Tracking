// ─── AttendanceHistoryModal ────────────────────────────────────────────────────
// Hiển thị lịch sử chấm công theo tháng trong một bottom-sheet có thể vuốt.
//
// ⚠️  API BASE URL:
//   App mobile KHÔNG thể dùng localhost / 127.0.0.1 làm địa chỉ server.
//   Phải dùng IP LAN của máy chạy backend (xem @/config/env.ts để biết thêm).
//
// Các endpoint được sử dụng:
//   GET /api/employee/attendance/history/:id?month=M&year=YYYY  — danh sách ngày công
//   GET /api/employee/attendance/summary/:id                     — thống kê tháng
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { attendanceService } from '@/services/attendanceService';
import { SwipeableSheet } from '@/components/SwipeableSheet';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AttendanceRow {
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string | null;
  total_work_hours: number | null;
}

interface AttendanceSummary {
  totalHours: number;
  daysWorked: number;
  workingDaysInMonth: number | null;
  lateOrEarlyCount: number;
  compliancePercent: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('vi-VN', {
      weekday: 'short', day: '2-digit', month: '2-digit',
    });
  } catch { return d; }
};

const fmtTime = (t: string | null) => {
  if (!t) return '—';
  try {
    return new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch { return t; }
};

const statusConfig = (status: string | null) => {
  switch (status) {
    case 'on_time':     return { label: 'Đúng giờ',  color: '#10b981', bg: '#d1fae5' };
    case 'late':        return { label: 'Đi muộn',   color: '#f59e0b', bg: '#fef3c7' };
    case 'early_leave': return { label: 'Về sớm',    color: '#f97316', bg: '#ffedd5' };
    case 'absent':      return { label: 'Vắng mặt',  color: '#ef4444', bg: '#fee2e2' };
    default:            return { label: 'Chưa xong', color: '#94a3b8', bg: '#f1f5f9' };
  }
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AttendanceHistoryModal({ visible, onClose }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [rows,    setRows]    = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [token, setToken]           = useState<string | null>(null);

  // ── Lấy token + employeeId từ AsyncStorage khi component mount ──────────────
  useEffect(() => {
    (async () => {
      const t  = await AsyncStorage.getItem('userToken');
      const id = await AsyncStorage.getItem('employeeId');
      setToken(t);
      setEmployeeId(id);
    })();
  }, []);

  /**
   * Tải lịch sử chấm công theo tháng/năm đang chọn.
   * Gọi song song:
   *   - attendanceService.getHistory  → danh sách ngày công
   *   - attendanceService.getSummary  → thống kê tháng (totalHours, daysWorked…)
   *
   * Lưu ý: Hàm này sẽ không thực thi nếu chưa có token hoặc employeeId.
   *        Nếu người dùng từ chối quyền vị trí / không đăng nhập, hiện thông báo rõ.
   */
  const fetchHistory = useCallback(async () => {
    if (!employeeId || !token) {
      setError('Chưa xác thực. Vui lòng đăng nhập lại.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Gọi song song history + summary để tăng tốc
      const [histRes, sumRes] = await Promise.all([
        attendanceService.getHistory(employeeId, token, { month, year }),
        attendanceService.getSummary(employeeId, token),
      ]);

      if (!histRes?.success) throw new Error(histRes?.message || 'Lỗi tải lịch sử chấm công');
      setRows(histRes.data?.rows ?? []);

      // Summary có thể đến từ history response hoặc summary endpoint
      // Ưu tiên summary từ history (nếu backend trả về), fallback sang summary endpoint
      if (histRes.data?.summary) {
        setSummary(histRes.data.summary);
      } else if (sumRes?.success && sumRes.data) {
        // Tính thủ công từ dữ liệu summary hôm nay nếu cần
        const rows = histRes.data?.rows ?? [];
        const totalHours = rows.reduce((acc, r) => acc + (r.total_work_hours ?? 0), 0);
        const daysWorked = rows.filter((r) => r.check_in_time != null).length;
        const lateOrEarlyCount = rows.filter((r) => r.status === 'late' || r.status === 'early_leave').length;
        const onTime = rows.filter((r) => r.status === 'on_time').length;
        const compliancePercent = daysWorked > 0 ? Math.round((onTime / daysWorked) * 100) : 0;
        setSummary({ totalHours: Math.round(totalHours * 10) / 10, daysWorked, workingDaysInMonth: null, lateOrEarlyCount, compliancePercent });
      }
    } catch (e: any) {
      // Phân biệt lỗi mạng vs lỗi xác thực
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      } else if (status === 404) {
        setError('Không tìm thấy dữ liệu chấm công.');
      } else {
        setError(e?.response?.data?.message || e?.message || 'Lỗi kết nối server');
      }
    } finally {
      setLoading(false);
    }
  }, [employeeId, token, month, year]);

  // Tự động fetch khi modal mở hoặc tháng thay đổi
  useEffect(() => {
    if (visible && employeeId && token) fetchHistory();
  }, [visible, fetchHistory, employeeId, token]);

  // Month nav
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;
    if (ny > now.getFullYear() || (ny === now.getFullYear() && nm > now.getMonth() + 1)) return;
    setMonth(nm); setYear(ny);
  };
  const isNextDisabled =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1);

  // Row render
  const renderItem = ({ item }: { item: AttendanceRow }) => {
    const s = statusConfig(item.status);
    const hours = item.total_work_hours != null
      ? `${Number(item.total_work_hours).toFixed(1)}h` : null;
    return (
      <View style={styles.row}>
        <Text style={styles.rowDate}>{fmtDate(item.attendance_date)}</Text>
        <View style={styles.rowTimes}>
          <Feather name="log-in" size={11} color="#10b981" />
          <Text style={styles.rowTime}>{fmtTime(item.check_in_time)}</Text>
          <View style={styles.rowDiv} />
          <Feather name="log-out" size={11} color="#f59e0b" />
          <Text style={styles.rowTime}>{fmtTime(item.check_out_time)}</Text>
          {hours && (
            <View style={styles.hoursBadge}>
              <Text style={styles.hoursText}>{hours}</Text>
            </View>
          )}
        </View>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>
    );
  };

  return (
    <SwipeableSheet visible={visible} onClose={onClose} maxHeightRatio={0.88}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Lịch sử chấm công</Text>
      </View>

      {/* ── Month nav ── */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.arrow} onPress={prevMonth}>
          <Feather name="chevron-left" size={22} color="#00b4d8" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity
          style={[styles.arrow, isNextDisabled && styles.arrowDis]}
          onPress={nextMonth} disabled={isNextDisabled}
        >
          <Feather name="chevron-right" size={22} color={isNextDisabled ? '#cbd5e1' : '#00b4d8'} />
        </TouchableOpacity>
      </View>

      {/* ── Summary ── */}
      {summary && !loading && (
        <View style={styles.summaryRow}>
          <SCard value={summary.daysWorked}              label="Ngày công" icon="calendar"      color="#10b981" />
          <SCard value={`${summary.totalHours}h`}        label="Tổng giờ"  icon="clock"         color="#00b4d8" />
          <SCard value={summary.lateOrEarlyCount}        label="Muộn/Sớm"  icon="alert-triangle" color="#f59e0b" />
          <SCard value={`${summary.compliancePercent}%`} label="Đúng giờ"  icon="check-circle"  color="#8b5cf6" />
        </View>
      )}

      {/* ── Col headers ── */}
      {!loading && !error && rows.length > 0 && (
        <View style={styles.colHead}>
          <Text style={[styles.colText, { flex: 1.1 }]}>Ngày</Text>
          <Text style={[styles.colText, { flex: 2 }]}>Vào / Ra</Text>
          <Text style={[styles.colText, { flex: 1, textAlign: 'right' }]}>Trạng thái</Text>
        </View>
      )}

      {/* ── Body ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00b4d8" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={36} color="#cbd5e1" />
          <Text style={styles.errText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchHistory}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>Không có dữ liệu tháng này</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.attendance_date}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </SwipeableSheet>
  );
}

// ─── Summary Card ──────────────────────────────────────────────────────────────
function SCard({ value, label, icon, color }: {
  value: string | number; label: string; icon: any; color: string;
}) {
  return (
    <View style={[styles.sCard, { borderTopColor: color }]}>
      <View style={[styles.sIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon} size={13} color={color} />
      </View>
      <Text style={[styles.sValue, { color }]}>{value}</Text>
      <Text style={styles.sLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 4 },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  arrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#e0f7fa', alignItems: 'center', justifyContent: 'center' },
  arrowDis: { backgroundColor: '#f1f5f9' },
  monthLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },

  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sCard: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 8, alignItems: 'center', borderTopWidth: 3, elevation: 1 },
  sIcon: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sValue: { fontSize: 14, fontWeight: '900', marginBottom: 1 },
  sLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700', textAlign: 'center' },

  colHead: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 7, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  colText: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  rowDate: { flex: 1.1, fontSize: 12, fontWeight: '700', color: '#334155' },
  rowTimes: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowTime: { fontSize: 12, color: '#475569', fontWeight: '600' },
  rowDiv: { width: 1, height: 11, backgroundColor: '#e2e8f0' },
  hoursBadge: { marginLeft: 3, backgroundColor: '#e0f7fa', borderRadius: 7, paddingHorizontal: 5, paddingVertical: 2 },
  hoursText: { fontSize: 10, color: '#00b4d8', fontWeight: '800' },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9, alignItems: 'flex-end' },
  badgeText: { fontSize: 10, fontWeight: '800' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 40 },
  errText: { fontSize: 13, color: '#ef4444', fontWeight: '600', textAlign: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  retryBtn: { backgroundColor: '#00b4d8', paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
