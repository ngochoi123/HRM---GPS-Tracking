import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ChevronLeft, ChevronRight, Fingerprint, PanelLeftClose, PanelLeftOpen, History, Loader2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocationOptimizer } from '../../hooks/useLocationOptimizer';
import { useManagerBranchSocket } from '../../hooks/useManagerBranchSocket';
import { attendanceService } from '../../services/attendanceService';
import AttendanceHistoryModal from '../../components/AttendanceHistoryModal';

import './CheckIn.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href
});

const TEMP_HQ = { latitude: 16.05963797280072, longitude: 108.17468278677039, radiusMeters: 500 };
const toRadians = (deg) => (deg * Math.PI) / 180;
const haversineDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};
const formatTime = (value) => {
  if (!value) return '--:--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const formatMMSS = (totalSeconds) => {
  const s = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};
const formatAttendanceStatus = (status) => {
  switch (status) {
    case 'on_time': return 'Đúng giờ';
    case 'late': return 'Đi muộn';
    case 'early_leave': return 'Về sớm';
    case 'absent': return 'Vắng mặt';
    default: return 'Đang cập nhật';
  }
};
const getInitials = (name) => {
  if (!name) return 'NV';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[parts.length - 2][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
};
const getEmployeeDisplayName = (employeeId, attendees) => {
  if (employeeId == null) return 'Nhân viên';
  const idNum = Number(employeeId);
  const row = attendees.find((a) => Number(a.employeeId) === idNum);
  return row?.fullName || `Nhân viên #${employeeId}`;
};

const buildStaffMarkerIcon = ({ initials, tone, active, countdownLabel }) => {
  const badge =
    countdownLabel != null && String(countdownLabel).trim() !== ''
      ? `<div class="manager-staff-countdown">${String(countdownLabel).replace(/</g, '&lt;')}</div>`
      : '';
  const h = countdownLabel ? 88 : 72;
  return L.divIcon({
    className: 'manager-staff-marker',
    html: `<div class="manager-staff-pin-wrap">${badge}<div class="manager-staff-pin ${tone} ${active ? 'active' : ''}">
        <div class="manager-staff-pin-inner"><span>${initials}</span></div>
        <div class="manager-staff-pin-pulse"></div>
      </div></div>`,
    iconSize: [58, h],
    iconAnchor: [29, h - 6],
    popupAnchor: [0, -(h - 14)],
  });
};

const MapInstanceRef = ({ mapRef, setIsMapReady }) => {
  const map = useMap();
  useEffect(() => { mapRef.current = map; setIsMapReady(true); return () => { mapRef.current = null; setIsMapReady(false); }; }, [map, mapRef, setIsMapReady]);
  return null;
};

const ManagerCheckIn = () => {
  const { gpsOptions, deviceTier } = useLocationOptimizer();
  const [isLocating, setIsLocating] = useState(false);
  const [workLocation, setWorkLocation] = useState(null);
  const [workLocations, setWorkLocations] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState({ checkInTime: null, checkOutTime: null });
  const [zoneStats, setZoneStats] = useState({ totalInZone: 0, checkedInOnly: 0, checkedOut: 0 });
  const [attendees, setAttendees] = useState([]);
  const [baseLayer, setBaseLayer] = useState('normal');
  const [gps, setGps] = useState({ status: 'loading', position: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [checkoutPreviewTime, setCheckoutPreviewTime] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [monitorOpen, setMonitorOpen] = useState(true);
  const [showAttendanceCard, setShowAttendanceCard] = useState(true);
  const [managerAlerts, setManagerAlerts] = useState([]);
  const [isOutZone, setIsOutZone] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${m}`;
  });
  /** Vị trí realtime từ mobile (employee_location_update), key = employee id */
  const [employeePositions, setEmployeePositions] = useState({});
  /** Đồng bộ đếm ngược rời vùng từ server (employee_out_of_zone_tick) */
  const employeeOutSyncRef = useRef({});
  const [mgrOutTick, setMgrOutTick] = useState(0);

  const mapRef = useRef(null);
  const gpsPosRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const hasAutoCenteredRef = useRef(false);

  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } }, []);
  const managerId = useMemo(() => (user ? user.employee_id || user.id || null : null), [user]);
  const canCheckOut = !!attendanceToday.checkInTime && !attendanceToday.checkOutTime;
  const isDone = !!attendanceToday.checkOutTime;
  const mapCenter = useMemo(() => [TEMP_HQ.latitude, TEMP_HQ.longitude], []);

  useEffect(() => {
    if (!gps.position || (!workLocation && workLocations.length === 0)) {
      setIsOutZone(true);
      return;
    }
    const locationsToCheck = workLocations.length > 0 ? workLocations : (workLocation ? [workLocation] : []);
    let anyInside = false;
    for (const wl of locationsToCheck) {
      const r = wl.radius_meters;
      if (r == null || r === '' || Number(r) <= 0) {
        anyInside = true; break;
      }
      const distance = haversineDistanceMeters(
        gps.position.latitude,
        gps.position.longitude,
        wl.latitude,
        wl.longitude
      );
      if (distance <= Number(r)) {
        anyInside = true; break;
      }
    }
    setIsOutZone(!anyInside);
  }, [gps.position, workLocation, workLocations]);

  const isInsideRadius = !isOutZone;

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const msg = 'Trình duyệt không hỗ trợ GPS.';
      setGps({ status: 'error', position: null });
      toast.error(msg);
      return;
    }

    setIsLocating(true);
    setGps(prev => ({ ...prev }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude);
        const lng = Number(pos.coords.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setGps({ status: 'ready', position: { latitude: lat, longitude: lng } });
          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 17);
          }
          toast.success('Đã làm mới vị trí');
        }
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        let errMsg = 'Không thể lấy vị trí GPS. Vui lòng bật quyền truy cập vị trí.';
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errMsg = 'Bạn đã từ chối quyền truy cập vị trí GPS.';
            break;
          case err.POSITION_UNAVAILABLE:
            errMsg = 'Thông tin vị trí không khả dụng (Không có sóng GPS).';
            break;
          case err.TIMEOUT:
            errMsg = 'Hết thời gian chờ lấy vị trí. Vui lòng thử lại.';
            break;
          default:
            errMsg = err.message || errMsg;
        }
        setGps({ status: 'error', position: null });
        toast.error(errMsg);
      },
      gpsOptions
    );
  }, [gpsOptions]);

  const focusOnEmployee = useCallback((item) => {
    if (!item?.latitude || !item?.longitude || !mapRef.current) return;
    setSelectedEmployeeId(item.employeeId);
    mapRef.current.flyTo([item.latitude, item.longitude], 18, { duration: 0.8 });
  }, []);

  useEffect(() => { gpsPosRef.current = gps.position; }, [gps.position]);

  const fetchSummary = useCallback(async () => {
    if (!managerId) return;
    const json = await attendanceService.getSummary(managerId);
    if (!json?.success) throw new Error(json?.message || 'Không tải được summary');
    const wl = json.data?.workLocation;
    const wls = json.data?.workLocations || (wl ? [wl] : []);
    setWorkLocation(wl);
    setWorkLocations(wls);
    setAttendanceToday(json.data?.attendanceToday);
  }, [managerId]);

  const fetchZoneAttendance = useCallback(async () => {
    if (!managerId) return;
    const json = await attendanceService.getManagerZone(managerId);
    if (!json?.success) throw new Error(json?.message || 'Không tải được zone');
    setZoneStats(json.data?.zoneStats || { totalInZone: 0, checkedInOnly: 0, checkedOut: 0 });
    setAttendees(Array.isArray(json.data?.attendees) ? json.data.attendees : []);
  }, [managerId]);

  const fetchHistory = useCallback(async () => {
    if (!managerId) return;
    const [y, m] = String(monthYear || '').split('-');
    const year = Number(y);
    const month = Number(m);
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const json = await attendanceService.getHistory(managerId, {
        month: Number.isFinite(month) ? month : undefined,
        year: Number.isFinite(year) ? year : undefined,
      });
      if (!json?.success) throw new Error(json?.message || 'Không tải được lịch sử');
      setHistoryData(json.data || null);
    } catch (err) {
      setHistoryError(err.message || String(err));
    } finally {
      setHistoryLoading(false);
    }
  }, [managerId, monthYear]);

  // API attendance/summary trả branch_id trong workLocation.branch — không có workLocation.branch_id phẳng
  const branchIdForSocket = useMemo(() => {
    const raw = workLocation?.branch?.branch_id ?? workLocation?.branch_id;
    if (raw == null || raw === '') return null;
    return String(raw);
  }, [workLocation]);

  const handleAttendanceSocket = useCallback(() => {
    void fetchZoneAttendance().catch((err) => console.error('[Socket] fetchZoneAttendance sau attendance_changed:', err));
  }, [fetchZoneAttendance]);

  const attendeesRef = useRef(attendees);
  attendeesRef.current = attendees;

  const handleAdminLocationsUpdated = useCallback(() => {
    console.log('🔄 Admin vừa cập nhật vùng chấm công. Đang tải lại...');
    void Promise.all([fetchSummary(), fetchZoneAttendance()]).catch((err) =>
      console.error('[Socket] fetch sau admin_locations_updated:', err)
    );
  }, [fetchSummary, fetchZoneAttendance]);

  const handleEmployeeLocationUpdate = useCallback((data) => {
    const id = data?.user_id ?? data?.employee_id;
    const lat = Number(data?.latitude);
    const lng = Number(data?.longitude);
    if (id == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setEmployeePositions((prev) => ({
      ...prev,
      [String(id)]: {
        latitude: lat,
        longitude: lng,
        timestamp: data?.timestamp,
      },
    }));
  }, []);

  const handleEmployeeOutOfZoneTick = useCallback((data) => {
    const id = String(data?.employee_id ?? '');
    if (!id) return;
    if (data?.secondsRemaining == null) {
      delete employeeOutSyncRef.current[id];
    } else {
      const r = Number(data.secondsRemaining);
      employeeOutSyncRef.current[id] = {
        remaining: Number.isFinite(r) ? r : 0,
        at: Date.now(),
      };
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setMgrOutTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const getItemCoords = useCallback(
    (item) => {
      const live = employeePositions[String(item.employeeId)];
      const lat = live?.latitude ?? item.latitude;
      const lng = live?.longitude ?? item.longitude;
      if (lat == null || lng == null) return null;
      const la = Number(lat);
      const ln = Number(lng);
      if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
      return { lat: la, lng: ln };
    },
    [employeePositions]
  );

  const getEffectiveInside = useCallback(
    (item) => {
      const locationsToCheck = workLocations.length > 0 ? workLocations : (workLocation ? [workLocation] : []);
      if (locationsToCheck.length === 0) return item.isInsideZone !== false;
      const c = getItemCoords(item);
      if (!c) return item.isInsideZone;

      for (const wl of locationsToCheck) {
        const r = wl.radius_meters;
        if (r == null || r === '' || Number(r) <= 0) return true;
        const d = haversineDistanceMeters(c.lat, c.lng, wl.latitude, wl.longitude);
        if (d <= Number(r)) return true;
      }
      return false;
    },
    [workLocation, workLocations, getItemCoords]
  );

  const getOutCountdownLive = useCallback((empId) => {
    void mgrOutTick;
    const o = employeeOutSyncRef.current[String(empId)];
    if (!o?.at) return null;
    return Math.max(0, o.remaining - (Date.now() - o.at) / 1000);
  }, [mgrOutTick]);

  const handleManagerAlert = useCallback((payload) => {
    const name = getEmployeeDisplayName(payload?.employee_id, attendeesRef.current);
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    if (payload?.type === 'speed_anomaly') {
      setManagerAlerts((prev) => [
        ...prev.slice(-6),
        {
          id,
          variant: 'danger',
          text: `Cảnh báo gian lận: Nhân viên ${name} di chuyển bất thường (Nghi vấn Fake GPS)`,
        },
      ]);
      return;
    }
    if (payload?.type === 'poor_accuracy') {
      const acc =
        payload.accuracy_meters != null && Number.isFinite(Number(payload.accuracy_meters))
          ? ` (độ chính xác báo cáo ~${Math.round(Number(payload.accuracy_meters))}m)`
          : '';
      setManagerAlerts((prev) => [
        ...prev.slice(-6),
        {
          id,
          variant: 'warn',
          text: `Vị trí nhân viên ${name} không chính xác (Độ sai lệch > 80m)${acc}`,
        },
      ]);
      return;
    }
    setManagerAlerts((prev) => [
      ...prev.slice(-6),
      { id, variant: 'info', text: payload?.message || 'Cảnh báo geofence' },
    ]);
  }, []);

  useManagerBranchSocket({
    branchId: branchIdForSocket || null,
    // socketUrl có thể omit để socketClient tự lấy từ env
    onAttendanceChanged: handleAttendanceSocket,
    onManagerAlert: handleManagerAlert,
    onAdminLocationsUpdated: handleAdminLocationsUpdated,
    onEmployeeLocationUpdate: handleEmployeeLocationUpdate,
    onEmployeeOutOfZoneTick: handleEmployeeOutOfZoneTick,
  });

  useEffect(() => {
    if (!managerId) return;
    Promise.all([fetchSummary(), fetchZoneAttendance()]).catch((err) => {
      setActionError(err.message || String(err));
      setMessage('Không thể tải dữ liệu giám sát chấm công.');
    });
  }, [managerId, fetchSummary, fetchZoneAttendance]);

  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gps.position || !isMapReady || !mapRef.current || hasAutoCenteredRef.current) return;
    hasAutoCenteredRef.current = true;
    if (typeof mapRef.current.flyTo === 'function') mapRef.current.flyTo([gps.position.latitude, gps.position.longitude], 17, { duration: 1 });
    else mapRef.current.setView([gps.position.latitude, gps.position.longitude], 17);
  }, [gps.position, isMapReady]);

  useEffect(() => {
    if (actionError) { setMessage(actionError); return; }
    if (isDone) { setMessage('Bạn đã checkout hôm nay.'); return; }
    if (canCheckOut) { setMessage('Sẵn sàng checkout. Hệ thống sẽ yêu cầu xác nhận trước khi chấm công ra.'); return; }
    if (!gps.position) { setMessage('Đang chờ GPS...'); return; }
    if (workLocation?.radius_meters != null && !isInsideRadius) { setMessage('Bạn đang ngoài vùng GPS — vào zone để checkin.'); return; }
    setMessage('Nhấn CHECK IN để bắt đầu ca và giám sát đội ngũ.');
  }, [actionError, isDone, canCheckOut, gps.position, workLocation, isInsideRadius]);

  const submitAttendance = async (mode) => {
    if (actionLoading || !managerId) return;
    if (!gps.position) { setActionError('Chưa có GPS. Vui lòng bật quyền vị trí và thử lại.'); return; }
    setActionLoading(true); setActionError('');
    try {
      const payload = { latitude: gps.position.latitude, longitude: gps.position.longitude };
      const json =
        mode === 'checkin'
          ? await attendanceService.checkIn(managerId, payload)
          : await attendanceService.checkOut(managerId, payload);
      if (!json?.success) throw new Error(json?.message || 'Thao tác chấm công thất bại');
      setShowCheckoutConfirm(false); setCheckoutPreviewTime('');
      await Promise.all([fetchSummary(), fetchZoneAttendance()]);
    } catch (err) { setActionError(err.message || String(err)); } 
    finally { setActionLoading(false); }
  };

  const handleAttendanceAction = () => {
    if (canCheckOut) { setCheckoutPreviewTime(new Date().toISOString()); setShowCheckoutConfirm(true); return; }
    void submitAttendance('checkin');
  };

  const actionDisabled =
    actionLoading || isDone || !gps.position || !workLocation || (workLocation.radius_meters != null && isOutZone);

return (
    <div className="checkin-shell">
      {managerAlerts.length > 0 && (
        <div className="manager-fraud-alerts" role="region" aria-label="Cảnh báo geofence">
          {managerAlerts.map((a) => (
            <div
              key={a.id}
              className={`manager-fraud-alert ${a.variant === 'danger' ? 'manager-fraud-alert--danger' : a.variant === 'warn' ? 'manager-fraud-alert--warn' : 'manager-fraud-alert--info'}`}
            >
              <span className="manager-fraud-alert-text">{a.text}</span>
              <button type="button" className="manager-fraud-alert-close" onClick={() => setManagerAlerts((prev) => prev.filter((x) => x.id !== a.id))} aria-label="Đóng">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="checkin-map-wrapper">
        
        {/* 1. BADGE TRỰC TIẾP (LIVE) */}
        {workLocation && (
          <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 16px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 'bold' }}>
            <div style={{ width: 8, height: 8, backgroundColor: '#ff4d4f', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
            GIÁM SÁT TRỰC TIẾP (LIVE)
          </div>
        )}

        {/* 2. BẢN ĐỒ */}
        <MapContainer className="checkin-map" center={mapCenter} zoom={16} scrollWheelZoom doubleClickZoom={false}>
          <MapInstanceRef mapRef={mapRef} setIsMapReady={setIsMapReady} />
          {baseLayer === 'normal' && <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />}
          {baseLayer === 'satellite' && <TileLayer attribution='Tiles &copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />}

          {workLocations.map((loc, idx) => {
            const lat = loc.latitude;
            const lng = loc.longitude;
            if (!lat || !lng) return null;
            return (
              <Circle key={loc.work_location_id || idx} center={[lat, lng]} radius={loc.radius_meters || TEMP_HQ.radiusMeters} pathOptions={{ color: '#16a34a', weight: 3, fillColor: '#16a34a', fillOpacity: 0.18 }} />
            );
          })}

          {gps.position && (
            <CircleMarker center={[gps.position.latitude, gps.position.longitude]} radius={12} pathOptions={{ color: isInsideRadius ? '#16a34a' : '#dc2626', weight: 3, fillOpacity: 0.85 }} />
          )}

          {Object.entries(employeePositions).map(([empId, pos]) => (
            <CircleMarker
              key={`live-pos-${empId}`}
              center={[pos.latitude, pos.longitude]}
              radius={9}
              pathOptions={{
                color: '#1d4ed8',
                weight: 2,
                fillColor: '#3b82f6',
                fillOpacity: 0.9,
              }}
            />
          ))}

          {attendees.map((item, index) => {
            const coords = getItemCoords(item);
            if (!coords) return null;
            const inside = getEffectiveInside(item);
            const cd = !item.checkOutTime && !inside ? getOutCountdownLive(item.employeeId) : null;
            const countdownLabel = cd != null ? formatMMSS(cd) : null;
            return (
              <Marker
                key={item.employeeId}
                position={[coords.lat, coords.lng]}
                zIndexOffset={selectedEmployeeId === item.employeeId ? 10000 : index}
                icon={buildStaffMarkerIcon({
                  initials: getInitials(item.fullName),
                  tone: item.checkOutTime ? 'done' : 'working',
                  active: selectedEmployeeId === item.employeeId,
                  countdownLabel,
                })}
                eventHandlers={{ click: () => setSelectedEmployeeId(item.employeeId) }}
              >
                <Popup>
                  <div className="manager-member-popup">
                    <div className="manager-member-popup-head">
                      <div className="manager-member-avatar">{getInitials(item.fullName)}</div>
                      <div>
                        <div className="manager-member-name">{item.fullName}</div>
                        <div className="manager-member-code">Mã NV: {item.employeeCode || 'N/A'}</div>
                      </div>
                      <div className={`manager-member-state ${item.checkOutTime ? 'done' : 'working'}`}>{item.checkOutTime ? 'Đã out' : 'Đang làm'}</div>
                    </div>
                    <div className="manager-member-times">
                      <div className="manager-member-time-item checkin"><span>Check-in</span><strong>{formatTime(item.checkInTime)}</strong></div>
                      <div className="manager-member-time-item checkout"><span>Check-out</span><strong>{item.checkOutTime ? formatTime(item.checkOutTime) : '--:--'}</strong></div>
                    </div>
                    <div className="manager-member-foot">Kết quả chấm công: {formatAttendanceStatus(item.status)}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* 3. LỚP UI ĐIỀU KHIỂN TRÊN BẢN ĐỒ */}
        <div className="checkin-map-ui">
          
          <div className="checkin-radar-label">
            <div className="checkin-radar-title">Radar • {workLocation?.radius_meters ?? TEMP_HQ.radiusMeters}m</div>
            <div className="checkin-radar-sub">{workLocation?.location_name || 'Trụ sở chính'} • Theo dõi đội ngũ</div>
          </div>

          <div className="checkin-map-controls">
            <div className="checkin-map-control-row">
              <button type="button" className={`checkin-map-mode-btn ${baseLayer === 'normal' ? 'active' : ''}`} onClick={() => setBaseLayer('normal')}>Bình thường</button>
              <button type="button" className={`checkin-map-mode-btn ${baseLayer === 'satellite' ? 'active' : ''}`} onClick={() => setBaseLayer('satellite')}>Vệ tinh</button>
            </div>
          </div>

          <button type="button" className={`checkin-fab-toggle ${showAttendanceCard ? 'expanded' : 'collapsed'}`} onClick={() => setShowAttendanceCard((prev) => !prev)}>
            {showAttendanceCard ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          <div className={`checkin-fab-card ${showAttendanceCard ? 'open' : 'closed'}`}>
              <div className="checkin-fab-top-actions">
                <button
                  type="button"
                  className="checkin-history-btn"
                  onClick={() => {
                    setHistoryOpen(true);
                    void fetchHistory();
                  }}
                  aria-label="Xem lịch sử chấm công"
                >
                  <History size={18} />
                </button>
              </div>
              <button className={`checkin-fab-button ${!isDone && !canCheckOut ? 'checkin' : canCheckOut ? 'checkout' : 'done'}`} onClick={handleAttendanceAction} disabled={!showAttendanceCard || actionDisabled} type="button">
                <Fingerprint size={44} color="#fff" />
                <div className="checkin-fab-text">{isDone ? 'ĐÃ CHECK OUT' : canCheckOut ? 'CHECK OUT' : 'CHECK IN'}</div>
              </button>
              <div className={`checkin-fab-message ${isDone ? 'msg-done' : canCheckOut ? 'msg-warning' : 'msg-info'}`}>
                {isDone ? `Đã checkout lúc ${formatTime(attendanceToday.checkOutTime)}` : canCheckOut ? `Vào ca: ${formatTime(attendanceToday.checkInTime)}` : 'Bạn chưa bắt đầu làm việc'}
              </div>
              <div className="checkin-fab-subtext">{message}</div>

              {/* Nút Lấy vị trí */}
              <div className="w-full px-4 pb-3 flex flex-col justify-center">
                <button
                  type="button"
                  onClick={fetchLocation}
                  disabled={isLocating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLocating ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-blue-600" />
                      Đang quét vị trí (Có thể mất vài giây)...
                    </>
                  ) : (
                    <>
                      <MapPin size={16} className="text-blue-600" />
                      Lấy vị trí GPS
                    </>
                  )}
                </button>
                {isLocating && (deviceTier === 'Low' || deviceTier === 'Mid') && (
                  <p className="text-xs text-orange-600 mt-1.5 text-center leading-[1.3] opacity-90">
                    Mạng yếu. Đang cố gắng lấy tọa độ chính xác nhất, vui lòng không tắt trình duyệt.
                  </p>
                )}
              </div>
          </div>

          <button type="button" className="manager-monitor-toggle" onClick={() => setMonitorOpen((prev) => !prev)}>
            {monitorOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />} {monitorOpen ? 'Ẩn giám sát' : 'Mở giám sát'}
          </button>

          <div className={`manager-monitor-card ${monitorOpen ? 'open' : 'closed'}`}>
            <div className="manager-monitor-head">
              <h4 className="manager-monitor-title">Bảng giám sát khu vực</h4>
              <p className="manager-monitor-sub">Theo dõi đội ngũ theo thời gian thực</p>
            </div>
            
            <div className="manager-stat-grid">
              <div className="manager-stat-card"><div className="manager-stat-label">Trong zone</div><div className="manager-stat-value">{zoneStats.totalInZone}</div></div>
              <div className="manager-stat-card working"><div className="manager-stat-label">Đang làm</div><div className="manager-stat-value">{zoneStats.checkedInOnly}</div></div>
              <div className="manager-stat-card done"><div className="manager-stat-label">Đã out</div><div className="manager-stat-value">{zoneStats.checkedOut}</div></div>
            </div>

            <div className="manager-attendee-list">
              {attendees.length === 0 ? <p className="manager-attendee-empty">Chưa có nhân viên check-in trong zone hôm nay.</p> : (
                attendees.map((item) => {
                  const inside = getEffectiveInside(item);
                  const outZone = !item.checkOutTime && !inside;
                  const cd = outZone ? getOutCountdownLive(item.employeeId) : null;
                  return (
                    <button
                      type="button"
                      className={`manager-attendee-item ${selectedEmployeeId === item.employeeId ? 'active' : ''} ${outZone ? 'manager-attendee-item--out-zone' : ''}`}
                      key={`list-${item.employeeId}`}
                      onClick={() => focusOnEmployee({ ...item, latitude: getItemCoords(item)?.lat, longitude: getItemCoords(item)?.lng })}
                    >
                      <div className="manager-attendee-head">
                        <div className="manager-attendee-person">
                          <div className="manager-attendee-avatar">{getInitials(item.fullName)}</div>
                          <div><div className="manager-attendee-name">{item.fullName}</div><div className="manager-attendee-code">{item.employeeCode || 'N/A'}</div></div>
                        </div>
                        <div className={`manager-attendee-status ${item.checkOutTime ? 'done' : 'working'}`}>{item.checkOutTime ? 'Đã out' : 'Đang làm'}</div>
                      </div>
                      <div className="manager-attendee-meta"><span>In: {formatTime(item.checkInTime)}</span><span>Out: {item.checkOutTime ? formatTime(item.checkOutTime) : '--:--'}</span></div>
                      {outZone && cd != null && (
                        <div className="manager-attendee-outzone">Tự động checkout sau: <strong>{formatMMSS(cd)}</strong></div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 4. POPUP XÁC NHẬN CHECKOUT (Nằm ngoài cùng lớp UI để không bị che) */}
        {showCheckoutConfirm && (
          <div className="checkin-confirm-overlay">
            <div className="checkin-confirm-box">
              <div className="checkin-confirm-header">Xác nhận kết thúc ca làm việc</div>
              <div className="checkin-confirm-body">
                <div className="checkin-confirm-times">
                  <div className="checkin-time-pill checkin">
                    Giờ CHECK-IN: <span>{formatTime(attendanceToday.checkInTime)}</span>
                  </div>
                  {checkoutPreviewTime && (
                    <div className="checkin-time-pill checkout">
                      Giờ CHECK-OUT: <span>{formatTime(checkoutPreviewTime)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="checkin-confirm-main">
                <button type="button" className="checkin-fab-button checkout checkin-confirm-checkout-btn" onClick={() => void submitAttendance('checkout')} disabled={actionLoading}>
                  <Fingerprint size={38} color="#fff" />
                  <div className="checkin-fab-text">{actionLoading ? 'ĐANG XỬ LÝ...' : 'CHECK OUT'}</div>
                </button>
              </div>
              <div className="checkin-confirm-actions">
                <button type="button" className="checkin-confirm-btn secondary" onClick={() => { setShowCheckoutConfirm(false); setCheckoutPreviewTime(''); }} disabled={actionLoading}>
                  Hủy bỏ
                </button>
              </div>
              <p className="checkin-confirm-footnote">Sau khi xác nhận, trạng thái trong ngày sẽ được khóa.</p>
            </div>
          </div>
        )}
        <AttendanceHistoryModal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          monthYear={monthYear}
          setMonthYear={setMonthYear}
          loading={historyLoading}
          error={historyError}
          data={historyData}
          onSearch={() => void fetchHistory()}
        />

      </div>
    </div>
  );
};

export default ManagerCheckIn;