import api from './api';

export const reportsService = {
  // ── Generated report history ──────────────────────────────────────────
  async listReports(params) {
    const { data } = await api.get('/reports/', { params });
    return Array.isArray(data) ? { results: data, count: data.length } : data;
  },

  // ── Report types & metadata ───────────────────────────────────────────
  async getReportTypes() {
    const { data } = await api.get('/reports/types/');
    return data;
  },

  async getReferenceData() {
    const { data } = await api.get('/reports/reference-data/');
    return data;
  },

  // ── Generate & Download a report ──────────────────────────────────────
  async generateReport({ report_type, format, parameters = {} }) {
    const response = await api.post(
      '/reports/generate/',
      { report_type, format, parameters },
      { responseType: 'blob' }
    );

    // Extract filename from Content-Disposition header
    const disposition = response.headers['content-disposition'];
    let filename = `${report_type}.${format === 'excel' ? 'xlsx' : format}`;
    if (disposition) {
      const match = disposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }

    // Trigger browser download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { filename };
  },

  // ── Summary / analytics endpoints ─────────────────────────────────────
  async getHeadcount() {
    const { data } = await api.get('/reports/headcount/');
    return data;
  },

  async getLeave(year) {
    const { data } = await api.get('/reports/leave/', { params: year ? { year } : undefined });
    return data;
  },

  async getRecruitment() {
    const { data } = await api.get('/reports/recruitment/');
    return data;
  },

  async getPerformance(cycleId) {
    const { data } = await api.get('/reports/performance/', { params: cycleId ? { cycle_id: cycleId } : undefined });
    return data;
  },

  async getTransfers() {
    const { data } = await api.get('/reports/transfers/');
    return data;
  },

  async getManpower() {
    const { data } = await api.get('/reports/manpower/');
    return data;
  },

  async getTrainees() {
    const { data } = await api.get('/reports/trainees/');
    return data;
  },
};