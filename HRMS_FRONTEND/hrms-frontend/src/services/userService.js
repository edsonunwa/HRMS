import api from './api';

export const userService = {
  async list() {
    const { data } = await api.get('/auth/users/');
    return Array.isArray(data) ? data : data.results;
  },

  async listWithoutProfile() {
    const { data } = await api.get('/auth/users/without-profile/');
    return Array.isArray(data) ? data : data.results;
  },

  async create(payload) {
    const { data } = await api.post('/auth/users/', payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/auth/users/${id}/`, payload);
    return data;
  },

  async remove(id) {
    await api.delete(`/auth/users/${id}/`);
  },
};
