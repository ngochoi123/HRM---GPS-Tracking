import axiosClient from '../api/axiosClient';

export const payrollService = {
  getCalculation: async (monthYear, departmentId) => {
    const response = await axiosClient.get('/payroll/calculate', {
      params: { monthYear, departmentId },
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response;
  },

  /** Sửa giờ chấm công (check-in / check-out) trong bảng attendance */
  correctAttendance: async (payload) => {
    const response = await axiosClient.patch('/payroll/attendance', payload, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response;
  }
};