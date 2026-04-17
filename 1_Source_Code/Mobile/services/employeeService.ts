import axios from 'axios';
import { API_URL } from '@/config/env';

export const employeeService = {
  getApprovers: async (employeeId: string | number) => {
    const response = await axios.get(`${API_URL}/employee/approvers/${employeeId}`);
    return response.data?.data || response.data || [];
  },

  createExplanationRequest: async (formData: FormData) => {
    return axios.post(`${API_URL}/employee/attendance-explanation-request`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getExplanationRequests: async (employeeId: string | number) => {
    const response = await axios.get(`${API_URL}/employee/attendance-explanation-request/${employeeId}`);
    return response.data?.data || response.data || [];
  },
};
