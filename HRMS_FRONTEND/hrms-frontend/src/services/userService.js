import api from './api';

export const userService = {
  async list() {
    const { data } = await api.get('/auth/users/');
    return Array.isArray(data) ? data : data.results;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/auth/users/${id}/`, payload);
    return data;
  },

  async remove(id) {
    await api.delete(`/auth/users/${id}/`);
  },

  async resetPassword(id) {
    const { data } = await api.post(`/auth/users/${id}/reset-password/`);
    return data;
  },
};
