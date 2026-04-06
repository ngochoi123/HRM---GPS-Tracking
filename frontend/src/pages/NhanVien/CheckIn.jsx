import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ChevronLeft, ChevronRight, Fingerprint, Wifi, AlertTriangle, History } from 'lucide-react';
import { getManagerSocket, socketOriginFromApiBase } from '../../services/managerSocket';
import AttendanceHistoryModal from '../../components/AttendanceHistoryModal';

import './CheckIn.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href
});

const API_BASE = 'http://localhost:5000/api';
const SOCKET_ORIGIN = socketOriginFromApiBase(API_BASE);

/** Trùng backend TEMP_HEADQUARTERS */
const TEMP_HQ = {
  latitude: 16.05963797280072,
  longitude: 108.17468278677039,
  radiusMeters: 500
};

const toNumberSafe = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toRadians = (deg) => (deg * Math.PI) / 180;
const haversineDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatTime = (isoOrTs) => {
  if (!isoOrTs) return '';
  const d = new Date(isoOrTs);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const buildPingIcon = (color, title) => {
  const html = `
    <div class="hq-ping-root" style="--ping-color:${color}">
      <div class="hq-ping-dot" title="${title}"></div>
      <div class="hq-ping-ring"></div>
    </div>
  `;
  return L.divIcon({
    className: 'hq-ping-icon',
    html,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
};

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

const CheckIn = () => {
  const [workLocation, setWorkLocation] = useState(null);
  const [attendanceToday, setAttendanceToday] = useState({
    checkInTime: null,
    checkOutTime: null,
    status: null
  });

  const [baseLayer, setBaseLayer] = useState('normal');
  const [gps, setGps] = useState({
    status: 'loading',
    position: null,
    errorMessage: ''
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [checkoutPreviewTime, setCheckoutPreviewTime] = useState('');
  const [showAttendanceCard, setShowAttendanceCard] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${m}`;
  });
  /** Trạng thái WiFi IP (theo API summary / lỗi backend khi chấm công). */
  const [isWifiValid, setIsWifiValid] = useState(true);
  /** true = ngoài vùng bán kính (khóa chấm công khi có radius). */
  const [isOutZone, setIsOutZone] = useState(true);

  const watchIdRef = useRef(null);
  const mapRef = useRef(null);
  const gpsPosRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const hasAutoCenteredRef = useRef(false);

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const employeeId = useMemo(() => {
    if (!user) return null;
    return user.employee_id || user.id || null;
  }, [user]);

  const mapCenter = useMemo(() => [TEMP_HQ.latitude, TEMP_HQ.longitude], []);

  const distanceMeters = useMemo(() => {
    if (!workLocation || !gps.position) return null;
    const { latitude, longitude } = gps.position;
    return haversineDistanceMeters(latitude, longitude, workLocation.latitude, workLocation.longitude);
  }, [workLocation, gps.position]);

  useEffect(() => {
    if (!gps.position || !workLocation) {
      setIsOutZone(true);
      return;
    }
    const r = workLocation.radius_meters;
    if (r == null || r === '' || Number(r) <= 0) {
      setIsOutZone(false);
      return;
    }
    const distance = haversineDistanceMeters(
      gps.position.latitude,
      gps.position.longitude,
      workLocation.latitude,
      workLocation.longitude
    );
    setIsOutZone(distance > Number(r));
  }, [gps.position, workLocation]);

  const isInsideRadius = !isOutZone;

  const radarColor = useMemo(() => {
    if (!workLocation || !gps.position) return '#16a34a';
    return isInsideRadius ? '#16a34a' : '#dc2626';
  }, [workLocation, gps.position, isInsideRadius]);

  const canCheckOut = !!attendanceToday.checkInTime && !attendanceToday.checkOutTime;
  const isDone = !!attendanceToday.checkOutTime;
  const buttonVariant = isDone ? 'done' : canCheckOut ? 'checkout' : 'checkin';
  const zoneDisplayName = workLocation?.location_name || 'Trụ sở chính';

  const recenterToMe = useCallback(() => {
    const map = mapRef.current;
    const pos = gpsPosRef.current;
    if (!map) {
      setActionError('Bản đồ chưa sẵn sàng. Đợi vài giây hoặc tải lại trang rồi thử lại.');
      return;
    }
    if (!pos) {
      setActionError('Chưa có GPS. Vui lòng bật quyền truy cập vị trí.');
      return;
    }
    map.invalidateSize();
    const target = [pos.latitude, pos.longitude];
    if (typeof map.flyTo === 'function') map.flyTo(target, 17, { duration: 1 });
    else map.setView(target, 17, { animate: true });
  }, []);

  useEffect(() => {
    gpsPosRef.current = gps.position;
  }, [gps.position]);

  const fetchSummary = useCallback(async () => {
    if (!employeeId) return;
    setActionError('');
    try {
      const res = await fetch(`${API_BASE}/employee/attendance/summary/${employeeId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || `Lỗi ${res.status}`);
      }
      const wl = json.data.workLocation;
      setWorkLocation(wl);
      if (!wl || !wl.wifi_ip_required) {
        setIsWifiValid(true);
      } else {
        setIsWifiValid(wl.client_ip_allowed === true);
      }
      setAttendanceToday(json.data.attendanceToday);
    } catch (err) {
      setMessage('Không thể tải dữ liệu chấm công từ server.');
      setActionError(err.message || String(err));
    }
  }, [employeeId]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const fetchHistory = useCallback(async () => {
    if (!employeeId) return;
    const [y, m] = String(monthYear || '').split('-');
    const year = Number(y);
    const month = Number(m);
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const qs = Number.isFinite(month) && Number.isFinite(year) ? `?month=${month}&year=${year}` : '';
      const res = await fetch(`${API_BASE}/employee/attendance/history/${employeeId}${qs}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || `Lỗi ${res.status}`);
      }
      setHistoryData(json.data || null);
    } catch (err) {
      setHistoryError(err.message || String(err));
    } finally {
      setHistoryLoading(false);
    }
  }, [employeeId, monthYear]);

  useEffect(() => {
    if (!employeeId) return;
    const socket = getManagerSocket(SOCKET_ORIGIN);
    const onLocationsUpdated = () => {
      console.log('🔄 Admin vừa cập nhật vùng chấm công. Đang tải lại...');
      void fetchSummary();
    };
    socket.on('admin_locations_updated', onLocationsUpdated);
    return () => {
      socket.off('admin_locations_updated', onLocationsUpdated);
    };
  }, [employeeId, fetchSummary]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGps({ status: 'error', position: null, errorMessage: 'Trình duyệt không hỗ trợ GPS.' });
      return;
    }

    const success = (pos) => {
      const lat = toNumberSafe(pos.coords.latitude);
      const lng = toNumberSafe(pos.coords.longitude);
      if (lat == null || lng == null) return;
      setGps({ status: 'ready', position: { latitude: lat, longitude: lng }, errorMessage: '' });
    };

    const error = (err) => {
      setGps({
        status: 'error',
        position: null,
        errorMessage: err?.message || 'Không thể lấy vị trí GPS. Vui lòng bật quyền truy cập vị trí.'
      });
    };

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
    const t = setInterval(() => void fetchSummary(), 30000);
    return () => clearInterval(t);
  }, [fetchSummary]);

  useEffect(() => {
    if (!gps.position || !isMapReady || !mapRef.current || hasAutoCenteredRef.current) return;
    hasAutoCenteredRef.current = true;
    mapRef.current.invalidateSize();
    const target = [gps.position.latitude, gps.position.longitude];
    if (typeof mapRef.current.flyTo === 'function') {
      mapRef.current.flyTo(target, 17, { duration: 1 });
    } else {
      mapRef.current.setView(target, 17);
    }
  }, [gps.position, isMapReady]);

  const wifiIpBlocks =
    workLocation?.wifi_ip_required === true && workLocation?.client_ip_allowed === false;

  useEffect(() => {
    if (!workLocation) return;
    if (actionError) {
      setMessage(actionError);
      return;
    }
    if (wifiIpBlocks) {
      setMessage('Cần kết nối WiFi văn phòng (IP hiện tại chưa khớp danh sách cho phép).');
      return;
    }
    if (isDone) {
      setMessage('Bạn đã checkout hôm nay.');
      return;
    }
    if (canCheckOut) {
      if (workLocation.radius_meters && !isInsideRadius) {
        setMessage('Bạn đang ngoài vùng GPS — vào đúng zone mới checkout được.');
        return;
      }
      setMessage('Sẵn sàng checkout. Hệ thống sẽ yêu cầu xác nhận trước khi chấm công ra.');
      return;
    }
    if (!gps.position) {
      setMessage('Đang chờ vị trí GPS...');
      return;
    }
    if (workLocation.radius_meters && !isInsideRadius) {
      setMessage('Bạn đang ngoài vùng GPS — chỉ có thể CHECK IN khi vào đúng bán kính.');
      return;
    }
    setMessage('Nhấn CHECK IN để bắt đầu ca.');
  }, [workLocation, gps.position, isInsideRadius, canCheckOut, isDone, actionError, wifiIpBlocks]);

  useEffect(() => {
    if (!canCheckOut) setShowCheckoutConfirm(false);
  }, [canCheckOut]);

  const submitAttendance = async (mode) => {
    if (actionLoading) return;
    if (!employeeId) return;
    if (!gps.position) {
      setActionError('Chưa có GPS. Vui lòng bật quyền truy cập vị trí và thử lại.');
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      const endpoint =
        mode === 'checkin'
          ? `${API_BASE}/employee/attendance/checkin/${employeeId}`
          : `${API_BASE}/employee/attendance/checkout/${employeeId}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: gps.position.latitude,
          longitude: gps.position.longitude
        })
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const msg = json.message || `Lỗi ${res.status}`;
        if (
          typeof msg === 'string' &&
          (msg.includes('WiFi văn phòng') || msg.includes('kết nối mạng'))
        ) {
          setIsWifiValid(false);
          window.alert(msg);
        }
        throw new Error(msg);
      }

      setShowCheckoutConfirm(false);
      setCheckoutPreviewTime('');
      await fetchSummary();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAttendanceAction = () => {
    if (canCheckOut) {
      setActionError('');
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
    (workLocation.radius_meters != null && isOutZone) ||
    wifiIpBlocks;

  return (
    <div className="checkin-shell">
      <div className="checkin-map-wrapper">
        <MapContainer
          className="checkin-map"
          center={mapCenter}
          zoom={16}
          scrollWheelZoom
          doubleClickZoom={false}
        >
          <MapInstanceRef mapRef={mapRef} setIsMapReady={setIsMapReady} />
          {baseLayer === 'normal' && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
            <>
              <Circle
                center={[workLocation.latitude, workLocation.longitude]}
                radius={workLocation.radius_meters || TEMP_HQ.radiusMeters}
                pathOptions={{
                  color: radarColor,
                  weight: 3,
                  fillColor: radarColor,
                  fillOpacity: 0.2
                }}
              />
              <Circle
                center={[workLocation.latitude, workLocation.longitude]}
                radius={workLocation.radius_meters || TEMP_HQ.radiusMeters}
                pathOptions={{ color: radarColor, weight: 2, fillOpacity: 0, dashArray: '6 6' }}
              />
              <Marker
                position={[workLocation.latitude, workLocation.longitude]}
                icon={buildPingIcon('#16a34a', 'Trụ sở chính')}
              >
                <Popup>
                  <div>
                    <strong>{zoneDisplayName}</strong>
                    <div>Bán kính: {Math.round(workLocation.radius_meters || TEMP_HQ.radiusMeters)} m</div>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {gps.position && (
            <>
              <CircleMarker
                center={[gps.position.latitude, gps.position.longitude]}
                radius={12}
                pathOptions={{
                  color: radarColor,
                  weight: 3,
                  fillColor: radarColor,
                  fillOpacity: 0.85
                }}
              />
              <Marker
                position={[gps.position.latitude, gps.position.longitude]}
                icon={buildPingIcon(isInsideRadius ? '#16a34a' : '#dc2626', 'Vị trí của bạn')}
              >
                <Popup>
                  <div>
                    <strong>Vị trí hiện tại</strong>
                    {distanceMeters != null && workLocation && (
                      <div>
                        Khoảng cách: {Math.round(distanceMeters)} m /{' '}
                        {Math.round(workLocation.radius_meters ?? TEMP_HQ.radiusMeters)} m
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>

        <div className="checkin-map-ui" aria-hidden={false}>
          <button type="button" className="checkin-recenter-btn" onClick={recenterToMe}>
            Về tôi
          </button>

          <div className="checkin-radar-label">
            <div className="checkin-radar-title">
              Radar GPS • {workLocation?.radius_meters ?? TEMP_HQ.radiusMeters}m
            </div>
            <div className="checkin-radar-sub">
              {zoneDisplayName} • {gps.status === 'ready' ? 'Đã có vị trí' : 'Đang chờ GPS'}
            </div>
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
            <button
              className={`checkin-fab-button ${buttonVariant}`}
              onClick={handleAttendanceAction}
              disabled={!showAttendanceCard || actionDisabled}
              type="button"
              aria-label="attendance action"
            >
              <Fingerprint size={44} color="#fff" />
              <div className="checkin-fab-text">
                {isDone ? 'ĐÃ CHECK OUT' : canCheckOut ? 'CHECK OUT' : 'CHECK IN'}
              </div>
            </button>

            <div
              className={`checkin-fab-message ${
                isDone ? 'msg-done' : canCheckOut ? 'msg-warning' : 'msg-info'
              }`}
            >
              {isDone
                ? `Đã checkout lúc ${formatTime(attendanceToday.checkOutTime)}`
                : canCheckOut
                  ? `Vào ca: ${formatTime(attendanceToday.checkInTime)}`
                  : `Bạn chưa bắt đầu làm việc`}
            </div>

            <div className="checkin-fab-subtext">{message}</div>

            <div
              className={`checkin-wifi-bar ${isWifiValid ? 'checkin-wifi-bar--ok' : 'checkin-wifi-bar--bad'}`}
              role="status"
            >
              {isWifiValid ? (
                <Wifi size={20} className="checkin-wifi-icon" aria-hidden />
              ) : (
                <AlertTriangle size={20} className="checkin-wifi-icon" aria-hidden />
              )}
              <div className="checkin-wifi-text">
                <div className="checkin-wifi-title">
                  {isWifiValid ? 'Kết nối mạng công ty' : 'Chưa kết nối WiFi công ty'}
                </div>
                <div className="checkin-wifi-sub">
                  {workLocation?.wifi_ip_required
                    ? isWifiValid
                      ? 'IP hiện tại khớp danh sách cho phép.'
                      : 'IP hiện tại không nằm trong danh sách WiFi văn phòng — không thể chấm công.'
                    : 'Không bắt buộc kiểm tra IP WiFi cho chi nhánh này.'}
                </div>
              </div>
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
                  Bạn đang thực hiện thao tác <span className="checkin-highlight-red">CHECK OUT</span>. Vui lòng xác
                  nhận để đảm bảo dữ liệu công được ghi nhận{' '}
                  <span className="checkin-highlight-green">chính xác</span>.
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
                  aria-label="confirm checkout"
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
              <p className="checkin-confirm-footnote">
                Sau khi xác nhận, trạng thái trong ngày sẽ được khóa và không thể thao tác thêm.
              </p>
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

export default CheckIn;
