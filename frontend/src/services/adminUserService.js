import axiosClient from '../api/axiosClient';

// Service quản lý tài khoản & người dùng cho Admin
// Mọi API đều dùng axiosClient với baseURL từ VITE_API_URL

export const adminUserService = {
  // Lấy danh sách tất cả tài khoản người dùng
  getUsers: () => {
    return axiosClient.get('/admin/users');
  },

  // Cập nhật trạng thái tài khoản (active / locked)
  updateUserStatus: (userId, status) => {
    return axiosClient.put(`/admin/users/${userId}`, { status });
  },

  // Lấy danh sách nhân viên chưa có tài khoản
  getEmployeesWithoutAccount: () => {
    return axiosClient.get('/admin/employees-no-account');
  },

  // Tạo mới tài khoản người dùng
  createUser: (payload) => {
    return axiosClient.post('/admin/users', payload);
  },

  // Reset mật khẩu cho tài khoản, gửi mật khẩu tạm thời qua email
  resetUserPassword: (email) => {
    return axiosClient.post('/admin/force-reset-password', { email });
  },
};

