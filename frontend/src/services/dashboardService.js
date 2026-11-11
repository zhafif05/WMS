import api from './api';

export const dashboardService = {
  getAdminStats: async () => {
    const response = await api.get('/dashboard/admin');
    return response.data;
  },

  getWorkerStats: async () => {
    const response = await api.get('/dashboard/worker');
    return response.data;
  },

  getQcStats: async () => {
    const response = await api.get('/dashboard/qc');
    return response.data;
  },
};

export default dashboardService;
