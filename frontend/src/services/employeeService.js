import axiosClient from '../api/axiosClient';

// Service cho các API phía Nhân viên (Employee)
export const employeeService = {
  getDashboard: (employeeId) => {
    return axiosClient.get(`/employee/dashboard/${employeeId}`);
  },

  getProfile: (employeeId) => {
    return axiosClient.get(`/employee/profile/${employeeId}`);
  },

  changePassword: ({ userId, oldPassword, newPassword }) => {
    return axiosClient.post('/employee/change-password', {
      userId,
      oldPassword,
      newPassword,
    });
  },

  getContract: (employeeId) => {
    return axiosClient.get(`/employee/contract/${employeeId}`);
  },

  getLeaveRequests: (employeeId) => {
    return axiosClient.get(`/employee/leave-request/${employeeId}`);
  },

  createLeaveRequest: (formData) => {
    return axiosClient.post('/employee/leave-request', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getApprovers: (employeeId) => {
    return axiosClient.get(`/employee/approvers/${employeeId}`);
  },
};

