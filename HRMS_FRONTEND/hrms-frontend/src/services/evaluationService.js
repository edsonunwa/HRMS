import api from './api';
import { createCrudService } from './apiServiceFactory';

export const cyclesService = createCrudService('evaluation/cycles');
export const kpisService = createCrudService('evaluation/kpis');
export const reviewsService = createCrudService('evaluation/reviews');
export const jobEvaluationsService = createCrudService('evaluation/job-evaluations');

export const evaluationService = {
  ...reviewsService,
  async submitReview(reviewId, payload) {
    const { data } = await api.post(`evaluation/reviews/${reviewId}/submit/`, payload);
    return data;
  },
  async selfAssess(reviewId, payload) {
    const { data } = await api.post(`evaluation/reviews/${reviewId}/self-assess/`, payload);
    return data;
  },
  async approveReview(reviewId, payload) {
    const { data } = await api.post(`evaluation/reviews/${reviewId}/approve/`, payload);
    return data;
  },
  async confirmReview(reviewId, payload) {
    const { data } = await api.post(`evaluation/reviews/${reviewId}/confirm/`, payload);
    return data;
  },
  async getDepartmentEmployees() {
    const { data } = await api.get('evaluation/department-employees/');
    return data;
  },
  async getReviewKPIs(reviewId) {
    const { data } = await api.get(`evaluation/reviews/${reviewId}/kpis/`);
    return data;
  },
  async getManagerRatings() {
    const { data } = await api.get('evaluation/manager-ratings/');
    return data;
  },
  async saveManagerRating(payload) {
    const { data } = await api.post('evaluation/manager-ratings/', payload);
    return data;
  },
  async getSelfRating() {
    const { data } = await api.get('evaluation/self-rating/');
    return data;
  },
  async saveSelfRating(payload) {
    const { data } = await api.post('evaluation/self-rating/', payload);
    return data;
  },
};
