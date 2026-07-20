import api from './api';
import { createCrudService } from './apiServiceFactory';

export const employeesService = createCrudService('employees');
employeesService.me = async () => {
  const { data } = await api.get('/employees/me/');
  return data;
};

export const departmentsService = createCrudService('employees/departments');
export const gradesService = createCrudService('employees/grades');
export const positionsService = createCrudService('employees/positions');
export const branchesService = createCrudService('employees/branches');