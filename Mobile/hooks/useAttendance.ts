import { API_URL } from "@/config/env";
import { useGeofenceTracking } from "@/hooks/useGeofenceTracking";
import { getGeofenceSocket } from "@/services/geofenceSocket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

/** Đếm ngược khi chưa có geofence_leave_warning từ server (fallback). */
const GRACE_LEAVE_SEC = 5 * 60;

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const useAttendance = () => {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userToken, setUserToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [workLocation, setWorkLocation] = useState<any>(null);
  const [workLocations, setWorkLocations] = useState<any[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const isValidTimeValue = (value: any) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") {
      const s = value.trim();
      if (s === "" || s.toLowerCase() === "null" || s === "--:--") return false;
    }
    return true;
  };

  const formatHoursDecimalToHHMM = (value: any): string | null => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") {
      const s = value.trim();
      if (/^\d{1,2}:\d{2}$/.test(s)) return s.padStart(5, "0");
      const parsed = parseFloat(s);
      if (Number.isNaN(parsed)) return null;
      value = parsed;
    }
    if (typeof value !== "number" || Number.isNaN(value)) return null;

    const totalMs = Math.max(0, value * 3600000);
    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  const totalWorkHours = useMemo(() => {
    const hasIn = isValidTimeValue(attendanceToday?.check_in_time);
    const hasOut = isValidTimeValue(attendanceToday?.check_out_time);

    if (!hasIn) return "--:--";

    if (hasOut) {
      const backendTotal = attendanceToday?.total_work_hours;
      const formatted = formatHoursDecimalToHHMM(backendTotal);
      if (formatted) return formatted;

      const startMs = new Date(attendanceToday?.check_in_time).getTime();
      const endMs = new Date(attendanceToday?.check_out_time).getTime();
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "--:--";

      const diffMs = Math.max(0, endMs - startMs);
      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    }

    const startMs = new Date(attendanceToday.check_in_time).getTime();
    const nowMs = currentTime.getTime();
    if (Number.isNaN(startMs)) return "--:--";

    const diffMs = Math.max(0, nowMs - startMs);
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }, [attendanceToday, currentTime]);

  const isPunchedIn = useMemo(() => {
    const hasIn = isValidTimeValue(attendanceToday?.check_in_time);
    const hasOut = isValidTimeValue(attendanceToday?.check_out_time);
    return hasIn && !hasOut;
  }, [attendanceToday]);

  const fetchSummary = useCallback(async (empId: string) => {
    try {
      const res = await axios.get(
        `${API_URL}/employee/attendance/summary/${empId}`,
      );
      const payload = res.data;
      const data = payload?.data ?? payload;

      const workLoc = data?.workLocation ?? data?.work_location ?? null;
      const workLocs = data?.workLocations ?? data?.work_locations ?? (workLoc ? [workLoc] : []);

      const attendance =
        data?.attendanceToday ??
        data?.attendance_today ??
        data?.attendance ??
        null;

      setWorkLocation(workLoc);
      setWorkLocations(workLocs);

      const normalizedAttendance = attendance
        ? {
            ...attendance,
            attendance_date: attendance?.attendance_date ?? null,
            check_in_time:
              attendance?.check_in_time ?? attendance?.checkInTime ?? null,
            check_out_time:
              attendance?.check_out_time ?? attendance?.checkOutTime ?? null,
            check_in_latitude:
              attendance?.check_in_latitude ??
              attendance?.checkInLatitude ??
              null,
            check_in_longitude:
              attendance?.check_in_longitude ??
              attendance?.checkInLongitude ??
              null,
            check_out_latitude:
              attendance?.check_out_latitude ??
              attendance?.checkOutLatitude ??
              null,
            check_out_longitude:
              attendance?.check_out_longitude ??
              attendance?.checkOutLongitude ??
              null,
            status: attendance?.status ?? null,
            total_work_hours:
              attendance?.total_work_hours ??
              attendance?.totalWorkHours ??
              null,
          }
        : null;

      setAttendanceToday(normalizedAttendance);
    } catch (e) {
      console.log("Lỗi fetchSummary:", e);
    }
  }, []);

  const fetchCurrentLocation = useCallback(async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    let loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    setLocation(loc.coords);
  }, []);

  const syncAttendanceFromServer = useCallback(async () => {
    if (employeeId) await fetchSummary(employeeId);
  }, [employeeId, fetchSummary]);

  const {
    geofenceSocketStatus,
    geofenceLeaveWarning,
    geofenceLeaveCountdownSec,
    clearGeofenceLeaveWarning,
    geofenceToast,
    dismissGeofenceToast,
    currentLocation: geofenceCurrentLocation,
  } = useGeofenceTracking({
    token: userToken,
    employeeId,
    onAttendanceSync: syncAttendanceFromServer,
  });

  useEffect(() => {
    if (geofenceCurrentLocation) {
      setLocation(geofenceCurrentLocation);
    }
  }, [geofenceCurrentLocation]);

  const liveCoords = useMemo(
    () => geofenceCurrentLocation ?? location,
    [geofenceCurrentLocation, location],
  );

  const distanceToWorkCenterM = useMemo(() => {
    if (!liveCoords || workLocations.length === 0) return null;
    let minDistance = Infinity;
    for (const wl of workLocations) {
      if (!wl.latitude || !wl.longitude) continue;
      const d = haversineDistance(
        liveCoords.latitude,
        liveCoords.longitude,
        Number(wl.latitude),
        Number(wl.longitude),
      );
      if (d < minDistance) minDistance = d;
    }
    if (minDistance === Infinity) {
      if (workLocation) {
        return haversineDistance(
          liveCoords.latitude,
          liveCoords.longitude,
          Number(workLocation.latitude),
          Number(workLocation.longitude),
        );
      }
      return null;
    }
    return minDistance;
  }, [liveCoords, workLocation, workLocations]);

  const [zoneBlocksPunch, setZoneBlocksPunch] = useState(true);

  /** State để ngăn spam thông báo push khi ra ngoài vùng. */
  const [hasNotified, setHasNotified] = useState(false);

  /** Số lần đọc GPS liên tiếp xác nhận đang ngoài vùng (debounce cảnh báo). */
  const [outOfZonePings, setOutOfZonePings] = useState(0);
  const [debouncedLeaveSeconds, setDebouncedLeaveSeconds] = useState(0);
  const [leaveOverlayDismissed, setLeaveOverlayDismissed] = useState(false);
  const leaveLocalTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopLocalLeaveCountdown = useCallback(() => {
    if (leaveLocalTickRef.current) {
      clearInterval(leaveLocalTickRef.current);
      leaveLocalTickRef.current = null;
    }
    setDebouncedLeaveSeconds(0);
  }, []);

  useEffect(() => {
    const pos = geofenceCurrentLocation ?? location;
    if (!pos || (workLocations.length === 0 && !workLocation)) {
      setZoneBlocksPunch(true);
      return;
    }
    const locationsToCheck = workLocations.length > 0 ? workLocations : (workLocation ? [workLocation] : []);
    let anyInside = false;
    for (const wl of locationsToCheck) {
      const r = wl.radius_meters;
      if (r == null || Number(r) <= 0) {
        anyInside = true;
        break;
      }
      const d = haversineDistance(
        pos.latitude,
        pos.longitude,
        Number(wl.latitude),
        Number(wl.longitude),
      );
      if (d <= Number(r)) {
        anyInside = true;
        break;
      }
    }
    setZoneBlocksPunch(!anyInside);
  }, [geofenceCurrentLocation, location, workLocation, workLocations]);

  const gpsSig = useMemo(() => {
    if (!liveCoords) return "";
    return `${liveCoords.latitude.toFixed(6)}|${liveCoords.longitude.toFixed(6)}`;
  }, [liveCoords]);

  useEffect(() => {
    if (!isPunchedIn || (!workLocation && workLocations.length === 0) || !liveCoords) {
      setOutOfZonePings(0);
      stopLocalLeaveCountdown();
      setLeaveOverlayDismissed(false);
      clearGeofenceLeaveWarning();
      return;
    }
    if (!gpsSig) {
      setOutOfZonePings(0);
      stopLocalLeaveCountdown();
      clearGeofenceLeaveWarning();
      return;
    }
    const locationsToCheck = workLocations.length > 0 ? workLocations : (workLocation ? [workLocation] : []);
    let anyInside = false;
    for (const wl of locationsToCheck) {
      const r = wl.radius_meters;
      if (r == null || Number(r) <= 0) {
        anyInside = true; break;
      }
      const d = haversineDistance(
        liveCoords.latitude,
        liveCoords.longitude,
        Number(wl.latitude),
        Number(wl.longitude),
      );
      if (d <= Number(r)) {
        anyInside = true; break;
      }
    }
    if (anyInside) {
      setOutOfZonePings(0);
      stopLocalLeaveCountdown();
      setLeaveOverlayDismissed(false);
      clearGeofenceLeaveWarning();
      return;
    }
    setOutOfZonePings((p) => p + 1);
  }, [
    gpsSig,
    liveCoords,
    workLocation,
    workLocations,
    isPunchedIn,
    clearGeofenceLeaveWarning,
    stopLocalLeaveCountdown,
  ]);

  /** Cảnh báo local push khi ra khỏi bán kính (một lần mỗi lần “ra → vào → ra”). */
  useEffect(() => {
    if (!isPunchedIn) {
      setHasNotified(false);
      return;
    }
    if (!liveCoords || !workLocation) {
      setHasNotified(false);
      return;
    }
    const r = workLocation.radius_meters;
    if (r == null || Number(r) <= 0) {
      setHasNotified(false);
      return;
    }
    if (!zoneBlocksPunch) {
      setHasNotified(false);
      return;
    }
    if (!hasNotified) {
      void Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Cảnh báo vị trí!",
          body: "Bạn đã ra khỏi khu vực chấm công. Vui lòng quay lại ngay để không bị hệ thống tự động Check-out.",
          sound: true,
        },
        trigger: null,
      });
      setHasNotified(true);
    }
  }, [isPunchedIn, zoneBlocksPunch, hasNotified, liveCoords, workLocation]);

  useEffect(() => {
    if (
      !isPunchedIn ||
      !zoneBlocksPunch ||
      outOfZonePings < 2 ||
      leaveOverlayDismissed
    )
      return;
    if (geofenceLeaveWarning) return;
    if (leaveLocalTickRef.current) return;
    setDebouncedLeaveSeconds(GRACE_LEAVE_SEC);
    leaveLocalTickRef.current = setInterval(() => {
      setDebouncedLeaveSeconds((s) => {
        if (s <= 1) {
          if (leaveLocalTickRef.current) {
            clearInterval(leaveLocalTickRef.current);
            leaveLocalTickRef.current = null;
          }
          setTimeout(() => {
            void forceAutoCheckout();
          }, 100);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [
    outOfZonePings,
    isPunchedIn,
    zoneBlocksPunch,
    geofenceLeaveWarning,
    leaveOverlayDismissed,
  ]);

  useEffect(() => {
    if (geofenceLeaveWarning) {
      stopLocalLeaveCountdown();
    }
  }, [geofenceLeaveWarning, stopLocalLeaveCountdown]);

  const dismissLeaveZoneUi = useCallback(() => {
    setLeaveOverlayDismissed(true);
    clearGeofenceLeaveWarning();
    stopLocalLeaveCountdown();
  }, [clearGeofenceLeaveWarning, stopLocalLeaveCountdown]);

  const showLeaveZoneOverlay =
    isPunchedIn &&
    outOfZonePings >= 2 &&
    zoneBlocksPunch &&
    !leaveOverlayDismissed &&
    (geofenceLeaveWarning != null || debouncedLeaveSeconds > 0);

  const leaveZoneUiSeconds = geofenceLeaveWarning
    ? geofenceLeaveCountdownSec
    : debouncedLeaveSeconds;

  const isInsideZone = useMemo(() => {
    if (!liveCoords || (workLocations.length === 0 && !workLocation)) return false;
    const locationsToCheck = workLocations.length > 0 ? workLocations : (workLocation ? [workLocation] : []);
    let requiresCheck = false;
    for (const wl of locationsToCheck) {
      const r = wl.radius_meters;
      if (r == null || Number(r) <= 0) return true;
      requiresCheck = true;
    }
    if (!requiresCheck) return true;
    return !zoneBlocksPunch;
  }, [liveCoords, workLocation, workLocations, zoneBlocksPunch]);

  useEffect(() => {
    if (!userToken || !employeeId) return;
    const s = getGeofenceSocket();
    const onAdminLoc = () => {
      console.log(
        "🔄 [Mobile] admin_locations_updated — tải lại cấu hình vùng",
      );
      void fetchSummary(employeeId);
    };
    const onPersonalEvent = (data: any) => {
      if (data.action === "AUTO_CHECKOUT") {
        Alert.alert(
          "Auto Checkout",
          "Bạn đã bị tự động checkout vì rời khỏi vùng quá lâu.",
        );
        void syncAttendanceFromServer();
      }
    };
    s.on("admin_locations_updated", onAdminLoc);
    s.on("personal_event_" + employeeId, onPersonalEvent);
    return () => {
      s.off("admin_locations_updated", onAdminLoc);
      s.off("personal_event_" + employeeId, onPersonalEvent);
    };
  }, [userToken, employeeId, fetchSummary, syncAttendanceFromServer]);

  useEffect(() => {
    const checkStatus = async () => {
      const token = await AsyncStorage.getItem("userToken");
      const empId = await AsyncStorage.getItem("employeeId");
      const name = await AsyncStorage.getItem("userName");
      if (token && empId) {
        setUserToken(token);
        setEmployeeId(empId);
        setUserName(name || "Nhân viên");
        void fetchCurrentLocation();
        void fetchSummary(empId);
      }
    };
    checkStatus();
  }, [fetchCurrentLocation, fetchSummary]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async () => {
    if (!username || !password)
      return Alert.alert("Lỗi", "Vui lòng nhập đủ tài khoản");
    setLoading(true);
    try {
      console.log("📤 [FRONTEND] Bắt đầu gọi API đăng nhập tới:", API_URL);
      const res = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      });
      if (res.data?.require_pass_change) {
        Alert.alert(
          "Đổi mật khẩu",
          res.data?.message ||
            "Vui lòng đổi mật khẩu trên web trước khi dùng app.",
        );
        return;
      }
      const { token, user } = res.data;
      const idStr = String(user.id);
      await AsyncStorage.multiSet([
        ["userToken", token],
        ["employeeId", idStr],
        ["userName", user.name],
      ]);
      setUserToken(token);
      setEmployeeId(idStr);
      setUserName(user.name);
      await fetchSummary(idStr);
      fetchCurrentLocation();
    } catch (error: any) {
      console.log(
        "❌ [FRONTEND] Lỗi đăng nhập:",
        error?.response?.data || error?.message,
      );
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Đăng nhập thất bại";
      Alert.alert("Lỗi", String(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type: "checkin" | "checkout") => {
    if (!location) return Alert.alert("Lỗi", "Chưa xác định được vị trí GPS");
    if (!employeeId) return Alert.alert("Lỗi", "Chưa xác định được nhân viên");
    const r = workLocation?.radius_meters;
    if (r != null && Number(r) > 0 && zoneBlocksPunch) {
      return Alert.alert(
        "Ngoài vùng chấm công",
        "Vui lòng vào đúng bán kính địa điểm đã cấu hình.",
      );
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/employee/attendance/${type}/${employeeId}`,
        { latitude: location.latitude, longitude: location.longitude },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      const successRaw = res.data?.success;
      const success =
        successRaw === true ||
        successRaw === 1 ||
        (typeof successRaw === "string" &&
          successRaw.toLowerCase() === "true") ||
        res.data?.status === "success";

      if (success) {
        Alert.alert("Thành công", res.data.message);
        await fetchSummary(employeeId);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Thao tác thất bại");
    } finally {
      setLoading(false);
    }
  };

  const forceAutoCheckout = async () => {
    if (!location) return;
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/employee/attendance/checkout/${employeeId}`,
        { latitude: location.latitude, longitude: location.longitude },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      const successRaw = res.data?.success;
      const success =
        successRaw === true ||
        successRaw === 1 ||
        (typeof successRaw === "string" &&
          successRaw.toLowerCase() === "true") ||
        res.data?.status === "success";

      if (success) {
        Alert.alert(
          "Auto Check-out",
          "Hệ thống đã tự động Check-out do bạn rời vị trí quá 5 phút.",
        );
        dismissLeaveZoneUi();
        await fetchSummary(employeeId);
      }
    } catch (error: any) {
      console.log(
        "❌ [FRONTEND] Auto checkout thất bại:",
        error?.response?.data || error?.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    setUserToken(null);
    setEmployeeId(null);
    setAttendanceToday(null);
    setLocation(null);
  };

  return {
    employeeId,
    userName,
    userToken,
    username,
    setUsername,
    password,
    setPassword,
    loading,
    location,
    currentLocation: geofenceCurrentLocation ?? location,
    workLocation,
    workLocations,
    attendanceToday,
    currentTime,
    isInsideZone,
    totalWorkHours,
    distanceToWorkCenterM,
    isPunchedIn,
    zoneBlocksPunch,
    outOfZonePings,
    handleLogin,
    handleAction,
    handleLogout,
    geofenceSocketStatus,
    geofenceLeaveWarning,
    geofenceLeaveCountdownSec,
    clearGeofenceLeaveWarning,
    geofenceToast,
    dismissGeofenceToast,
    showLeaveZoneOverlay,
    leaveZoneUiSeconds,
    dismissLeaveZoneUi,
    haversineDistance,
  };
};
