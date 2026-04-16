import axiosClient from '../api/axiosClient';

const contractService = {
  getOverview: async (month, year) => {
    const response = await axiosClient.get('/manager/contracts/overview', {
      params: { month, year }
    });
    return response.data || response;
  },

  getBreakdown: async (month, year) => {
    const response = await axiosClient.get('/manager/contracts/breakdown', {
      params: { month, year }
    });
    return response.data || response;
  },

  getExpiring: async (month, year) => {
    const response = await axiosClient.get('/manager/contracts/expiring', {
      params: { month, year }
    });
    return response.data || response;
  },

  renew: async (id, data) => {
    const response = await axiosClient.post(`/manager/contracts/renew/${id}`, data);
    return response.data || response;
  },
  bulkRenew: async (month, year) => {
    const response = await axiosClient.post('/manager/contracts/bulk-renew', { month, year });
    return response.data || response;
  }
};

export default contractService;
