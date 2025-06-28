import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Schickt die anfragen ans backend? Durch headers: 'Content-Type': 'application/json', schicken wir dem backend den header, dass wir immmer json haben
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor for auth token
// ?
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth-token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;// ?Setzt den header mit dem Token?
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) { // ?Wenn backend Status 401 liefert?
            localStorage.removeItem('auth-token');
            window.location.href = '/login'; // ?schickt uns wieder auf die /login seite?
        }
        return Promise.reject(error);
    }
);