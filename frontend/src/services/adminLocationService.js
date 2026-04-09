import axiosClient from '../api/axiosClient';

// Service quản lý khu vực chấm công, vị trí và cấu hình liên quan cho Admin

export const adminLocationService = {
  // Lấy toàn bộ danh sách khu vực và chi nhánh từ Backend
  getLocations: () => {
    return axiosClient.get('/admin/locations');
  },

  // Tạo mới khu vực chấm công
  createLocation: (payload) => {
    return axiosClient.post('/admin/locations', payload);
  },

  // Cập nhật cấu hình khu vực chấm công cho một chi nhánh
  updateLocationSettings: (branchId, payload) => {
    return axiosClient.put(`/admin/locations/${branchId}/settings`, payload);
  },

  // Xóa khu vực chấm công theo work_location_id
  deleteWorkLocation: (workLocationId) => {
    return axiosClient.delete(`/admin/locations/${workLocationId}/work-location`);
  },
};

