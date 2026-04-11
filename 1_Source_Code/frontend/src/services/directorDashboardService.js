import axiosClient from '../api/axiosClient';

// Service dashboard (Director)
export const directorDashboardService = {
  getOverview: () => {
    return axiosClient.get('/director/dashboard/overview');
  },
};

