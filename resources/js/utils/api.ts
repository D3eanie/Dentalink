// utils/api.ts - API helper utilities (Updated)

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: any;
    pagination?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
    };
}

class ApiClient {
    private baseURL: string;
    private csrfToken: string | null = null;

    constructor() {
        this.baseURL = '';
        this.initCSRF();
    }

    private initCSRF() {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (token) {
            this.csrfToken = token;
        }
    }

    private getHeaders(isFormData = false): HeadersInit {
        const headers: HeadersInit = {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };

        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        if (this.csrfToken) {
            headers['X-CSRF-TOKEN'] = this.csrfToken;
        }

        return headers;
    }

    private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
        try {
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Expected JSON response, got ${contentType}`);
            }

            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 422 && data.errors) {
                    return {
                        success: false,
                        message: data.message || 'Validation failed',
                        errors: data.errors
                    };
                }
                
                return {
                    success: false,
                    message: data.message || `HTTP Error: ${response.status}`,
                    errors: data.errors
                };
            }

            return data;
        } catch (error) {
            console.error('API Response Error:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers: this.getHeaders(),
                credentials: 'same-origin'
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            console.error('GET Request Error:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    async post<T>(endpoint: string, data: any, isFormData = false): Promise<ApiResponse<T>> {
        try {
            const body = isFormData ? data : JSON.stringify(data);
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(isFormData),
                credentials: 'same-origin',
                body
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            console.error('POST Request Error:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            console.error('PUT Request Error:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                credentials: 'same-origin'
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            console.error('DELETE Request Error:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error'
            };
        }
    }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Updated bookingsApi with proper customer booking methods
export const bookingsApi = {
    // Get customer bookings with proper query parameters
    getCustomerBookings: (queryString?: string) => 
        apiClient.get(`/api/bookings/customer-bookings${queryString || ''}`),
    
    // Get all bookings (admin/employee)
    getAll: (queryString?: string) => 
        apiClient.get(`/api/bookings${queryString || ''}`),
    
    // Get booking statistics
    getStats: () => apiClient.get('/api/bookings/stats'),
    
    // Get employee bookings
    getEmployeeBookings: (queryString?: string) => 
        apiClient.get(`/api/bookings/employee-bookings${queryString || ''}`),
    
    // Get specific booking by ID
    getById: (id: number) => apiClient.get(`/api/bookings/${id}`),
    
    // Create new booking
    create: (data: any) => apiClient.post('/api/bookings', data),
    
    // Update booking
    update: (id: number, data: any) => apiClient.put(`/api/bookings/${id}`, data),
    
    // Update booking status (admin/employee only)
    updateStatus: (id: number, data: any) => 
        apiClient.put(`/api/bookings/${id}/status`, data),
    
    // Update payment status (admin/employee only)
    updatePaymentStatus: (id: number, data: any) => 
        apiClient.put(`/api/bookings/${id}/payment-status`, data),
    
    // Cancel booking
    cancel: (id: number, data: any) => 
        apiClient.post(`/api/bookings/${id}/cancel`, data),
    
    // Get available time slots
    getAvailableTimeSlots: (queryString?: string) => 
        apiClient.get(`/api/bookings/available-time-slots${queryString || ''}`)
};

// Updated servicesApi
export const servicesApi = {
    getAll: (queryString?: string) => 
        apiClient.get(`/api/services${queryString || ''}`),
    getStats: () => apiClient.get('/api/services/stats'),
    getActive: (queryString?: string) => 
        apiClient.get(`/api/services/active${queryString || ''}`),
    getById: (id: number) => apiClient.get(`/api/services/${id}`),
    create: (data: FormData) => apiClient.post('/api/services', data, true),
    update: (id: number, data: FormData) => apiClient.post(`/api/services/${id}`, data, true),
    delete: (id: number) => apiClient.delete(`/api/services/${id}`),
    getServiceBookings: (id: number, queryString?: string) => 
        apiClient.get(`/api/services/${id}/bookings${queryString || ''}`)
};

// Updated messagesApi
export const messagesApi = {
    // Get recent conversations
    getConversations: () => apiClient.get('/api/messages/conversations'),
    
    // Get conversation with specific user
    getConversation: (otherUserId: number, queryString?: string) => 
        apiClient.get(`/api/messages/conversation/${otherUserId}${queryString || ''}`),
    
    // Get recent conversations (limited)
    getRecentConversations: (limit: number = 10) => 
        apiClient.get(`/api/messages/recent-conversations?limit=${limit}`),
    
    // Get message statistics
    getStats: () => apiClient.get('/api/messages/stats'),
    
    // Get unread message count
    getUnreadCount: () => apiClient.get('/api/messages/unread-count'),
    
    // Create message
    create: (data: any) => apiClient.post('/api/messages', data),
    
    // Create message with attachments
    createWithAttachments: (formData: FormData) => 
        apiClient.post('/api/messages', formData, true),
    
    // Mark message as read
    markAsRead: (messageId: number) => 
        apiClient.post(`/api/messages/${messageId}/mark-read`, {}),
    
    // Mark message as unread
    markAsUnread: (messageId: number) => 
        apiClient.post(`/api/messages/${messageId}/mark-unread`, {}),
    
    // Mark multiple messages as read
    markMultipleAsRead: (messageIds: number[]) => 
        apiClient.post('/api/messages/mark-multiple-read', { message_ids: messageIds }),
    
    // Delete message
    deleteMessage: (messageId: number) => apiClient.delete(`/api/messages/${messageId}`),
    
    // Get all messages with filters
    getAll: (queryString?: string) => 
        apiClient.get(`/api/messages${queryString || ''}`),
    
    // Get specific message
    getById: (id: number) => apiClient.get(`/api/messages/${id}`),
    
    // Update message
    update: (id: number, data: any) => apiClient.put(`/api/messages/${id}`, data)
};

// Updated ordersApi
export const ordersApi = {
    getAll: (queryString?: string) => 
        apiClient.get(`/api/orders${queryString || ''}`),
    getStats: () => apiClient.get('/api/orders/stats'),
    getMyOrders: (queryString?: string) => 
        apiClient.get(`/api/orders/my-orders${queryString || ''}`),
    getSellerOrders: (queryString?: string) => 
        apiClient.get(`/api/orders/seller-orders${queryString || ''}`),
    getRecent: (limit: number = 10) => 
        apiClient.get(`/api/orders/recent?limit=${limit}`),
    getById: (id: number) => apiClient.get(`/api/orders/${id}`),
    getOrderItems: (id: number) => apiClient.get(`/api/orders/${id}/items`),
    create: (data: any) => apiClient.post('/api/orders', data),
    updateStatus: (id: number, data: any) => 
        apiClient.put(`/api/orders/${id}/status`, data),
    bulkUpdateStatus: (data: any) => 
        apiClient.post('/api/orders/bulk-update-status', data),
    cancel: (id: number, data: any) => 
        apiClient.post(`/api/orders/${id}/cancel`, data)
};

// Other API endpoints remain the same...
export const categoriesApi = {
    getAll: (queryString?: string) => 
        apiClient.get(`/api/categories${queryString || ''}`),
    getStats: () => apiClient.get('/api/categories/stats'),
    getActive: () => apiClient.get('/api/categories/active'),
    getForDropdown: () => apiClient.get('/api/categories/dropdown'),
    getById: (id: number) => apiClient.get(`/api/categories/${id}`),
    getCategoryProducts: (id: number, queryString?: string) => 
        apiClient.get(`/api/categories/${id}/products${queryString || ''}`),
    create: (data: any) => apiClient.post('/api/categories', data),
    update: (id: number, data: any) => apiClient.put(`/api/categories/${id}`, data),
    delete: (id: number) => apiClient.delete(`/api/categories/${id}`),
    toggleStatus: (id: number) => apiClient.post(`/api/categories/${id}/toggle-status`, {}),
    bulkUpdateStatus: (data: any) => 
        apiClient.post('/api/categories/bulk-update-status', data)
};

export const productsApi = {
    getAll: (queryString?: string) => 
        apiClient.get(`/api/products${queryString || ''}`),
    getStats: () => apiClient.get('/api/products/stats'),
    getMyProducts: (queryString?: string) => 
        apiClient.get(`/api/products/my-products${queryString || ''}`),
    getLowStock: () => apiClient.get('/api/products/low-stock'),
    getFeatured: () => apiClient.get('/api/products/featured'),
    getById: (id: number) => apiClient.get(`/api/products/${id}`),
    getStockHistory: (id: number) => apiClient.get(`/api/products/${id}/stock-history`),
    create: (data: FormData) => apiClient.post('/api/products', data, true),
    update: (id: number, data: FormData) => apiClient.post(`/api/products/${id}`, data, true),
    delete: (id: number) => apiClient.delete(`/api/products/${id}`),
    adjustStock: (id: number, data: any) => 
        apiClient.post(`/api/products/${id}/adjust-stock`, data)
};

export const usersApi = {
    getAll: (queryString?: string) => 
        apiClient.get(`/api/users${queryString || ''}`),
    getStats: () => apiClient.get('/api/users/stats'),
    getProfile: () => apiClient.get('/api/users/profile'),
    getById: (id: number) => apiClient.get(`/api/users/${id}`),
    getByRole: (role: string) => apiClient.get(`/api/users/role/${role}`),
    getActivitySummary: (id: number) => apiClient.get(`/api/users/${id}/activity`),
    search: (queryString?: string) => 
        apiClient.get(`/api/users/search${queryString || ''}`),
    create: (data: any) => apiClient.post('/api/users', data),
    update: (id: number, data: any) => apiClient.put(`/api/users/${id}`, data),
    updateProfile: (data: any) => apiClient.put('/api/users/profile', data),
    changePassword: (data: any) => apiClient.post('/api/users/change-password', data),
    delete: (id: number) => apiClient.delete(`/api/users/${id}`),
    bulkUpdate: (data: any) => apiClient.post('/api/users/bulk-update', data)
};

// Shop API for public/customer access
export const shopApi = {
    getProducts: (queryString?: string) => 
        apiClient.get(`/api/shop/products${queryString || ''}`),
    getProduct: (id: number) => apiClient.get(`/api/shop/products/${id}`),
    getProductSuggestions: (query: string) => 
        apiClient.get(`/api/shop/products/suggestions?q=${encodeURIComponent(query)}`),
    getRecommendedProducts: (type: string = 'popular', limit: number = 6) => 
        apiClient.get(`/api/shop/products/recommended?type=${type}&limit=${limit}`),
    getCategories: () => apiClient.get('/api/shop/categories'),
    getProductsByCategory: (categoryId: number, queryString?: string) => 
        apiClient.get(`/api/shop/categories/${categoryId}/products${queryString || ''}`),
    getProductsBySeller: (sellerId: number, queryString?: string) => 
        apiClient.get(`/api/shop/sellers/${sellerId}/products${queryString || ''}`),
    searchProducts: (queryString?: string) => 
        apiClient.get(`/api/shop/search${queryString || ''}`),
    getFilters: () => apiClient.get('/api/shop/filters'),
    getStats: () => apiClient.get('/api/shop/stats'),
    getFeatured: () => apiClient.get('/api/shop/featured')
};

// Dashboard API
export const dashboardApi = {
    getStats: () => apiClient.get('/dashboard/stats'),
    getRecentActivity: () => apiClient.get('/dashboard/recent-activity'),
    
    // Customer dashboard
    getCustomerStats: () => apiClient.get('/customer/dashboard/stats'),
    getCustomerRecentActivity: () => apiClient.get('/customer/dashboard/recent-activity'),
    
    // Employee dashboard
    getEmployeeStats: () => apiClient.get('/api/employee/dashboard/stats'),
    getEmployeeTodaysBookings: () => apiClient.get('/api/employee/dashboard/todays-bookings'),
    getEmployeeCustomers: (queryString?: string) => 
        apiClient.get(`/api/employee/customers${queryString || ''}`),
    getEmployeeCustomerStats: () => apiClient.get('/api/employee/customers/stats'),
    getEmployeeSchedule: (queryString?: string) => 
        apiClient.get(`/api/employee/schedule${queryString || ''}`)
};

// Error handler helper
export const handleApiError = (error: ApiResponse) => {
    if (error.errors) {
        const errorMessages = Object.values(error.errors).flat().join(', ');
        console.error('API Validation Errors:', errorMessages);
        return errorMessages;
    } else {
        console.error('API Error:', error.message);
        return error.message || 'An unexpected error occurred';
    }
};

// Success message helper
export const showSuccess = (message: string) => {
    console.log('Success:', message);
};

// Toast notification placeholder (integrate with your toast library)
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`${type.toUpperCase()}: ${message}`);
};