import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ChevronLeft, ChevronRight, Fingerprint } from 'lucide-react';

import './CheckIn.css';

// Fix leaflet default marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href
});

const API_BASE = 'http://localhost:5000/api';

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

const CheckIn = () => {
  const [workLocation, setWorkLocation] = useState(null);
  const [attendanceToday, setAttendanceToday] = useState({
    checkInTime: null,
    checkOutTime: null,
    status: null
  });

  const [gps, setGps] = useState({
    status: 'loading', // loading | ready | error
    position: null, // { latitude, longitude }
    errorMessage: ''
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [showAttendanceCard, setShowAttendanceCard] = useState(true);
  const watchIdRef = useRef(null);

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
    // Login code có thể lưu `id` hoặc `employee_id`
    return user.employee_id || user.id || null;
  }, [user]);

  const mapCenter = useMemo(() => {
    if (workLocation) return [workLocation.latitude, workLocation.longitude];
    if (gps.position) return [gps.position.latitude, gps.position.longitude];
    // default (HCM-ish)
    return [10.8231, 106.6297];
  }, [workLocation, gps.position]);

  const distanceMeters = useMemo(() => {
    if (!workLocation || !gps.position) return null;
    const { latitude, longitude } = gps.position;
    return haversineDistanceMeters(latitude, longitude, workLocation.latitude, workLocation.longitude);
  }, [workLocation, gps.position]);

  const isInsideRadius = useMemo(() => {
    if (!workLocation) return false;
    if (!workLocation.radius_meters) return true; // nếu chưa set radius thì bỏ kiểm tra
    if (distanceMeters == null) return false;
    return distanceMeters <= workLocation.radius_meters;
  }, [workLocation, distanceMeters]);

  const canCheckIn = !attendanceToday.checkInTime && !attendanceToday.checkOutTime;
  const canCheckOut = !!attendanceToday.checkInTime && !attendanceToday.checkOutTime;
  const isDone = !!attendanceToday.checkOutTime;

  const fetchSummary = async () => {
    if (!employeeId) return;
    setActionError('');
    try {
      const res = await fetch(`${API_BASE}/employee/attendance/summary/${employeeId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Lỗi lấy dữ liệu chấm công');

      setWorkLocation(json.data.workLocation);
      setAttendanceToday(json.data.attendanceToday);
    } catch (err) {
      setMessage('Không thể tải dữ liệu chấm công từ server.');
      setActionError(err.message || String(err));
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  // realtime GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setGps({
        status: 'error',
        position: null,
        errorMessage: 'Trình duyệt không hỗ trợ GPS.'
      });
      return;
    }

    const success = (pos) => {
      const lat = toNumberSafe(pos.coords.latitude);
      const lng = toNumberSafe(pos.coords.longitude);
      if (lat == null || lng == null) return;

      setGps({
        status: 'ready',
        position: { latitude: lat, longitude: lng },
        errorMessage: ''
      });
    };

    const error = (err) => {
      setGps({
        status: 'error',
        position: null,
        errorMessage:
          err?.message ||
          'Không thể lấy vị trí GPS. Vui lòng bật quyền truy cập vị trí cho trình duyệt.'
      });
    };

    watchIdRef.current = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    });

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Reset theo ngày: refetch định kỳ
  useEffect(() => {
    const t = setInterval(() => {
      fetchSummary();
    }, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  useEffect(() => {
    if (!workLocation) return;

    if (actionError) {
      setMessage(actionError);
      return;
    }

    if (isDone) {
      setMessage('Bạn đã checkout hôm nay.');
      return;
    }

    if (canCheckOut) {
      setMessage('Sẵn sàng checkout. Nhấn nút để kết thúc ca làm việc.');
      return;
    }

    if (!gps.position) {
      setMessage('Đang chờ vị trí GPS...');
      return;
    }

    if (workLocation.radius_meters && !isInsideRadius) {
      setMessage('Bạn đang ở ngoài vùng GPS cho phép.');
      return;
    }

    setMessage('Bạn chưa bắt đầu làm việc. Nhấn CHECK IN để bắt đầu ca.');
  }, [workLocation, gps.position, isInsideRadius, canCheckOut, canCheckIn, isDone, actionError]);

  const handleAttendanceAction = async () => {
    if (actionLoading) return;
    if (!employeeId) return;
    if (!gps.position) {
      setActionError('Chưa có GPS. Vui lòng bật quyền truy cập vị trí và thử lại.');
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      const endpoint = canCheckIn
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

      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Lỗi thực hiện chấm công');

      await fetchSummary();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const buttonVariant = isDone ? 'done' : canCheckOut ? 'checkout' : 'checkin';

  return (
    <div className="checkin-shell">
      <div className="checkin-map-wrapper">
        <MapContainer className="checkin-map" center={mapCenter} zoom={16} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {workLocation && (
            <>
              <Circle
                center={[workLocation.latitude, workLocation.longitude]}
                radius={workLocation.radius_meters || 0}
                pathOptions={{
                  color: '#16a34a',
                  weight: 2,
                  fillColor: '#16a34a',
                  fillOpacity: 0.12
                }}
              />
              <Marker position={[workLocation.latitude, workLocation.longitude]}>
                <Popup>
                  <div>
                    <strong>{workLocation.location_name || 'Work location'}</strong>
                    <div>Radius: {workLocation.radius_meters ? `${workLocation.radius_meters} m` : 'N/A'}</div>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {gps.position && (
            <Marker position={[gps.position.latitude, gps.position.longitude]}>
              <Popup>
                <div>
                  <strong>Vị trí hiện tại</strong>
                  {distanceMeters != null && (
                    <div>
                      Khoảng cách: {Number(distanceMeters.toFixed(0))} m
                      {workLocation?.radius_meters ? ` / ${workLocation.radius_meters} m` : ''}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Overlay: radar label */}
        <div className="checkin-radar-label">
          <div className="checkin-radar-title">Radar GPS</div>
          <div className="checkin-radar-sub">
            {workLocation?.radius_meters ? `${workLocation.radius_meters} m` : 'Chưa có radius'} •{' '}
            {gps.status === 'ready' ? 'Đang lấy vị trí' : 'Đang chờ GPS'}
          </div>
        </div>

        {/* Overlay: button */}
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
              disabled={!showAttendanceCard || actionLoading || isDone || !gps.position || (workLocation?.radius_meters && !isInsideRadius)}
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
                  ? `Bắt đầu checkout • Vào ca: ${formatTime(attendanceToday.checkInTime)}`
                  : `Bạn chưa bắt đầu làm việc`}
            </div>

            <div className="checkin-fab-subtext">
              {message}
            </div>
          </div>
      </div>
    </div>
  );
};

export default CheckIn;
