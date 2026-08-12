// services/api.ts - Fixed API Service without CSRF token refresh

import type {
    ProductItem,
    ProductFormData,
    ProductStats,
    ProductResponse,
    ProductFilters,
    StockAdjustmentData,
    StockHistoryResponse,
    Category,
    CategoryFormData,
    CategoryResponse,
    CategoryFilters,
    Order,
    OrderResponse,
    ShopFilters,
    ShopStats,
    OrderFilters,
    OrderFormData,
    OrderStats,
    User,
    UserFormData,
    UserStats,
    UserResponse,
    UserFilters,
    ApiResponse,
    PaginationData
} from '../types/pet-types';

class ApiService {
    private getCSRFToken(): string {
        // Get CSRF token from meta tag only (no refresh)
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        return metaToken || '';
    }

    protected async request<T>(
        url: string,
        options: RequestInit = {}
    ): Promise<T> {
        // Get CSRF token for state-changing requests
        const needsCSRF = options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method.toUpperCase());
        const csrfToken = needsCSRF ? this.getCSRFToken() : '';

        const defaultOptions: RequestInit = {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
                ...(this.getAuthToken() && { 'Authorization': `Bearer ${this.getAuthToken()}` }),
                ...options.headers,
            },
            credentials: 'same-origin',
        };

        // Only set Content-Type for JSON requests (not for FormData)
        if (options.body && typeof options.body === 'string') {
            (defaultOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                if (text.trim()) {
                    try {
                        data = JSON.parse(text);
                    } catch {
                        throw new Error(`Unexpected response format: ${text.substring(0, 100)}...`);
                    }
                } else {
                    throw new Error('Empty response from server');
                }
            }

            if (!response.ok) {
                if (response.status === 419) {
                    // Session expired - provide better user experience
                    console.warn('CSRF token mismatch or session expired (419)');
                    this.handleSessionExpired();
                    throw new Error('Session expired. Your session token has been invalidated. Please refresh the page and try again.');
                }

                if (response.status === 401) {
                    console.warn('Unauthorized access (401)');
                    this.clearAuth();
                    this.handleUnauthorized();
                    throw new Error('You are not authorized to perform this action. Please log in again.');
                }

                if (response.status === 403) {
                    console.warn('Forbidden access (403)');
                    throw new Error('You do not have permission to perform this action.');
                }

                if (response.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                }

                // Handle validation and other errors
                if (data && typeof data === 'object') {
                    if (data.errors) {
                        const errorMessages = Object.entries(data.errors)
                            .map(([field, msgs]) => {
                                const messages = Array.isArray(msgs) ? msgs : [msgs];
                                return `${field}: ${messages.join(', ')}`;
                            })
                            .join('; ');
                        throw new Error(errorMessages);
                    }

                    if (data.message) {
                        throw new Error(data.message);
                    }
                }

                throw new Error(`Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);

            // Handle specific error types
            if (error instanceof Error) {
                if (error.message.includes('Session expired')) {
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else if (error.message.includes('not authorized')) {
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1000);
                }
            }

            throw error;
        }
    }

    private getAuthToken(): string | null {
        return localStorage.getItem('auth_token') ||
               sessionStorage.getItem('auth_token') ||
               document.querySelector('meta[name="auth-token"]')?.getAttribute('content') ||
               null;
    }

    private clearAuth(): void {
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
    }

    protected handleSessionExpired(): void {
        // Clear any local auth data
        this.clearAuth();

        // Show user-friendly message and reload after delay
        // This gives the user time to read the message
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }

    protected handleUnauthorized(): void {
        // Redirect to login page
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
    }

    protected refreshSession(): void {
        // Keep session alive by making a lightweight request
        fetch('/api/ping', {
            method: 'HEAD',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include'
        }).catch(() => {
            // Silent failure - session ping is non-critical
        });
    }
}

// Product Service with Image Upload Support
class ProductService extends ApiService {
    private baseURL = '/api/products';

    async getProducts(filters: ProductFilters = {}): Promise<ProductResponse> {
        const searchParams = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${searchParams.toString()}`;
        return this.request<ProductResponse>(url);
    }

    async getProduct(id: number): Promise<ApiResponse<ProductItem>> {
        return this.request<ApiResponse<ProductItem>>(`${this.baseURL}/${id}`);
    }

    async createProduct(data: ProductFormData): Promise<ApiResponse<ProductItem>> {
        // Handle file uploads with FormData
        if (data.images && data.images.length > 0) {
            return this.createProductWithImages(data);
        }

        return this.request<ApiResponse<ProductItem>>(this.baseURL, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async createProductWithImages(data: ProductFormData): Promise<ApiResponse<ProductItem>> {
        const formData = new FormData();

        // Append text fields
        Object.entries(data).forEach(([key, value]) => {
            if (key !== 'images' && value !== undefined && value !== null) {
                formData.append(key, value.toString());
            }
        });

        // Append image files
        if (data.images) {
            data.images.forEach((file, index) => {
                if (file instanceof File) {
                    formData.append(`images[${index}]`, file);
                }
            });
        }

        return this.request<ApiResponse<ProductItem>>(this.baseURL, {
            method: 'POST',
            body: formData,
        });
    }

    async updateProduct(id: number, data: Partial<ProductFormData>): Promise<ApiResponse<ProductItem>> {
        // Handle file uploads with FormData
        if (data.images && data.images.length > 0) {
            return this.updateProductWithImages(id, data);
        }

        return this.request<ApiResponse<ProductItem>>(`${this.baseURL}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async updateProductWithImages(id: number, data: Partial<ProductFormData>): Promise<ApiResponse<ProductItem>> {
        const formData = new FormData();

        // Add method override for PUT request with FormData
        formData.append('_method', 'PUT');

        // Append text fields
        Object.entries(data).forEach(([key, value]) => {
            if (key !== 'images' && value !== undefined && value !== null) {
                formData.append(key, value.toString());
            }
        });

        // Append image files
        if (data.images) {
            data.images.forEach((file, index) => {
                if (file instanceof File) {
                    formData.append(`images[${index}]`, file);
                }
            });
        }

        return this.request<ApiResponse<ProductItem>>(`${this.baseURL}/${id}`, {
            method: 'POST', // Use POST with _method override for file uploads
            body: formData,
        });
    }

    async deleteProduct(id: number): Promise<ApiResponse<null>> {
        return this.request<ApiResponse<null>>(`${this.baseURL}/${id}`, {
            method: 'DELETE',
        });
    }

    async deleteProductImage(productId: number, imageIndex: number): Promise<ApiResponse<ProductItem>> {
        return this.request<ApiResponse<ProductItem>>(`${this.baseURL}/${productId}/images/${imageIndex}`, {
            method: 'DELETE',
        });
    }

    async getStats(): Promise<ApiResponse<ProductStats>> {
        return this.request<ApiResponse<ProductStats>>(`${this.baseURL}/stats`);
    }

    async getMyProducts(filters: ProductFilters = {}): Promise<ProductResponse> {
        const searchParams = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}/my-products?${searchParams.toString()}`;
        return this.request<ProductResponse>(url);
    }

    async getLowStockProducts(): Promise<ApiResponse<ProductItem[]>> {
        return this.request<ApiResponse<ProductItem[]>>(`${this.baseURL}/low-stock`);
    }

    async getFeaturedProducts(): Promise<ApiResponse<ProductItem[]>> {
        return this.request<ApiResponse<ProductItem[]>>(`${this.baseURL}/featured`);
    }

    async adjustStock(id: number, data: StockAdjustmentData): Promise<ApiResponse<ProductItem>> {
        return this.request<ApiResponse<ProductItem>>(`${this.baseURL}/${id}/adjust-stock`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getStockHistory(id: number, page = 1): Promise<StockHistoryResponse> {
        return this.request<StockHistoryResponse>(`${this.baseURL}/${id}/stock-history?page=${page}`);
    }
}

// Category Service
class CategoryService extends ApiService {
    private baseURL = '/api/categories';

    async getCategories(filters: CategoryFilters = {}): Promise<CategoryResponse> {
        const searchParams = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${searchParams.toString()}`;
        return this.request<CategoryResponse>(url);
    }

    async getCategory(id: number): Promise<ApiResponse<Category>> {
        return this.request<ApiResponse<Category>>(`${this.baseURL}/${id}`);
    }

    async createCategory(data: CategoryFormData): Promise<ApiResponse<Category>> {
        return this.request<ApiResponse<Category>>(this.baseURL, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateCategory(id: number, data: Partial<CategoryFormData>): Promise<ApiResponse<Category>> {
        return this.request<ApiResponse<Category>>(`${this.baseURL}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteCategory(id: number): Promise<ApiResponse<null>> {
        return this.request<ApiResponse<null>>(`${this.baseURL}/${id}`, {
            method: 'DELETE',
        });
    }

    async getActiveCategories(): Promise<ApiResponse<Category[]>> {
        return this.request<ApiResponse<Category[]>>(`${this.baseURL}/active`);
    }

    async getCategoryProducts(id: number, filters: ProductFilters = {}): Promise<ApiResponse<{
        category: Category;
        products: ProductItem[];
        pagination: PaginationData;
    }>> {
        const searchParams = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}/${id}/products?${searchParams.toString()}`;
        return this.request(url);
    }
}

// User Service
class UserService extends ApiService {
    private baseURL = '/api/users';

    async getUsers(filters: UserFilters = {}): Promise<UserResponse> {
        const searchParams = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${searchParams.toString()}`;
        return this.request<UserResponse>(url);
    }

    async getUser(id: number): Promise<ApiResponse<User>> {
        return this.request<ApiResponse<User>>(`${this.baseURL}/${id}`);
    }

    async createUser(data: UserFormData): Promise<ApiResponse<User>> {
        return this.request<ApiResponse<User>>(this.baseURL, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateUser(id: number, data: Partial<UserFormData>): Promise<ApiResponse<User>> {
        return this.request<ApiResponse<User>>(`${this.baseURL}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteUser(id: number): Promise<ApiResponse<null>> {
        return this.request<ApiResponse<null>>(`${this.baseURL}/${id}`, {
            method: 'DELETE',
        });
    }

    async getStats(): Promise<ApiResponse<UserStats>> {
        return this.request<ApiResponse<UserStats>>(`${this.baseURL}/stats`);
    }
}

// Auth Service
class AuthService extends ApiService {
    async logout(): Promise<ApiResponse<{ redirect: string }>> {
        return this.request<ApiResponse<{ redirect: string }>>('/logout', {
            method: 'POST',
        });
    }

    async checkAuth(): Promise<ApiResponse<{ authenticated: boolean; user?: User }>> {
        return this.request<ApiResponse<{ authenticated: boolean; user?: User }>>('/check-auth');
    }
}

// Shop Service
class ShopService extends ApiService {
    private baseURL = '/api/shop';

    async getProducts(filters: ShopFilters = {}): Promise<ProductResponse> {
        const searchParams = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}/products?${searchParams.toString()}`;
        return this.request<ProductResponse>(url);
    }

    async getProduct(id: number): Promise<ApiResponse<ProductItem>> {
        return this.request<ApiResponse<ProductItem>>(`${this.baseURL}/products/${id}`);
    }

    async getCategories(): Promise<ApiResponse<Category[]>> {
        return this.request<ApiResponse<Category[]>>(`${this.baseURL}/categories`);
    }

    async getFeaturedProducts(): Promise<ApiResponse<ProductItem[]>> {
        return this.request<ApiResponse<ProductItem[]>>(`${this.baseURL}/featured`);
    }

    async getProductsByCategory(categoryId: number, filters: ShopFilters = {}): Promise<ApiResponse<{
        category: Category;
        products: ProductItem[];
        pagination: PaginationData;
    }>> {
        const searchParams = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}/categories/${categoryId}/products?${searchParams.toString()}`;
        return this.request(url);
    }

    async getProductsBySeller(sellerId: number, filters: ShopFilters = {}): Promise<ApiResponse<{
        seller: Partial<User>;
        products: ProductItem[];
        pagination: PaginationData;
    }>> {
        const searchParams = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}/sellers/${sellerId}/products?${searchParams.toString()}`;
        return this.request(url);
    }

    async searchProducts(query: string, filters: ShopFilters = {}): Promise<ProductResponse> {
        const searchParams = new URLSearchParams();
        searchParams.append('q', query);

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}/search?${searchParams.toString()}`;
        return this.request<ProductResponse>(url);
    }

    async getStats(): Promise<ApiResponse<ShopStats>> {
        return this.request<ApiResponse<ShopStats>>(`${this.baseURL}/stats`);
    }
}

// Order Service
class OrderService extends ApiService {
    private baseURL = '/api/orders';

    async getOrders(filters: OrderFilters = {}): Promise<OrderResponse> {
        const searchParams = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${searchParams.toString()}`;
        return this.request<OrderResponse>(url);
    }

    async getOrder(id: number): Promise<ApiResponse<Order>> {
        return this.request<ApiResponse<Order>>(`${this.baseURL}/${id}`);
    }

    async createOrder(data: OrderFormData): Promise<ApiResponse<Order[]>> {
        return this.request<ApiResponse<Order[]>>(this.baseURL, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateOrderStatus(id: number, data: { status: string; notes?: string }): Promise<ApiResponse<Order>> {
        return this.request<ApiResponse<Order>>(`${this.baseURL}/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async getMyOrders(filters: OrderFilters = {}): Promise<OrderResponse> {
        const searchParams = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}/my-orders?${searchParams.toString()}`;
        return this.request<OrderResponse>(url);
    }

    async getSellerOrders(filters: OrderFilters = {}): Promise<OrderResponse> {
        const searchParams = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}/seller-orders?${searchParams.toString()}`;
        return this.request<OrderResponse>(url);
    }

    async getStats(): Promise<ApiResponse<OrderStats>> {
        return this.request<ApiResponse<OrderStats>>(`${this.baseURL}/stats`);
    }
}

// Main API class
class API {
    public products: ProductService;
    public categories: CategoryService;
    public users: UserService;
    public auth: AuthService;
    public shop: ShopService;
    public orders: OrderService;

    constructor() {
        this.products = new ProductService();
        this.categories = new CategoryService();
        this.users = new UserService();
        this.auth = new AuthService();
        this.shop = new ShopService();
        this.orders = new OrderService();
    }
}

// Export services
export const api = new API();
export const shopService = api.shop;
export const orderService = api.orders;
