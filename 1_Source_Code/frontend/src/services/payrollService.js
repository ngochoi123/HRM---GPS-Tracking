import axiosClient from '../api/axiosClient';

export const payrollService = {
  getCalculation: async (monthYear, departmentId) => {
    const response = await axiosClient.get('/payroll/calculate', {
      params: { monthYear, departmentId },
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response;
  }
};