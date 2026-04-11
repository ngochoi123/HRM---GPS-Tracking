import axiosClient from '../api/axiosClient';

// Service quản lý Nhân viên cho vai trò Manager
export const managerEmployeeService = {
  // Danh sách nhân viên thuộc phạm vi quản lý
  getEmployees: () => {
    return axiosClient.get('/manager/employees');
  },

  // Chi tiết nhân viên
  getEmployeeById: (employeeId) => {
    return axiosClient.get(`/manager/employees/${employeeId}`);
  },

  // Xóa nhân viên
  deleteEmployee: (employeeId) => {
    return axiosClient.delete(`/manager/employees/${employeeId}`);
  },

  // Dữ liệu combobox (departments / positions / managers...)
  getFormOptions: () => {
    return axiosClient.get('/manager/form-options');
  },

  // Tạo mới nhân viên
  createEmployee: (payload) => {
    return axiosClient.post('/manager/employees', payload);
  },

  // Cập nhật nhân viên
  updateEmployee: (employeeId, payload) => {
    return axiosClient.put(`/manager/employees/${employeeId}`, payload);
  },
};

