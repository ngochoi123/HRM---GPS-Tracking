import axiosClient from '../api/axiosClient';

// Service cho các API phòng ban (đang dùng bởi nhiều màn hình, gồm cả trang Quản Lý thông báo)
export const directorDepartmentService = {
  getDepartments: () => {
    return axiosClient.get('/director/departments');
  },

  getDepartmentById: (departmentId) => {
    return axiosClient.get(`/director/departments/${departmentId}`);
  },

  getEmployeesByDepartment: (departmentId) => {
    return axiosClient.get(`/director/departments/${departmentId}/employees`);
  },

  createDepartment: (payload) => {
    return axiosClient.post('/director/departments', payload);
  },

  updateDepartment: (departmentId, payload) => {
    return axiosClient.put(`/director/departments/${departmentId}`, payload);
  },

  deleteDepartment: (departmentId, payload) => {
    return axiosClient.delete(`/director/departments/${departmentId}`, { data: payload });
  },
};

