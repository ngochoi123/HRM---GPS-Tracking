import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet, View, Text } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

export type LocationMapProps = {
  currentLat: number;
  currentLng: number;
  officeLat: number;
  officeLng: number;
  radiusMeters: number;
  workLocations?: any[];
  /** Chiều cao cố định (px). Nếu không truyền, component `flex: 1` để lấp parent (vd. trong Modal). */
  height?: number;
};

const isValidCoord = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** Vùng nhìn bám nhân viên + geofence — dùng khi parent cần `animateToRegion`. */
export function buildMapFollowRegion(lat: number, lng: number, radiusM: number): Region {
  const r = Number.isFinite(radiusM) && radiusM > 0 ? radiusM : 100;
  const latDelta = Math.max((r / 111_000) * 4, 0.006);
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngDelta = Math.max(latDelta / (cosLat > 0.2 ? cosLat : 0.2), 0.006);
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/**
 * Bản đồ vùng chấm công: Google Maps (Android) / Apple Maps (iOS).
 * Camera trượt theo user qua `animateCamera` khi `currentLat`/`currentLng` đổi.
 */
export const LocationMap = forwardRef<MapView, LocationMapProps>(function LocationMap(
  { currentLat, currentLng, officeLat, officeLng, radiusMeters, workLocations, height },
  ref
) {
  const mapRef = useRef<MapView | null>(null);
  useImperativeHandle(ref, () => mapRef.current as MapView, []);
  /** Bật tạm khi tọa đổi để Marker custom vẽ lại đúng (Android/Google Maps). */
  const [trackUserMarker, setTrackUserMarker] = useState(true);

  const userOk = isValidCoord(currentLat, currentLng);
  const locationsToDraw = workLocations && workLocations.length > 0 ? workLocations : (isValidCoord(officeLat, officeLng) ? [{ latitude: officeLat, longitude: officeLng, radius_meters: radiusMeters, location_name: 'Văn phòng' }] : []);
  const officeOk = locationsToDraw.length > 0;
  const radius = Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : 100;
  const fillParent = height == null;

  useEffect(() => {
    if (!userOk) return;
    mapRef.current?.animateCamera(
      {
        center: { latitude: currentLat, longitude: currentLng },
        pitch: 0,
      },
      { duration: 450 }
    );
  }, [currentLat, currentLng, userOk]);

  useEffect(() => {
    if (!userOk) return;
    setTrackUserMarker(true);
    const id = setTimeout(() => setTrackUserMarker(false), 600);
    return () => clearTimeout(id);
  }, [currentLat, currentLng, userOk]);

  if (!userOk || !officeOk) {
    return (
      <View style={[styles.fallback, fillParent ? styles.fallbackFlex : { height }]}>
        <Text style={styles.fallbackText}>Đang chờ tọa độ GPS / văn phòng…</Text>
      </View>
    );
  }

  const initialRegion = buildMapFollowRegion(currentLat, currentLng, radius);

  return (
    <View style={[styles.wrap, fillParent ? styles.wrapFlex : { height }]}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        mapType="standard"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsIndoors={false}
        toolbarEnabled={false}
        rotateEnabled
        pitchEnabled={false}
      >
        {locationsToDraw.map((loc, idx) => {
          const lat = Number(loc.latitude);
          const lng = Number(loc.longitude);
          const r = loc.radius_meters ? Number(loc.radius_meters) : 100;
          if (!isValidCoord(lat, lng)) return null;
          return (
            <React.Fragment key={loc.work_location_id || idx}>
              <Circle
                center={{ latitude: lat, longitude: lng }}
                radius={r}
                strokeColor="rgba(16, 185, 129, 0.5)"
                fillColor="rgba(16, 185, 129, 0.15)"
                strokeWidth={2}
              />
              <Marker
                coordinate={{ latitude: lat, longitude: lng }}
                title={loc.location_name || "Văn phòng"}
                zIndex={1}
              />
            </React.Fragment>
          );
        })}
        {/* Chấm xanh: vị trí bạn — coordinate cập nhật theo GPS realtime từ parent */}
        <Marker
          coordinate={{ latitude: currentLat, longitude: currentLng }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={20}
          title="Bạn đang ở đây"
          tracksViewChanges={trackUserMarker}
        >
          <View style={styles.userLocationContainer} collapsable={false}>
            <View style={styles.userLocationPulse} />
            <View style={styles.userLocationDot} />
          </View>
        </Marker>
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  wrapFlex: {
    flex: 1,
    minHeight: 200,
    alignSelf: 'stretch',
  },
  fallback: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fallbackFlex: {
    flex: 1,
    minHeight: 200,
    alignSelf: 'stretch',
  },
  fallbackText: { fontSize: 13, color: '#64748b', fontWeight: '600', textAlign: 'center' },
  userLocationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  userLocationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
});
