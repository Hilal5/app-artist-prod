import axios from 'axios';

// Set CSRF token secara global
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.headers.common['X-CSRF-TOKEN'] = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

// Interceptor untuk handle response error
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 419) {
      // Session expired - refresh token atau redirect
      console.log('Session expired, refreshing...');
      return refreshCSRFToken().then(() => {
        // Retry original request
        const config = error.config;
        config.headers['X-CSRF-TOKEN'] = getCSRFToken();
        return axios.request(config);
      });
    }
    
    // Handle HTML response instead of JSON
    if (error.response && 
        error.response.headers['content-type']?.includes('text/html') &&
        error.response.data instanceof String && 
        error.response.data.startsWith('<!DOCTYPE')) {
      
      console.warn('Server returned HTML instead of JSON. Redirecting...');
      window.location.reload();
      return Promise.reject(new Error('Session expired'));
    }
    
    return Promise.reject(error);
  }
);

// Function untuk refresh CSRF token
function refreshCSRFToken() {
  return axios.get('/refresh-csrf').then(response => {
    const newToken = response.data.csrf_token;
    // Update meta tag
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
      meta.setAttribute('content', newToken);
    }
    // Update axios default header
    axios.defaults.headers.common['X-CSRF-TOKEN'] = newToken;
    return newToken;
  }).catch(error => {
    // Jika refresh gagal, redirect ke login
    window.location.href = '/login';
    return Promise.reject(error);
  });
}

// Helper function untuk get CSRF token
function getCSRFToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

// Export axios instance
window.axios = axios;