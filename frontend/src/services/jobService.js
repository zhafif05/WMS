import api from './api';

export const jobService = {
  getJobs: async (params = {}) => {
    const response = await api.get('/jobs', { params });
    return response.data;
  },

  getJobById: async (id) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  createJob: async (data) => {
    const response = await api.post('/jobs', data);
    return response.data;
  },

  updateJob: async (id, data) => {
    const response = await api.put(`/jobs/${id}`, data);
    return response.data;
  },

  updateTreatment: async (jobId, treatmentId, data) => {
    const response = await api.put(`/jobs/${jobId}/treatments/${treatmentId}`, data);
    return response.data;
  },

  getTimeline: async (id) => {
    const response = await api.get(`/jobs/${id}/timeline`);
    return response.data;
  },

  getJobQR: async (id) => {
    const response = await api.get(`/jobs/${id}/qr`);
    return response.data;
  },
};

export default jobService;
