import api from './api';

export const performanceService = {
  async getDashboard() {
    const { data } = await api.get('/performance/dashboard/');
    return data;
  },
};

export const evaluationService = {
  async getDashboard() {
    const { data } = await api.get('/evaluation/dashboard/');
    return data;
  },
};