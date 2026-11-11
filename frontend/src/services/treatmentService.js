import api from './api';

export const treatmentService = {
  getTreatments: async (params = {}) => {
    const response = await api.get('/treatments', { params });
    return response.data;
  },

  getTreatmentById: async (id) => {
    const response = await api.get(`/treatments/${id}`);
    return response.data;
  },

  createTreatment: async (data) => {
    const response = await api.post('/treatments', data);
    return response.data;
  },

  updateTreatment: async (id, data) => {
    const response = await api.put(`/treatments/${id}`, data);
    return response.data;
  },

  deleteTreatment: async (id) => {
    const response = await api.delete(`/treatments/${id}`);
    return response.data;
  },
};

export default treatmentService;
