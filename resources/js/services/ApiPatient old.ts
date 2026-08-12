// ApiPatient.ts - Complete Patient API Client with ALL Backend Routes
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

class ApiPatient {
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
                      (document.querySelector('input[name="_token"]') as HTMLInputElement)?.value;
        
        return token || '';
    }

    private async request<T>(
        url: string,
        options: RequestInit & { timeout?: number } = {}
    ): Promise<T> {
        const { timeout = 10000, ...fetchOptions } = options;
        
        const needsCSRF = options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method.toUpperCase());
        const csrfToken = needsCSRF ? this.getCSRFToken() : '';

        const defaultOptions: RequestInit = {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
                ...options.headers,
            },
            credentials: 'same-origin',
            signal: AbortSignal.timeout(timeout),
        };

        if (options.body && typeof options.body === 'string') {
            (defaultOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, { ...defaultOptions, ...fetchOptions });
            const contentType = response.headers.get('content-type');
            let data: any;
            
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
                    data = { success: true };
                }
            }

            if (!response.ok) {
                if (response.status === 419) {
                    throw new Error('Session expired - please refresh the page');
                }
                if (response.status === 401) {
                    throw new Error('You are not authorized to perform this action. Please log in again.');
                }
                if (response.status === 403) {
                    throw new Error('You do not have permission to perform this action.');
                }
                if (response.status >= 500) {
                    throw new Error('Server error - please try again later');
                }
                if (response.status === 422) {
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
                throw new Error('Request timeout - please try again');
            } else if (error instanceof TypeError && error.message.includes('fetch')) {
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
    // DASHBOARD
    // ================================
    async getDashboardData(): Promise<any> {
        try {
            const response = await this.request<any>('/api/dashboard/data', { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch dashboard data');
        }
    }

    async getDashboardStats(): Promise<any> {
        try {
            const response = await this.request<any>('/api/dashboard/stats', { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch dashboard stats');
        }
    }

    async getRecentActivity(): Promise<any> {
        try {
            const response = await this.request<any>('/api/dashboard/recent-activity', { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch recent activity');
        }
    }

    async getDashboardAlerts(): Promise<any> {
        try {
            const response = await this.request<any>('/api/dashboard/alerts', { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch dashboard alerts');
        }
    }

    // ================================
    // APPOINTMENTS
    // ================================
    async getMyAppointments(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/appointments?${searchParams.toString()}`, { method: 'GET' });
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

    async getAvailableSlots(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/appointments/available-slots?${searchParams.toString()}`, { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch available slots');
        }
    }

    async bookAppointment(appointmentData: any): Promise<any> {
        try {
            const response = await this.request<any>('/api/appointments', {
                method: 'POST',
                body: JSON.stringify(appointmentData)
            });
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Appointment booked successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });
            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;
            const errorData = this.handleError(error, 'book appointment');
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message,
                confirmButtonColor: '#EF4444'
            });
            throw error;
        }
    }

    async rescheduleAppointment(id: number, appointmentData: any): Promise<any> {
        try {
            const response = await this.request<any>(`/api/appointments/${id}`, {
                method: 'PUT',
                body: JSON.stringify(appointmentData)
            });
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Appointment rescheduled successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });
            return this.handleResponse(response);
        } catch (error: any) {
            if (error.response?.status === 422) throw error;
            const errorData = this.handleError(error, 'reschedule appointment');
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

    // ================================
    // MEDICAL RECORDS (VIEW ONLY)
    // ================================
    async getMyMedicalRecords(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/patient-records?${searchParams.toString()}`, { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch medical records');
        }
    }

    async getMedicalRecord(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/patient-records/${id}`, { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch medical record');
        }
    }

    // ================================
    // TREATMENT PLANS (VIEW ONLY)
    // ================================
    async getMyTreatmentPlans(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/treatment-plans?${searchParams.toString()}`, { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch treatment plans');
        }
    }

    async getTreatmentPlan(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/treatment-plans/${id}`, { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch treatment plan');
        }
    }

    // ================================
    // BILLING / FINANCIAL RECORDS (VIEW ONLY)
    // ================================
    async getMyBillingRecords(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/financial-records?${searchParams.toString()}`, { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch billing records');
        }
    }

    async getBillingRecord(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/financial-records/${id}`, { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch billing record');
        }
    }

    async getFinancialSummary(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/financial-records/reports/summary?${searchParams.toString()}`, { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch financial summary');
        }
    }

    // ================================
    // SERVICES (PUBLIC VIEW)
    // ================================
    async getServices(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/services?${searchParams.toString()}`, { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch services');
        }
    }

    async getService(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/services/${id}`, { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch service');
        }
    }

    // ================================
    // PROFILE MANAGEMENT
    // ================================
    async getMyProfile(): Promise<any> {
        try {
            const response = await this.request<any>('/api/users/profile', { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch profile');
        }
    }

    async updateMyProfile(profileData: Record<string, any>): Promise<any> {
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

    // ================================
    // NOTIFICATIONS
    // ================================
    async getMyNotifications(params: Record<string, any> = {}): Promise<any> {
        try {
            const cleanParams = this.cleanParams(params);
            const searchParams = new URLSearchParams(cleanParams);
            const response = await this.request<any>(`/api/notifications?${searchParams.toString()}`, { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch notifications');
        }
    }

    async getUnreadNotificationCount(): Promise<any> {
        try {
            const response = await this.request<any>('/api/notifications/unread-count', { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch unread notification count');
        }
    }

    async getRecentNotifications(): Promise<any> {
        try {
            const response = await this.request<any>('/api/notifications/recent', { method: 'GET' });
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
            const response = await this.request<any>(`/api/notifications/${id}/mark-read`, { method: 'PATCH' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'mark notification as read');
        }
    }

    async markNotificationAsUnread(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/notifications/${id}/mark-unread`, { method: 'PATCH' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'mark notification as unread');
        }
    }

    async deleteNotification(id: number): Promise<any> {
        try {
            const response = await this.request<any>(`/api/notifications/${id}`, { method: 'DELETE' });
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
            const response = await this.request<any>('/api/system/status', { method: 'GET' });
            return this.handleResponse(response);
        } catch (error) {
            throw this.handleError(error, 'fetch system status');
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
const apiPatient = new ApiPatient();
export default apiPatient;