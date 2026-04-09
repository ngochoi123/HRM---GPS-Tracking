import axiosClient from '../api/axiosClient';

// Service cho các API xác thực / tài khoản dùng chung
export const authService = {
  // Đăng nhập
  login: ({ username, password }) => {
    return axiosClient.post('/auth/login', { username, password });
  },

  // Gửi email hướng dẫn đặt lại mật khẩu
  forgotPassword: (email) => {
    return axiosClient.post('/auth/forgot-password', { email });
  },

  // Xác thực OTP
  verifyOtp: ({ email, otp }) => {
    return axiosClient.post('/auth/verify-otp', { email, otp });
  },

  // Đặt lại mật khẩu sau khi verify OTP
  resetPassword: ({ email, newPassword }) => {
    return axiosClient.post('/auth/reset-password', { email, newPassword });
  },

  // Đổi mật khẩu lần đầu đăng nhập (bắt buộc)
  changePasswordFirst: ({ username, oldPassword, newPassword }) => {
    return axiosClient.post('/auth/change-password-first', {
      username,
      oldPassword,
      newPassword,
    });
  },
};

