/*
 * Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.
 * All rights reserved.
 */

import axiosClient from '../api/axiosClient';
export const managerApprovals={
  //  Lấy danh sách đơn chờ duyệt 
  getApprovalRequests: (managerId) => {
    return axiosClient.get(`/manager/approval-requests/${managerId}`);
  },

  //  Duyệt đơn
  approveRequest: (type, id, approverId) => {
    return axiosClient.put(`/manager/approval/${type}/${id}`, {
      status: 'approved',
      approverId
    });
  },

  //  Từ chối đơn
  rejectRequest: (type, id, approverId, rejectReason) => {
    return axiosClient.put(`/manager/approval/${type}/${id}`, {
      status: 'rejected',
      approverId,
       rejectReason
    });
  },
  getApprovalHistory: (managerId) => {
    return axiosClient.get(`/manager/approval-history/${managerId}`);
  },
};
