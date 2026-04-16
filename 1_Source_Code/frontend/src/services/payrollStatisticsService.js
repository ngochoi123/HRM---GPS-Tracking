import axiosClient from '../api/axiosClient';

const payrollStatisticsService = {
  getOverview: async (month, year) => {
    const response = await axiosClient.get('/manager/payroll/statistics/overview', {
      params: { month, year }
    });
    return response.data || response;
  },

  getDepartmentBreakdown: async (month, year) => {
    const response = await axiosClient.get('/manager/payroll/statistics/departments', {
      params: { month, year }
    });
    return response.data || response;
  },

  getDepartmentEmployees: async (departmentId, month, year) => {
    const response = await axiosClient.get(`/manager/payroll/statistics/departments/${departmentId}/employees`, {
      params: { month, year }
    });
    return response.data || response;
  },

  quickApprove: async (payrollIds) => {
    const response = await axiosClient.put('/manager/payroll/statistics/quick-approve', {
      payrollIds
    });
    return response.data || response;
  }
};

export default payrollStatisticsService;
