import axiosClient from '../api/axiosClient';

// Service CRUD thông báo nội bộ
export const notificationService = {
  getNotifications: () => {
    return axiosClient.get('/notifications');
  },

  // Chuông thông báo (cá nhân)
  getMyBell: (userId) => {
    return axiosClient.get(`/notifications/my-bell/${userId}`);
  },

  markAllAsRead: (userId) => {
    return axiosClient.put(`/notifications/read-all/${userId}`);
  },

  markAsRead: (notificationId, userId) => {
    return axiosClient.put(`/notifications/read/${notificationId}`, { userId });
  },

  getNotificationDetail: (notificationId) => {
    return axiosClient.get(`/notifications/${notificationId}/detail`);
  },

  createNotification: (payload) => {
    return axiosClient.post('/notifications', payload);
  },

  updateNotification: (notificationId, payload) => {
    return axiosClient.put(`/notifications/${notificationId}`, payload);
  },
};

