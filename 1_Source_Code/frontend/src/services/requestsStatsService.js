/*
 * Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.
 * All rights reserved.
 */

import axiosClient from '../api/axiosClient';

const requestsStatsService = {
  getManagerRequestsStats: (managerId, month) => {
    const config = month ? { params: { month } } : undefined;
    return axiosClient.get(`/manager/stats/requests/${managerId}`, config);
  }
};

export default requestsStatsService;
