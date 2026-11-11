import api from './api';

export const qcService = {
  getInspectionJobs: async () => {
    const response = await api.get('/qc/jobs');
    return response.data;
  },

  getInspectionDetail: async (id) => {
    const response = await api.get(`/qc/jobs/${id}`);
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get('/qc/history');
    return response.data;
  },

  getJobInspections: async (jobId) => {
    const response = await api.get(`/qc/jobs/${jobId}/inspections`);
    return response.data;
  },

  submitInspection: async (jobId, data) => {
    const response = await api.post(`/qc/jobs/${jobId}/inspections`, data);
    return response.data;
  },
};

export default qcService;
