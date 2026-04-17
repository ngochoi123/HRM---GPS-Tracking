import axios from 'axios';
import { API_URL } from '@/config/env';

export const employeeService = {
  createExplanationRequest: async (formData: FormData, token: string) => {
    return axios.post(`${API_URL}/employee/attendance-explanation-request`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      },
    });
  },

  getExplanationRequests: async (employeeId: string | number, token: string) => {
    const response = await axios.get(`${API_URL}/employee/attendance-explanation-request/${employeeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data?.data || response.data || [];
  },

  getApprovers: async (employeeId: string | number, token: string) => {
    const response = await axios.get(`${API_URL}/employee/approvers/${employeeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data?.data || response.data || [];
  },
};
