import api from './api';
import { createCrudService } from './apiServiceFactory';

export const leaveTypesService = createCrudService('leave/types');

export const leaveBalancesService = {
  async list(params) {
    const { data } = await api.get('/leave/balances/', { params });
    return Array.isArray(data) ? { results: data, count: data.length } : data;
  },
};

export const leaveRequestsService = createCrudService('leave/requests');
leaveRequestsService.approve = async (id, body) => {
  const { data } = await api.post(`/leave/requests/${id}/approve/`, body);
  return data;
};
leaveRequestsService.cancel = async (id) => {
  const { data } = await api.post(`/leave/requests/${id}/cancel/`);
  return data;
};
