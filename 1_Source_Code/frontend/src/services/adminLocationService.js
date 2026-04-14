import axiosClient from '../api/axiosClient';

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

  // Lấy danh sách chi nhánh
  getBranches: () => {
    return axiosClient.get('/admin/hierarchy/branches');
  },

  // Lấy danh sách phòng ban theo chi nhánh
  getDepartmentsByBranch: (branchId) => {
    return axiosClient.get(`/admin/hierarchy/departments/${branchId}`);
  },

  // Lấy danh sách nhân viên theo phòng ban
  getEmployeesByDepartment: (departmentId) => {
    return axiosClient.get(`/admin/hierarchy/employees/${departmentId}`);
  },

  // Lấy danh sách địa điểm làm việc theo chi nhánh
  getWorkLocationsByBranch: (branchId) => {
    return axiosClient.get(`/admin/hierarchy/work-locations/${branchId}`);
  },

  // Tạo phân công (Branch/Department/Employee)
  createLocationAssignment: (payload) => {
    return axiosClient.post('/admin/hierarchy/assignments', payload);
  },
};

