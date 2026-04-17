import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@/config/env';
import { BellButton } from '@/components/BellButton';
import { SwipeableSheet } from '@/components/SwipeableSheet';

// ─── Types ───────────────────────────────────────────────────────────────────
interface UserProfile {
  full_name: string;
  employee_code: string;
  work_email: string;
  phone_number: string;
  identity_card_number: string;
  date_of_birth: string;
  gender: boolean | number;
  personal_email: string;
  bank_name: string;
  bank_account_number: string;
  address: string;
  department_name: string;
  position_name: string;
  contract_type: string;
  join_date: string;
  manager_name: string;
  is_active: boolean | number;
  avatar_url: string;
}

interface Contract {
  full_name: string;
  contract_number: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  department_name: string;
  position_name: string;
  base_salary: number | string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const contractTypeLabel = (type: string) => {
  if (type === 'fixed_3y') return 'Xác định thời hạn (3 năm)';
  if (type === 'fixed_1y') return 'Xác định thời hạn (1 năm)';
  if (type === 'indefinite') return 'Không xác định thời hạn';
  return 'Chưa có hợp đồng';
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Đổi mật khẩu
  const [showPwModal, setShowPwModal] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Hợp đồng
  const [showContractModal, setShowContractModal] = useState(false);
  const [loadingContract, setLoadingContract] = useState(false);

  // ── Load token & profile ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('userToken');
      const empId = await AsyncStorage.getItem('employeeId');
      setUserToken(token);
      setEmployeeId(empId);
      if (token && empId) {
        try {
          const res = await axios.get(`${API_URL}/employee/profile/${empId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(res.data?.data ?? res.data);
        } catch (e) {
          console.log('Lỗi load profile:', e);
        }
      }
      setLoadingProfile(false);
    })();
  }, []);

  // ── Load contract ───────────────────────────────────────────────────────
  const loadContract = useCallback(async () => {
    if (!employeeId || !userToken) return;
    setLoadingContract(true);
    try {
      const res = await axios.get(`${API_URL}/employee/contract/${employeeId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = res.data?.data ?? res.data;
      setContract(data);
      setShowContractModal(true);
    } catch (e: any) {
      Alert.alert('Thông báo', e?.response?.data?.message || 'Chưa có hợp đồng');
    } finally {
      setLoadingContract(false);
    }
  }, [employeeId, userToken]);

  // ── Đổi mật khẩu ───────────────────────────────────────────────────────
  const closePwModal = () => {
    setShowPwModal(false);
    setOldPw(''); setNewPw(''); setConfirmPw('');
    setPwMsg(''); setPwSuccess(false);
  };

  const handleChangePassword = async () => {
    if (!oldPw || !newPw || !confirmPw) {
      setPwMsg('Vui lòng nhập đầy đủ thông tin!'); return;
    }
    if (oldPw === newPw) {
      setPwMsg('Mật khẩu mới không được trùng mật khẩu cũ!'); return;
    }
    if (newPw !== confirmPw) {
      setPwMsg('Mật khẩu mới và xác nhận không khớp!'); return;
    }
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!regex.test(newPw)) {
      setPwMsg('Mật khẩu tối thiểu 6 ký tự, gồm chữ thường, chữ hoa và số!'); return;
    }
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn thay đổi mật khẩu không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: async () => {
            setPwLoading(true);
            try {
              await axios.post(
                `${API_URL}/employee/change-password`,
                { userId: employeeId, oldPassword: oldPw, newPassword: newPw },
                { headers: { Authorization: `Bearer ${userToken}` } },
              );
              setPwMsg('Đổi mật khẩu thành công!');
              setPwSuccess(true);
              setTimeout(closePwModal, 2000);
            } catch (e: any) {
              setPwMsg(e?.response?.data?.message || 'Lỗi khi đổi mật khẩu');
            } finally {
              setPwLoading(false);
            }
          }
        }
      ]
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00b4d8" />
        <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Feather name="user-x" size={48} color="#94a3b8" />
        <Text style={styles.loadingText}>Không tải được dữ liệu</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient top */}
      <View style={styles.topBg} />

      {/* Bell top-right */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Hồ sơ của tôi</Text>
        <BellButton />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── HEADER ── */}
        <View style={styles.headerCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: user.avatar_url || `https://i.pravatar.cc/150?u=${employeeId}` }}
              style={styles.avatar}
            />
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.fullName}>{user.full_name}</Text>
          <Text style={styles.position}>{user.position_name} · {user.department_name}</Text>

          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Feather name="hash" size={11} color="#00b4d8" />
              <Text style={styles.pillText}>{user.employee_code}</Text>
            </View>
            <View style={styles.pill}>
              <Feather name="mail" size={11} color="#00b4d8" />
              <Text style={styles.pillText} numberOfLines={1}>{user.work_email}</Text>
            </View>
          </View>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Feather name="phone" size={11} color="#00b4d8" />
              <Text style={styles.pillText}>{user.phone_number}</Text>
            </View>
          </View>
        </View>

        {/* ── THÔNG TIN CÁ NHÂN ── */}
        <SectionCard title="Thông tin cá nhân" icon="user" iconColor="#10b981">
          <InfoRow label="Họ và tên" value={user.full_name} />
          <InfoRow label="CCCD" value={user.identity_card_number} />
          <InfoRow label="Ngày sinh" value={formatDate(user.date_of_birth)} />
          <InfoRow label="Giới tính" value={user.gender ? 'Nam' : 'Nữ'} />
          <InfoRow label="Email cá nhân" value={user.personal_email} />
          <InfoRow label="Ngân hàng" value={user.bank_name} />
          <InfoRow label="Số tài khoản" value={user.bank_account_number} />
          <InfoRow label="Địa chỉ" value={user.address} last />
        </SectionCard>

        {/* ── THÔNG TIN CÔNG VIỆC ── */}
        <SectionCard title="Thông tin công việc" icon="briefcase" iconColor="#f59e0b">
          <InfoRow label="Phòng ban" value={user.department_name} />
          <InfoRow label="Chức vụ" value={user.position_name} />
          <InfoRow label="Loại hợp đồng" value={contractTypeLabel(user.contract_type)} />
          <InfoRow label="Ngày gia nhập" value={formatDate(user.join_date)} />
          <InfoRow label="Quản lý trực tiếp" value={user.manager_name} last />
        </SectionCard>

        {/* ── HÀNH ĐỘNG ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => setShowPwModal(true)}
          >
            <Feather name="lock" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Đổi mật khẩu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={loadContract}
            disabled={loadingContract}
          >
            {loadingContract
              ? <ActivityIndicator size="small" color="#00b4d8" />
              : <Feather name="file-text" size={18} color="#00b4d8" />
            }
            <Text style={[styles.actionBtnText, { color: '#00b4d8' }]}>Hợp đồng</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── SHEET ĐỔI MẬT KHẨU ── */}
      <SwipeableSheet visible={showPwModal} onClose={closePwModal} maxHeightRatio={0.62}>
        <View style={styles.sheetBody}>
          <Text style={styles.modalTitle}>Đổi mật khẩu</Text>

          <PasswordField
            placeholder="Mật khẩu cũ"
            value={oldPw} onChange={setOldPw}
            show={showOld} onToggle={() => setShowOld(!showOld)}
          />
          <PasswordField
            placeholder="Mật khẩu mới"
            value={newPw} onChange={setNewPw}
            show={showNew} onToggle={() => setShowNew(!showNew)}
          />
          <PasswordField
            placeholder="Xác nhận mật khẩu mới"
            value={confirmPw} onChange={setConfirmPw}
            show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)}
          />

          {!!pwMsg && (
            <Text style={[styles.pwMsg, pwSuccess ? styles.pwOk : styles.pwErr]}>
              {pwMsg}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.modalBtn, styles.modalBtnPrimary]}
            onPress={handleChangePassword}
            disabled={pwLoading}
          >
            {pwLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.modalBtnText}>Xác nhận</Text>
            }
          </TouchableOpacity>
        </View>
      </SwipeableSheet>


      {/* ── SHEET HỢP ĐỒNG ── */}
      <SwipeableSheet
        visible={showContractModal}
        onClose={() => setShowContractModal(false)}
        maxHeightRatio={0.78}
      >
        <View style={[styles.sheetBody, { flex: 1 }]}>
          <View style={styles.contractHeader}>
            <Text style={styles.modalTitle}>Hợp đồng lao động</Text>
            {contract && (
              <View style={styles.contractBadge}>
                <Text style={styles.contractBadgeText}>
                  {contract.contract_type === 'fixed_3y' ? '3 năm'
                    : contract.contract_type === 'fixed_1y' ? '1 năm'
                    : contract.contract_type === 'indefinite' ? 'Không xác định'
                    : 'Chưa có'}
                </Text>
              </View>
            )}
          </View>

          {contract ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <ContractSection title="Thông tin chung" icon="user">
                <ContractField label="Tên người lao động" value={contract.full_name} />
                <ContractField label="Số/Mã hợp đồng" value={contract.contract_number} />
              </ContractSection>
              <ContractSection title="Thời gian" icon="calendar">
                <ContractField label="Bắt đầu từ" value={formatDate(contract.start_date)} />
                <ContractField label="Kết thúc vào" value={formatDate(contract.end_date) || 'Không xác định'} />
              </ContractSection>
              <ContractSection title="Chi tiết công việc" icon="briefcase">
                <ContractField label="Phòng ban" value={contract.department_name} />
                <ContractField label="Loại hợp đồng" value={contractTypeLabel(contract.contract_type)} />
                <ContractField label="Chức vụ" value={contract.position_name} />
                <ContractField
                  label="Lương/Tháng"
                  value={`${Number(contract.base_salary).toLocaleString('vi-VN')} VNĐ`}
                />
              </ContractSection>
            </ScrollView>
          ) : (
            <Text style={styles.noContract}>Chưa có thông tin hợp đồng</Text>
          )}
        </View>
      </SwipeableSheet>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionCard({
  title, icon, iconColor, children
}: { title: string; icon: any; iconColor: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: iconColor + '18' }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value?: string | null; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function PasswordField({
  placeholder, value, onChange, show, onToggle
}: { placeholder: string; value: string; onChange: (t: string) => void; show: boolean; onToggle: () => void }) {
  return (
    <View style={styles.pwField}>
      <TextInput
        style={styles.pwInput}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChange}
        secureTextEntry={!show}
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={onToggle} style={styles.pwEye}>
        <Feather name={show ? 'eye-off' : 'eye'} size={18} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  );
}

function ContractSection({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <View style={styles.contractSection}>
      <View style={styles.contractSectionHeader}>
        <Feather name={icon} size={14} color="#00b4d8" />
        <Text style={styles.contractSectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ContractField({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.contractField}>
      <Text style={styles.contractLabel}>{label}</Text>
      <View style={styles.contractValueBox}>
        <Text style={styles.contractValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(d?: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('vi-VN');
  } catch {
    return d;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: '#e0f7fa', opacity: 0.5 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, zIndex: 10 },
  topBarTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  // Header Card
  headerCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, alignItems: 'center',
    marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#e0f7fa' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, backgroundColor: '#10b981', borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  fullName: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  position: { fontSize: 13, color: '#64748b', fontWeight: '500', marginBottom: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#e0f7fa', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 11, color: '#0f172a', fontWeight: '600', maxWidth: 160 },

  // Section Card
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600', flex: 1 },
  infoValue: { fontSize: 13, color: '#0f172a', fontWeight: '700', flex: 1.2, textAlign: 'right' },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, elevation: 3 },
  actionBtnPrimary: { backgroundColor: '#00b4d8', shadowColor: '#00b4d8', shadowOpacity: 0.3, shadowRadius: 8 },
  actionBtnSecondary: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#00b4d8' },
  actionBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  modalGrab: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 20 },
  modalBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  modalBtnPrimary: { backgroundColor: '#0f172a' },
  modalBtnCancel: { backgroundColor: '#f1f5f9' },
  modalBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Password
  pwField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, paddingHorizontal: 14 },
  pwInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#0f172a' },
  pwEye: { padding: 4 },
  pwMsg: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 8, marginTop: -4 },
  pwOk: { color: '#10b981' },
  pwErr: { color: '#ef4444' },

  // Contract
  contractHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  contractBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  contractBadgeText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  contractSection: { marginBottom: 16 },
  contractSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  contractSectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  contractField: { marginBottom: 10 },
  contractLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
  contractValueBox: { backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  contractValue: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  noContract: { textAlign: 'center', color: '#94a3b8', fontSize: 14, fontWeight: '600', paddingVertical: 24 },

  // SwipeableSheet body padding
  sheetBody: { paddingHorizontal: 24, paddingBottom: 8, flex: 1 },
});

