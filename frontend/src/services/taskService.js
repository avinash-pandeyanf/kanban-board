import axios from "axios";

// API URL based on environment
const API_URL = process.env.NODE_ENV === 'production'
  ? `${process.env.VUE_APP_API_URL}/api/tasks`
  : "http://localhost:5000/api/tasks";

// Request interceptor for error handling
axios.interceptors.request.use(
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
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('Response error:', error);
    // Handle specific error cases
    if (error.response?.status === 404) {
      console.error('Resource not found');
    }
    return Promise.reject(error);
  }
);

// Task API methods
export const getTasks = () => axios.get(API_URL);
export const addTask = (task) => axios.post(API_URL, task);
export const updateTask = (id, updates) => axios.put(`${API_URL}/${id}`, updates);
export const deleteTask = (id) => axios.delete(`${API_URL}/${id}`);
