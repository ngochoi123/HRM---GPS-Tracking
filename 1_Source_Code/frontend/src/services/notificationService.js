import axiosClient from '../api/axiosClient';

export const notificationService = {
  getNotifications: async () => {
    const response = await axiosClient.get('/notifications');
    return Array.isArray(response) ? response : [];
  },

  getMyBell: async (userId) => {
    const response = await axiosClient.get(`/notifications/my-bell/${userId}`);
    return Array.isArray(response) ? response : [];
  },

  markAllAsRead: (userId) => {
    return axiosClient.put(`/notifications/read-all/${userId}`);
  },

  markAsRead: (notificationId, userId) => {
    return axiosClient.put(`/notifications/read/${notificationId}`, { userId });
  },

  getNotificationDetail: async (notificationId) => {
    const response = await axiosClient.get(`/notifications/${notificationId}/detail`);
    return response || {};
  },

  createNotification: (payload) => {
    return axiosClient.post('/notifications', payload);
  },

  updateNotification: (notificationId, payload) => {
    return axiosClient.put(`/notifications/${notificationId}`, payload);
  },
};
