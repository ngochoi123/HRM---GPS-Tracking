import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ChevronLeft, ChevronRight, Fingerprint, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import './CheckIn.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href
});

const API_BASE = 'http://localhost:5000/api';
const TEMP_HQ = { latitude: 16.05963797280072, longitude: 108.17468278677039, radiusMeters: 500 };
const toRadians = (deg) => (deg * Math.PI) / 180;
const haversineDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};
const formatTime = (value) => {
  if (!value) return '--:--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};
const formatAttendanceStatus = (status) => {
  switch (status) {
    case 'on_time':
      return 'Đúng giờ';
    case 'late':
      return 'Đi muộn';
    case 'early_leave':
      return 'Về sớm';
    case 'absent':
      return 'Vắng mặt';
    default:
      return 'Đang cập nhật';
  }
};
const getInitials = (name) => {
  if (!name) return 'NV';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[parts.length - 2][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
};
const buildPingIcon = (color, title) =>
  L.divIcon({
    className: 'hq-ping-icon',
    html: `<div class="hq-ping-root" style="--ping-color:${color}"><div class="hq-ping-dot" title="${title}"></div><div class="hq-ping-ring"></div></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
const buildStaffMarkerIcon = ({ initials, tone, active }) =>
  L.divIcon({
    className: 'manager-staff-marker',
    html: `
      <div class="manager-staff-pin ${tone} ${active ? 'active' : ''}">
        <div class="manager-staff-pin-inner"><span>${initials}</span></div>
        <div class="manager-staff-pin-pulse"></div>
      </div>
    `,
    iconSize: [58, 72],
    iconAnchor: [29, 66],
    popupAnchor: [0, -58]
  });

const MapInstanceRef = ({ mapRef, setIsMapReady }) => {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    setIsMapReady(true);
    return () => {
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [map, mapRef, setIsMapReady]);
  return null;
};

const ManagerCheckIn = () => {
  const [workLocation, setWorkLocation] = useState(null);
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

  const watchIdRef = useRef(null);
  const mapRef = useRef(null);
  const gpsPosRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const hasAutoCenteredRef = useRef(false);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);
  const managerId = useMemo(() => (user ? user.employee_id || user.id || null : null), [user]);
  const canCheckOut = !!attendanceToday.checkInTime && !attendanceToday.checkOutTime;
  const isDone = !!attendanceToday.checkOutTime;
  const buttonVariant = isDone ? 'done' : canCheckOut ? 'checkout' : 'checkin';
  const mapCenter = useMemo(() => [TEMP_HQ.latitude, TEMP_HQ.longitude], []);

  const distanceMeters = useMemo(() => {
    if (!workLocation || !gps.position) return null;
    return haversineDistanceMeters(
      gps.position.latitude,
      gps.position.longitude,
      workLocation.latitude,
      workLocation.longitude
    );
  }, [workLocation, gps.position]);

  const isInsideRadius = useMemo(() => {
    if (!workLocation) return false;
    if (workLocation.radius_meters == null) return true;
    if (distanceMeters == null) return false;
    return distanceMeters <= workLocation.radius_meters;
  }, [workLocation, distanceMeters]);

  const recenterToMe = useCallback(() => {
    const map = mapRef.current;
    const pos = gpsPosRef.current;
    if (!map) {
      setActionError('Bản đồ chưa sẵn sàng.');
      return;
    }
    if (!pos) {
      setActionError('Chưa có GPS. Vui lòng bật quyền vị trí.');
      return;
    }
    const target = [pos.latitude, pos.longitude];
    if (typeof map.flyTo === 'function') map.flyTo(target, 17, { duration: 1 });
    else map.setView(target, 17, { animate: true });
  }, []);
  const focusOnEmployee = useCallback((item) => {
    if (!item?.latitude || !item?.longitude || !mapRef.current) return;
    setSelectedEmployeeId(item.employeeId);
    mapRef.current.flyTo([item.latitude, item.longitude], 18, { duration: 0.8 });
  }, []);

  useEffect(() => {
    gpsPosRef.current = gps.position;
  }, [gps.position]);

  const fetchSummary = useCallback(async () => {
    if (!managerId) return;
    const res = await fetch(`${API_BASE}/employee/attendance/summary/${managerId}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(json.message || `Lỗi ${res.status}`);
    setWorkLocation(json.data.workLocation);
    setAttendanceToday(json.data.attendanceToday);
  }, [managerId]);

  const fetchZoneAttendance = useCallback(async () => {
    if (!managerId) return;
    const res = await fetch(`${API_BASE}/employee/attendance/manager-zone/${managerId}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(json.message || `Lỗi ${res.status}`);
    setZoneStats(json.data.zoneStats || { totalInZone: 0, checkedInOnly: 0, checkedOut: 0 });
    setAttendees(Array.isArray(json.data.attendees) ? json.data.attendees : []);
  }, [managerId]);

  useEffect(() => {
    if (!managerId) return;
    Promise.all([fetchSummary(), fetchZoneAttendance()]).catch((err) => {
      setActionError(err.message || String(err));
      setMessage('Không thể tải dữ liệu giám sát chấm công.');
    });
  }, [managerId, fetchSummary, fetchZoneAttendance]);

  useEffect(() => {
    const timer = setInterval(() => {
      Promise.all([fetchSummary(), fetchZoneAttendance()]).catch(() => null);
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchSummary, fetchZoneAttendance]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGps({ status: 'error', position: null });
      return;
    }
    const success = (pos) =>
      setGps({
        status: 'ready',
        position: { latitude: Number(pos.coords.latitude), longitude: Number(pos.coords.longitude) }
      });
    const error = () => setGps({ status: 'error', position: null });
    watchIdRef.current = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000
    });
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (!gps.position || !isMapReady || !mapRef.current || hasAutoCenteredRef.current) return;
    hasAutoCenteredRef.current = true;
    const target = [gps.position.latitude, gps.position.longitude];
    if (typeof mapRef.current.flyTo === 'function') mapRef.current.flyTo(target, 17, { duration: 1 });
    else mapRef.current.setView(target, 17);
  }, [gps.position, isMapReady]);

  useEffect(() => {
    if (actionError) {
      setMessage(actionError);
      return;
    }
    if (isDone) {
      setMessage('Bạn đã checkout hôm nay.');
      return;
    }
    if (canCheckOut) {
      setMessage('Sẵn sàng checkout. Hệ thống sẽ yêu cầu xác nhận trước khi chấm công ra.');
      return;
    }
    if (!gps.position) {
      setMessage('Đang chờ GPS...');
      return;
    }
    if (workLocation?.radius_meters != null && !isInsideRadius) {
      setMessage('Bạn đang ngoài vùng GPS — vào zone để checkin.');
      return;
    }
    setMessage('Nhấn CHECK IN để bắt đầu ca và giám sát đội ngũ.');
  }, [actionError, isDone, canCheckOut, gps.position, workLocation, isInsideRadius]);

  const submitAttendance = async (mode) => {
    if (actionLoading || !managerId) return;
    if (!gps.position) {
      setActionError('Chưa có GPS. Vui lòng bật quyền vị trí và thử lại.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const endpoint =
        mode === 'checkin'
          ? `${API_BASE}/employee/attendance/checkin/${managerId}`
          : `${API_BASE}/employee/attendance/checkout/${managerId}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: gps.position.latitude, longitude: gps.position.longitude })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || `Lỗi ${res.status}`);
      setShowCheckoutConfirm(false);
      setCheckoutPreviewTime('');
      await Promise.all([fetchSummary(), fetchZoneAttendance()]);
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAttendanceAction = () => {
    if (canCheckOut) {
      setCheckoutPreviewTime(new Date().toISOString());
      setShowCheckoutConfirm(true);
      return;
    }
    void submitAttendance('checkin');
  };

  const actionDisabled =
    actionLoading ||
    isDone ||
    !gps.position ||
    !workLocation ||
    (workLocation.radius_meters != null && !isInsideRadius);

  return (
    <div className="checkin-shell">
      <div className="checkin-map-wrapper">
        <MapContainer className="checkin-map" center={mapCenter} zoom={16} scrollWheelZoom doubleClickZoom={false}>
          <MapInstanceRef mapRef={mapRef} setIsMapReady={setIsMapReady} />
          {baseLayer === 'normal' && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}
          {baseLayer === 'satellite' && (
            <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          )}

          {workLocation && (
            <Circle
              center={[workLocation.latitude, workLocation.longitude]}
              radius={workLocation.radius_meters || TEMP_HQ.radiusMeters}
              pathOptions={{ color: '#16a34a', weight: 3, fillColor: '#16a34a', fillOpacity: 0.18 }}
            />
          )}

          {gps.position && (
            <CircleMarker
              center={[gps.position.latitude, gps.position.longitude]}
              radius={12}
              pathOptions={{ color: isInsideRadius ? '#16a34a' : '#dc2626', weight: 3, fillOpacity: 0.85 }}
            />
          )}

          {attendees.map((item, index) =>
            item.latitude && item.longitude ? (
              <Marker
                key={item.employeeId}
                position={[item.latitude, item.longitude]}
                zIndexOffset={selectedEmployeeId === item.employeeId ? 10000 : index}
                icon={buildStaffMarkerIcon({
                  initials: getInitials(item.fullName),
                  tone: item.checkOutTime ? 'done' : 'working',
                  active: selectedEmployeeId === item.employeeId
                })}
                eventHandlers={{
                  click: () => setSelectedEmployeeId(item.employeeId)
                }}
              >
                <Popup>
                  <div className="manager-member-popup">
                    <div className="manager-member-popup-head">
                      <div className="manager-member-avatar">{getInitials(item.fullName)}</div>
                      <div>
                        <div className="manager-member-name">{item.fullName}</div>
                        <div className="manager-member-code">Mã NV: {item.employeeCode || 'N/A'}</div>
                      </div>
                      <div className={`manager-member-state ${item.checkOutTime ? 'done' : 'working'}`}>
                        {item.checkOutTime ? 'Đã out' : 'Đang làm'}
                      </div>
                    </div>
                    <div className="manager-member-times">
                      <div className="manager-member-time-item checkin">
                        <span>Check-in</span>
                        <strong>{formatTime(item.checkInTime)}</strong>
                      </div>
                      <div className="manager-member-time-item checkout">
                        <span>Check-out</span>
                        <strong>{item.checkOutTime ? formatTime(item.checkOutTime) : '--:--'}</strong>
                      </div>
                    </div>
                    <div className="manager-member-foot">Kết quả chấm công: {formatAttendanceStatus(item.status)}</div>
                  </div>
                </Popup>
              </Marker>
            ) : null
          )}
        </MapContainer>

        <div className="checkin-map-ui" aria-hidden={false}>
          <button type="button" className="checkin-recenter-btn" onClick={recenterToMe}>
            Về tôi
          </button>

          <div className="checkin-radar-label">
            <div className="checkin-radar-title">Radar • {workLocation?.radius_meters ?? TEMP_HQ.radiusMeters}m</div>
            <div className="checkin-radar-sub">{workLocation?.location_name || 'Trụ sở chính'} • Theo dõi đội ngũ</div>
          </div>

          <div className="checkin-map-controls">
            <div className="checkin-map-control-row">
              <button
                type="button"
                className={`checkin-map-mode-btn ${baseLayer === 'normal' ? 'active' : ''}`}
                onClick={() => setBaseLayer('normal')}
              >
                Bình thường
              </button>
              <button
                type="button"
                className={`checkin-map-mode-btn ${baseLayer === 'satellite' ? 'active' : ''}`}
                onClick={() => setBaseLayer('satellite')}
              >
                Vệ tinh
              </button>
            </div>
          </div>

          <button
            type="button"
            className={`checkin-fab-toggle ${showAttendanceCard ? 'expanded' : 'collapsed'}`}
            onClick={() => setShowAttendanceCard((prev) => !prev)}
            aria-label={showAttendanceCard ? 'Thu gọn ô chấm công' : 'Mở ô chấm công'}
          >
            {showAttendanceCard ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          <div className={`checkin-fab-card ${showAttendanceCard ? 'open' : 'closed'}`}>
              <button
                className={`checkin-fab-button ${buttonVariant}`}
                onClick={handleAttendanceAction}
                disabled={!showAttendanceCard || actionDisabled}
                type="button"
              >
                <Fingerprint size={44} color="#fff" />
                <div className="checkin-fab-text">{isDone ? 'ĐÃ CHECK OUT' : canCheckOut ? 'CHECK OUT' : 'CHECK IN'}</div>
              </button>
              <div className={`checkin-fab-message ${isDone ? 'msg-done' : canCheckOut ? 'msg-warning' : 'msg-info'}`}>
                {isDone
                  ? `Đã checkout lúc ${formatTime(attendanceToday.checkOutTime)}`
                  : canCheckOut
                    ? `Vào ca: ${formatTime(attendanceToday.checkInTime)}`
                    : 'Bạn chưa bắt đầu làm việc'}
              </div>
              <div className="checkin-fab-subtext">{message}</div>
            </div>

          <button type="button" className="manager-monitor-toggle" onClick={() => setMonitorOpen((prev) => !prev)}>
            {monitorOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            {monitorOpen ? 'Ẩn giám sát' : 'Mở giám sát'}
          </button>

          <div className={`manager-monitor-card ${monitorOpen ? 'open' : 'closed'}`}>
            <div className="manager-monitor-head">
              <h4 className="manager-monitor-title">Bảng giám sát khu vực</h4>
              <p className="manager-monitor-sub">Theo dõi đội ngũ theo thời gian thực</p>
            </div>
            <div className="manager-stat-grid">
              <div className="manager-stat-card">
                <div className="manager-stat-label">Trong zone</div>
                <div className="manager-stat-value">{zoneStats.totalInZone}</div>
              </div>
              <div className="manager-stat-card working">
                <div className="manager-stat-label">Đang làm</div>
                <div className="manager-stat-value">{zoneStats.checkedInOnly}</div>
              </div>
              <div className="manager-stat-card done">
                <div className="manager-stat-label">Đã out</div>
                <div className="manager-stat-value">{zoneStats.checkedOut}</div>
              </div>
            </div>
            <div className="manager-attendee-list">
              {attendees.length === 0 ? (
                <p className="manager-attendee-empty">Chưa có nhân viên check-in trong zone hôm nay.</p>
              ) : (
                attendees.map((item) => (
                  <button
                    type="button"
                    className={`manager-attendee-item ${selectedEmployeeId === item.employeeId ? 'active' : ''}`}
                    key={`list-${item.employeeId}`}
                    onClick={() => focusOnEmployee(item)}
                  >
                    <div className="manager-attendee-head">
                      <div className="manager-attendee-person">
                        <div className="manager-attendee-avatar">{getInitials(item.fullName)}</div>
                        <div>
                          <div className="manager-attendee-name">{item.fullName}</div>
                          <div className="manager-attendee-code">{item.employeeCode || 'N/A'}</div>
                        </div>
                      </div>
                      <div className={`manager-attendee-status ${item.checkOutTime ? 'done' : 'working'}`}>
                        {item.checkOutTime ? 'Đã out' : 'Đang làm'}
                      </div>
                    </div>
                    <div className="manager-attendee-meta">
                      <span>In: {formatTime(item.checkInTime)}</span>
                      <span>Out: {item.checkOutTime ? formatTime(item.checkOutTime) : '--:--'}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {showCheckoutConfirm && (
          <div className="checkin-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <div className="checkin-confirm-modal">
              <div className="checkin-confirm-badge">Xác nhận nghiệp vụ</div>
              <h3 id="checkout-title">Hoàn tất chấm công ra ca</h3>
              <div className="checkin-confirm-content">
                <p className="checkin-confirm-lead">
                  Bạn đang thực hiện thao tác <span className="checkin-highlight-red">CHECK OUT</span>. Vui lòng xác nhận
                  để lưu dữ liệu công và trạng thái giám sát.
                </p>
                <div className="checkin-time-row">
                  {attendanceToday.checkInTime && (
                    <div className="checkin-time-pill">
                      Giờ CHECK-IN: <span>{formatTime(attendanceToday.checkInTime)}</span>
                    </div>
                  )}
                  {checkoutPreviewTime && (
                    <div className="checkin-time-pill checkout">
                      Giờ CHECK-OUT: <span>{formatTime(checkoutPreviewTime)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="checkin-confirm-main">
                <button
                  type="button"
                  className="checkin-fab-button checkout checkin-confirm-checkout-btn"
                  onClick={() => void submitAttendance('checkout')}
                  disabled={actionLoading}
                >
                  <Fingerprint size={38} color="#fff" />
                  <div className="checkin-fab-text">{actionLoading ? 'ĐANG XỬ LÝ...' : 'CHECK OUT'}</div>
                </button>
              </div>
              <div className="checkin-confirm-actions">
                <button
                  type="button"
                  className="checkin-confirm-btn secondary"
                  onClick={() => {
                    setShowCheckoutConfirm(false);
                    setCheckoutPreviewTime('');
                  }}
                  disabled={actionLoading}
                >
                  Hủy bỏ
                </button>
              </div>
              <p className="checkin-confirm-footnote">Sau khi xác nhận, trạng thái trong ngày sẽ được khóa.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerCheckIn;
