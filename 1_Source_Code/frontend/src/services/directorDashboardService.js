import axiosClient from '../api/axiosClient';

// Service dashboard (Director)
export const directorDashboardService = {
  getOverview: async (params = {}) => {
    const response = await axiosClient.get('/director/dashboard/overview', { params });
    return response;
  },
};

