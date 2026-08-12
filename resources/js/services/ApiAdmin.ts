// ApiAdmin.ts - Complete Admin API Client with ALL Backend Routes
import Swal, { SweetAlertResult } from 'sweetalert2';

declare global {
    interface Window {
        Laravel?: {
            csrfToken?: string;
        };
    }
}

interface ApiResponse<T = any> {
    success?: boolean;
    message?: string;
    data?: T;
    errors?: Record<string, string[]>;
    status?: number;
}

interface ErrorResponse {
    success: boolean;
    message: string;
    errors: Record<string, string[]>;
    status?: number;
}

// ==================== DATA TYPE DEFINITIONS ====================

// ✅ UPDATED: Complete UserData interface
interface UserData {
    name: string;
    email: string;
    password?: string;
    password_confirmation?: string;
    phone?: string;
    address?: string;

    // FIXED ROLE
    role?: string;

    is_active?: boolean;
    status?: 'active' | 'inactive';

    employee_id?: string;
    position?: 'dentist' | 'hygienist' | 'assistant' | 'receptionist';
    license_number?: string;
    license_expiry?: string;
    hire_date?: string;
    hourly_rate?: number;
    specializations?: string[];
    bio?: string;
    years_experience?: number;

    birthday?: string;
    gender?: 'male' | 'female' | 'other';
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;
    insurance_provider?: string;
    insurance_number?: string;
    medical_history?: string;
    allergies?: string;
    current_medications?: string;
    blood_type?: string;
}


interface StaffData {
    user_id?: number;
    employee_id?: string;
    position?: 'dentist' | 'hygienist' | 'assistant' | 'receptionist';
    specialization?: string;
    license_number?: string;
    license_expiry?: string;
    department?: string;
    hire_date?: string;
    hourly_rate?: number;
    is_available?: boolean;
    bio?: string;
    years_experience?: number;
}

interface PatientData {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
    medical_history?: string;
}

interface AppointmentData {
    patient_id: number;
    doctor_id: number;
    service_id: number;
    appointment_date: string;
    appointment_time: string;
    duration_minutes?: number;
    status?: string;
    notes?: string;
}

interface ServiceData {
    name: string;
    description?: string;
    price: number;
    duration_minutes: number;
    category?: string;
    is_active?: boolean;
}

interface TreatmentPlanData {
    patient_id: number;
    doctor_id: number;
    diagnosis?: string;
    treatment_description?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
}

interface PatientRecordData {
    patient_id: number;
    doctor_id: number;
    appointment_id?: number;
    record_type?: string;
    diagnosis?: string;
    treatment?: string;
    prescriptions?: string;
    notes?: string;
    record_date?: string;
}

interface FinancialRecordData {
    appointment_id?: number;
    patient_id: number;
    amount: number;
    payment_method?: string;
    description?: string;
    notes?: string;
    transaction_date?: string;
}

interface ScheduleData {
    staff_id: number;
    date: string;         // ✅ Correct - matches DB
    start_time: string;
    end_time: string;
    is_available?: boolean;
    notes?: string;       // ✅ Added - matches DB
}

class ApiAdmin {
    private baseURL: string;

    constructor() {
        this.baseURL = window.location.origin;
    }

    // ================================
    // CORE PRIVATE METHODS
    // ================================
    private getCSRFToken(): string {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                      window.Laravel?.csrfToken ||
                      (document.querySelector('input[name="_token"]') as HTMLInputElement)?.value ||
                      this.getXSRFTokenFromCookie();

        return token || '';
    }

    private getXSRFTokenFromCookie(): string {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    private async refreshCsrfToken(): Promise<string> {
        try {
            const response = await fetch('/csrf-token', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                return this.getCSRFToken();
            }

            const data = await response.json();
            const token = data?.csrfToken || this.getCSRFToken();

            const meta = document.querySelector('meta[name="csrf-token"]');
            if (meta && token) {
                meta.setAttribute('content', token);
            }

            return token || '';
        } catch {
            return this.getCSRFToken();
        }
    }

    private async request<T>(
        url: string,
        options: RequestInit & { timeout?: number } = {}
    ): Promise<T> {
        const { timeout = 10000, ...fetchOptions } = options;

        const needsCSRF = options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method.toUpperCase());
        const prefetchHeader = (options.headers as Record<string, string> | undefined)?.['X-CSRF-PREFETCH'];
        let csrfToken = needsCSRF ? this.getCSRFToken() : '';
        if (needsCSRF && !prefetchHeader) {
            csrfToken = await this.refreshCsrfToken();
            options = {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    'X-CSRF-PREFETCH': '1',
                },
            };
        } else if (needsCSRF && !csrfToken) {
            csrfToken = await this.refreshCsrfToken();
        }
        const xsrfToken = this.getXSRFTokenFromCookie();

        const defaultOptions: RequestInit = {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
                ...(xsrfToken && { 'X-XSRF-TOKEN': xsrfToken }),
                ...options.headers,
            },
            credentials: 'same-origin',
            signal: AbortSignal.timeout(timeout),
        };

        if (options.body && typeof options.body === 'string') {
            (defaultOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        try {
            console.log(`API Request: ${options.method || 'GET'} ${url}`);

            const response = await fetch(url, { ...defaultOptions, ...fetchOptions });
            const contentType = response.headers.get('content-type');
            let data: any;

            console.log('API Response Status:', response.status);

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && contentType.includes('text/html')) {
                if (response.redirected || response.url.includes('/login')) {
                    throw new Error('Session expired - please refresh the page');
                }
                const text = await response.text();
                throw new Error(`Unexpected response format: ${text.substring(0, 100)}...`);
            } else {
                const text = await response.text();
                if (text.trim()) {
                    if (text.trim().startsWith('<!DOCTYPE html')) {
                        if (response.redirected || response.url.includes('/login')) {
                            throw new Error('Session expired - please refresh the page');
                        }
                        throw new Error(`Unexpected response format: ${text.substring(0, 100)}...`);
                    }
                    try {
                        data = JSON.parse(text);
                    } catch {
                        throw new Error(`Unexpected response format: ${text.substring(0, 100)}...`);
                    }
                } else {
                    data = { success: true };
                }
            }

            console.log('API Response Data:', data);

            if (!response.ok) {
                if (response.status === 419) {
                    console.error('CSRF token expired');
                    const retryHeader = (options.headers as Record<string, string> | undefined)?.['X-CSRF-RETRY'];
                    if (!retryHeader) {
                        const refreshedToken = await this.refreshCsrfToken();
                        return this.request<T>(url, {
                            ...options,
                            headers: {
                                ...(options.headers || {}),
                                ...(refreshedToken && { 'X-CSRF-TOKEN': refreshedToken }),
                                'X-CSRF-RETRY': '1',
                            },
                        });
                    }
                    throw new Error('Session expired - please refresh the page');
                }

                if (response.status === 401) {
                    throw new Error('You are not authorized to perform this action. Please log in again.');
                }

                if (response.status === 403) {
                    throw new Error('You do not have permission to perform this action.');
                }

                if (response.status >= 500) {
                    console.error('Server error - check Laravel logs');
                    throw new Error('Server error - please try again later');
                }

                if (response.status === 422) {
                    console.error('Validation error');
                    const error: any = new Error('Validation failed');
                    error.response = { status: response.status, data };
                    throw error;
                }

                if (data && typeof data === 'object') {
                    if (data.errors) {
                        const error: any = new Error(data.message || 'Validation failed');
                        error.response = { status: response.status, data };
                        throw error;
                    }

                    if (data.message) {
                        throw new Error(data.message);
                    }
                }

                throw new Error(`Request failed with status ${response.status}`);
            }

            return data;
        } catch (error: any) {
            console.error('API Error:', error);

            if (error.name === 'TimeoutError' || error.name === 'AbortError') {
                console.error('Request timeout - server took too long to respond');
                throw new Error('Request timeout - please try again');
            } else if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error('Network error - check your connection');
                throw new Error('Network error - check your connection');
            }

            throw error;
        }
    }

    private cleanParams(params: Record<string, any>): Record<string, string> {
        return Object.keys(params).reduce((acc, key) => {
            const value = params[key];
            if (value !== null && value !== undefined && value !== '') {
                acc[key] = value.toString();
            }
            return acc;
        }, {} as Record<string, string>);
    }

    private handleResponse<T>(response: ApiResponse<T>): T {
        return response.data || response as any;
    }

    private handleError(error: any, context: string = 'operation'): ErrorResponse {
        const message = error.response?.data?.message || error.message || `Failed to complete ${context}.`;
        const errors = error.response?.data?.errors || {};

        console.error(`API Error (${context}):`, error);

        return {
            success: false,
            message,
            errors,
            status: error.response?.status
        };
    }

    // ================================
    // USER MANAGEMENT (ADMIN ONLY)
    // ================================
    async getUsers(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/users?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch users');
        }
    }

    async createUser(userData: UserData): Promise<any> {
        try {
            const response = await this.request<any>('/api/users', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'User created successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'create user');
            await Swal.fire({
                icon: 'error',
                title: 'Error Creating User',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async getUserStats(): Promise<any> {
        try {
            const response = await this.request<any>('/api/users/stats', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch user stats');
        }
    }

    async getUsersByRole(role: string): Promise<any> {
        try {
            const response = await this.request<any>(`/api/users/role/${role}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch users by role');
        }
    }

    async bulkUpdateUsers(data: { user_ids: number[], updates: Record<string, any> }): Promise<any> {
        try {
            const response = await this.request<any>('/api/users/bulk-update', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Users updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'bulk update users');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async bulkUpdateUserStatus(data: { user_ids: number[], is_active: boolean }): Promise<any> {
        try {
            const response = await this.request<any>('/api/users/bulk-update-status', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'User status updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'bulk update user status');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async updateUser(id: number, userData: Partial<UserData>): Promise<any> {
        try {
            const response = await this.request<any>(`/api/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'User updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'update user');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async deleteUser(id: number, name?: string): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Delete User',
                text: name
                    ? `Are you sure you want to delete ${name}? This action cannot be undone.`
                    : 'Are you sure you want to delete this user? This action cannot be undone.',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/users/${id}`, {
                method: 'DELETE'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'User has been deleted successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'delete user');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async getUserActivity(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/users/${id}/activity`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch user activity');
        }
    }

    async activateUser(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/users/${id}/activate`, {
                method: 'PATCH'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'User activated successfully.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'activate user');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async deactivateUser(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/users/${id}/deactivate`, {
                method: 'PATCH'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'User deactivated successfully.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'deactivate user');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async resetUserPassword(id: number): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Reset Password',
                text: 'Are you sure you want to reset this user\'s password?',
                showCancelButton: true,
                confirmButtonColor: '#F59E0B',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, reset it',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/users/${id}/reset-password`, {
                method: 'PATCH'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Password reset email sent.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'reset password');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async exportUserData(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/users/export-data/${id}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'export user data');
        }
    }

    async getUser(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/users/${id}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch user');
        }
    }

    // ================================
    // STAFF MANAGEMENT (ADMIN ONLY)
    // ================================
    async getStaff(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/staff?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch staff');
        }
    }

    async getStaffMember(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/staff/${id}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch staff member');
        }
    }

    async createStaff(staffData: StaffData): Promise<any> {
        try {
            const response = await this.request<any>('/api/staff', {
                method: 'POST',
                body: JSON.stringify(staffData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Staff member created successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'create staff');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async updateStaff(id: number, staffData: Partial<StaffData>): Promise<any> {
        try {
            const response = await this.request<any>(`/api/staff/${id}`, {
                method: 'PUT',
                body: JSON.stringify(staffData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Staff member updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'update staff');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async deleteStaff(id: number): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Delete Staff Member',
                text: 'Are you sure you want to delete this staff member?',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/staff/${id}`, {
                method: 'DELETE'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Staff member has been deleted successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'delete staff');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    // ================================
    // ADMIN DASHBOARD
    // ================================
    async getAdminStats(): Promise<any> {
        try {
            const response = await this.request<any>('/api/admin/stats', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch admin stats');
        }
    }

    async getAdminDashboardStats(): Promise<any> {
        try {
            const response = await this.request<any>('/api/admin/dashboard-stats', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch admin dashboard stats');
        }
    }

    async getSystemHealth(): Promise<any> {
        try {
            const response = await this.request<any>('/api/admin/system-health', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch system health');
        }
    }

    async getSystemAnalytics(): Promise<any> {
        try {
            const response = await this.request<any>('/api/admin/analytics', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch system analytics');
        }
    }

    async getUserActivityLogs(): Promise<any> {
        try {
            const response = await this.request<any>('/api/admin/user-activity', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch user activity');
        }
    }

    async getFinancialSummary(): Promise<any> {
        try {
            const response = await this.request<any>('/api/admin/financial-summary', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch financial summary');
        }
    }

    async backupSystem(): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'info',
                title: 'Backup System',
                text: 'Are you sure you want to create a system backup?',
                showCancelButton: true,
                confirmButtonColor: '#3B82F6',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, backup now',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>('/api/admin/backup-system', {
                method: 'POST',
                body: JSON.stringify({})
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'System backup initiated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'backup system');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    // ================================
    // DATA EXPORT (ADMIN ONLY)
    // ================================
    async exportPatients(): Promise<any> {
        try {
            const response = await this.request<any>('/api/export/patients', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'export patients');
        }
    }

    async exportAppointments(startDate?: string, endDate?: string): Promise<any> {
        try {
            const params: Record<string, string> = {};
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const searchParams = new URLSearchParams(params);
            const response = await this.request<any>(`/api/export/appointments?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'export appointments');
        }
    }

    async exportFinancialRecords(startDate?: string, endDate?: string): Promise<any> {
        try {
            const params: Record<string, string> = {};
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const searchParams = new URLSearchParams(params);
            const response = await this.request<any>(`/api/export/financial-records?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'export financial records');
        }
    }

    // Download financial records PDF and trigger browser download
    async downloadFinancialRecordsPdf(startDate?: string, endDate?: string): Promise<void> {
        try {
            const params: Record<string, string> = {};
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const searchParams = new URLSearchParams(params);
            const url = `/api/export/financial-records?${searchParams.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to download PDF: ${response.status}`);
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `financial_records_${new Date().toISOString().slice(0,10)}.pdf`;
            if (contentDisposition) {
                const match = /filename=\"?([^\";]+)\"?/.exec(contentDisposition);
                if (match && match[1]) filename = match[1];
            }

            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            const err = this.handleError(error, 'download financial records PDF');
            throw err;
        }
    }

    // ================================
    // BULK OPERATIONS (ADMIN ONLY)
    // ================================
    async bulkCancelAppointments(appointmentIds: number[], reason?: string): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Bulk Cancel Appointments',
                text: `Are you sure you want to cancel ${appointmentIds.length} appointments?`,
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, cancel them',
                cancelButtonText: 'No'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>('/api/bulk/appointments/cancel', {
                method: 'POST',
                body: JSON.stringify({ appointment_ids: appointmentIds, reason })
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Appointments cancelled successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'bulk cancel appointments');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async bulkCreateNotifications(data: {
        user_ids: number[];
        title: string;
        message: string;
        type: string;
    }): Promise<any> {
        try {
            const response = await this.request<any>('/api/bulk/notifications/create', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Notifications created successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'bulk create notifications');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async bulkSendReminders(appointmentIds: number[], reminderType: string): Promise<any> {
        try {
            const response = await this.request<any>('/api/bulk/reminders/send', {
                method: 'POST',
                body: JSON.stringify({ appointment_ids: appointmentIds, reminder_type: reminderType })
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Reminders sent successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'bulk send reminders');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async importPatients(csvData: string): Promise<any> {
        try {
            const response = await this.request<any>('/api/bulk/patients/import', {
                method: 'POST',
                body: JSON.stringify({ csv_data: csvData })
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Patients imported successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'import patients');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    // ================================
    // PATIENTS
    // ================================
    async getPatients(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/patients?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch patients');
        }
    }

    async getPatient(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/patients/${id}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch patient');
        }
    }

    async createPatient(patientData: PatientData): Promise<any> {
        try {
            const response = await this.request<any>('/api/patients', {
                method: 'POST',
                body: JSON.stringify(patientData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Patient created successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'create patient');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async updatePatient(id: number, patientData: Partial<PatientData>): Promise<any> {
        try {
            const response = await this.request<any>(`/api/patients/${id}`, {
                method: 'PUT',
                body: JSON.stringify(patientData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Patient updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'update patient');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async deletePatient(id: number): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Delete Patient',
                text: 'Are you sure you want to delete this patient?',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/patients/${id}`, {
                method: 'DELETE'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Patient has been deleted successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'delete patient');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    // ================================
    // APPOINTMENTS
    // ================================
    async getAppointments(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/appointments?${searchParams.toString()}`, { method: 'GET'});
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch appointments');
        }
    }

    async getAppointment(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/appointments/${id}`, { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch appointment');
        }
    }

    async createAppointment(appointmentData: any): Promise<any> {
        try {
            const response = await this.request<any>('/api/appointments', {
                method: 'POST',
                body: JSON.stringify(appointmentData),
                timeout: 30000 // 30 seconds - appointment creation includes financial record, blockchain hash, and notifications
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Appointment created successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'create appointment');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async updateAppointment(id: number, appointmentData: any): Promise<any> {
        try {
            const response = await this.request<any>(`/api/appointments/${id}`, {
                method: 'PUT',
                body: JSON.stringify(appointmentData),
                timeout: 30000 // 30 seconds - may involve financial record operations
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Appointment updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'update appointment');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async deleteAppointment(id: number): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Delete Appointment',
                text: 'Are you sure you want to delete this appointment?',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/appointments/${id}`, {
                method: 'DELETE'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Appointment has been deleted successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'delete appointment');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async checkInAppointment(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/appointments/${id}/check-in`, {
                method: 'POST',
                body: JSON.stringify({})
            });

            await Swal.fire({
                icon: 'success',
                title: 'Checked In',
                text: 'Patient checked in successfully.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'check in appointment');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async completeAppointment(id: number, completionNotes?: string): Promise<any> {
        try {
            const response = await this.request<any>(`/api/appointments/${id}/complete`, {
                method: 'POST',
                body: JSON.stringify({ completion_notes: completionNotes }),
                timeout: 30000 // 30 seconds - auto-creates financial record and blockchain hash
            });

            await Swal.fire({
                icon: 'success',
                title: 'Completed',
                text: 'Redirecting to transaction form. Appointment completes after a record is created.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'complete appointment');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async getFinancialFormDataFromAppointment(appointmentId: number): Promise<any> {
        try {
            const response = await this.request<any>(
                `/api/financial-records/form-data/from-appointment/${appointmentId}`,
                { method: 'GET' }
            );
            return this.handleResponse(response);
        } catch (error: any) {
            const errorData = this.handleError(error, 'get financial form data');
            // For this method, don't show Swal as parent component will handle it
            // Just re-throw with proper error structure
            throw {
                response: error.response,
                message: errorData.message
            };
        }
    }

    async confirmAppointmentPayment(id: number, paymentMethod: string, notes?: string): Promise<any> {
        try {
            const response = await this.request<any>(`/api/appointments/${id}/confirm-payment`, {
                method: 'POST',
                body: JSON.stringify({
                    payment_method: paymentMethod,
                    notes: notes
                })
            });

            await Swal.fire({
                icon: 'success',
                title: 'Payment Confirmed',
                text: 'Payment has been confirmed successfully.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                },
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'confirm payment');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async cancelAppointment(id: number, reason?: string): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Cancel Appointment',
                text: 'Are you sure you want to cancel this appointment?',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, cancel it',
                cancelButtonText: 'No'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/appointments/${id}/cancel`, {
                method: 'POST',
                body: JSON.stringify({ reason })
            });

            await Swal.fire({
                icon: 'success',
                title: 'Cancelled',
                text: 'Appointment has been cancelled.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'cancel appointment');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async quickConfirmAppointment(id: number): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'question',
                title: 'Quick Confirm',
                text: 'Confirm this appointment?',
                showCancelButton: true,
                confirmButtonColor: '#3B82F6',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, confirm',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/appointments/${id}/quick-confirm`, {
                method: 'POST'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Confirmed',
                text: 'Appointment has been confirmed.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'confirm appointment');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    // ================================
    // SERVICES
    // ================================
    async getServices(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/services?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch services');
        }
    }

    async getService(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/services/${id}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch service');
        }
    }

    async createService(serviceData: ServiceData): Promise<any> {
        try {
            const response = await this.request<any>('/api/services', {
                method: 'POST',
                body: JSON.stringify(serviceData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Service created successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'create service');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async updateService(id: number, serviceData: Partial<ServiceData>): Promise<any> {
        try {
            const response = await this.request<any>(`/api/services/${id}`, {
                method: 'PUT',
                body: JSON.stringify(serviceData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Service updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'update service');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async deleteService(id: number): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Delete Service',
                text: 'Are you sure you want to delete this service?',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/services/${id}`, {
                method: 'DELETE'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Service has been deleted successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'delete service');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    // ================================
    // TOOTH RECORDS
    // ================================

    // Test method to verify methods are being compiled
    async testToothRecordsMethod(): Promise<any> {
        return { test: 'hello' };
    }

    async getToothRecords(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/tooth-records?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch tooth records');
        }
    }

    async getToothRecordsByAppointment(appointmentId: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/appointments/${appointmentId}/tooth-records`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch tooth records for appointment');
        }
    }

    async getToothRecord(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/tooth-records/${id}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch tooth record');
        }
    }

    async createToothRecord(recordData: any): Promise<any> {
        try {
            const response = await this.request<any>('/api/tooth-records', {
                method: 'POST',
                body: JSON.stringify(recordData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Tooth record created successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'create tooth record');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async updateToothRecord(id: number, recordData: any): Promise<any> {
        try {
            const response = await this.request<any>(`/api/tooth-records/${id}`, {
                method: 'PUT',
                body: JSON.stringify(recordData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Tooth record updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'update tooth record');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async deleteToothRecord(id: number): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Delete Tooth Record',
                text: 'Are you sure you want to delete this tooth record?',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/tooth-records/${id}`, {
                method: 'DELETE'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Tooth record has been deleted successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'delete tooth record');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async markToothRecordReviewed(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/tooth-records/${id}/mark-reviewed`, {
                method: 'POST'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Tooth record marked as reviewed.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'mark tooth record as reviewed');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    // ================================
    // PATIENT RECORDS
    // ================================
    async getPatientRecords(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/patient-records?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch patient records');
        }
    }

    async getPatientRecord(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/patient-records/${id}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch patient record');
        }
    }

    async createPatientRecord(recordData: PatientRecordData): Promise<any> {
        try {
            const response = await this.request<any>('/api/patient-records', {
                method: 'POST',
                body: JSON.stringify(recordData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Patient record created successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'create patient record');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async updatePatientRecord(id: number, recordData: Partial<PatientRecordData>): Promise<any> {
        try {
            const response = await this.request<any>(`/api/patient-records/${id}`, {
                method: 'PUT',
                body: JSON.stringify(recordData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Patient record updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'update patient record');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async deletePatientRecord(id: number): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Delete Patient Record',
                text: 'Are you sure you want to delete this patient record?',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/patient-records/${id}`, {
                method: 'DELETE'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Patient record has been deleted successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'delete patient record');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    // ================================
    // TREATMENT PLANS
    // ================================
    async getTreatmentPlans(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/treatment-plans?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch treatment plans');
        }
    }

    async getTreatmentPlan(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/treatment-plans/${id}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch treatment plan');
        }
    }

    async createTreatmentPlan(planData: TreatmentPlanData): Promise<any> {
        try {
            const response = await this.request<any>('/api/treatment-plans', {
                method: 'POST',
                body: JSON.stringify(planData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Treatment plan created successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'create treatment plan');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async updateTreatmentPlan(id: number, planData: Partial<TreatmentPlanData>): Promise<any> {
        try {
            const response = await this.request<any>(`/api/treatment-plans/${id}`, {
                method: 'PUT',
                body: JSON.stringify(planData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Treatment plan updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'update treatment plan');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async deleteTreatmentPlan(id: number): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Delete Treatment Plan',
                text: 'Are you sure you want to delete this treatment plan?',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/treatment-plans/${id}`, {
                method: 'DELETE'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Treatment plan has been deleted successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'delete treatment plan');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async approveTreatmentPlan(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/treatment-plans/${id}/approve`, {
                method: 'POST',
                body: JSON.stringify({})
            });

            await Swal.fire({
                icon: 'success',
                title: 'Approved',
                text: 'Treatment plan has been approved.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'approve treatment plan');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async startTreatmentPlan(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/treatment-plans/${id}/start`, {
                method: 'POST',
                body: JSON.stringify({})
            });

            await Swal.fire({
                icon: 'success',
                title: 'Started',
                text: 'Treatment plan has been started.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'start treatment plan');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async completeTreatmentPlan(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/treatment-plans/${id}/complete`, {
                method: 'POST',
                body: JSON.stringify({})
            });

            await Swal.fire({
                icon: 'success',
                title: 'Completed',
                text: 'Treatment plan has been completed.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'complete treatment plan');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    // ================================
    // FINANCIAL RECORDS
    // ================================
    async getFinancialRecords(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/financial-records?${searchParams.toString()}`, {
                method: 'GET'
            });
            // Return full response including summary and pagination
            return response;
        } catch (error) {
            throw this.handleError(error, 'fetch financial records');
        }
    }

    async getFinancialRecord(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/financial-records/${id}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch financial record');
        }
    }

    async getFinancialReportSummary(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/financial-records/reports/summary?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch financial report summary');
        }
    }

    async createFinancialRecord(recordData: FinancialRecordData): Promise<any> {
        try {
            const response = await this.request<any>('/api/financial-records', {
                method: 'POST',
                body: JSON.stringify(recordData),
                timeout: 30000
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Financial record created successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'create financial record');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async updateFinancialRecord(id: number, recordData: Partial<FinancialRecordData>): Promise<any> {
        try {
            const response = await this.request<any>(`/api/financial-records/${id}`, {
                method: 'PUT',
                body: JSON.stringify(recordData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Financial record updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'update financial record');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async deleteFinancialRecord(id: number, description?: string): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Delete Financial Record',
                text: description
                    ? `Are you sure you want to delete ${description}?`
                    : 'Are you sure you want to delete this financial record?',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/financial-records/${id}`, {
                method: 'DELETE'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Financial record has been deleted successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'delete financial record');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async markFinancialRecordAsPaid(id: number, data?: { payment_method?: string; notes?: string }): Promise<any> {
        try {
            const response = await this.request<any>(`/api/financial-records/${id}/mark-as-paid`, {
                method: 'POST',
                body: JSON.stringify(data || { payment_method: 'cash' })
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Financial record marked as paid.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'mark as paid');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async calculateRemainingBalance(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/financial-records/${id}/remaining-balance`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'calculate remaining balance');
        }
    }

    async createPartialPaymentFollowUp(id: number, data: { amount: number; payment_method: string; notes?: string }): Promise<any> {
        try {
            const response = await this.request<any>(`/api/financial-records/${id}/create-partial-followup`, {
                method: 'POST',
                body: JSON.stringify(data),
                timeout: 30000
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Partial payment follow-up transaction created successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'create partial payment follow-up');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async verifyFinancialBlockchainChain(): Promise<any> {
        try {
            const response = await this.request<any>('/api/financial-records/blockchain/verify-chain', {
                method: 'POST',
                timeout: 60000 // 60 seconds timeout for large verifications
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'verify financial blockchain chain');
        }
    }

    async markFinancialRecordAsVerified(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/financial-records/${id}/mark-as-verified`, {
                method: 'POST',
                body: JSON.stringify({})
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'mark financial record as verified');
        }
    }

    async generateDetailedBlockchainVerificationReport(): Promise<any> {
        try {
            const response = await this.request<any>('/api/blockchain/generate-detailed-report', {
                method: 'POST',
                timeout: 60000 // 60 seconds timeout for large reports
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'generate detailed blockchain verification report');
        }
    }

    async getBlockchainStatistics(): Promise<any> {
        try {
            const response = await this.request<any>('/api/financial-records/blockchain/statistics', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch blockchain statistics');
        }
    }

    async repairDataIntegrity(): Promise<any> {
        try {
            const response = await this.request<any>('/api/financial-records/data-integrity/repair', {
                method: 'POST',
                timeout: 120000 // 120 seconds timeout for factory reset and rebuild
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'repair data integrity');
        }
    }

    async getIntegrityRepairReports(): Promise<any> {
        try {
            const response = await this.request<any>('/api/financial-records/data-integrity/reports', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch integrity repair reports');
        }
    }

    // ================================
    // SCHEDULES
    // ================================
    async getSchedules(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/schedules?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch schedules');
        }
    }

    async getSchedule(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/schedules/${id}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch schedule');
        }
    }

    async createSchedule(scheduleData: ScheduleData): Promise<any> {
        try {
            const response = await this.request<any>('/api/schedules', {
                method: 'POST',
                body: JSON.stringify(scheduleData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Schedule created successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'create schedule');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async updateSchedule(id: number, scheduleData: Partial<ScheduleData>): Promise<any> {
        try {
            const response = await this.request<any>(`/api/schedules/${id}`, {
                method: 'PUT',
                body: JSON.stringify(scheduleData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Schedule updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'update schedule');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async deleteSchedule(id: number): Promise<any> {
        try {
            const result: SweetAlertResult = await Swal.fire({
                icon: 'warning',
                title: 'Delete Schedule',
                text: 'Are you sure you want to delete this schedule?',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return null;

            const response = await this.request<any>(`/api/schedules/${id}`, {
                method: 'DELETE'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Schedule has been deleted successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'delete schedule');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async makeScheduleUnavailable(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/schedules/${id}/make-unavailable`, {
                method: 'POST',
                body: JSON.stringify({})
            });

            await Swal.fire({
                icon: 'success',
                title: 'Updated',
                text: 'Schedule marked as unavailable.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'make schedule unavailable');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async makeScheduleAvailable(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/schedules/${id}/make-available`, {
                method: 'POST',
                body: JSON.stringify({})
            });

            await Swal.fire({
                icon: 'success',
                title: 'Updated',
                text: 'Schedule marked as available.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'make schedule available');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    // ================================
    // REPORTS
    // ================================
    async getReports(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/reports?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch reports');
        }
    }

    async getFinancialReport(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/reports/financial?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch financial report');
        }
    }

    async getAppointmentsReport(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/reports/appointments?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch appointments report');
        }
    }

    async getPatientsReport(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/reports/patients?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch patients report');
        }
    }

    async getStaffReport(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/reports/staff?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch staff report');
        }
    }

    async getAuditReport(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/reports/audit?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch audit report');
        }
    }

    // ================================
    // DASHBOARD
    // ================================
    async getDashboardData(): Promise<any> {
        try {
            const response = await this.request<any>('/api/dashboard/data', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch dashboard data');
        }
    }

    async getDashboardStats(): Promise<any> {
        try {
            const response = await this.request<any>('/api/dashboard/stats', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch dashboard stats');
        }
    }

    async getRecentActivity(): Promise<any> {
        try {
            const response = await this.request<any>('/api/dashboard/recent-activity', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch recent activity');
        }
    }

    async getDashboardAlerts(): Promise<any> {
        try {
            const response = await this.request<any>('/api/dashboard/alerts', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch dashboard alerts');
        }
    }

    // ================================
    // USER PROFILE
    // ================================
    async getUserProfile(): Promise<any> {
        try {
            const response = await this.request<any>('/api/users/profile', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch user profile');
        }
    }

    async updateUserProfile(profileData: Record<string, any>): Promise<any> {
        try {
            const response = await this.request<any>('/api/users/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Profile updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'update profile');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async changePassword(passwordData: { current_password: string; new_password: string; new_password_confirmation: string }): Promise<any> {
        try {
            const response = await this.request<any>('/api/users/change-password', {
                method: 'POST',
                body: JSON.stringify(passwordData)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Password changed successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;

            const errorData = this.handleError(error, 'change password');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async updatePreferences(preferences: Record<string, any>): Promise<any> {
        try {
            const response = await this.request<any>('/api/users/preferences', {
                method: 'PATCH',
                body: JSON.stringify(preferences)
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Preferences updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            const errorData = this.handleError(error, 'update preferences');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async searchUsers(query: string): Promise<any> {
        try {
            const response = await this.request<any>(`/api/users/search?q=${encodeURIComponent(query)}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'search users');
        }
    }

    async getUserNotifications(): Promise<any> {
        try {
            const response = await this.request<any>('/api/users/notifications', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch user notifications');
        }
    }

    async markUserNotificationsRead(notificationIds: number[]): Promise<any> {
        try {
            const response = await this.request<any>('/api/users/notifications/mark-read', {
                method: 'POST',
                body: JSON.stringify({ notification_ids: notificationIds })
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'mark notifications as read');
        }
    }

    // ================================
    // NOTIFICATIONS
    // ================================
    async getNotifications(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/notifications?${searchParams.toString()}`, {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch notifications');
        }
    }

    async getUnreadNotificationCount(): Promise<any> {
        try {
            const response = await this.request<any>('/api/notifications/unread-count', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch unread notification count');
        }
    }

    async getRecentNotifications(): Promise<any> {
        try {
            const response = await this.request<any>('/api/notifications/recent', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch recent notifications');
        }
    }

    async markAllNotificationsAsRead(): Promise<any> {
        try {
            const response = await this.request<any>('/api/notifications/mark-all-read', {
                method: 'POST',
                body: JSON.stringify({})
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'All notifications marked as read.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'mark all notifications as read');
        }
    }

    async markNotificationAsRead(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/notifications/${id}/mark-read`, {
                method: 'PATCH'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'mark notification as read');
        }
    }

    async markNotificationAsUnread(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/notifications/${id}/mark-unread`, {
                method: 'PATCH'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'mark notification as unread');
        }
    }

    async deleteNotification(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/notifications/${id}`, {
                method: 'DELETE'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'delete notification');
        }
    }

    // ================================
    // SYSTEM
    // ================================
    async getSystemStatus(): Promise<any> {
        try {
            const response = await this.request<any>('/api/system/status', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch system status');
        }
    }

    async getSystemVersion(): Promise<any> {
        try {
            const response = await this.request<any>('/api/system/version', {
                method: 'GET'
            });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch system version');
        }
    }

    // ================================
    // UTILITY METHODS
    // ================================
    showErrorToast(message: string): void {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: message,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    }

    showSuccessToast(message: string): void {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: message,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    }

    async confirmAction(title: string, text: string, confirmText: string = 'Yes', type: 'warning' | 'info' = 'warning'): Promise<boolean> {
        const result: SweetAlertResult = await Swal.fire({
            icon: type,
            title: title,
            text: text,
            showCancelButton: true,
            confirmButtonColor: type === 'warning' ? '#EF4444' : '#10B981',
            cancelButtonColor: '#6B7280',
            confirmButtonText: confirmText,
            cancelButtonText: 'Cancel'
        });

        return result.isConfirmed;
    }
}

// Create and export a single instance
const apiAdmin = new ApiAdmin();
export default apiAdmin;
