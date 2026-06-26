/*
 * Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.
 * All rights reserved.
 */

import axiosClient from '../api/axiosClient';

// Service dashboard (Director)
export const directorDashboardService = {
  getOverview: async (params = {}) => {
    const response = await axiosClient.get('/director/dashboard/overview', { params });
    return response;
  },
};

