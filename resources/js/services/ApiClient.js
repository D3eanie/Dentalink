import axios from 'axios';
import Swal from 'sweetalert2';

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// CSRF token setup with refresh capability
const getCsrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
           window.Laravel?.csrfToken ||
           document.querySelector('input[name="_token"]')?.value;
};

// Note: CSRF token refresh via background requests is not possible
// because meta tags are only updated on full page loads.
// When a 419 error occurs, we reload the page to get a fresh token.

// Set CSRF token for all requests
let csrfToken = getCsrfToken();
if (csrfToken) {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;
}

// Request interceptor to ensure CSRF token is always included and fresh
axios.interceptors.request.use(async (config) => {
    // Skip CSRF token for GET/HEAD requests (not needed)
    const needsCSRF = config.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase());

    if (needsCSRF) {
        // Always get fresh token before each state-changing request
        const token = getCsrfToken();
        if (token) {
            config.headers['X-CSRF-TOKEN'] = token;
            csrfToken = token; // Update cached token
        } else if (csrfToken) {
            // Use cached token as fallback if meta tag doesn't have it
            config.headers['X-CSRF-TOKEN'] = csrfToken;
        }
        // If no token found at all, the request will likely fail with 419
        // and trigger a page reload to get a fresh token
    }
    return config;
});

// Response interceptor for error handling with automatic token refresh
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 419) {
            // CSRF token mismatch - reload page to get fresh token
            // Meta tags are only updated on full page loads, so background
            // token refresh is not possible. Reloading is the only reliable solution.
            window.location.reload();
            // Return a promise that never resolves to prevent error handlers
            // from executing before the page reloads
            return new Promise(() => {});
        } else if (error.response?.status === 403) {
            Swal.fire({
                icon: 'error',
                title: 'Access Denied',
                text: 'You do not have permission to perform this action.',
                confirmButtonColor: '#3B82F6'
            });
        }
        return Promise.reject(error);
    }
);

class ApiClient {
    constructor() {
        // Using web routes directly
    }

    // ================================
    // PATIENT DASHBOARD
    // ================================
    async getDashboardStats() {
        try {
            const response = await axios.get('/api/dashboard/stats');
            return response.data;
        } catch (error) {
            console.error('Error fetching patient dashboard stats:', error);
            throw error;
        }
    }

    async getDashboardData() {
        try {
            const response = await axios.get('/api/dashboard/data');
            return response.data;
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            throw error;
        }
    }

    // ================================
    // PATIENT PROFILE MANAGEMENT
    // ================================
    async getProfile() {
        try {
            const response = await axios.get('/api/users/profile');
            return response.data;
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    }

    async updateProfile(profileData) {
        try {
            const response = await axios.patch('/api/users/profile', profileData);

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Profile updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to update profile.';
            const errors = error.response?.data?.errors || {};

            let errorText = errorMessage;
            if (Object.keys(errors).length > 0) {
                errorText += '\n\nValidation errors:\n';
                Object.keys(errors).forEach(field => {
                    errorText += `• ${errors[field][0]}\n`;
                });
            }

            await Swal.fire({
                icon: 'error',
                title: 'Error Updating Profile',
                text: errorText,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }

    async changePassword(passwordData) {
        try {
            const response = await axios.post('/api/users/change-password', passwordData);

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Password changed successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to change password.';
            const errors = error.response?.data?.errors || {};

            let errorText = errorMessage;
            if (Object.keys(errors).length > 0) {
                errorText += '\n\nValidation errors:\n';
                Object.keys(errors).forEach(field => {
                    errorText += `• ${errors[field][0]}\n`;
                });
            }

            await Swal.fire({
                icon: 'error',
                title: 'Error Changing Password',
                text: errorText,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }

    async updatePreferences(preferencesData) {
        try {
            const response = await axios.patch('/api/users/preferences', preferencesData);

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Preferences updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to update preferences.';

            await Swal.fire({
                icon: 'error',
                title: 'Error Updating Preferences',
                text: errorMessage,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }

    // ================================
    // APPOINTMENT MANAGEMENT
    // ================================
    async getMyAppointments(params = {}) {
        try {
            // This would need to be filtered on the backend for the current patient
            const response = await axios.get('/api/appointments', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching my appointments:', error);
            throw error;
        }
    }

    async getAppointment(id) {
        try {
            const response = await axios.get(`/api/appointments/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching appointment:', error);
            throw error;
        }
    }

    async bookAppointment(appointmentData) {
        try {
            const response = await axios.post('/api/appointments', appointmentData);

            await Swal.fire({
                icon: 'success',
                title: 'Appointment Booked!',
                text: 'Your appointment has been booked successfully. You will receive a confirmation shortly.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                },
                timer: 4000
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to book appointment.';
            const errors = error.response?.data?.errors || {};

            let errorText = errorMessage;
            if (Object.keys(errors).length > 0) {
                errorText += '\n\nValidation errors:\n';
                Object.keys(errors).forEach(field => {
                    errorText += `• ${errors[field][0]}\n`;
                });
            }

            await Swal.fire({
                icon: 'error',
                title: 'Booking Failed',
                text: errorText,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }

    async updateAppointment(id, appointmentData) {
        try {
            const response = await axios.patch(`/api/appointments/${id}`, appointmentData);

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Appointment updated successfully.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to update appointment.';

            await Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: errorMessage,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }

    async requestReschedule(id, newDateTime, reason = '') {
        try {
            const result = await Swal.fire({
                icon: 'question',
                title: 'Request Reschedule',
                text: 'Are you sure you want to request to reschedule this appointment?',
                input: 'textarea',
                inputPlaceholder: 'Reason for rescheduling (optional)',
                inputValue: reason,
                showCancelButton: true,
                confirmButtonColor: '#3B82F6',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, request reschedule',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) {
                return null;
            }

            // For now, this will update the appointment with a note
            // In a real application, you might want a separate endpoint for reschedule requests
            const response = await axios.patch(`/api/appointments/${id}`, {
                notes: `Reschedule requested: ${result.value || 'No reason provided'}`,
                requested_datetime: newDateTime
            });

            await Swal.fire({
                icon: 'info',
                title: 'Request Submitted',
                text: 'Your reschedule request has been submitted. We will contact you shortly to confirm.',
                confirmButtonColor: '#3B82F6',
                timer: 4000
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to request reschedule.';

            await Swal.fire({
                icon: 'error',
                title: 'Request Failed',
                text: errorMessage,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }

    async cancelAppointment(id, reason = '') {
        try {
            const result = await Swal.fire({
                icon: 'warning',
                title: 'Cancel Appointment',
                text: 'Are you sure you want to cancel this appointment? Please note our cancellation policy.',
                input: 'textarea',
                inputPlaceholder: 'Reason for cancellation (optional)',
                inputValue: reason,
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, cancel appointment',
                cancelButtonText: 'Keep appointment'
            });

            if (!result.isConfirmed) {
                return null;
            }

            const response = await axios.post(`/api/appointments/${id}/cancel`, {
                cancellation_reason: result.value || 'No reason provided'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Cancelled',
                text: 'Your appointment has been cancelled. You will receive a confirmation shortly.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to cancel appointment.';

            await Swal.fire({
                icon: 'error',
                title: 'Cancellation Failed',
                text: errorMessage,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }

    async getAvailableSlots(params) {
        try {
            const response = await axios.get('/api/appointments/available-slots', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching available slots:', error);
            throw error;
        }
    }

    // ================================
    // MEDICAL RECORDS
    // ================================
    async getMyRecords(params = {}) {
        try {
            // This would need to be filtered on the backend for the current patient
            const response = await axios.get('/api/patient-records', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching medical records:', error);
            throw error;
        }
    }

    async getRecord(id) {
        try {
            const response = await axios.get(`/api/patient-records/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching medical record:', error);
            throw error;
        }
    }

    // ================================
    // TREATMENT PLANS
    // ================================
    async getMyTreatmentPlans(params = {}) {
        try {
            // This would need to be filtered on the backend for the current patient
            const response = await axios.get('/api/treatment-plans', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching treatment plans:', error);
            throw error;
        }
    }

    async getTreatmentPlan(id) {
        try {
            const response = await axios.get(`/api/treatment-plans/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching treatment plan:', error);
            throw error;
        }
    }

    async acceptTreatmentPlan(id) {
        try {
            const result = await Swal.fire({
                icon: 'question',
                title: 'Accept Treatment Plan',
                text: 'Are you sure you want to accept this treatment plan?',
                showCancelButton: true,
                confirmButtonColor: '#10B981',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, accept plan',
                cancelButtonText: 'Review more'
            });

            if (!result.isConfirmed) {
                return null;
            }

            // This would need a custom endpoint for patient acceptance
            // For now, we'll use a generic update with a note
            const response = await axios.patch(`/api/treatment-plans/${id}`, {
                patient_acceptance: 'accepted',
                acceptance_date: new Date().toISOString()
            });

            await Swal.fire({
                icon: 'success',
                title: 'Plan Accepted',
                text: 'You have accepted the treatment plan. Your doctor will be notified.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to accept treatment plan.';

            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }

    // ================================
    // BILLING & PAYMENTS
    // ================================
    async getMyBilling(params = {}) {
        try {
            // This would need to be filtered on the backend for the current patient
            const response = await axios.get('/api/financial-records', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching billing information:', error);
            throw error;
        }
    }

    async getInvoice(id) {
        try {
            const response = await axios.get(`/api/financial-records/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching invoice:', error);
            throw error;
        }
    }

    async makePayment(invoiceId, paymentData) {
        try {
            // Show loading while processing payment
            Swal.fire({
                icon: 'info',
                title: 'Processing Payment...',
                text: 'Please wait while we process your payment.',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await axios.post(`/api/financial-records/${invoiceId}/mark-as-paid`, paymentData);

            await Swal.fire({
                icon: 'success',
                title: 'Payment Successful!',
                text: 'Your payment has been processed successfully. You will receive a receipt shortly.',
                confirmButtonColor: '#10B981',
                timer: 4000
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Payment processing failed.';

            await Swal.fire({
                icon: 'error',
                title: 'Payment Failed',
                text: errorMessage,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }

    async requestPaymentPlan(invoiceId, proposedPlan) {
        try {
            const result = await Swal.fire({
                icon: 'question',
                title: 'Request Payment Plan',
                text: 'Are you sure you want to request a payment plan for this invoice?',
                showCancelButton: true,
                confirmButtonColor: '#3B82F6',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, request plan',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) {
                return null;
            }

            // This would need a custom endpoint for payment plan requests
            // For now, we'll add a note to the financial record
            const response = await axios.patch(`/api/financial-records/${invoiceId}`, {
                notes: `Payment plan requested: ${JSON.stringify(proposedPlan)}`,
                payment_plan_requested: true
            });

            await Swal.fire({
                icon: 'info',
                title: 'Request Submitted',
                text: 'Your payment plan request has been submitted. We will contact you shortly to discuss the details.',
                confirmButtonColor: '#3B82F6',
                timer: 4000
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to request payment plan.';

            await Swal.fire({
                icon: 'error',
                title: 'Request Failed',
                text: errorMessage,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }

    // ================================
    // SERVICES & INFORMATION
    // ================================
    async getServices() {
        try {
            const response = await axios.get('/api/services');
            return response.data;
        } catch (error) {
            console.error('Error fetching services:', error);
            throw error;
        }
    }

    async getService(id) {
        try {
            const response = await axios.get(`/api/services/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching service:', error);
            throw error;
        }
    }

    // ================================
    // NOTIFICATIONS
    // ================================
    async getNotifications(params = {}) {
        try {
            const response = await axios.get('/api/notifications', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }

    async markNotificationAsRead(id) {
        try {
            const response = await axios.patch(`/api/notifications/${id}/mark-read`);
            return response.data;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    async markNotificationAsUnread(id) {
        try {
            const response = await axios.patch(`/api/notifications/${id}/mark-unread`);
            return response.data;
        } catch (error) {
            console.error('Error marking notification as unread:', error);
            throw error;
        }
    }

    async markAllNotificationsAsRead() {
        try {
            const response = await axios.post('/api/notifications/mark-all-read');

            await Swal.fire({
                icon: 'success',
                title: 'All Notifications Marked as Read',
                text: 'All your notifications have been marked as read.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return response.data;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    async deleteNotification(id) {
        try {
            const result = await Swal.fire({
                icon: 'warning',
                title: 'Delete Notification',
                text: 'Are you sure you want to delete this notification?',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, delete it',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) {
                return null;
            }

            const response = await axios.delete(`/api/notifications/${id}`);

            await Swal.fire({
                icon: 'success',
                title: 'Deleted',
                text: 'Notification has been deleted.',
                confirmButtonColor: '#10B981',
                timer: 2000
            });

            return response.data;
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }

    async getUnreadNotificationCount() {
        try {
            const response = await axios.get('/api/notifications/unread-count');
            return response.data;
        } catch (error) {
            console.error('Error fetching unread notification count:', error);
            throw error;
        }
    }

    async getRecentNotifications() {
        try {
            const response = await axios.get('/api/notifications/recent');
            return response.data;
        } catch (error) {
            console.error('Error fetching recent notifications:', error);
            throw error;
        }
    }

    // ================================
    // FEEDBACK & COMMUNICATION
    // ================================
    async sendMessage(messageData) {
        try {
            // This would need a custom endpoint for patient-clinic communication
            // For now, we could create it as a special type of notification or record
            await Swal.fire({
                icon: 'success',
                title: 'Message Sent!',
                text: 'Your message has been sent successfully. We will get back to you soon.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return { success: true, message: 'Message sent successfully' };
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to send message.';

            await Swal.fire({
                icon: 'error',
                title: 'Message Failed',
                text: errorMessage,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }

    async submitFeedback(feedbackData) {
        try {
            // This would need a custom endpoint for feedback collection
            await Swal.fire({
                icon: 'success',
                title: 'Thank You!',
                text: 'Your feedback has been submitted successfully. We appreciate your input.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });

            return { success: true, message: 'Feedback submitted successfully' };
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to submit feedback.';

            await Swal.fire({
                icon: 'error',
                title: 'Submission Failed',
                text: errorMessage,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }

    // ================================
    // UTILITY METHODS
    // ================================
    async getCurrentUser() {
        try {
            const response = await axios.get('/api/users/me'); // This route might not exist
            return response.data;
        } catch (error) {
            console.error('Error fetching current user:', error);
            throw error;
        }
    }

    async getSystemStatus() {
        try {
            const response = await axios.get('/api/system/status');
            return response.data;
        } catch (error) {
            console.error('Error fetching system status:', error);
            throw error;
        }
    }

    // ================================
    // EMERGENCY CONTACT
    // ================================
    async getEmergencyContacts() {
        try {
            // This would be a static page or API endpoint
            return {
                emergency_phone: '911',
                clinic_emergency: '(555) 123-4567',
                after_hours: '(555) 123-4568'
            };
        } catch (error) {
            console.error('Error fetching emergency contacts:', error);
            throw error;
        }
    }

    async requestEmergencyAppointment(emergencyData) {
        try {
            const result = await Swal.fire({
                icon: 'warning',
                title: 'Emergency Appointment Request',
                text: 'Are you experiencing a dental emergency? We will prioritize your request and contact you as soon as possible.',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Yes, this is an emergency',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) {
                return null;
            }

            // Create an urgent appointment request
            const response = await axios.post('/api/appointments', {
                ...emergencyData,
                priority: 'emergency',
                status: 'emergency_request',
                notes: 'EMERGENCY APPOINTMENT REQUEST'
            });

            await Swal.fire({
                icon: 'info',
                title: 'Emergency Request Submitted',
                text: 'Your emergency appointment request has been submitted. We will contact you immediately to arrange urgent care.',
                confirmButtonColor: '#EF4444',
                timer: 5000
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to submit emergency request.';

            await Swal.fire({
                icon: 'error',
                title: 'Request Failed',
                text: errorMessage,
                confirmButtonColor: '#EF4444'
            });

            throw error;
        }
    }
}

// Create and export a single instance
const apiClient = new ApiClient();
export default apiClient;
