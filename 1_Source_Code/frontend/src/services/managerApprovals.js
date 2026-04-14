import axiosClient from '../api/axiosClient';
export const managerApprovals={
  //  Lấy danh sách đơn chờ duyệt 
  getApprovalRequests: (managerId) => {
    return axiosClient.get(`/manager/approval-requests/${managerId}`);
  },

  //  Duyệt đơn
  approveRequest: (type, id) => {
    return axiosClient.put(`/manager/approval/${type}/${id}`, {
      status: 'approved',
    });
  },

  //  Từ chối đơn
  rejectRequest: (type, id) => {
    return axiosClient.put(`/manager/approval/${type}/${id}`, {
      status: 'rejected',
    });
  },
  getApprovalHistory: (managerId) => {
    return axiosClient.get(`/manager/approval-history/${managerId}`);
  },
};