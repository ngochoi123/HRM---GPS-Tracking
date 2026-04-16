import axiosClient from '../api/axiosClient';

// Service cho các API chấm công (attendance) dùng chung
export const attendanceService = {
  getSummary: (employeeId) => {
    return axiosClient.get(`/employee/attendance/summary/${employeeId}`);
  },

  getManagerZone: (managerId) => {
    return axiosClient.get(`/employee/attendance/manager-zone/${managerId}`);
  },

  getHistory: (employeeId, { month, year } = {}) => {
    const params = {};
    if (month != null) params.month = month;
    if (year != null) params.year = year;
    return axiosClient.get(`/employee/attendance/history/${employeeId}`, { params });
  },

  checkIn: (employeeId, payload) => {
    return axiosClient.post(`/employee/attendance/checkin/${employeeId}`, payload);
  },

  checkOut: (employeeId, payload) => {
    return axiosClient.post(`/employee/attendance/checkout/${employeeId}`, payload);
  },

  getManagerAttendanceStats: (month) => {
    const config = month ? { params: { month } } : undefined;
    return axiosClient.get('/manager/stats/attendance', config);
  },
};
