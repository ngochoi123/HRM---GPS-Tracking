import axiosClient from '../api/axiosClient';

export const recommendationService = {
  // Lấy danh sách đề xuất khen thưởng / kỷ luật từ AI Alerts
  getRecommendations: () => axiosClient.get('/ai/recommendations'),
};
