import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, 
  ActivityIndicator, RefreshControl, Alert, Platform, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_URL } from '@/config/env';
import { SwipeableSheet } from '@/components/SwipeableSheet';
import { BellButton } from '@/components/BellButton';
import { employeeService } from '@/services/employeeService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- TYPES ---
interface RequestItem {
  id: string | number;
  type: string;
  type_label: string;
  start_datetime: string;
  end_datetime?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
}

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

export default function RequestsScreen() {
  // Tab Management: 'leave' | 'overtime' | 'explanation'
  const [activeTab, setActiveTab] = useState<'leave' | 'overtime' | 'explanation'>('leave');
  const [view, setView] = useState<'list' | 'form'>('list');
  
  // Ref for horizontal pager
  const pagerRef = useRef<ScrollView>(null);

  // Data State
  const [leaveOtRequests, setLeaveOtRequests] = useState<RequestItem[]>([]);
  const [explanationRequests, setExplanationRequests] = useState<ExplanationRequest[]>([]);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Statistics
  const [leaveUsed, setLeaveUsed] = useState(0);
  const [otHours, setOtHours] = useState(0);
  const [otCount, setOtCount] = useState(0);

  // Form State - COMMON
  const [approverId, setApproverId] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<any>(null);

  // Form State - LEAVE / OT
  const [leaveType, setLeaveType] = useState('annual'); 
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  // Form State - EXPLANATION
  const [expDate, setExpDate] = useState(new Date());
  const [expType, setExpType] = useState('');
  const [expCheckin, setExpCheckin] = useState(new Date());
  const [expCheckout, setExpCheckout] = useState(new Date());

  // UI State - Sheets & Pickers
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [showApproverSheet, setShowApproverSheet] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const [datePickerMode, setDatePickerMode] = useState<'date' | 'start' | 'end' | 'checkin' | 'checkout' | null>(null);

  // --- LOGIC: FETCHING ---
  const fetchData = useCallback(async () => {
    try {
      const empId = await AsyncStorage.getItem('employeeId');
      const token = await AsyncStorage.getItem('userToken') || '';
      if (!empId) return;

      const headers = { headers: { 'Authorization': `Bearer ${token}` } };
      
      const apps = await employeeService.getApprovers(empId, token);
      setApprovers(apps);

      const [resLeave, resOt, reqEx] = await Promise.all([
        axios.get(`${API_URL}/employee/leave-request/${empId}`, headers),
        axios.get(`${API_URL}/employee/overtime-request/${empId}`, headers),
        employeeService.getExplanationRequests(empId, token)
      ]);

      console.log("Leave Data:", resLeave.data);
      console.log("OT Data:", resOt.data);
      console.log("Explanation Data:", reqEx);

      // Process Leave/OT
      const leaveData = (resLeave.data || []).map((r: any) => ({
        ...r,
        type: r.leave_type,
        type_label: getLeaveTypeText(r.leave_type)
      }));

      const otData = (resOt.data || []).map((r: any) => ({
        ...r,
        type: 'overtime',
        type_label: 'Tăng ca (OT)',
        start_datetime: r.date + 'T' + r.start_time,
        end_datetime: r.date + 'T' + r.end_time,
      }));

      const combined = [...leaveData, ...otData].sort((a, b) => 
        new Date(b.created_at || b.start_datetime).getTime() - new Date(a.created_at || a.start_datetime).getTime()
      );

      setLeaveOtRequests(combined);
      setExplanationRequests(reqEx);

      // Stats Logic
      let lUsed = 0;
      leaveData.forEach((r: any) => {
        if (r.leave_type === 'annual' && r.status === 'approved') {
          let start = new Date(r.start_datetime);
          let end = new Date(r.end_datetime);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            let curr = new Date(start); curr.setHours(0,0,0,0);
            let e = new Date(end); e.setHours(0,0,0,0);
            while (curr <= e) {
              const day = curr.getDay();
              if (curr.getFullYear() === new Date().getFullYear() && day !== 0 && day !== 6) lUsed++;
              curr.setDate(curr.getDate() + 1);
            }
          }
        }
      });
      setLeaveUsed(lUsed);

      let otH = 0, otC = 0;
      const curMonth = new Date().getMonth(), curYear = new Date().getFullYear();
      otData.forEach((r: any) => {
        if (r.status === 'approved') {
          let d = new Date(r.date || r.start_datetime);
          if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
            otC++;
            if (r.start_time && r.end_time) {
              let st = r.start_time.split(':'), et = r.end_time.split(':');
              let h = (parseInt(et[0]) - parseInt(st[0])) + (parseInt(et[1]) - parseInt(st[1]))/60;
              if (h > 0) otH += h;
            }
          }
        }
      });
      setOtHours(otH); setOtCount(otC);
    } catch (error) {
       console.log('Error fetching data', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  // --- LOGIC: PAGER SYNC ---
  const handleTabPress = (tab: 'leave' | 'overtime' | 'explanation', index: number) => {
    setActiveTab(tab);
    pagerRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    const tabs: ('leave' | 'overtime' | 'explanation')[] = ['leave', 'overtime', 'explanation'];
    if (tabs[index] !== activeTab) {
      setActiveTab(tabs[index]);
    }
  };

  // --- LOGIC: HELPERS ---
  const getLeaveTypeText = (type: string) => {
    const types: any = {
      annual: "Nghỉ phép năm",
      sick: "Nghỉ ốm",
      unpaid: "Nghỉ không lương",
      maternity: "Nghỉ thai sản",
      bereavement: "Nghỉ tang",
      overtime: "Tăng ca (OT)",
      forgot_checkin: "Quên checkin",
      forgot_checkout: "Quên checkout",
      late_arrival: "Đi muộn",
      early_leave: "Về sớm",
      system_error: "Lỗi hệ thống"
    };
    return types[type] || type;
  };

  const toMinutes = (date: Date) => date.getHours() * 60 + date.getMinutes();
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const formatTime = (date: Date) => date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

  const getStatusStyle = (status: string) => {
    if (status === 'approved') return { bg: '#d1fae5', text: '#059669', label: 'Đã duyệt' };
    if (status === 'rejected') return { bg: '#ffe4e6', text: '#e11d48', label: 'Từ chối' };
    return { bg: '#fef3c7', text: '#d97706', label: 'Chờ duyệt' };
  };

  const resetForm = () => {
    setApproverId('');
    setReason('');
    setAttachment(null);
    setStartDate(new Date());
    setEndDate(new Date());
    setExpDate(new Date());
    setExpType('');
    setExpCheckin(new Date());
    setExpCheckout(new Date());
  };

  // --- HANDLERS ---
  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!res.canceled && res.assets?.[0]) setAttachment(res.assets[0]);
    } catch (err) { console.log('Error picking file', err); }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setDatePickerMode(null);
    if (!date) return;
    if (datePickerMode === 'start') setStartDate(date);
    else if (datePickerMode === 'end') setEndDate(date);
    else if (datePickerMode === 'date') setExpDate(date);
    else if (datePickerMode === 'checkin') setExpCheckin(date);
    else if (datePickerMode === 'checkout') setExpCheckout(date);
  };

  const handleSubmit = async () => {
    if (!approverId) return Alert.alert('Lỗi', 'Vui lòng chọn người kiểm duyệt!');
    if (!reason.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập lý do!');

    setIsLoading(true);
    try {
      const empId = await AsyncStorage.getItem('employeeId');
      const token = await AsyncStorage.getItem('userToken') || '';
      
      const formData = new FormData();
      formData.append('userId', empId!);
      formData.append('approverId', approverId);
      formData.append('reason', reason);

      if (activeTab === 'overtime') {
        const payload = { 
          employee_id: empId, 
          approver_id: approverId, 
          reason, 
          ot_date: formatDate(startDate), 
          start_time: '18:00', 
          end_time: '20:00' 
        };
        console.log("Submitting Overtime Payload:", payload);
        await axios.post(`${API_URL}/employee/overtime-request`, payload, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else if (activeTab === 'explanation') {
        const ciMin = toMinutes(expCheckin), coMin = toMinutes(expCheckout);
        if (!expType) return (setIsLoading(false), Alert.alert('Lỗi', 'Vui lòng chọn loại giải trình!'));
        
        const checkValidRange = (min: number) => min >= 7 * 60 && min <= 21 * 60;
        if (!checkValidRange(ciMin) || !checkValidRange(coMin)) {
          return (setIsLoading(false), Alert.alert('Lỗi', 'Giờ làm việc không đúng quy định (07:00 - 21:00)!'));
        }
        if (ciMin >= coMin) {
          return (setIsLoading(false), Alert.alert('Lỗi', 'Giờ vào phải trước giờ ra!'));
        }

        formData.append('attendance_date', formatDate(expDate));
        formData.append('explanation_type', expType);
        formData.append('proposed_check_in', formatTime(expCheckin));
        formData.append('proposed_check_out', formatTime(expCheckout));
        
        if (attachment) {
          formData.append('file', {
            uri: Platform.OS === 'android' ? attachment.uri : attachment.uri.replace('file://', ''),
            name: attachment.name,
            type: attachment.mimeType || 'application/octet-stream',
          } as any);
        }
        console.log("Submitting Explanation FormData:", Array.from((formData as any)._parts));
        await employeeService.createExplanationRequest(formData, token);
      } else {
        formData.append('leave_type', leaveType);
        formData.append('start_datetime', `${formatDate(startDate)} 00:00:00`);
        formData.append('end_datetime', `${formatDate(endDate)} 23:59:59`);
        if (attachment) {
          formData.append('attachment', {
            uri: Platform.OS === 'android' ? attachment.uri : attachment.uri.replace('file://', ''),
            name: attachment.name,
            type: attachment.mimeType || 'application/octet-stream'
          } as any);
        }
        console.log("Submitting Leave FormData:", Array.from((formData as any)._parts));
        await axios.post(`${API_URL}/employee/leave-request`, formData, { 
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          } 
        });
      }

      Alert.alert('Thành công', 'Yêu cầu của bạn đã được gửi!');
      resetForm();
      setView('list');
      fetchData();
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể tạo đơn!');
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER HELPERS ---
  const renderHistoryItem = ({ item }: { item: any }) => {
    const isExplanation = !!item.attendance_date;
    const s = getStatusStyle(item.status);
    
    if (isExplanation) {
      return (
        <TouchableOpacity style={styles.requestCard} onPress={() => { setSelectedRequest(item); setShowDetailSheet(true); }}>
          <View style={styles.reqTop}>
            <Text style={styles.reqType}>{getLeaveTypeText(item.explanation_type)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
              <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
            </View>
          </View>
          <Text style={styles.reqDate}>{new Date(item.attendance_date).toLocaleDateString('vi-VN')} ({item.proposed_check_in} - {item.proposed_check_out})</Text>
          <Text style={styles.reqReason} numberOfLines={2}>&quot;{item.reason}&quot;</Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.reqTop}>
          <Text style={styles.reqType}>{item.type_label}</Text>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
          </View>
        </View>
        <Text style={styles.reqDate}>
          {new Date(item.start_datetime).toLocaleDateString('vi-VN')} {item.end_datetime && `- ${new Date(item.end_datetime).toLocaleDateString('vi-VN')}`}
        </Text>
        <Text style={styles.reqReason} numberOfLines={2}>&quot;{item.reason}&quot;</Text>
      </View>
    );
  };

  const renderListPage = (type: 'leave' | 'overtime' | 'explanation') => {
    const data = type === 'explanation' ? explanationRequests : leaveOtRequests.filter(r => type === 'overtime' ? r.type === 'overtime' : r.type !== 'overtime');
    
    return (
      <ScrollView 
        style={{ width: SCREEN_WIDTH }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {type === 'leave' && (
          <View style={[styles.summaryCard, { backgroundColor: '#10b981' }]}>
            <Text style={styles.cardTitle}>QUỸ PHÉP NĂM {new Date().getFullYear()}</Text>
            <Text style={styles.cardValLarge}>{(12 - leaveUsed).toFixed(1)} <Text style={{ fontSize: 16 }}>/ 12 ngày</Text></Text>
            <Text style={styles.cardFooterText}>Đã dùng: {leaveUsed.toFixed(1)} ngày ({((leaveUsed/12)*100).toFixed(0)}%)</Text>
            <Feather name="umbrella" size={80} color="rgba(255,255,255,0.2)" style={styles.cardBgIcon} />
          </View>
        )}
        {type === 'overtime' && (
          <View style={[styles.summaryCard, { backgroundColor: '#3b82f6' }]}>
            <Text style={styles.cardTitle}>TĂNG CA THÁNG {(new Date().getMonth()+1).toString().padStart(2,'0')}</Text>
            <Text style={styles.cardValLarge}>{otHours.toFixed(1)} <Text style={{ fontSize: 16 }}>giờ</Text></Text>
            <Text style={styles.cardFooterText}>Số đơn được duyệt: {otCount}</Text>
            <Feather name="briefcase" size={80} color="rgba(255,255,255,0.2)" style={styles.cardBgIcon} />
          </View>
        )}
        {type === 'explanation' && (
          <View style={[styles.summaryCard, { backgroundColor: '#f43f5e' }]}>
            <Text style={styles.cardTitle}>GIẢI TRÌNH CHẤM CÔNG</Text>
            <Text style={styles.cardValLarge}>{explanationRequests.length} <Text style={{ fontSize: 16 }}>đơn</Text></Text>
            <Text style={styles.cardFooterText}>Duyệt: {explanationRequests.filter(r=>r.status==='approved').length} | Chờ: {explanationRequests.filter(r=>r.status==='pending').length}</Text>
            <Feather name="alert-circle" size={80} color="rgba(255,255,255,0.2)" style={styles.cardBgIcon} />
          </View>
        )}

        <TouchableOpacity style={styles.mainCreateBtn} onPress={() => setView('form')}>
          <Feather name="plus-circle" size={20} color="#166534" />
          <Text style={styles.mainCreateBtnText}>TẠO ĐƠN MỚI</Text>
        </TouchableOpacity>

        <View style={styles.listHeader}>
          <Feather name="clock" size={16} color="#94a3b8" />
          <Text style={styles.listTitle}>LỊCH SỬ GẦN ĐÂY</Text>
        </View>

        {data.length > 0 ? (
          data.map((item) => <View key={item.id.toString()}>{renderHistoryItem({ item })}</View>)
        ) : (
          <Text style={styles.emptyText}>Chưa có dữ liệu nào.</Text>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {view === 'form' ? (
          <TouchableOpacity onPress={() => setView('list')} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={activeTab === 'leave' ? '#10b981' : (activeTab === 'overtime' ? '#3b82f6' : '#f43f5e')} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: activeTab === 'leave' ? '#dcfce7' : (activeTab === 'overtime' ? '#dbeafe' : '#ffe4e6') }]}>
            <Feather name="file-text" size={22} color={activeTab === 'leave' ? '#10b981' : (activeTab === 'overtime' ? '#3b82f6' : '#f43f5e')} />
          </View>
        )}
        <Text style={styles.headerTitle}>{view === 'list' ? 'Đơn từ & Giải trình' : 'Tạo yêu cầu mới'}</Text>
        <BellButton />
      </View>

      {/* Tab Nav - Sync with Pager */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'leave' && { backgroundColor: '#dcfce7' }]} 
          onPress={() => handleTabPress('leave', 0)}
        >
          <Text style={[styles.tabLabel, activeTab === 'leave' && { color: '#10b981', fontWeight: '800' }]}>Nghỉ phép</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'overtime' && { backgroundColor: '#dbeafe' }]} 
          onPress={() => handleTabPress('overtime', 1)}
        >
          <Text style={[styles.tabLabel, activeTab === 'overtime' && { color: '#3b82f6', fontWeight: '800' }]}>Tăng ca</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'explanation' && { backgroundColor: '#ffe4e6' }]} 
          onPress={() => handleTabPress('explanation', 2)}
        >
          <Text style={[styles.tabLabel, activeTab === 'explanation' && { color: '#f43f5e', fontWeight: '800' }]}>Giải trình</Text>
        </TouchableOpacity>
      </View>

      {view === 'list' ? (
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          ref={pagerRef}
          style={styles.pager}
        >
          {renderListPage('leave')}
          {renderListPage('overtime')}
          {renderListPage('explanation')}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
          <View style={styles.formContainer}>
            <TouchableOpacity onPress={() => setShowTypeSheet(true)} style={styles.inputGroup}>
              <Text style={styles.label}>LOẠI YÊU CẦU</Text>
              <View style={styles.pickerBox}>
                <Text style={styles.pickerText}>{getLeaveTypeText(activeTab === 'explanation' ? expType : (activeTab === 'leave' ? leaveType : 'overtime'))}</Text>
                <Feather name="chevron-down" size={20} color="#64748b" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowApproverSheet(true)} style={styles.inputGroup}>
              <Text style={styles.label}>NGƯỜI KIỂM DUYỆT</Text>
              <View style={styles.pickerBox}>
                <Text style={[styles.pickerText, !approverId && { color: '#94a3b8' }]}>
                  {approvers.find(a => a.id === approverId)?.full_name || 'Chọn người duyệt...'}
                </Text>
                <Feather name="chevron-down" size={20} color="#64748b" />
              </View>
            </TouchableOpacity>

            <View style={styles.inputSplit}>
              <TouchableOpacity onPress={() => setDatePickerMode(activeTab === 'explanation' ? 'date' : 'start')} style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{activeTab === 'explanation' ? 'NGÀY GIẢI TRÌNH' : 'TỪ NGÀY'}</Text>
                <View style={styles.pickerBox}>
                  <Text style={styles.pickerText}>{formatDate(activeTab === 'explanation' ? expDate : startDate)}</Text>
                  <Feather name="calendar" size={18} color="#94a3b8" />
                </View>
              </TouchableOpacity>
              {activeTab === 'leave' && (
                <TouchableOpacity onPress={() => setDatePickerMode('end')} style={[styles.inputGroup, { flex: 1, marginLeft: 15 }]}>
                  <Text style={styles.label}>ĐẾN NGÀY</Text>
                  <View style={styles.pickerBox}>
                    <Text style={styles.pickerText}>{formatDate(endDate)}</Text>
                    <Feather name="calendar" size={18} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {activeTab === 'explanation' && (
              <View style={styles.inputSplit}>
                <TouchableOpacity onPress={() => setDatePickerMode('checkin')} style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>VÀO THỰC TẾ</Text>
                  <View style={styles.pickerBox}>
                    <Text style={styles.pickerText}>{formatTime(expCheckin)}</Text>
                    <Feather name="clock" size={18} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDatePickerMode('checkout')} style={[styles.inputGroup, { flex: 1, marginLeft: 15 }]}>
                  <Text style={styles.label}>RA THỰC TẾ</Text>
                  <View style={styles.pickerBox}>
                    <Text style={styles.pickerText}>{formatTime(expCheckout)}</Text>
                    <Feather name="clock" size={18} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>LÝ DO CHI TIẾT</Text>
              <TextInput style={styles.textArea} multiline numberOfLines={4} value={reason} onChangeText={setReason} placeholder="Nhập lý do cụ thể..." placeholderTextColor="#cbd5e1" />
            </View>

            {activeTab !== 'overtime' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>TÀI LIỆU ĐÍNH KÈM</Text>
                <TouchableOpacity style={styles.attachBtn} onPress={pickDocument}>
                  <Feather name="paperclip" size={20} color={activeTab === 'leave' ? '#10b981' : (activeTab === 'overtime' ? '#3b82f6' : '#f43f5e')} />
                  <Text style={[styles.attachText, !attachment && { color: '#94a3b8' }]} numberOfLines={1}>{attachment ? attachment.name : 'Chọn file minh chứng...'}</Text>
                  {attachment && <TouchableOpacity onPress={() => setAttachment(null)}><Feather name="x-circle" size={18} color="#f43f5e" /></TouchableOpacity>}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: activeTab === 'leave' ? '#10b981' : (activeTab === 'overtime' ? '#3b82f6' : '#f43f5e') }]} 
              onPress={handleSubmit} 
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Feather name="send" size={18} color="#fff" />
                  <Text style={styles.submitText}>GỬI YÊU CẦU</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Modals & Pickers */}
      {datePickerMode && (
        <DateTimePicker
          value={datePickerMode === 'start' ? startDate : datePickerMode === 'end' ? endDate : datePickerMode === 'checkin' ? expCheckin : datePickerMode === 'checkout' ? expCheckout : expDate}
          mode={['checkin', 'checkout'].includes(datePickerMode) ? 'time' : 'date'}
          is24Hour={true}
          onChange={handleDateChange}
        />
      )}

      <SwipeableSheet visible={showTypeSheet} onClose={() => setShowTypeSheet(false)} maxHeightRatio={0.6}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Chọn loại {activeTab === 'explanation' ? 'giải trình' : 'nghỉ phép'}</Text>
          <ScrollView>
            {(activeTab === 'explanation' ? ['forgot_checkin', 'forgot_checkout', 'late_arrival', 'early_leave', 'system_error'] : ['annual', 'sick', 'unpaid', 'maternity', 'bereavement']).map((t) => (
              <TouchableOpacity key={t} style={styles.sheetItem} onPress={() => { activeTab === 'explanation' ? setExpType(t) : setLeaveType(t); setShowTypeSheet(false); }}>
                <Text style={[styles.sheetItemText, (activeTab === 'explanation' ? expType === t : leaveType === t) && { color: activeTab === 'leave' ? '#10b981' : (activeTab === 'overtime' ? '#3b82f6' : '#f43f5e'), fontWeight: 'bold' }]}>{getLeaveTypeText(t)}</Text>
                {(activeTab === 'explanation' ? expType === t : leaveType === t) && <Feather name="check" size={20} color={activeTab === 'leave' ? '#10b981' : (activeTab === 'overtime' ? '#3b82f6' : '#f43f5e')} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SwipeableSheet>

      <SwipeableSheet visible={showApproverSheet} onClose={() => setShowApproverSheet(false)} maxHeightRatio={0.5}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Chọn người duyệt</Text>
          <ScrollView>
            {approvers.map((appr) => (
              <TouchableOpacity key={appr.id} style={styles.sheetItem} onPress={() => { setApproverId(appr.id); setShowApproverSheet(false); }}>
                <Text style={[styles.sheetItemText, approverId === appr.id && { color: activeTab === 'leave' ? '#10b981' : (activeTab === 'overtime' ? '#3b82f6' : '#f43f5e'), fontWeight: 'bold' }]}>{appr.full_name} ({appr.position_name})</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SwipeableSheet>

      <SwipeableSheet visible={showDetailSheet} onClose={() => setShowDetailSheet(false)} maxHeightRatio={0.8}>
        {selectedRequest && (
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Chi tiết giải trình</Text>
            <View style={styles.detailRow}><Text style={styles.dtL}>Loại đơn:</Text><Text style={styles.dtV}>{getLeaveTypeText(selectedRequest.explanation_type)}</Text></View>
            <View style={styles.detailRow}><Text style={styles.dtL}>Người duyệt:</Text><Text style={styles.dtV}>{selectedRequest.approver_name || '---'}</Text></View>
            <View style={styles.detailRow}><Text style={styles.dtL}>Ngày:</Text><Text style={styles.dtV}>{new Date(selectedRequest.attendance_date).toLocaleDateString('vi-VN')}</Text></View>
            <View style={styles.detailRow}><Text style={styles.dtL}>Thời gian:</Text><Text style={styles.dtV}>{selectedRequest.proposed_check_in} - {selectedRequest.proposed_check_out}</Text></View>
            <View style={styles.detailRow}><Text style={styles.dtL}>Lý do:</Text><Text style={styles.dtV}>{selectedRequest.reason}</Text></View>
            <TouchableOpacity style={styles.closeSheetBtn} onPress={() => setShowDetailSheet(false)}><Text style={styles.closeSheetBtnText}>Đóng</Text></TouchableOpacity>
          </View>
        )}
      </SwipeableSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#1e293b' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  tabLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  pager: { flex: 1 },
  content: { padding: 20 },
  summaryCard: { borderRadius: 24, padding: 22, overflow: 'hidden', marginBottom: 20, position: 'relative' },
  cardTitle: { color: '#fff', fontSize: 12, fontWeight: '800', opacity: 0.9, marginBottom: 10 },
  cardValLarge: { color: '#fff', fontSize: 32, fontWeight: '900', marginBottom: 5 },
  cardFooterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardBgIcon: { position: 'absolute', right: -10, bottom: -10 },
  mainCreateBtn: { backgroundColor: '#dcfce7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#bcf0da' },
  mainCreateBtnText: { color: '#166534', fontSize: 14, fontWeight: '800', marginLeft: 10 },
  listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  listTitle: { fontSize: 12, fontWeight: '900', color: '#94a3b8', marginLeft: 8 },
  requestCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  reqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reqType: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '800' },
  reqDate: { fontSize: 12, color: '#64748b', fontWeight: '500', marginBottom: 10 },
  reqReason: { fontSize: 13, color: '#475569', fontStyle: 'italic', lineHeight: 20 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontStyle: 'italic' },
  formContainer: { padding: 0 },
  inputGroup: { marginBottom: 20 },
  inputSplit: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 8, marginLeft: 5 },
  pickerBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  pickerText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  textArea: { backgroundColor: '#fff', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14, color: '#0f172a', textAlignVertical: 'top' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#6366f1' },
  attachText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e293b', marginLeft: 10 },
  submitBtn: { padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '800', marginLeft: 10 },
  sheetContent: { padding: 25, paddingBottom: 50 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 20, textAlign: 'center' },
  sheetItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sheetItemText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  detailRow: { flexDirection: 'row', marginBottom: 15 },
  dtL: { width: 100, fontSize: 14, fontWeight: '700', color: '#64748b' },
  dtV: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  closeSheetBtn: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  closeSheetBtnText: { color: '#64748b', fontSize: 14, fontWeight: '800' }
});
