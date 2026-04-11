import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { LocationObjectCoords } from 'expo-location';
import { disconnectGeofenceSocket, getGeofenceSocket } from '@/services/geofenceSocket';

export type GeofenceLeaveWarningState = {
  message: string;
  graceMs: number;
  endsAt: number;
};

export type GeofenceToastState = {
  message: string;
  kind: 'success' | 'error';
};

type UseGeofenceTrackingOptions = {
  token: string | null;
  employeeId: string | null;
  /** Gọi sau auto check-in/out / attendance_changed để đồng bộ UI */
  onAttendanceSync: () => void | Promise<void>;
  /** Gọi khi token hết hạn để logout */
  onAuthError?: () => void;
};

/**
 * Socket geofencing khớp backend geofencingService.js:
 * authenticate_tracking, track_location, geofence_leave_warning, geofence_auto_checkin/out, tracking_error
 */
export function useGeofenceTracking({ token, employeeId, onAttendanceSync, onAuthError }: UseGeofenceTrackingOptions) {
  const [socketStatus, setSocketStatus] = useState<'off' | 'connecting' | 'authenticated' | 'error'>('off');
  const [leaveWarning, setLeaveWarning] = useState<GeofenceLeaveWarningState | null>(null);
  const [leaveCountdownSec, setLeaveCountdownSec] = useState(0);
  const [toast, setToast] = useState<GeofenceToastState | null>(null);
  /** Tọa độ realtime từ watchPositionAsync (dùng cho bản đồ / UI). */
  const [currentLocation, setCurrentLocation] = useState<LocationObjectCoords | null>(null);

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const onAttendanceSyncRef = useRef(onAttendanceSync);
  const employeeIdRef = useRef(employeeId);
  const onAuthErrorRef = useRef(onAuthError);
  /** Chỉ emit track_location sau khi authenticate_tracking thành công. */
  const trackingAuthRef = useRef(false);
  onAttendanceSyncRef.current = onAttendanceSync;
  employeeIdRef.current = employeeId;
  onAuthErrorRef.current = onAuthError;

  const showToast = useCallback((message: string, kind: GeofenceToastState['kind']) => {
    setToast({ message, kind });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const leaveCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearLeaveWarning = useCallback(() => {
    if (leaveCountdownIntervalRef.current) {
      clearInterval(leaveCountdownIntervalRef.current);
      leaveCountdownIntervalRef.current = null;
    }
    setLeaveWarning(null);
    setLeaveCountdownSec(0);
  }, []);

  const stopLocationWatch = useCallback(async () => {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    setCurrentLocation(null);
  }, []);

  const startLocationWatch = useCallback(async () => {
    await stopLocationWatch();
    trackingAuthRef.current = false;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Geofence] Không có quyền vị trí foreground');
      return;
    }

    const bg = await Location.requestBackgroundPermissionsAsync().catch(() => null);
    if (bg && bg.status !== 'granted') {
      console.warn('[Geofence] Background location chưa được cấp — chỉ theo dõi khi app mở');
    }

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 10_000,
      },
      (loc) => {
        const acc = loc.coords.accuracy;
        if (typeof acc === 'number' && acc > 40) {
          return;
        }

        const newLat = loc.coords.latitude;
        const newLng = loc.coords.longitude;
        const accOpt = acc ?? undefined;
        lastCoordsRef.current = {
          latitude: newLat,
          longitude: newLng,
          accuracy: accOpt,
        };
        setCurrentLocation(loc.coords);

        const s = getGeofenceSocket();
        const empId = employeeIdRef.current;
        if (!s.connected || !trackingAuthRef.current || !empId) return;

        s.emit('track_location', {
          user_id: empId,
          latitude: newLat,
          longitude: newLng,
          accuracy: accOpt,
          timestamp: Date.now(),
        });
      }
    );
    locationSubRef.current = sub;
  }, [stopLocationWatch]);

  const authenticate = useCallback(() => {
    const s = getGeofenceSocket();
    if (!token) return;
    setSocketStatus('connecting');
    s.emit('authenticate_tracking', { token }, (ack: { ok?: boolean; message?: string } | undefined) => {
      if (ack?.ok === false) {
        trackingAuthRef.current = false;
        setSocketStatus('error');
        console.warn('[Geofence] authenticate_tracking ack:', ack?.message);
        return;
      }
      trackingAuthRef.current = true;
      setSocketStatus('authenticated');
    });
  }, [token]);

  useEffect(() => {
    if (!token) {
      trackingAuthRef.current = false;
      void stopLocationWatch();
      disconnectGeofenceSocket();
      setSocketStatus('off');
      clearLeaveWarning();
      return;
    }

    void startLocationWatch();

    const s = getGeofenceSocket();

    const onConnect = () => {
      authenticate();
    };

    const onDisconnect = () => {
      trackingAuthRef.current = false;
      setSocketStatus((prev) => (prev === 'off' ? 'off' : 'connecting'));
    };

    const onTrackingAuthenticated = () => {
      trackingAuthRef.current = true;
      setSocketStatus('authenticated');
    };

    const onLeaveWarning = (payload: {
      message?: string;
      grace_ms?: number;
    }) => {
      const graceMs = typeof payload?.grace_ms === 'number' ? payload.grace_ms : 5 * 60 * 1000;
      const endsAt = Date.now() + graceMs;
      setLeaveWarning({
        message: payload?.message || 'Bạn đã ra khỏi vùng chấm công.',
        graceMs,
        endsAt,
      });
      setLeaveCountdownSec(Math.ceil(graceMs / 1000));
    };

    const onAutoCheckin = async (payload: { message?: string }) => {
      showToast(payload?.message || 'Đã tự động check-in.', 'success');
      await onAttendanceSyncRef.current();
    };

    const onAutoCheckout = async (payload: { message?: string }) => {
      showToast(payload?.message || 'Đã tự động check-out.', 'error');
      clearLeaveWarning();
      await onAttendanceSyncRef.current();
    };

    const onAttendanceChanged = (payload: { employee_id?: string | number }) => {
      const mine = employeeIdRef.current;
      if (mine == null || payload?.employee_id == null) return;
      if (String(payload.employee_id) !== String(mine)) return;
      void onAttendanceSyncRef.current();
    };

    const onTrackingError = (payload: { message?: string }) => {
      const msg = payload?.message || 'Lỗi theo dõi vị trí';
      console.warn('[Geofence] tracking_error:', msg);
      showToast(msg, 'error');
      if (/token|jwt|hết hạn|expired|xác thực/i.test(msg)) {
        trackingAuthRef.current = false;
        setSocketStatus('error');
        onAuthErrorRef.current?.();
      }
    };

    const onOutOfZoneStatus = (payload: { secondsRemaining?: number | null }) => {
      if (payload?.secondsRemaining == null) {
        clearLeaveWarning();
        return;
      }
      const r = Number(payload.secondsRemaining);
      if (Number.isFinite(r)) {
        setLeaveCountdownSec(Math.ceil(r));
      }
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('tracking_authenticated', onTrackingAuthenticated);
    s.on('geofence_leave_warning', onLeaveWarning);
    s.on('out_of_zone_status', onOutOfZoneStatus);
    s.on('geofence_auto_checkin', onAutoCheckin);
    s.on('geofence_auto_checkout', onAutoCheckout);
    s.on('tracking_error', onTrackingError);
    s.on('attendance_changed', onAttendanceChanged);

    if (!s.connected) {
      s.connect();
    } else {
      authenticate();
    }

    return () => {
      trackingAuthRef.current = false;
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('tracking_authenticated', onTrackingAuthenticated);
      s.off('geofence_leave_warning', onLeaveWarning);
      s.off('out_of_zone_status', onOutOfZoneStatus);
      s.off('geofence_auto_checkin', onAutoCheckin);
      s.off('geofence_auto_checkout', onAutoCheckout);
      s.off('tracking_error', onTrackingError);
      s.off('attendance_changed', onAttendanceChanged);
      void stopLocationWatch();
      disconnectGeofenceSocket();
      setSocketStatus('off');
    };
  }, [token, authenticate, startLocationWatch, stopLocationWatch, clearLeaveWarning, showToast]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (leaveCountdownIntervalRef.current) {
      clearInterval(leaveCountdownIntervalRef.current);
      leaveCountdownIntervalRef.current = null;
    }
    if (!leaveWarning) return;
    const tick = () => {
      const sec = Math.max(0, Math.ceil((leaveWarning.endsAt - Date.now()) / 1000));
      setLeaveCountdownSec(sec);
      if (sec <= 0) clearLeaveWarning();
    };
    tick();
    leaveCountdownIntervalRef.current = setInterval(tick, 1000);
    return () => {
      if (leaveCountdownIntervalRef.current) {
        clearInterval(leaveCountdownIntervalRef.current);
        leaveCountdownIntervalRef.current = null;
      }
    };
  }, [leaveWarning, clearLeaveWarning]);

  return {
    geofenceSocketStatus: socketStatus,
    geofenceLeaveWarning: leaveWarning,
    geofenceLeaveCountdownSec: leaveCountdownSec,
    clearGeofenceLeaveWarning: clearLeaveWarning,
    geofenceToast: toast,
    dismissGeofenceToast: dismissToast,
    currentLocation,
  };
}
