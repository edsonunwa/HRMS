import api from './api';
import { createCrudService } from './apiServiceFactory';

export const transfersService = createCrudService('transfers');
transfersService.approve = async (id, body) => {
  const { data } = await api.post(`/transfers/${id}/approve/`, body);
  return data;
};
transfersService.cancel = async (id) => {
  const { data } = await api.post(`/transfers/${id}/cancel/`);
  return data;
};
