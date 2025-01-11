import axios from "axios";

// API URL based on environment
const API_URL = process.env.NODE_ENV === 'production'
  ? `${process.env.VUE_APP_API_URL}/api/tasks`
  : "http://localhost:5000/api/tasks";

// Create axios instance with default config
const api = axios.create({
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for error handling
api.interceptors.request.use(
  config => {
    // Add any auth headers here if needed
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('Response error:', error);
    
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        response: {
          data: {
            message: 'Network error. Please check your connection.'
          }
        }
      });
    }

    // Handle specific error cases
    switch (error.response.status) {
      case 404:
        error.response.data.message = error.response.data.message || 'Resource not found';
        break;
      case 400:
        error.response.data.message = error.response.data.message || 'Invalid request';
        break;
      case 500:
        error.response.data.message = error.response.data.message || 'Server error. Please try again later.';
        break;
      default:
        error.response.data.message = error.response.data.message || 'An unexpected error occurred';
    }

    return Promise.reject(error);
  }
);

// Task API methods
export const getTasks = (queryString = '') => {
  const url = queryString ? `${API_URL}${queryString}` : API_URL;
  return api.get(url);
};

export const addTask = (task) => {
  // Validate task data before sending
  if (!task.name?.trim()) {
    return Promise.reject({
      response: {
        data: {
          message: 'Task name is required'
        }
      }
    });
  }

  // Ensure assignees is an array
  if (!Array.isArray(task.assignees)) {
    task.assignees = [];
  }

  return api.post(API_URL, task);
};

export const updateTask = (id, updates) => {
  if (!id) {
    return Promise.reject({
      response: {
        data: {
          message: 'Task ID is required'
        }
      }
    });
  }

  // Ensure assignees is an array
  if (updates.assignees && !Array.isArray(updates.assignees)) {
    updates.assignees = [];
  }

  return api.put(`${API_URL}/${id}`, updates);
};

export const deleteTask = (id) => {
  if (!id) {
    return Promise.reject({
      response: {
        data: {
          message: 'Task ID is required'
        }
      }
    });
  }

  return api.delete(`${API_URL}/${id}`);
};
