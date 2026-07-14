import api from './api';

export const performanceService = {
  async getDashboard() {
    const { data } = await api.get('/api/performance/dashboard/');
    return data;
  },
};

export const evaluationService = {
  async getDashboard() {
    const { data } = await api.get('/api/evaluation/dashboard/');
    return data;
  },
};
