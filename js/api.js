const configuredApiBase = typeof document !== 'undefined'
    ? document.querySelector('meta[name="otitech-api-base"]')?.content
    : '';
const isLocalPreview = typeof window !== 'undefined'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    && window.location.port === '4173';
export const API_BASE = (configuredApiBase || (isLocalPreview
    ? `${window.location.protocol}//${window.location.hostname}:3000/api/v1`
    : '/api/v1')).replace(/\/$/, '');

// Import Supabase client for auth token
import { supabase } from './supabase.js';

class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

async function getSupabaseAccessToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
}

async function request(endpoint, options = {}) {
    const headers = new Headers(options.headers || {});
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    let body = options.body;

    if (body && typeof body === 'object' && !isFormData) {
        body = JSON.stringify(body);
        if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    }

    // Use Supabase access token for authentication
    const token = await getSupabaseAccessToken();
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, body });

    if (response.status === 401 && !['/auth/login', '/auth/register', '/auth/refresh'].includes(endpoint)) {
        // Session expired or invalid
        window.dispatchEvent(new CustomEvent('otitech:session-expired'));
        throw new ApiError('Your session has expired. Please sign in again.', 401);
    }

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new ApiError(
            data.error?.message || `HTTP ${response.status}`,
            response.status,
            data
        );
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

export const api = {
    get: (endpoint) => request(endpoint, { method: 'GET' }),
    post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
    patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body }),
    delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export const propertiesApi = {
    list: (params = {}) => {
        const search = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                search.append(key, value);
            }
        });
        return api.get(`/properties?${search.toString()}`);
    },

    get: (slug) => api.get(`/properties/${slug}`),

    create: (data) => api.post('/properties', data),

    update: (id, data) => api.patch(`/properties/${id}`, data),

    delete: (id) => api.delete(`/properties/${id}`),
};

export const projectsApi = {
    list: (params = {}) => {
        const search = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                search.append(key, value);
            }
        });
        return api.get(`/projects?${search.toString()}`);
    },

    get: (slug) => api.get(`/projects/${slug}`),

    create: (data) => api.post('/projects', data),

    update: (id, data) => api.patch(`/projects/${id}`, data),

    delete: (id) => api.delete(`/projects/${id}`),
};

export const enquiriesApi = {
    create: (data) => api.post('/enquiries', data),

    list: (params = {}) => {
        const search = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                search.append(key, value);
            }
        });
        return api.get(`/enquiries?${search.toString()}`);
    },

    get: (id) => api.get(`/enquiries/${id}`),

    update: (id, data) => api.patch(`/enquiries/${id}`, data),

    delete: (id) => api.delete(`/enquiries/${id}`),
};

export const authApi = {
    login: (email, password) => api.post('/auth/login', { email, password }),

    register: (data) => api.post('/auth/register', data),

    refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),

    me: () => api.get('/auth/me'),
};

export const settingsApi = {
    list: () => api.get('/settings'),

    get: (key) => api.get(`/settings/${key}`),

    getPublic: (keys) => {
        const search = new URLSearchParams();
        if (keys && keys.length) {
            keys.forEach(k => search.append('keys', k));
        }
        return api.get(`/settings/public?${search.toString()}`);
    },

    create: (data) => api.post('/settings', data),

    update: (key, data) => api.patch(`/settings/${key}`, data),

    delete: (key) => api.delete(`/settings/${key}`),
};

export const healthApi = {
    check: () => api.get('/health'),

    ready: () => api.get('/health/ready'),

    live: () => api.get('/health/live'),
};

export const mediaApi = {
    storageStatus: () => api.get('/media/storage/status'),
    presignedUpload: (data) => api.post('/media/presigned-upload', data),
    propertyImages: (id) => api.get(`/properties/${id}/images`),
    addPropertyImage: (id, formData) => api.post(`/properties/${id}/images`, formData),
    updatePropertyImage: (id, imageId, data) => api.patch(`/properties/${id}/images/${imageId}`, data),
    deletePropertyImage: (id, imageId) => api.delete(`/properties/${id}/images/${imageId}`),
    projectImages: (id) => api.get(`/projects/${id}/images`),
    addProjectImage: (id, formData) => api.post(`/projects/${id}/images`, formData),
    updateProjectImage: (id, imageId, data) => api.patch(`/projects/${id}/images/${imageId}`, data),
    deleteProjectImage: (id, imageId) => api.delete(`/projects/${id}/images/${imageId}`),
};

export const adminApi = {
    summary: () => api.get('/admin/summary'),

    properties: (params = {}) => api.get(`/properties/admin?${new URLSearchParams(params)}`),

    projects: (params = {}) => api.get(`/projects/admin?${new URLSearchParams(params)}`),

    users: (params = {}) => api.get(`/admin/users?${new URLSearchParams(params)}`),

    createUser: (data) => api.post('/admin/users', data),

    updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),

    deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export { ApiError };
