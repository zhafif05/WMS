import api from './api';

export const qrService = {
  scanQR: async (token) => {
    const cleanToken = token.trim();
    const response = await api.get(`/qr/${encodeURIComponent(cleanToken)}`);
    return response.data;
  },
};

export default qrService;
