import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Image, Animated, Dimensions, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LocationMap } from '@/components/LocationMap';
import { BellButton } from '@/components/BellButton';
import { AttendanceHistoryModal } from '@/components/AttendanceHistoryModal';

const { width } = Dimensions.get('window');

/** Ngưỡng hiển thị Emerald / Rose trên panel bản đồ (theo spec UI). */
const UI_MAP_INSIDE_M = 100;

export const AttendanceUI = ({ props }: { props: any }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);

  const isValidTimeValue = (value: any) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') {
      const s = value.trim();
      if (s === '' || s.toLowerCase() === 'null' || s === '--:--') return false;
    }
    return true;
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  const hasIn = isValidTimeValue(props.attendanceToday?.check_in_time);
  const hasOut = isValidTimeValue(props.attendanceToday?.check_out_time);
  const isPunchedIn = Boolean(props.userToken && hasIn && !hasOut);

  const fmtCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const distM = props.distanceToWorkCenterM;
  const mapInside = distM != null && distM < UI_MAP_INSIDE_M;

  /** Tọa độ hiển thị marker — ưu tiên GPS realtime từ geofence. */
  const mapCoords = props.currentLocation ?? props.location;
  const officeReady = props.workLocation != null && mapCoords != null;
  const officeLat = Number(props.workLocation?.latitude);
  const officeLng = Number(props.workLocation?.longitude);
  const radiusM = props.workLocation?.radius_meters == null ? 500 : Number(props.workLocation.radius_meters);

  const hasRadius =
    props.workLocation?.radius_meters != null && Number(props.workLocation.radius_meters) > 0;
  const showGpsZoneAlert = Boolean(hasRadius && props.zoneBlocksPunch);
  /** Đang trong ca và ngoài bán kính — auto checkout có thể xảy ra. */
  const isOutZone = Boolean(isPunchedIn && showGpsZoneAlert);
  /** Thanh đỏ ngắn (không đếm) khi ngoài vùng nhưng chưa vào ca / không hiện banner đếm ngược. */
  const showCompactZoneBar = showGpsZoneAlert && !isOutZone;
  const punchLockedByGps = showGpsZoneAlert;



  if (!props.userToken) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginCard}>
          <View style={styles.iconWrapper}><Feather name="map-pin" size={40} color="#00b4d8" /></View>
          <Text style={styles.loginTitle}>HRM Chấm Công</Text>
          <TextInput style={styles.input} placeholder="Tên đăng nhập" value={props.username} onChangeText={props.setUsername} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Mật khẩu" value={props.password} onChangeText={props.setPassword} secureTextEntry />
          
          <View style={styles.rememberRow}>
            <TouchableOpacity 
              style={styles.rememberBtn} 
              onPress={() => props.setRememberMe(!props.rememberMe)}
              activeOpacity={0.7}
            >
              <Feather 
                name={props.rememberMe ? "check-square" : "square"} 
                size={20} 
                color={props.rememberMe ? "#00b4d8" : "#94a3b8"} 
              />
              <Text style={[styles.rememberText, props.rememberMe && { color: '#00b4d8' }]}>
                Ghi nhớ đăng nhập
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={props.handleLogin} disabled={props.loading}>
            {props.loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>ĐĂNG NHẬP</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Logic Chuyển Đổi Nút Bấm Tự Động ---
  let btnCfg = {
    color: '#00b4d8', text: 'VÀO CA', sub: 'Nhấn để bắt đầu',
    icon: <MaterialIcons name="fingerprint" size={60} color="#fff" />,
    action: 'checkin' as 'checkin' | 'checkout'
  };

  if (hasIn && !hasOut) {
    btnCfg = { color: '#ea580c', text: 'TAN CA', sub: 'Nhấn để kết thúc', 
               icon: <Feather name="power" size={50} color="#fff" />, action: 'checkout' };
  } else if (hasOut) {
    btnCfg = { color: '#94a3b8', text: 'XONG CA', sub: (() => {
      const cLat = props.attendanceToday?.check_out_latitude;
      const cLng = props.attendanceToday?.check_out_longitude;
      if (cLat && cLng && props.workLocations) {
        let minDistance = Infinity;
        let matchedRadius = 500;
        const locs = props.workLocations.length > 0 ? props.workLocations : (props.workLocation ? [props.workLocation] : []);
        for (const wl of locs) {
          const r = wl.radius_meters ? Number(wl.radius_meters) : 500;
          if (r <= 0) continue;
          const d = props.haversineDistance(Number(cLat), Number(cLng), Number(wl.latitude), Number(wl.longitude));
          if (d < minDistance) { minDistance = d; matchedRadius = r; }
        }
        if (minDistance !== Infinity) {
          if (minDistance > matchedRadius + 300) return 'Bị tự checkout (quá xa)';
          if (minDistance > matchedRadius) return 'Bị tự checkout (> 5 phút)';
        }
      }
      return 'Hẹn gặp lại bạn mai';
    })(), 
               icon: <Feather name="check-circle" size={50} color="#fff" />, action: 'checkin' };
  }

  const showOutZonePunch = props.showLeaveZoneOverlay;
  const punchRippleColor = showOutZonePunch ? '#fdba74' : btnCfg.color;
  const punchRippleOpacity = showOutZonePunch ? 0.35 : 0.2;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBackground} />
      {props.geofenceToast ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.geoToast, props.geofenceToast.kind === 'error' ? styles.geoToastErr : styles.geoToastOk]}
          onPress={props.dismissGeofenceToast}
        >
          <Text style={styles.geoToastText}>{props.geofenceToast.message}</Text>
        </TouchableOpacity>
      ) : null}
      {showCompactZoneBar ? (
        <View style={styles.zoneAlertBar}>
          <Feather name="alert-circle" size={18} color="#fff" />
          <Text style={styles.zoneAlertText}>Bạn đang ngoài vùng chấm công — không thể chấm công cho đến khi vào bán kính.</Text>
        </View>
      ) : null}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View>
            <Image source={{ uri: 'https://i.pravatar.cc/150?u=12' }} style={styles.avatar} />
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>{props.userName}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.bellBtn} onPress={() => setIsHistoryVisible(true)}>
            <Feather name="clock" size={20} color="#64748b" />
          </TouchableOpacity>
          <BellButton />
          <TouchableOpacity style={styles.bellBtn} onPress={() => {
            Alert.alert(
              'Xác nhận',
              'Bạn có chắc chắn muốn đăng xuất không?',
              [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Đăng xuất', style: 'destructive', onPress: props.handleLogout }
              ]
            );
          }}>
            <Feather name="log-out" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.timeSection}>
          <Text style={styles.dateText}>{props.currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          <Text style={styles.timeText}>{props.currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
          
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.locationBadge, { borderColor: props.isInsideZone ? '#ecfdf5' : '#fff1f2' }]}
            onPress={() => setIsMapVisible(true)}
          >
            <View style={[styles.locationIconWrapper, { backgroundColor: props.isInsideZone ? '#ecfdf5' : '#fff1f2' }]}>
              <Feather name="map-pin" size={12} color={props.isInsideZone ? '#10b981' : '#f43f5e'} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.locationTitle, { color: props.isInsideZone ? '#059669' : '#e11d48' }]}>
                {props.workLocation?.location_name || 'Đang xác định...'}
              </Text>
              <Text style={styles.locationDesc}>
                {distM != null
                  ? `Cách tâm ${Math.round(distM)}m · Chạm xem bản đồ`
                  : 'Đang lấy GPS...'}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.punchSection}>
          <Animated.View
            style={[
              styles.rippleBg,
              {
                backgroundColor: punchRippleColor,
                opacity: punchRippleOpacity,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <View style={styles.punchWrap}>
            {showOutZonePunch ? (
              <View style={[styles.punchBtn, styles.outZonePunchBtn]} pointerEvents="box-none">
                <Feather name="alert-triangle" size={40} color="#fff" style={{ marginBottom: 8 }} />
                <Text style={styles.punchLeaveTitle}>BẠN ĐÃ RA NGOÀI VÙNG!</Text>
                <Text style={styles.punchLeaveSub}>Quay lại trong {props.leaveZoneUiSeconds != null ? fmtCountdown(props.leaveZoneUiSeconds) : '--:--'}</Text>
                <TouchableOpacity
                  onPress={props.dismissLeaveZoneUi}
                  style={styles.punchLeaveDismiss}
                  hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
                >
                  <Text style={styles.punchLeaveDismissText}>Ẩn (vẫn đếm)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.punchBtn, { backgroundColor: btnCfg.color }]}
                onPress={() => {
                  if (btnCfg.action === 'checkout') {
                    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn tan ca không?', [
                      { text: 'Huỷ', style: 'cancel' },
                      { text: 'Đồng ý', onPress: () => props.handleAction('checkout') }
                    ]);
                  } else {
                    props.handleAction(btnCfg.action);
                  }
                }}
                disabled={props.loading || hasOut || punchLockedByGps}
              >
                {props.loading ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <>
                    {btnCfg.icon}
                    <Text style={styles.punchText}>{btnCfg.text}</Text>
                    <Text style={styles.punchSubtext}>{btnCfg.sub}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 4. THỐNG KÊ (Giờ vào nhảy khi checkin thành công) */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={styles.statIconBg}><Feather name="log-in" size={14} color="#10b981" /></View>
            <Text style={styles.statLabel}>GIỜ VÀO</Text>
            <Text style={[styles.statValue, hasIn && {color: '#10b981'}]}>
              {hasIn
                ? new Date(props.attendanceToday.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
                : '--:--'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <View style={styles.statIconBg}><Feather name="clock" size={14} color="#00b4d8" /></View>
            <Text style={styles.statLabel}>TỔNG GIỜ</Text>
            <Text style={[styles.statValue, hasIn && {color: '#00b4d8'}]}>{props.totalWorkHours}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <View style={styles.statIconBg}><Feather name="log-out" size={14} color="#f43f5e" /></View>
            <Text style={styles.statLabel}>GIỜ RA</Text>
            <Text style={[styles.statValue, hasOut && {color: '#f43f5e', fontSize: 13, textAlign: 'center', marginTop: 2, paddingHorizontal: 4}]}>
              {hasOut
                ? (() => {
                    const cLat = props.attendanceToday.check_out_latitude;
                    const cLng = props.attendanceToday.check_out_longitude;
                    if (cLat && cLng && props.workLocations) {
                      let minDistance = Infinity;
                      let matchedRadius = 500;
                      const locs = props.workLocations.length > 0 ? props.workLocations : (props.workLocation ? [props.workLocation] : []);
                      for (const wl of locs) {
                        const r = wl.radius_meters ? Number(wl.radius_meters) : 500;
                        if (r <= 0) continue;
                        const d = props.haversineDistance(Number(cLat), Number(cLng), Number(wl.latitude), Number(wl.longitude));
                        if (d < minDistance) { minDistance = d; matchedRadius = r; }
                      }
                      if (minDistance !== Infinity) {
                        const timeStr = new Date(props.attendanceToday.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                        if (minDistance > matchedRadius + 300) return `Rời vùng GPS quá xa\nLúc ${timeStr}`;
                        if (minDistance > matchedRadius) return `Rời vùng GPS > 5p\nLúc ${timeStr}`;
                        return timeStr;
                      }
                    }
                    return new Date(props.attendanceToday.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                  })()
                : '--:--'}
            </Text>
          </View>
        </View>
      </View>

      <AttendanceHistoryModal
        visible={isHistoryVisible}
        onClose={() => setIsHistoryVisible(false)}
      />

      <Modal
        visible={isMapVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsMapVisible(false)}
      >
        <View style={styles.mapBottomSheetRoot}>
          <TouchableOpacity
            style={styles.mapBottomSheetBackdrop}
            activeOpacity={1}
            onPress={() => setIsMapVisible(false)}
          />
          <View style={styles.mapBottomSheetPanel}>
            <View style={styles.mapGrab} />
            <View style={styles.mapBottomSheetHeader}>
              <Text style={styles.mapBottomSheetTitle}>Định vị chấm công</Text>
              <TouchableOpacity onPress={() => setIsMapVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.mapBottomSheetClose}>Đóng</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapBottomSheetMapHost}>
              {officeReady ? (
                <LocationMap
                  currentLat={mapCoords!.latitude}
                  currentLng={mapCoords!.longitude}
                  officeLat={officeLat}
                  officeLng={officeLng}
                  radiusMeters={radiusM}
                  workLocations={props.workLocations}
                />
              ) : (
                <View style={styles.mapPlaceholderFlex}>
                  <Feather name="map" size={28} color="#94a3b8" />
                  <Text style={styles.mapPlaceholderText}>
                    {mapCoords == null ? 'Chưa có GPS' : 'Chưa có cấu hình văn phòng'}
                  </Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.mapInfoBox,
                mapInside ? styles.mapInfoBoxIn : styles.mapInfoBoxOut,
              ]}
            >
              <View style={[styles.mapInfoIcon, mapInside ? styles.mapInfoIconIn : styles.mapInfoIconOut]}>
                <Feather name={mapInside ? 'map-pin' : 'alert-triangle'} size={20} color={mapInside ? '#059669' : '#e11d48'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mapInfoLine, mapInside ? styles.mapInfoLineIn : styles.mapInfoLineOut]}>
                  {distM != null ? `Cách tâm ${Math.round(distM)}m` : '—'}
                </Text>
                <Text style={styles.mapInfoHint}>So với tâm vùng chấm công</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, backgroundColor: '#e0f7fa', opacity: 0.5 },
  loginContainer: { flex: 1, backgroundColor: '#e2e8f0', justifyContent: 'center', padding: 20 },
  loginCard: { backgroundColor: '#fff', padding: 30, borderRadius: 30, elevation: 10 },
  iconWrapper: { alignItems: 'center', marginBottom: 15 },
  loginTitle: { fontSize: 26, fontWeight: '900', textAlign: 'center', color: '#0f172a', marginBottom: 20 },
  input: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: -5 },
  rememberBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rememberText: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  loginBtn: { backgroundColor: '#00b4d8', padding: 18, borderRadius: 15, alignItems: 'center' },
  loginBtnText: { color: '#fff', fontWeight: 'bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 40, zIndex: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: '#fff' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, backgroundColor: '#10b981', borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  greeting: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  userName: { fontSize: 16, fontWeight: '800' },
  bellBtn: { width: 45, height: 45, backgroundColor: '#fff', borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  mainContent: { flex: 1, paddingHorizontal: 20 },
  mapPlaceholderFlex: {
    flex: 1,
    minHeight: 200,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  mapPlaceholderText: { fontSize: 13, color: '#64748b', fontWeight: '600', textAlign: 'center' },
  timeSection: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  dateText: { fontSize: 14, color: '#64748b', fontWeight: '500', marginBottom: 5 },
  timeText: { fontSize: 64, fontWeight: '900', color: '#0f172a', letterSpacing: -2 },
  locationBadge: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 30, alignItems: 'center', gap: 10, borderWidth: 1 },
  locationIconWrapper: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  locationTitle: { fontSize: 12, fontWeight: '800' },
  locationDesc: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  punchSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rippleBg: { position: 'absolute', width: width * 0.75, height: width * 0.75, borderRadius: width },
  punchWrap: { width: width * 0.6, height: width * 0.6, justifyContent: 'center', alignItems: 'center' },
  punchBtn: { width: width * 0.6, height: width * 0.6, borderRadius: width, justifyContent: 'center', alignItems: 'center', elevation: 15 },
  outZonePunchBtn: {
    backgroundColor: '#e11d48',
    borderWidth: 4,
    borderColor: '#9f1239',
    paddingHorizontal: 14,
  },
  punchLeaveTitle: { color: '#fff', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  punchLeaveSub: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  punchLeaveDismiss: { marginTop: 12, paddingVertical: 6, paddingHorizontal: 12 },
  punchLeaveDismissText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  punchText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  punchSubtext: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 25, padding: 20, justifyContent: 'space-between', elevation: 5 },
  statItem: { flex: 1, alignItems: 'center' },
  statIconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: '#f1f5f9' },
  statValue: { fontSize: 16, fontWeight: '900', color: '#94a3b8' },
  statLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '800', marginBottom: 4 },
  divider: { width: 1, height: 40, backgroundColor: '#f1f5f9' },
  mapBottomSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  mapBottomSheetBackdrop: { ...StyleSheet.absoluteFillObject },
  mapBottomSheetPanel: {
    height: '70%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    width: '100%',
    zIndex: 2,
    elevation: 12,
  },
  mapGrab: { width: 48, height: 5, borderRadius: 3, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 12 },
  mapBottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  mapBottomSheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  mapBottomSheetClose: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
  mapBottomSheetMapHost: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 200,
  },
  mapInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  mapInfoBoxIn: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  mapInfoBoxOut: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  mapInfoIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mapInfoIconIn: { backgroundColor: '#d1fae5' },
  mapInfoIconOut: { backgroundColor: '#ffe4e6' },
  mapInfoLine: { fontSize: 15, fontWeight: '900' },
  mapInfoLineIn: { color: '#065f46' },
  mapInfoLineOut: { color: '#9f1239' },
  mapInfoHint: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
  geoToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 100,
    padding: 14,
    borderRadius: 12,
    zIndex: 50,
    elevation: 8,
  },
  geoToastOk: { backgroundColor: '#0f172a' },
  geoToastErr: { backgroundColor: '#991b1b' },
  geoToastText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  zoneAlertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    zIndex: 20,
  },
  zoneAlertText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700' },
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 12, marginBottom: 6,
    paddingVertical: 14, paddingHorizontal: 20,
    backgroundColor: '#e0f7fa', borderRadius: 16,
    borderWidth: 1, borderColor: '#b2ebf2',
  },
  historyBtnText: { fontSize: 14, fontWeight: '800', color: '#00b4d8', flex: 1, textAlign: 'center' },
});