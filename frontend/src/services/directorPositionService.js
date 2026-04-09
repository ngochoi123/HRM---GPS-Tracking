import axiosClient from '../api/axiosClient';

// Service cho quản lý Chức vụ (Director)
export const directorPositionService = {
  getPositions: () => {
    return axiosClient.get('/director/positions');
  },

  getFormOptions: () => {
    return axiosClient.get('/director/form-options');
  },

  createPosition: (payload) => {
    return axiosClient.post('/director/positions', payload);
  },

  updatePosition: (positionId, payload) => {
    return axiosClient.put(`/director/positions/${positionId}`, payload);
  },

  deletePosition: (positionId) => {
    return axiosClient.delete(`/director/positions/${positionId}`);
  },
};

