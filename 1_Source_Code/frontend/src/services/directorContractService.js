import axiosClient from '../api/axiosClient';

// Service cho quản lý Hợp đồng (Director)
export const directorContractService = {
  getContracts: () => {
    return axiosClient.get('/director/contracts');
  },

  getContractFormOptions: () => {
    return axiosClient.get('/director/contract-form-options');
  },

  createContract: (payload) => {
    return axiosClient.post('/director/contracts', payload);
  },

  updateContract: (contractId, payload) => {
    return axiosClient.put(`/director/contracts/${contractId}`, payload);
  },
};

