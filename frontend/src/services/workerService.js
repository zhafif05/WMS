import api from './api';

export const workerService = {
  getMyJobs: async (params = {}) => {
    const response = await api.get('/worker/jobs', { params });
    return response.data;
  },

  getJobDetail: async (id) => {
    const response = await api.get(`/worker/jobs/${id}`);
    return response.data;
  },

  getTreatment: async (id) => {
    const response = await api.get(`/worker/treatments/${id}`);
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get('/worker/history');
    return response.data;
  },

  startTreatment: async (treatmentId, notes = '') => {
    const response = await api.post(`/worker/treatments/${treatmentId}/start`, { notes });
    return response.data;
  },

  progressTreatment: async (treatmentId, notes, activityType = 'progress') => {
    const response = await api.post(`/worker/treatments/${treatmentId}/progress`, {
      notes,
      activity_type: activityType,
    });
    return response.data;
  },

  finishTreatment: async (treatmentId, notes = '', verified = false) => {
    const response = await api.post(`/worker/treatments/${treatmentId}/finish`, {
      notes,
      verified,
    });
    return response.data;
  },

  reworkTreatment: async (treatmentId, notes) => {
    const response = await api.post(`/worker/treatments/${treatmentId}/rework`, { notes });
    return response.data;
  },
};

export default workerService;
