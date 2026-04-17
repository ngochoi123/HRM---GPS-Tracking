import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { employeeService } from '@/services/employeeService';
import { SwipeableSheet } from '@/components/SwipeableSheet';

const { width } = Dimensions.get('window');

interface ExplanationRequest {
  id: string | number;
  attendance_date: string;
  explanation_type: string;
  proposed_check_in: string;
  proposed_check_out: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approver_name?: string;
  attachment_url?: string;
}

export default function AttendanceExplanationScreen() {
  const [view, setView] = useState<'create' | 'history'>('create');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    date: new Date(),
    type: '',
    checkin: new Date(),
    checkout: new Date(),
    reason: '',
  });
  const [approverId, setApproverId] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Data State
  const [requests, setRequests] = useState<ExplanationRequest[]>([]);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [selectedRequest, setSelectedRequest] = useState<ExplanationRequest | null>(null);

  // UI State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCheckinPicker, setShowCheckinPicker] = useState(false);
  const [showCheckoutPicker, setShowCheckoutPicker] = useState(false);
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [showApproverSheet, setShowApproverSheet] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const id = await AsyncStorage.getItem('employeeId');
      if (id) {
        setEmployeeId(id);
        fetchData(id);
      }
    };
    init();
  }, []);

  const fetchData = async (id: string) => {
    try {
      const [reqs, apps] = await Promise.all([
        employeeService.getExplanationRequests(id),
        employeeService.getApprovers(id),
      ]);
      setRequests(reqs);
      setApprovers(apps);
    } catch (error) {
      console.error('Error fetching explanation data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!employeeId) return;
    setIsRefreshing(true);
    await fetchData(employeeId);
    setIsRefreshing(false);
  }, [employeeId]);

  // Logic Helpers
  const toMinutes = (date: Date) => {
    return date.getHours() * 60 + date.getMinutes();
  };

  const handleResetForm = () => {
    setForm({
      date: new Date(),
      type: '',
      checkin: new Date(),
      checkout: new Date(),
      reason: '',
    });
    setApproverId('');
    setSelectedFile(null);
  };

  const getExplanationText = (type: string) => {
    const map: any = {
      forgot_checkin: "Quên checkin",
      forgot_checkout: "Quên checkout",
      late_arrival: "Đi muộn",
      early_leave: "Về sớm",
      system_error: "Lỗi hệ thống"
    };
    return map[type] || type;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setSelectedFile(res.assets[0]);
      }
    } catch (err) {
      console.log('Error picking file', err);
    }
  };

  const handleSubmit = async () => {
    if (!form.type || !approverId || !form.reason.trim()) {
      return Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ thông tin!');
    }

    const checkinMin = toMinutes(form.checkin);
    const checkoutMin = toMinutes(form.checkout);
    const limitMin = 21 * 60; // 21:00
    const minCheckin = 7 * 60; // 07:00

    if (checkinMin >= checkoutMin) {
      return Alert.alert('Lỗi', 'Thời gian vào phải nhỏ hơn thời gian ra!');
    }
    if (checkoutMin > limitMin) {
      return Alert.alert('Lỗi', 'Thời gian ra phải nhỏ hơn hoặc bằng 21:00!');
    }
    if (checkinMin < minCheckin) {
      return Alert.alert('Lỗi', 'Thời gian vào phải sau hoặc bằng 07:00!');
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("userId", employeeId!);
      formData.append("attendance_date", formatDate(form.date));
      formData.append("explanation_type", form.type);
      formData.append("proposed_check_in", formatTime(form.checkin));
      formData.append("proposed_check_out", formatTime(form.checkout));
      formData.append("reason", form.reason);
      formData.append("approverId", approverId);

      if (selectedFile) {
        formData.append("file", {
          uri: Platform.OS === 'android' ? selectedFile.uri : selectedFile.uri.replace('file://', ''),
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/octet-stream',
        } as any);
      }

      await employeeService.createExplanationRequest(formData);
      Alert.alert('Thành công', 'Gửi đơn giải trình thành công!');
      handleResetForm();
      fetchData(employeeId!);
      setView('history');
    } catch (err: any) {
      console.error(err.response?.data || err);
      Alert.alert('Lỗi', 'Gửi thất bại, vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  };

  // Rendering
  const renderItem = ({ item }: { item: ExplanationRequest }) => (
    <TouchableOpacity
      style={styles.historyCard}
      onPress={() => {
        setSelectedRequest(item);
        setShowDetailSheet(true);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{getExplanationText(item.explanation_type)}</Text>
        </View>
        <View style={[styles.statusBadge, styles[item.status]]}>
          <Text style={[styles.statusText, styles[`${item.status}Text`]]}>
            {item.status === 'approved' ? 'Đã duyệt' : item.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Feather name="calendar" size={14} color="#64748b" />
          <Text style={styles.infoText}>Ngày: {new Date(item.attendance_date).toLocaleDateString('vi-VN')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="clock" size={14} color="#64748b" />
          <Text style={styles.infoText}>Giờ: {item.proposed_check_in} - {item.proposed_check_out}</Text>
        </View>
      </View>
      <Text style={styles.cardReason} numberOfLines={1}>"{item.reason}"</Text>
    </TouchableOpacity>
  );

  const filteredRequests = requests.filter(r => {
    const date = new Date(r.attendance_date);
    return date.toISOString().startsWith(filterMonth);
  });

  const stats = {
    total: filteredRequests.length,
    approved: filteredRequests.filter(r => r.status === 'approved').length,
    pending: filteredRequests.filter(r => r.status === 'pending').length,
    rejected: filteredRequests.filter(r => r.status === 'rejected').length,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ef4444" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn giải trình</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, view === 'create' && styles.activeTab]}
          onPress={() => setView('create')}
        >
          <Text style={[styles.tabText, view === 'create' && styles.activeTabText]}>Tạo đơn</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'history' && styles.activeTab]}
          onPress={() => setView('history')}
        >
          <Text style={[styles.tabText, view === 'history' && styles.activeTabText]}>Lịch sử</Text>
        </TouchableOpacity>
      </View>

      {view === 'create' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Feather name="file-text" size={20} color="#ef4444" />
              <Text style={styles.sectionTitle}>Thông tin chung</Text>
            </View>

            <TouchableOpacity style={styles.inputGroup} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.label}>Ngày cần giải trình</Text>
              <View style={styles.pickerBox}>
                <Text style={styles.pickerValue}>{form.date.toLocaleDateString('vi-VN')}</Text>
                <Feather name="calendar" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.inputGroup} onPress={() => setShowTypeSheet(true)}>
              <Text style={styles.label}>Loại giải trình</Text>
              <View style={styles.pickerBox}>
                <Text style={[styles.pickerValue, !form.type && { color: '#94a3b8' }]}>
                  {form.type ? getExplanationText(form.type) : 'Chọn loại giải trình'}
                </Text>
                <Feather name="chevron-down" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.inputGroup} onPress={() => setShowApproverSheet(true)}>
              <Text style={styles.label}>Người kiểm duyệt</Text>
              <View style={styles.pickerBox}>
                <Text style={[styles.pickerValue, !approverId && { color: '#94a3b8' }]}>
                  {approvers.find(a => a.id === approverId)?.full_name || 'Chọn người duyệt'}
                </Text>
                <Feather name="user" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Feather name="clock" size={20} color="#ef4444" />
              <Text style={styles.sectionTitle}>Thời gian thực tế</Text>
            </View>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.inputGroup, { flex: 1, marginRight: 10 }]} onPress={() => setShowCheckinPicker(true)}>
                <Text style={styles.label}>Checkin</Text>
                <View style={styles.pickerBox}>
                  <Text style={styles.pickerValue}>{formatTime(form.checkin)}</Text>
                  <Feather name="clock" size={18} color="#94a3b8" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.inputGroup, { flex: 1 }]} onPress={() => setShowCheckoutPicker(true)}>
                <Text style={styles.label}>Checkout</Text>
                <View style={styles.pickerBox}>
                  <Text style={styles.pickerValue}>{formatTime(form.checkout)}</Text>
                  <Feather name="clock" size={18} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Feather name="edit-3" size={20} color="#ef4444" />
              <Text style={styles.sectionTitle}>Giải trình & Tài liệu</Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lý do cụ thể</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                value={form.reason}
                onChangeText={(val) => setForm({ ...form, reason: val })}
                placeholder="Nhập lý do giải trình..."
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
              <View style={styles.uploadIconWrap}>
                <Feather name="upload-cloud" size={24} color="#ef4444" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.uploadText, !selectedFile && { color: '#94a3b8' }]} numberOfLines={1}>
                  {selectedFile ? selectedFile.name : 'Đính kèm tài liệu'}
                </Text>
                {!selectedFile && <Text style={styles.uploadSubText}>PNG, JPG, PDF (Max 10MB)</Text>}
              </View>
              {selectedFile && (
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <Feather name="x-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Feather name="send" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.statsContainer}>
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <Feather name="bar-chart-2" size={20} color="#fff" />
                <Text style={styles.statsTitle}>Thống kê tháng {filterMonth.split('-')[1]}</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Tổng đơn</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{stats.approved}</Text>
                  <Text style={styles.statLabel}>Đã duyệt</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{stats.pending}</Text>
                  <Text style={styles.statLabel}>Chờ duyệt</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.filterBar}>
            <Text style={styles.listHeaderTitle}>Danh sách yêu cầu</Text>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterPicker(true)}>
              <Feather name="calendar" size={16} color="#ef4444" />
              <Text style={styles.filterBtnText}>{filterMonth}</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredRequests}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Feather name="inbox" size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>Không có đơn giải trình nào</Text>
              </View>
            }
          />
        </View>
      )}

      {/* DateTime Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={form.date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setForm({ ...form, date });
          }}
        />
      )}
      {showCheckinPicker && (
        <DateTimePicker
          value={form.checkin}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowCheckinPicker(false);
            if (date) setForm({ ...form, checkin: date });
          }}
        />
      )}
      {showCheckoutPicker && (
        <DateTimePicker
          value={form.checkout}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowCheckoutPicker(false);
            if (date) setForm({ ...form, checkout: date });
          }}
        />
      )}
      {showFilterPicker && (
        <DateTimePicker
          value={new Date(filterMonth + '-01')}
          mode="date"
          display="spinner"
          onChange={(event, date) => {
            setShowFilterPicker(false);
            if (date) setFilterMonth(date.toISOString().substring(0, 7));
          }}
        />
      )}

      {/* Sheets */}
      <SwipeableSheet visible={showTypeSheet} onClose={() => setShowTypeSheet(false)} maxHeightRatio={0.5}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Loại giải trình</Text>
          {['forgot_checkin', 'forgot_checkout', 'late_arrival', 'early_leave', 'system_error'].map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.sheetItem}
              onPress={() => {
                setForm({ ...form, type: t });
                setShowTypeSheet(false);
              }}
            >
              <Text style={[styles.sheetItemText, form.type === t && { color: '#ef4444', fontWeight: 'bold' }]}>
                {getExplanationText(t)}
              </Text>
              {form.type === t && <Feather name="check" size={20} color="#ef4444" />}
            </TouchableOpacity>
          ))}
        </View>
      </SwipeableSheet>

      <SwipeableSheet visible={showApproverSheet} onClose={() => setShowApproverSheet(false)} maxHeightRatio={0.6}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Người kiểm duyệt</Text>
          <ScrollView>
            {approvers.map((appr) => (
              <TouchableOpacity
                key={appr.id}
                style={styles.sheetItem}
                onPress={() => {
                  setApproverId(appr.id);
                  setShowApproverSheet(false);
                }}
              >
                <View>
                  <Text style={[styles.sheetItemText, approverId === appr.id && { color: '#ef4444', fontWeight: 'bold' }]}>
                    {appr.full_name}
                  </Text>
                  <Text style={styles.sheetItemSub}>{appr.position_name}</Text>
                </View>
                {approverId === appr.id && <Feather name="check" size={20} color="#ef4444" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SwipeableSheet>

      <SwipeableSheet visible={showDetailSheet} onClose={() => setShowDetailSheet(false)} maxHeightRatio={0.8}>
        {selectedRequest && (
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Chi tiết giải trình</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailGroup}>
                <Text style={styles.detailLabel}>Loại giải trình</Text>
                <Text style={styles.detailValue}>{getExplanationText(selectedRequest.explanation_type)}</Text>
              </View>
              <View style={styles.detailGroup}>
                <Text style={styles.detailLabel}>Người kiểm duyệt</Text>
                <Text style={styles.detailValue}>{selectedRequest.approver_name || '---'}</Text>
              </View>
              <View style={styles.detailGroup}>
                <Text style={styles.detailLabel}>Ngày giải trình</Text>
                <Text style={styles.detailValue}>{new Date(selectedRequest.attendance_date).toLocaleDateString('vi-VN')}</Text>
              </View>
              <View style={styles.row}>
                <View style={[styles.detailGroup, { flex: 1 }]}>
                  <Text style={styles.detailLabel}>Checkin</Text>
                  <Text style={styles.detailValue}>{selectedRequest.proposed_check_in}</Text>
                </View>
                <View style={[styles.detailGroup, { flex: 1 }]}>
                  <Text style={styles.detailLabel}>Checkout</Text>
                  <Text style={styles.detailValue}>{selectedRequest.proposed_check_out}</Text>
                </View>
              </View>
              <View style={styles.detailGroup}>
                <Text style={styles.detailLabel}>Lý do</Text>
                <View style={styles.detailReasonBox}>
                  <Text style={styles.detailReasonText}>{selectedRequest.reason}</Text>
                </View>
              </View>
              {selectedRequest.attachment_url && (
                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Tài liệu đính kèm</Text>
                  <TouchableOpacity style={styles.fileLink}>
                    <Feather name="paperclip" size={16} color="#ef4444" />
                    <Text style={styles.fileLinkText}>Xem tài liệu</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                style={styles.closeSheetBtn}
                onPress={() => setShowDetailSheet(false)}
              >
                <Text style={styles.closeSheetBtnText}>Đóng</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </SwipeableSheet>
    </SafeAreaView>
  );
}

const styles: any = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 60, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  backButton: { padding: 8 },

  tabContainer: {
    flexDirection: 'row', padding: 4, backgroundColor: '#fff',
    borderRadius: 12, margin: 16, backgroundColor: '#f1f5f9'
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#ef4444', fontWeight: '800' },

  scrollContent: { padding: 16, paddingBottom: 40 },
  formSection: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 1
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginLeft: 10 },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8, marginLeft: 4 },
  pickerBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8fafc', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0'
  },
  pickerValue: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  row: { flexDirection: 'row' },
  textArea: {
    backgroundColor: '#f8fafc', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0',
    fontSize: 15, minHeight: 100, color: '#1e293b'
  },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 16, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#ef4444'
  },
  uploadIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff1f2', justifyContent: 'center', alignItems: 'center' },
  uploadText: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  uploadSubText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  submitBtn: {
    backgroundColor: '#ef4444', paddingVertical: 18, borderRadius: 16, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', shadowColor: '#ef4444', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 10 },

  // History Styles
  statsContainer: { paddingHorizontal: 16, marginBottom: 16 },
  statsCard: {
    backgroundColor: '#ef4444', borderRadius: 24, padding: 20,
    shadowColor: '#ef4444', shadowOpacity: 0.2, shadowRadius: 12, elevation: 6
  },
  statsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statsTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 8 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 24, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', marginTop: 4 },
  statDivider: { width: 1, height: 30 },

  filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  listHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#334155' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  filterBtnText: { fontSize: 13, fontWeight: '700', color: '#ef4444', marginLeft: 6 },

  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  historyCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8, elevation: 1
  },
  typeBadge: { backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { color: '#ef4444', fontSize: 12, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  pending: { backgroundColor: '#fef3c7' },
  pendingText: { color: '#d97706' },
  approved: { backgroundColor: '#d1fae5' },
  approvedText: { color: '#059669' },
  rejected: { backgroundColor: '#fee2e2' },
  rejectedText: { color: '#ef4444' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardBody: { marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#64748b', fontWeight: '500', marginLeft: 8 },
  cardReason: { fontSize: 13, color: '#475569', fontStyle: 'italic' },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#94a3b8', fontSize: 14, marginTop: 12, fontStyle: 'italic' },

  // Sheet Styles
  sheetContent: { padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 20, textAlign: 'center' },
  sheetItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sheetItemText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  sheetItemSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  detailGroup: { marginBottom: 20 },
  detailLabel: { fontSize: 12, fontWeight: '800', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' },
  detailValue: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  detailReasonBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  detailReasonText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  fileLink: { flexDirection: 'row', alignItems: 'center' },
  fileLinkText: { fontSize: 14, color: '#ef4444', fontWeight: '700', marginLeft: 8, textDecorationLine: 'underline' },
  closeSheetBtn: { backgroundColor: '#f1f5f9', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  closeSheetBtnText: { color: '#64748b', fontSize: 15, fontWeight: '800' }
});
