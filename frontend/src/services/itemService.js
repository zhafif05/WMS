import api from './api';

export const itemService = {
  getItems: async (params = {}) => {
    const response = await api.get('/items', { params });
    return response.data;
  },

  getItemById: async (id) => {
    const response = await api.get(`/items/${id}`);
    return response.data;
  },

  createItem: async (data) => {
    const response = await api.post('/items', data);
    return response.data;
  },

  updateItem: async (id, data) => {
    const response = await api.put(`/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await api.delete(`/items/${id}`);
    return response.data;
  },
};

export default itemService;
