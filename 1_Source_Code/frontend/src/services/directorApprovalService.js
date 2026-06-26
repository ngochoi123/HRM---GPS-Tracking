/*
 * Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.
 * All rights reserved.
 */

import axiosClient from '../api/axiosClient';

export const directorApprovalService = {
  getOverview: async (params = {}) => {
    const response = await axiosClient.get('/director/approvals/overview', { params });
    return response;
  },

  updateStatus: async (type, id, action, reason = '') => {
    const response = await axiosClient.patch(`/director/approvals/${type}/${id}`, { action, reason });
    return response;
  },

  bulkApprove: async (items) => {
    const response = await axiosClient.post('/director/approvals/bulk-approve', { items });
    return response;
  },
};
