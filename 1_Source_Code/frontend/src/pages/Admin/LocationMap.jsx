import React, { useEffect, useRef } from 'react';
// CHỈ IMPORT LEAFLET GỐC, KHÔNG DÙNG REACT-LEAFLET NỮA
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix lỗi icon Marker kinh điển
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const LocationMap = ({ lat, lng, radius }) => {
    // Dùng useRef để giữ thẻ <div> và các đối tượng bản đồ mà không gây re-render
    const mapContainerRef = useRef(null);
    const mapInstance = useRef(null);
    const markerInstance = useRef(null);
    const circleInstance = useRef(null);

    useEffect(() => {
        // Xử lý dữ liệu đầu vào
        const currentLat = Number(lat) || 21.0285;
        const currentLng = Number(lng) || 105.8542;
        const currentRadius = Number(radius) || 100;
        const position = [currentLat, currentLng];

        // 1. NẾU BẢN ĐỒ CHƯA ĐƯỢC TẠO -> KHỞI TẠO LẦN ĐẦU
        if (!mapInstance.current) {
            // Tạo bản đồ bám vào thẻ div có ref={mapContainerRef}
            mapInstance.current = L.map(mapContainerRef.current).setView(position, 16);

            // Nạp lớp bản đồ từ OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(mapInstance.current);

            // Gắn Marker (Ghim)
            markerInstance.current = L.marker(position).addTo(mapInstance.current);

            // Gắn Circle (Vòng tròn bán kính)
            circleInstance.current = L.circle(position, {
                color: '#0EA5E9',
                fillColor: '#0EA5E9',
                fillOpacity: 0.2,
                radius: currentRadius
            }).addTo(mapInstance.current);
        } 
        // 2. NẾU BẢN ĐỒ ĐÃ CÓ -> CHỈ CẬP NHẬT TỌA ĐỘ VÀ BÁN KÍNH
        else {
            mapInstance.current.flyTo(position, 16);
            markerInstance.current.setLatLng(position);
            circleInstance.current.setLatLng(position);
            circleInstance.current.setRadius(currentRadius);
        }

        // Cleanup function (Dọn dẹp khi chuyển trang khác để chống rò rỉ bộ nhớ)
        return () => {
            // Không xóa map instance ở đây để tránh lỗi nhấp nháy khi nhập liệu
        };
    }, [lat, lng, radius]); // Hàm này sẽ chạy lại mỗi khi lat, lng hoặc radius thay đổi

    // Giao diện chỉ cần một thẻ div trống, Leaflet sẽ tự vẽ bản đồ vào đây
    return <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />;
};

export default LocationMap;