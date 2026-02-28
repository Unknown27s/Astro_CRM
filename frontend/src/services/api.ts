import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const auth = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    register: (email: string, password: string, fullName: string) =>
        api.post('/auth/register', { email, password, fullName }),
};

// Customers (v3.0.0)
export const customers = {
    getAll: (params?: any) => api.get('/customers', { params }),
    getOne: (id: number) => api.get(`/customers/${id}`),
    create: (data: any) => api.post('/customers', data),
    update: (id: number, data: any) => api.put(`/customers/${id}`, data),
    delete: (id: number) => api.delete(`/customers/${id}`),
    getStats: () => api.get('/customers/stats/overview'),
};

// Purchases (v3.0.0)
export const purchases = {
    getAll: (params?: any) => api.get('/purchases', { params }),
    getRecent: (limit?: number) => api.get('/purchases/recent', { params: { limit } }),
    create: (data: any) => api.post('/purchases', data),
    update: (id: number, data: any) => api.put(`/purchases/${id}`, data),
    delete: (id: number) => api.delete(`/purchases/${id}`),
};

// Campaigns (v3.0.0)
export const campaigns = {
    getAll: () => api.get('/campaigns'),
    getOne: (id: number) => api.get(`/campaigns/${id}`),
    create: (data: any) => api.post('/campaigns', data),
    preview: (id: number) => api.post(`/campaigns/${id}/preview`),
    send: (id: number) => api.post(`/campaigns/${id}/send`),
    getSends: (id: number) => api.get(`/campaigns/${id}/sends`),
    delete: (id: number) => api.delete(`/campaigns/${id}`),
};

// Insights (v3.0.0)
export const insights = {
    getRevenueTrends: (period?: string) => api.get('/insights/revenue-trends', { params: { period } }),
    getCustomerStats: (period?: string) => api.get('/insights/customer-stats', { params: { period } }),
    getPurchasePatterns: (period?: string) => api.get('/insights/purchase-patterns', { params: { period } }),
    getRevenueByLocation: (period?: string) => api.get('/insights/revenue-by-location', { params: { period } }),
    exportData: (data: any) => api.post('/insights/export', data),
};

// Import
export const importData = {
    upload: (formData: FormData) =>
        api.post('/import/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    execute: (formData: FormData) =>
        api.post('/import/execute', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

// Analytics
export const analytics = {
    getDashboard: (params?: any) => api.get('/analytics/dashboard', { params }),
    getSegments: () => api.get('/analytics/segments'),
    getSegmentCustomers: (segmentId: number) =>
        api.get(`/analytics/segments/${segmentId}/customers`),
    segmentCustomers: (numClusters: number) =>
        api.post('/analytics/segment-customers', { numClusters }),
    getSalesTrends: (params?: any) => api.get('/analytics/trends/sales', { params }),
};

// Reports
export const reports = {
    generateSales: (data: any) =>
        api.post('/reports/sales', data, { responseType: 'blob' }),
    generateCustomers: (data: any) =>
        api.post('/reports/customers', data, { responseType: 'blob' }),
    generateSegments: (data: any) =>
        api.post('/reports/segments', data, { responseType: 'blob' }),
    getMonthlyData: (month: number, year: number) =>
        api.post('/reports/monthly', { month, year }),
};

// Products (admin)
export const products = {
    getAll: () => api.get('/products'),
    create: (data: any) => api.post('/products', data),
    update: (id: number, data: any) => api.put(`/products/${id}`, data),
    delete: (id: number) => api.delete(`/products/${id}`),
    toggleVisibility: (id: number) => api.patch(`/products/${id}/toggle-visibility`),
    toggleStock: (id: number) => api.patch(`/products/${id}/toggle-stock`),
};

// Shop (admin settings + public storefront)
export const shop = {
    getSettings: () => api.get('/shop/settings'),
    updateSettings: (data: any) => api.put('/shop/settings', data),
    getOrders: () => api.get('/shop/orders'),
    updateOrderStatus: (id: number, status: string) => api.patch(`/shop/orders/${id}`, { status }),
    deleteOrder: (id: number) => api.delete(`/shop/orders/${id}`),
};

// Coupons (admin)
export const coupons = {
    getAll: () => api.get('/coupons'),
    create: (data: any) => api.post('/coupons', data),
    update: (id: number, data: any) => api.put(`/coupons/${id}`, data),
    delete: (id: number) => api.delete(`/coupons/${id}`),
    toggle: (id: number) => api.patch(`/coupons/${id}/toggle`),
};

// Public shop (no auth needed — uses base axios without interceptor)
const publicApi = axios.create({ baseURL: API_BASE_URL });
export const publicShop = {
    getStorefront: () => publicApi.get('/shop/storefront'),
    placeOrder: (data: any) => publicApi.post('/shop/order', data),
    validateCoupon: (code: string, cart_total: number) => publicApi.post('/shop/validate-coupon', { code, cart_total }),
};

export default api;
