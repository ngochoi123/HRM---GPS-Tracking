import axios from 'axios';
const API_URL = 'https://kltn-gps-api.onrender.com/api/payroll';

export const payrollService = {
  getCalculation: async (monthYear, departmentId) => {
    const response = await axios.get(`${API_URL}/calculate`, {
      params: { monthYear, departmentId },
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  }
};