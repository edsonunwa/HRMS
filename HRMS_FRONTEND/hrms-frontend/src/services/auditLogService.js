import api from './api';

export const auditLogService = {
  async list(params = {}) {
    const { data } = await api.get('/auth/audit-logs/', { params });
    return data;
  },
};