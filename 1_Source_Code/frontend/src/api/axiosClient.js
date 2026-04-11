import axios from 'axios';

// Khởi tạo axios instance dùng chung cho toàn bộ project
// baseURL được đọc từ biến môi trường Vite: VITE_API_URL
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Request interceptor: tự động gắn JWT token (nếu có) vào header Authorization
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor:
// - Trả về response.data để component/service không phải .data nhiều lần
// - Nếu gặp 401: có thể xử lý logout hoặc redirect sau này (tạm thời chỉ log)
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error?.response?.status === 401) {
      // TODO: tuỳ theo UX có thể xoá token, điều hướng về trang login...
      console.warn('Unauthorized - 401, cần xử lý đăng nhập lại.');
    }
    return Promise.reject(error);
  }
);

export default axiosClient;

