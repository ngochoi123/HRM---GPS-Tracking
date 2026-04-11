import axiosClient from '../api/axiosClient';

// Service quản lý Quyết định Khen thưởng / Kỷ luật cho vai trò Manager
export const managerDecisionService = {
  // Dashboard & danh sách theo tháng + search
  getDashboard: ({ year, month, search } = {}) => {
    return axiosClient.get('/manager/decisions/dashboard', {
      params: { year, month, search },
    });
  },

  // Chi tiết quyết định
  getDecisionById: (decisionId) => {
    return axiosClient.get(`/manager/decisions/${decisionId}`);
  },

  // Tạo mới quyết định (multipart)
  createDecision: (formData) => {
    return axiosClient.post('/manager/decisions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Cập nhật quyết định (multipart)
  updateDecision: (decisionId, formData) => {
    return axiosClient.put(`/manager/decisions/${decisionId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

