import axiosClient from '../api/axiosClient';

// Service dashboard (Director)
export const directorDashboardService = {
  getOverview: async () => {
    const response = await axiosClient.get('/director/dashboard/overview');
    return response;
  },
};

