import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/login', { email, password });
    const { token, user } = response.data;
    if (token) {
      localStorage.setItem('auth_token', token);
    }
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.warn('Logout request failed on server:', err);
    } finally {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
    }
  },

  getCurrentUser: async () => {
    const response = await api.get('/me');
    const user = response.data.user;
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
    return user;
  },
};

export default authService;
