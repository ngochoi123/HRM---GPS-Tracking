import React, { useState, useEffect, useCallback } from 'react';
// 🔥 BƯỚC 1: Đổi tên Map thành MapIcon ở đây
import { MapPin, Wifi, Save, Navigation, Trash2, Plus, Edit2, CheckCircle, Map as MapIcon } from 'lucide-react';
import LocationMap from './LocationMap';
import axios from 'axios';
import toast from 'react-hot-toast';
const LocationSettings = () => {
    const [locations, setLocations] = useState([]);
    const [selectedLoc, setSelectedLoc] = useState(null);
    const [ipInput, setIpInput] = useState('');
    const [branches, setBranches] = useState([]);

    const handleAddNewLocation = useCallback(() => {
        const newId = Date.now();
        const newLocation = {
            id: newId,
            branch_id: '',
            location_name: 'Khu vực mới',
            branch_name: 'Chưa gắn chi nhánh',
            address: 'Chưa cập nhật',
            latitude: 21.028511,
            longitude: 105.804817,
            radius_meters: 100,
            allowed_ips: [],
            is_active: false,
            gps_status: false,
            wifi_status: false,
            type: 'branch',
            isNew: true
        };
        setLocations(prev => [newLocation, ...prev]);
        setSelectedLoc(newLocation);
    }, []);

    // 🛠️ 1. GỌI API LẤY DANH SÁCH TỪ DATABASE
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/admin/locations');
                const apiData = res.data.data || res.data;

                if (apiData && apiData.length > 0) {
                    const uniqueBranches = [];
                    const duplicateFilterMap = new Map();
                    for (const item of apiData) {
                        if (!duplicateFilterMap.has(item.id)) {
                            duplicateFilterMap.set(item.id, true);
                            uniqueBranches.push({ id: item.id, branch_name: item.branch_name });
                        }
                    }
                    setBranches(uniqueBranches);

                    const formattedLocations = apiData.map(item => ({
                        id: item.work_location_id || `temp_${item.id}`,
                        work_location_id: item.work_location_id,
                        branch_id: item.id,
                        location_name: item.location_name || 'Chưa đặt tên khu vực',
                        branch_name: item.branch_name || 'Chi nhánh chưa rõ',
                        address: item.address || 'Chưa cập nhật',
                        latitude: Number(item.latitude) || null,
                        longitude: Number(item.longitude) || null,
                        radius_meters: Number(item.radius_meters) || 100,
                        allowed_ips: Array.isArray(item.allowed_ips) ? item.allowed_ips :
                            (typeof item.allowed_ips === 'string' ? JSON.parse(item.allowed_ips) : []),
                        is_active: item.is_active !== undefined ? item.is_active : true,
                        gps_status: !!item.latitude,
                        wifi_status: item.allowed_ips && item.allowed_ips.length > 0,
                        type: item.type || 'branch',
                        isNew: false
                    }));

                    setLocations(formattedLocations);
                    setSelectedLoc(formattedLocations[0]);
                } else {
                    handleAddNewLocation();
                }
            } catch (error) {
                console.error("Lỗi lấy dữ liệu từ DB:", error);
            }
        };
        fetchLocations();
    }, [handleAddNewLocation]);

const handleSaveConfig = async () => {
    if (!selectedLoc || !selectedLoc.branch_id) {
        toast.error("Vui lòng chọn một chi nhánh từ danh sách để gắn khu vực này!", { duration: 4000 });
        return; 
    }

    const basePayload = {
        location_name: selectedLoc.location_name,
        location_type: selectedLoc.type || 'branch',
        latitude: selectedLoc.latitude,
        longitude: selectedLoc.longitude,
        radius_meters: selectedLoc.radius_meters,
        is_active: selectedLoc.is_active,
        allowed_ips: JSON.stringify(selectedLoc.allowed_ips || []),
    };

    try {
        if (selectedLoc.isNew) {
            const payload = {
                ...basePayload,
                branch_id: selectedLoc.branch_id
            };
            const res = await axios.post('http://localhost:5000/api/admin/locations', payload);
            alert("✅ Đã THÊM MỚI khu vực thành công!");
            
            updateField('isNew', false);
            
            const newWorkLocId = res.data?.data?.work_location_id;
            if (newWorkLocId) {
                updateField('work_location_id', newWorkLocId);
                updateField('id', newWorkLocId); 
            }
        } else {
            const payload = {
                ...basePayload,
                work_location_id: selectedLoc.work_location_id,
                branch_id: selectedLoc.branch_id
            };
            await axios.put(`http://localhost:5000/api/admin/locations/${selectedLoc.branch_id}/settings`, payload);
            alert("✅ Đã CẬP NHẬT toàn bộ cấu hình thành công!");
        }
    } catch (error) {
        console.error("Lỗi khi lưu:", error);
        const errorMsg = error.response?.data?.message || "Lỗi khi lưu vào Database!";
        alert(`❌ ${errorMsg}`);
    }
};

    const updateField = (field, value) => {
        const updatedLoc = { ...selectedLoc, [field]: value };
        setSelectedLoc(updatedLoc);
        setLocations(locations.map(loc => loc.id === updatedLoc.id ? updatedLoc : loc));
    };

const handleDeleteLocation = async () => {
        // 1. Nếu là khu vực mới (chưa lưu vào DB) -> Chỉ cần xóa khỏi danh sách UI
        if (selectedLoc.isNew) {
            const updatedList = locations.filter(loc => loc.id !== selectedLoc.id);
            setLocations(updatedList);
            if (updatedList.length > 0) {
                setSelectedLoc(updatedList[0]);
            } else {
                handleAddNewLocation();
            }
            return;
        }

        // 2. YÊU CẦU NHẬP ĐÚNG TÊN ĐỂ XÁC NHẬN XÓA
        const locationNameToDelete = selectedLoc.location_name;
        const userInput = window.prompt(
            `CẢNH BÁO BẢO MẬT:\nBạn đang chuẩn bị xóa khu vực "${locationNameToDelete}".\n\nHành động này không thể hoàn tác! Vui lòng nhập chính xác tên khu vực ("${locationNameToDelete}") để xác nhận xóa:`
        );

        // 3. KIỂM TRA ĐIỀU KIỆN
        if (userInput === null) {
            return; // Người dùng bấm Hủy (Cancel)
        }
        if (userInput.trim() !== locationNameToDelete) {
            alert(`❌ Xóa thất bại!\nTên bạn nhập ("${userInput}") không khớp với "${locationNameToDelete}".`);
            return;
        }

        // 4. NẾU NHẬP ĐÚNG -> GỌI API XÓA
        try {
            const res = await axios.delete(`http://localhost:5000/api/admin/locations/${selectedLoc.work_location_id}/work-location`);
            
            if (res.data.success) {
                alert("✅ Đã xóa khu vực chấm công thành công!");
                
                // Cập nhật lại UI: Lọc bỏ khu vực vừa xóa
                const updatedList = locations.filter(loc => loc.work_location_id !== selectedLoc.work_location_id);
                setLocations(updatedList);
                
                // Đưa form bên phải về trạng thái trắng hoặc chọn khu vực khác
                if (updatedList.length > 0) {
                    setSelectedLoc(updatedList[0]);
                } else {
                    handleAddNewLocation();
                }
            }
        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            alert("❌ Xóa thất bại! Vui lòng thử lại.");
        }
    };

const handleAddIp = () => {
    if (!ipInput.trim()) return;

    // Kiểm tra định dạng IP cơ bản (Regex)
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ipInput.trim())) {
        alert("❌ Định dạng IP không hợp lệ (Ví dụ: 192.168.1.1)");
        return;
    }

    // Kiểm tra trùng lặp trong danh sách hiện tại
    if (selectedLoc.allowed_ips.includes(ipInput.trim())) {
        alert("⚠️ IP này đã tồn tại trong danh sách!");
        return;
    }

    // Cập nhật State cho selectedLoc
    const updatedIps = [...selectedLoc.allowed_ips, ipInput.trim()];
    const updatedLoc = { ...selectedLoc, allowed_ips: updatedIps };
    
    setSelectedLoc(updatedLoc);

    // Cập nhật lại vào danh sách tổng (locations) để đồng bộ UI bên trái
    setLocations(prev => prev.map(loc => 
        (loc.work_location_id === selectedLoc.work_location_id && loc.id === selectedLoc.id) 
        ? updatedLoc 
        : loc
    ));

    setIpInput(''); // Xóa ô nhập liệu
};

const handleRemoveIp = (ipToRemove) => {
    // Lọc bỏ IP được chọn
    const updatedIps = selectedLoc.allowed_ips.filter(ip => ip !== ipToRemove);
    const updatedLoc = { ...selectedLoc, allowed_ips: updatedIps };

    setSelectedLoc(updatedLoc);

    // Đồng bộ lại danh sách tổng để UI cập nhật ngay lập tức
    setLocations(prev => prev.map(loc => 
        (loc.work_location_id === selectedLoc.work_location_id && loc.id === selectedLoc.id) 
        ? updatedLoc 
        : loc
    ));
};

    const handleGetGPS = () => {
    if (!navigator.geolocation) {
        return alert("Trình duyệt của bạn không hỗ trợ định vị GPS!");
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            // 1. Cập nhật State
            const updatedLoc = { 
                ...selectedLoc, 
                latitude: pos.coords.latitude, 
                longitude: pos.coords.longitude, 
                gps_status: true 
            };
            setSelectedLoc(updatedLoc);
            setLocations(prevLocations => prevLocations.map(loc => loc.id === updatedLoc.id ? updatedLoc : loc));
            
            // 2. Thông báo thành công!
            alert(`Lấy tọa độ thành công!\nVĩ độ: ${pos.coords.latitude}\nKinh độ: ${pos.coords.longitude}`);
        },
        (error) => {
            // Xử lý báo lỗi chi tiết thay vì chỉ báo "Lỗi lấy vị trí!"
            if (error.code === 1) {
                alert("Bạn đã từ chối quyền truy cập vị trí. Vui lòng cấp lại quyền trên trình duyệt!");
            } else if (error.code === 2) {
                alert("Không thể xác định được vị trí của bạn lúc này. Hãy kiểm tra lại kết nối mạng/GPS.");
            } else if (error.code === 3) {
                alert("Quá thời gian chờ định vị (Timeout). Hãy thử lại!");
            } else {
                alert("Lỗi lấy vị trí không xác định!");
            }
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 } // Bật HighAccuracy để lấy tọa độ chuẩn xác nhất cho chấm công
    );
};

    const Badge = ({ label, active }) => (
        <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '6px', marginRight: '5px', backgroundColor: active ? '#E0F2FE' : '#FFE4E6', color: active ? '#0369A1' : '#E11D48', border: `1px solid ${active ? '#BAE6FD' : '#FECDD3'}` }}>
            {label}: {active ? 'Bật' : 'Tắt'}
        </span>
    );

    if (!selectedLoc) return <div style={{ padding: '20px' }}>Đang tải...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#F8FAFC', fontFamily: 'system-ui' }}>

            <div style={{ padding: '20px 30px', backgroundColor: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ padding: '12px', backgroundColor: '#F0F9FF', borderRadius: '12px' }}>
                        {/* 🔥 BƯỚC 2: Đổi tên Component ở đây */}
                        <MapIcon color="#0EA5E9" size={24} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '20px', color: '#0F172A', fontWeight: '700' }}>Cài đặt Khu vực Chấm công</h1>
                        <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#64748B' }}>Thiết lập GPS và Wifi chấm công cho toàn hệ thống.</p>
                    </div>
                </div>
                <button onClick={handleAddNewLocation} style={{ backgroundColor: '#0EA5E9', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(14, 165, 233, 0.2)' }}>
                    <Plus size={18} /> Thêm khu vực mới
                </button>
            </div>

            <div style={{ display: 'flex', flex: 1, padding: '20px', gap: '25px', overflow: 'hidden' }}>

                <div style={{ width: '280px', overflowY: 'auto', paddingRight: '5px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748B', marginBottom: '15px' }}>DANH SÁCH KHU VỰC</p>
                    {locations.map(loc => (
                        <div key={loc.id} onClick={() => setSelectedLoc(loc)} style={{ padding: '15px', borderRadius: '15px', backgroundColor: 'white', cursor: 'pointer', marginBottom: '12px', border: selectedLoc.id === loc.id ? '1.5px solid #38BDF8' : '1px solid #F1F5F9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#1E293B' }}>
                                {loc.location_name} {loc.isNew && <span style={{ color: '#E11D48', fontSize: '10px' }}>(Mới)</span>}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', margin: '4px 0 10px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={12} /> {loc.branch_id ? `Nhánh: ${loc.branch_name}` : 'Chưa gắn'}
                            </div>
                            <div style={{ display: 'flex' }}><Badge label="GPS" active={loc.gps_status} /><Badge label="Wifi" active={loc.wifi_status} /></div>
                        </div>
                    ))}
                </div>

                <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            <div style={{ backgroundColor: '#F8FAFC', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <Edit2 size={18} color="#0EA5E9" />
                            </div>
                            <input
                                type="text"
                                value={selectedLoc.location_name}
                                onChange={(e) => updateField('location_name', e.target.value)}
                                style={{ fontSize: '22px', fontWeight: '700', color: '#0F172A', border: 'none', borderBottom: '2px solid transparent', padding: '4px 0', width: '70%', outline: 'none' }}
                                onFocus={(e) => e.target.style.borderBottom = '2px solid #38BDF8'}
                                onBlur={(e) => e.target.style.borderBottom = '2px solid transparent'}
                                placeholder="Nhập tên khu vực..."
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => updateField('is_active', !selectedLoc.is_active)}>
                            <div style={{ width: '40px', height: '20px', backgroundColor: selectedLoc.is_active ? '#22C55E' : '#CBD5E1', borderRadius: '20px', position: 'relative', transition: '0.3s' }}>
                                <div style={{ width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', right: selectedLoc.is_active ? '2px' : '22px', top: '2px', transition: '0.3s' }} />
                            </div>
                            <span style={{ fontSize: '13px', color: selectedLoc.is_active ? '#22C55E' : '#64748B', fontWeight: '600' }}>
                                {selectedLoc.is_active ? 'Đang áp dụng' : 'Đã tắt'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-100">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Loại địa điểm</label>
                            <select
                                value={selectedLoc.type}
                                onChange={(e) => updateField('type', e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px' }}
                            >
                                <option value="department_site">Trụ sở chính</option>
                                <option value="branch">Chi nhánh</option>
                                <option value="client_site">Đối tác</option>
                                <option value="wfh">Làm việc tại nhà</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Thuộc chi nhánh quản lý</label>
                            <select
                                value={selectedLoc.branch_id || ''}
                                onChange={(e) => updateField('branch_id', Number(e.target.value))}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px' }}
                            >
                                <option value="" disabled>-- Chọn chi nhánh --</option>
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '40px' }}>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#334155' }}>
                                <div style={{ backgroundColor: '#F0F9FF', padding: '6px', borderRadius: '8px' }}><CheckCircle size={18} color="#0EA5E9" /></div>
                                Cấu hình GPS
                            </h4>
                            <div style={{ marginTop: '20px' }}>
                                <label style={{ fontSize: '12px', color: '#64748B' }}>Vĩ độ</label>
                                <input type="number" value={selectedLoc.latitude || ''} onChange={(e) => updateField('latitude', Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginTop: '5px' }} />
                            </div>
                            <div style={{ marginTop: '15px' }}>
                                <label style={{ fontSize: '12px', color: '#64748B' }}>Kinh độ</label>
                                <input type="number" value={selectedLoc.longitude || ''} onChange={(e) => updateField('longitude', Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginTop: '5px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '15px', marginTop: '15px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', color: '#64748B' }}>Bán kính (m)</label>
                                    <input type="number" value={selectedLoc.radius_meters || ''} onChange={(e) => updateField('radius_meters', Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginTop: '5px' }} />
                                </div>
                                <button onClick={handleGetGPS} style={{ height: '45px', padding: '0 20px', backgroundColor: '#E0F2FE', color: '#0369A1', border: 'none', borderRadius: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <Navigation size={16} /> Lấy vị trí
                                </button>
                            </div>
                        </div>

                        <div style={{ width: '350px', height: '270px', borderRadius: '15px', overflow: 'hidden', marginTop: '45px', border: '1px solid #E2E8F0' }}>
                            {selectedLoc.latitude && selectedLoc.longitude ? (
                                <LocationMap lat={selectedLoc.latitude} lng={selectedLoc.longitude} radius={selectedLoc.radius_meters} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                                    Chưa có tọa độ
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '40px' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#334155' }}>
                            <div style={{ backgroundColor: '#F5F3FF', padding: '6px', borderRadius: '8px' }}><Wifi size={18} color="#7C3AED" /></div>
                            IP Wifi (Tùy chọn)
                        </h4>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <input type="text" placeholder="Nhập IPv4..." value={ipInput} onChange={(e) => setIpInput(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }} />
                            <button onClick={handleAddIp} style={{ padding: '0 25px', backgroundColor: '#F5F3FF', color: '#7C3AED', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Thêm IP</button>
                        </div>
                        <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {selectedLoc.allowed_ips.map((ip, i) => (
                                <div key={i} style={{ backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px' }}>{ip}</span>
                                    <Trash2 size={14} color="#E11D48" style={{ cursor: 'pointer' }} onClick={() => handleRemoveIp(ip)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '30px' }}>
                        <button onClick={handleDeleteLocation} style={{ padding: '12px 25px', color: '#E11D48', backgroundColor: 'transparent', border: '1px solid #FEE2E2', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
                            Xóa khu vực
                        </button>
                        <button onClick={handleSaveConfig} style={{ padding: '12px 30px', backgroundColor: '#1E293B', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <Save size={18} /> Lưu cấu hình
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationSettings;
