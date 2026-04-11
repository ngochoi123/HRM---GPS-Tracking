import axiosClient from '../api/axiosClient';

// Service cho quản lý Chi nhánh (Director)
export const directorBranchService = {
  getBranches: () => {
    return axiosClient.get('/director/branches');
  },

  getBranchById: (branchId) => {
    return axiosClient.get(`/director/branches/${branchId}`);
  },

  getManagerCandidates: (branchId) => {
    return axiosClient.get(`/director/branches/${branchId}/manager-candidates`);
  },

  createBranch: (payload) => {
    // Backend hiện dùng endpoint singular: /director/branch
    return axiosClient.post('/director/branch', payload);
  },

  updateBranch: (branchId, payload) => {
    return axiosClient.put(`/director/branches/${branchId}`, payload);
  },

  deleteBranch: (branchId, payload) => {
    // axios delete với body cần truyền qua config.data
    return axiosClient.delete(`/director/branches/${branchId}`, { data: payload });
  },
};

