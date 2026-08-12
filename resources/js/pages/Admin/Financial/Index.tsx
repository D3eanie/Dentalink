import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiAdmin from '@/services/ApiAdmin';
import Swal from 'sweetalert2';
import { computePaymentStatus } from '@/utils/financialStatus';
import {
    PhilippinePeso,
    Search,
    Filter,
    Plus,
    Edit,
    Trash2,
    Eye,
    CreditCard,
    Receipt,
    AlertTriangle,
    CheckCircle,
    Clock,
    RefreshCw,
    Download,
    TrendingUp,
    TrendingDown,
    Calendar,
    User,
    FileText
} from 'lucide-react';

// TypeScript interfaces
interface FinancialRecord {
    id: number;
    patient: {
        id: number;
        name: string;
        email: string;
        phone: string;
    };
    appointment?: {
        id: number;
        service: {
            id: number;
            name: string;
        };
    };
    amount: number;
    balance: number;
    payment_status: 'pending' | 'paid' | 'partial' | 'overdue';
    payment_method: string | null;
    transaction_date: string;
    description: string;
    notes: string;
    created_at: string;
    updated_at: string;
    blockchain_hash?: string | null;
    previous_blockchain_hash?: string | null;
    is_verified?: boolean;
    verified_by?: number | null;
    verified_at?: string | null;
    verifier?: {
        id: number;
        name: string;
        email: string;
    } | null;
}

interface FinancialFilters {
    search: string;
    payment_status: string;
    payment_method: string;
    date_from: string;
    date_to: string;
}

interface FinancialFormData {
    patient_id: string;
    appointment_id: string;
    amount: string;
    payment_method: string;
    transaction_date: string;
    description: string;
    notes: string;
}

interface Patient {
    id: number;
    name: string;
    email: string;
    first_name?: string;
    last_name?: string;
}

interface Appointment {
    id: number;
    patient: {
        name: string;
    };
    service: {
        name: string;
        price: number;
    };
    appointment_date: string;
}

const initialFormData: FinancialFormData = {
    patient_id: '',
    appointment_id: '',
    amount: '',
    payment_method: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    notes: ''
};

const paymentStatuses = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
    { value: 'partial', label: 'Partial', color: 'bg-blue-100 text-blue-800' },
    { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' }
];

const paymentMethods = [
    { value: 'cash', label: 'Cash' }
];

const breadcrumbs = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Financial Records', href: '/admin/financial-records' }
];

export default function FinancialRecordsPage() {
    const [records, setRecords] = useState<FinancialRecord[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);
    const [formData, setFormData] = useState<FinancialFormData>(initialFormData);
    const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filters, setFilters] = useState<FinancialFilters>({
        search: '',
        payment_status: '',
        payment_method: '',
        date_from: '',
        date_to: ''
    });
    const [summary, setSummary] = useState({
        total_revenue: 0,
        outstanding_balance: 0,
        monthly_revenue: 0,
        pending_count: 0,
        paid_count: 0,
        overdue_count: 0
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Partial Payment Modal States
    const [isPartialPaymentModalOpen, setIsPartialPaymentModalOpen] = useState(false);
    const [partialPaymentRecord, setPartialPaymentRecord] = useState<FinancialRecord | null>(null);
    const [remainingBalance, setRemainingBalance] = useState<number>(0);
    const [totalServicePrice, setTotalServicePrice] = useState<number>(0);
    const [partialPaymentForm, setPartialPaymentForm] = useState({
        amount: '',
        payment_method: '',
        notes: ''
    });
    const [partialPaymentErrors, setPartialPaymentErrors] = useState<Record<string, string[]>>({});
    const [isPartialPaymentSubmitting, setIsPartialPaymentSubmitting] = useState(false);

    // Verification Modal States
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [verificationRecord, setVerificationRecord] = useState<FinancialRecord | null>(null);
    const [verificationConfirmed, setVerificationConfirmed] = useState(false);
    const [isVerificationSubmitting, setIsVerificationSubmitting] = useState(false);

    // Helper function to unwrap response data
    const unwrapList = <T,>(res: any, keys: string[] = ['data', 'records']): T[] => {
        if (!res) return [];
        if (Array.isArray(res.data?.data)) return res.data.data;
        if (Array.isArray(res.data)) return res.data;
        for (const k of keys) {
            if (Array.isArray(res?.[k])) return res[k];
            if (Array.isArray(res?.data?.[k])) return res.data[k];
        }
        return [];
    };

    // Fetch financial records from API
    const fetchRecords = async () => {
        try {
            setLoading(true);
            const response = await apiAdmin.getFinancialRecords({
                ...filters,
                page: currentPage
            });

            console.log('Financial records response:', response);

            // Handle different response structures
            let recordsList: any[] = [];
            if (Array.isArray(response?.data)) {
                recordsList = response.data;
            } else if (Array.isArray(response?.records)) {
                recordsList = response.records;
            } else if (Array.isArray(response?.data?.data)) {
                recordsList = response.data.data;
            } else if (Array.isArray(response)) {
                recordsList = response;
            }

            // Map records to ensure patient names are formatted correctly
            const mappedRecords = recordsList.map(record => ({
                ...record,
                payment_status: computePaymentStatus(record),
                patient: {
                    ...record.patient,
                    name: record.patient?.first_name && record.patient?.last_name
                        ? `${record.patient.first_name} ${record.patient.last_name}`
                        : record.patient?.name || 'Unknown Patient'
                }
            }));

            setRecords(mappedRecords);

            // Handle summary data
            let summaryData = response?.summary || response?.data?.summary || {};

            console.log('API Response:', JSON.stringify(response, null, 2));
            console.log('Summary data received:', summaryData);
            console.log('Summary data keys:', Object.keys(summaryData));
            console.log('Summary values:', {
                total_revenue: summaryData.total_revenue,
                outstanding_balance: summaryData.outstanding_balance,
                monthly_revenue: summaryData.monthly_revenue
            });

            // Always use backend summary values
            setSummary({
                total_revenue: Number(summaryData.total_revenue || 0),
                outstanding_balance: Number(summaryData.outstanding_balance || 0),
                monthly_revenue: Number(summaryData.monthly_revenue || 0),
                pending_count: Number(summaryData.pending_count || 0),
                paid_count: Number(summaryData.paid_count || 0),
                overdue_count: Number(summaryData.overdue_count || 0)
            });

            console.log('Summary set from backend:', {
                total_revenue: Number(summaryData.total_revenue || 0),
                outstanding_balance: Number(summaryData.outstanding_balance || 0),
                monthly_revenue: Number(summaryData.monthly_revenue || 0),
                pending_count: Number(summaryData.pending_count || 0),
                paid_count: Number(summaryData.paid_count || 0),
                overdue_count: Number(summaryData.overdue_count || 0)
            });

            setTotalPages(response?.last_page || response?.data?.last_page || 1);
        } catch (error) {
            console.error('Error fetching financial records:', error);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch dropdown data
    const fetchDropdownData = async () => {
        try {
            // Fetch patients directly using the patients endpoint
            const [patientsRes, appointmentsRes] = await Promise.all([
                apiAdmin.getPatients({}),
                apiAdmin.getAppointments({})
            ]);

            console.log('Patients response:', patientsRes);
            console.log('Appointments response:', appointmentsRes);

            // Try multiple ways to extract patients data
            let patientsList: Patient[] = [];
            if (Array.isArray(patientsRes)) {
                patientsList = patientsRes;
            } else if (Array.isArray(patientsRes?.data?.data)) {
                patientsList = patientsRes.data.data;
            } else if (Array.isArray(patientsRes?.data)) {
                patientsList = patientsRes.data;
            } else if (Array.isArray(patientsRes?.patients)) {
                patientsList = patientsRes.patients;
            }

            // Try multiple ways to extract appointments data
            let appointmentsList: any[] = [];
            if (Array.isArray(appointmentsRes)) {
                appointmentsList = appointmentsRes;
            } else if (Array.isArray(appointmentsRes?.data?.data)) {
                appointmentsList = appointmentsRes.data.data;
            } else if (Array.isArray(appointmentsRes?.data)) {
                appointmentsList = appointmentsRes.data;
            } else if (Array.isArray(appointmentsRes?.appointments)) {
                appointmentsList = appointmentsRes.appointments;
            }

            // Map patients to the format we need
            const mappedPatients = patientsList.map(p => ({
                id: p.id,
                name: p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.name || 'Unknown',
                email: p.email,
                first_name: p.first_name,
                last_name: p.last_name
            }));

            // Map appointments to the format we need
            const mappedAppointments = appointmentsList.map(a => ({
                id: a.id,
                patient: {
                    name: a.patient?.first_name && a.patient?.last_name
                        ? `${a.patient.first_name} ${a.patient.last_name}`
                        : a.patient?.name || 'Unknown'
                },
                service: {
                    name: a.service?.name || 'Unknown Service',
                    price: a.service?.price || 0
                },
                appointment_date: a.appointment_date
            }));

            setPatients(mappedPatients);
            setAppointments(mappedAppointments);

            console.log('Mapped patients:', mappedPatients);
            console.log('Mapped appointments:', mappedAppointments);
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
            setPatients([]);
            setAppointments([]);
        }
    };



    useEffect(() => {
        fetchRecords();
    }, [filters, currentPage]);

    useEffect(() => {
        fetchDropdownData();

        // Check if there's an appointment_id in the URL params
        const urlParams = new URLSearchParams(window.location.search);
        const appointmentId = urlParams.get('appointment_id');

        if (appointmentId) {
            setIsModalOpen(true);
            setIsEditMode(false);
            setFormData(prev => ({
                ...prev,
                appointment_id: appointmentId
            }));

            // Auto-fill the form from appointment data
            apiAdmin.getFinancialFormDataFromAppointment(parseInt(appointmentId))
                .then((response: any) => {
                    const formData = response?.form_data || response?.data?.form_data;
                    if (formData) {
                        setFormData(formData);
                        Swal.fire({
                            icon: 'success',
                            title: 'Form Ready',
                            text: 'Transaction form has been pre-filled.'
                        });
                        return;
                    }

                    if (response?.appointment) {
                        setFormData({
                            ...initialFormData,
                            patient_id: response.appointment.patient_id?.toString() || '',
                            appointment_id: response.appointment.id?.toString() || appointmentId,
                            amount: response.appointment.service?.price?.toString() || '',
                            payment_method: '',
                            transaction_date: new Date().toISOString().split('T')[0],
                            description: response.appointment.service?.name
                                ? `Service: ${response.appointment.service.name}`
                                : '',
                            notes: ''
                        });
                    }
                })
                .catch((error: any) => {
                    console.error('Error auto-filling form:', error);
                });
        }
    }, []);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors({});
        if (isSubmitting) return;

        // Validate payment method is selected
        if (!formData.payment_method) {
            setFormErrors({ payment_method: ['Payment method is required'] });
            await Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please select a payment method before submitting.',
                confirmButtonColor: '#EF4444'
            });
            return;
        }

        try {
            setIsSubmitting(true);
            const recordData = {
                ...formData,
                amount: parseFloat(formData.amount)
            };

            if (isEditMode && selectedRecord) {
                await apiAdmin.updateFinancialRecord(selectedRecord.id, recordData);
            } else {
                await apiAdmin.createFinancialRecord(recordData);
            }

            setIsModalOpen(false);
            setFormData(initialFormData);
            setSelectedRecord(null);
            setIsEditMode(false);
            await fetchRecords();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setFormErrors(error.response.data.errors);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle edit
    const handleEdit = async (record: FinancialRecord) => {
        setSelectedRecord(record);
        setFormData({
            patient_id: record.patient.id.toString(),
            appointment_id: record.appointment?.id.toString() || '',
            amount: record.amount.toString(),
            payment_method: record.payment_method || '',
            transaction_date: record.transaction_date,
            description: record.description,
            notes: record.notes || ''
        });
        setIsEditMode(true);
        setIsModalOpen(true);
        setFormErrors({});
        await fetchDropdownData();
    };

    // Handle create new
    const handleCreateNew = async () => {
        setSelectedRecord(null);
        setFormData(initialFormData);
        setIsEditMode(false);
        setIsModalOpen(true);
        setFormErrors({});
        await fetchDropdownData();
    };

    // Handle filter change
    const handleFilterChange = (key: keyof FinancialFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            search: '',
            payment_status: '',
            payment_method: '',
            date_from: '',
            date_to: ''
        });
        setCurrentPage(1);
    };

    // Mark as paid
    // Export financial records report for current month
    const handleExportReport = async () => {
        try {
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

            await apiAdmin.downloadFinancialRecordsPdf(startDate, endDate);
        } catch (error) {
            console.error('Export error:', error);
        }
    };

    const handleMarkAsPaid = async (record: FinancialRecord) => {
        try {
            await apiAdmin.markFinancialRecordAsPaid(record.id, {
                payment_method: 'cash',
                notes: 'Marked as paid from admin panel'
            });
            await fetchRecords();
        } catch (error) {
            console.error('Error marking as paid:', error);
        }
    };

    // Handle opening partial payment modal
    const handleOpenPartialPaymentModal = async (record: FinancialRecord) => {
        if (!record.appointment) {
            Swal.fire({
                icon: 'warning',
                title: 'No Appointment Linked',
                text: 'Only transactions linked to an appointment can have follow-up payments.',
                confirmButtonColor: '#3B82F6'
            });
            return;
        }

        if (record.payment_status !== 'partial') {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Payment Status',
                text: 'Only partial payments can have follow-up payments.',
                confirmButtonColor: '#3B82F6'
            });
            return;
        }

        try {
            setPartialPaymentRecord(record);
            setPartialPaymentErrors({});
            setPartialPaymentForm({
                amount: '',
                payment_method: '',
                notes: ''
            });

            const balanceData = await apiAdmin.calculateRemainingBalance(record.id);
            if (balanceData.success) {
                setRemainingBalance(balanceData.remaining_balance);
                setTotalServicePrice(balanceData.total_service_price);

                // Check if transaction is already fully paid
                if (balanceData.remaining_balance <= 0) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Already Fully Paid',
                        text: 'This transaction has been completely paid. No additional follow-up payments are needed.',
                        confirmButtonColor: '#3B82F6'
                    });
                    return;
                }

                // Auto-fill with remaining balance
                setPartialPaymentForm(prev => ({
                    ...prev,
                    amount: balanceData.remaining_balance.toString()
                }));
            }

            setIsPartialPaymentModalOpen(true);
        } catch (error) {
            console.error('Error opening partial payment modal:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load payment information.',
                confirmButtonColor: '#EF4444'
            });
        }
    };

    // Handle submitting partial payment follow-up
    const handleSubmitPartialPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!partialPaymentRecord) return;
        if (isPartialPaymentSubmitting) return;

        try {
            setIsPartialPaymentSubmitting(true);
            setPartialPaymentErrors({});

            // Validate
            const errors: Record<string, string[]> = {};

            // Check if transaction is already fully paid
            if (remainingBalance <= 0) {
                errors.amount = ['This transaction is already fully paid. No additional payments can be added.'];
            }

            if (!partialPaymentForm.amount || parseFloat(partialPaymentForm.amount) <= 0) {
                errors.amount = ['Amount must be greater than 0'];
            }

            // Only validate against remaining balance for partial payments
            if (partialPaymentRecord.payment_status === 'partial' && remainingBalance > 0) {
                if (parseFloat(partialPaymentForm.amount) > remainingBalance) {
                    errors.amount = ['Amount cannot exceed remaining balance of ₱' + remainingBalance.toFixed(2)];
                }
            }

            if (!partialPaymentForm.payment_method) {
                errors.payment_method = ['Payment method is required'];
            }

            if (Object.keys(errors).length > 0) {
                setPartialPaymentErrors(errors);
                return;
            }

            // Submit
            await apiAdmin.createPartialPaymentFollowUp(partialPaymentRecord.id, {
                amount: parseFloat(partialPaymentForm.amount),
                payment_method: partialPaymentForm.payment_method,
                notes: partialPaymentForm.notes
            });

            setIsPartialPaymentModalOpen(false);
            setPartialPaymentRecord(null);
            await fetchRecords();
        } catch (error) {
            console.error('Error creating partial payment follow-up:', error);
        } finally {
            setIsPartialPaymentSubmitting(false);
        }
    };

    // Handle opening verification modal
    const handleOpenVerificationModal = (record: FinancialRecord) => {
        setVerificationRecord(record);
        setVerificationConfirmed(false);
        setIsVerificationModalOpen(true);
    };

    // Handle submitting verification
    const handleSubmitVerification = async () => {
        if (!verificationRecord) return;
        if (!verificationConfirmed) return;
        if (isVerificationSubmitting) return;

        try {
            setIsVerificationSubmitting(true);

            const response = await apiAdmin.markFinancialRecordAsVerified(verificationRecord.id);

            if (response.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Verified!',
                    text: 'Financial record has been verified successfully.',
                    confirmButtonColor: '#10B981',
                    timer: 3000
                });

                // Close both modals and redirect back to list
                setIsVerificationModalOpen(false);
                setIsDetailsModalOpen(false);
                setVerificationRecord(null);
                setVerificationConfirmed(false);
                setSelectedRecord(null);
                await fetchRecords();
            }
        } catch (error) {
            console.error('Error verifying record:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Verification Failed',
                text: 'Failed to verify the record. Please try again.',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setIsVerificationSubmitting(false);
        }
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Get status color
    const getStatusColor = (status: string) => {
        const statusObj = paymentStatuses.find(s => s.value === status);
        return statusObj?.color || 'bg-gray-100 text-gray-800';
    };

    // Get payment method display
    const getPaymentMethodDisplay = (method: string | null) => {
        if (!method) return 'Not specified';
        const methodObj = paymentMethods.find(m => m.value === method);
        return methodObj?.label || method;
    };

    // Get error message
    const getErr = (errors: string[] | undefined) => {
        return Array.isArray(errors) ? errors[0] : errors;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Financial Records Management" />

            <div className="flex flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Financial Records</h1>
                        <p className="text-gray-600">Manage payments, invoices, and financial transactions</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportReport}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <FileText className="w-4 h-4" />
                            Reports
                        </button>
                        <button
                            onClick={fetchRecords}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button
                            onClick={handleCreateNew}
                            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            Add Transaction
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {loading ? '...' : formatCurrency(summary.total_revenue)}
                                </p>
                                <p className="text-xs text-green-600 flex items-center mt-1">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    All time
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <PhilippinePeso className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                                <p className="text-2xl font-bold text-red-900">
                                    {loading ? '...' : formatCurrency(summary.outstanding_balance)}
                                </p>
                                <p className="text-xs text-red-600 flex items-center mt-1">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {summary.overdue_count} overdue
                                </p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                                <p className="text-2xl font-bold text-blue-900">
                                    {loading ? '...' : formatCurrency(summary.monthly_revenue)}
                                </p>
                                <p className="text-xs text-blue-600 flex items-center mt-1">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    This month
                                </p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <TrendingUp className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Transactions</p>
                                <p className="text-2xl font-bold text-gray-900">{records.length}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-green-600">{summary.paid_count} paid</span>
                                    <span className="text-xs text-yellow-600">{summary.pending_count} pending</span>
                                </div>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <Receipt className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search transactions..."
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <select
                                    value={filters.payment_status}
                                    onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Status</option>
                                    {paymentStatuses.map(status => (
                                        <option key={status.value} value={status.value}>{status.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={filters.payment_method}
                                    onChange={(e) => handleFilterChange('payment_method', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Methods</option>
                                    {paymentMethods.map(method => (
                                        <option key={method.value} value={method.value}>{method.label}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={clearFilters}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                                <input
                                    type="date"
                                    value={filters.date_from}
                                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                                <input
                                    type="date"
                                    value={filters.date_to}
                                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Records Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Patient
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Transaction Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Payment Info
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex justify-center">
                                                <RefreshCw className="w-6 h-6 animate-spin" />
                                            </div>
                                        </td>
                                    </tr>
                                ) : records.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No financial records found
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <User className="h-5 w-5 text-blue-600" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {record.patient.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {record.patient.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {record.description}
                                                    </div>
                                                    {record.appointment && (
                                                        <div className="text-sm text-gray-500">
                                                            Service: {record.appointment.service.name}
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-gray-400 flex items-center mt-1">
                                                        <Calendar className="w-3 h-3 mr-1" />
                                                        {formatDate(record.transaction_date)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {formatCurrency(record.amount)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">
                                                    {getPaymentMethodDisplay(record.payment_method)}
                                                </div>
                                                {record.payment_method && (
                                                    <div className="text-xs text-gray-500 flex items-center mt-1">
                                                        <CreditCard className="w-3 h-3 mr-1" />
                                                        Payment method
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.payment_status)}`}>
                                                        {paymentStatuses.find(s => s.value === record.payment_status)?.label || record.payment_status}
                                                    </span>
                                                    {record.is_verified && (
                                                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800" title="This record is verified and immutable">
                                                            <CheckCircle className="w-3 h-3 mr-1" /> Verified
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRecord(record);
                                                        setIsDetailsModalOpen(true);
                                                    }}
                                                    className="p-1 text-blue-600 hover:text-blue-700 rounded"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Page {currentPage} of {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Financial Record Form Modal */}
            {/* View Details Modal */}
            {isDetailsModalOpen && selectedRecord && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Transaction Details</h2>
                                <button
                                    onClick={() => setIsDetailsModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Patient Information */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Patient Information</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</p>
                                                <p className="text-sm text-gray-900 mt-1">{selectedRecord.patient.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                                                <p className="text-sm text-gray-900 mt-1">{selectedRecord.patient.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</p>
                                                <p className="text-sm text-gray-900 mt-1">{selectedRecord.patient.phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Transaction Information */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Transaction Information</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</p>
                                                <p className="text-sm font-semibold text-gray-900 mt-1">₱{parseFloat(selectedRecord.amount).toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</p>
                                                <p className="text-sm font-semibold text-gray-900 mt-1">₱{parseFloat(selectedRecord.balance).toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Date</p>
                                                <p className="text-sm text-gray-900 mt-1">{formatDate(selectedRecord.transaction_date)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</p>
                                                <p className="text-sm text-gray-900 mt-1">{selectedRecord.payment_method ? selectedRecord.payment_method.charAt(0).toUpperCase() + selectedRecord.payment_method.slice(1).replace('_', ' ') : 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Status */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Payment Status</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                                                <p className="text-sm mt-1">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                        paymentStatuses.find(s => s.value === computePaymentStatus(selectedRecord))?.color || 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {paymentStatuses.find(s => s.value === computePaymentStatus(selectedRecord))?.label}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Verification Status */}
                                {selectedRecord.verified_by && selectedRecord.verifier && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-3">Verification Status</h3>
                                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Verified By</p>
                                                    <p className="text-sm font-semibold text-green-700 mt-1">{selectedRecord.verifier.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Verified At</p>
                                                    <p className="text-sm text-gray-900 mt-1">{selectedRecord.verified_at ? formatDate(selectedRecord.verified_at) : 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                                                <CheckCircle size={16} />
                                                <span>This record has been verified and approved</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Description and Notes */}
                                {(selectedRecord.description || selectedRecord.notes) && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-3">Additional Information</h3>
                                        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                                            {selectedRecord.description && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</p>
                                                    <p className="text-sm text-gray-900 mt-1">{selectedRecord.description}</p>
                                                </div>
                                            )}
                                            {selectedRecord.notes && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</p>
                                                    <p className="text-sm text-gray-900 mt-1">{selectedRecord.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                {!selectedRecord.verified_by && (
                                    <button
                                        onClick={() => handleOpenVerificationModal(selectedRecord)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <CheckCircle size={18} />
                                        Verify Record
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsDetailsModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">
                                {isEditMode ? 'Edit Financial Record' : 'Add New Transaction'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Patient & Appointment */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Patient *
                                        </label>
                                        <select
                                            value={formData.patient_id}
                                            onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                formErrors.patient_id ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        >
                                            <option value="">Select patient</option>
                                            {patients.map(patient => (
                                                <option key={patient.id} value={patient.id.toString()}>
                                                    {patient.name}
                                                </option>
                                            ))}
                                        </select>
                                        {formErrors.patient_id && (
                                            <p className="text-red-500 text-sm mt-1">{getErr(formErrors.patient_id)}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Related Appointment (Optional)
                                        </label>
                                        <select
                                            value={formData.appointment_id}
                                            onChange={(e) => setFormData({ ...formData, appointment_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select appointment</option>
                                            {appointments.map(appointment => (
                                                <option key={appointment.id} value={appointment.id.toString()}>
                                                    {appointment.patient.name} - {appointment.service.name} ({formatDate(appointment.appointment_date)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Amount & Description */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Amount (₱) *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                formErrors.amount ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="0.00"
                                        />
                                        {formErrors.amount && (
                                            <p className="text-red-500 text-sm mt-1">{getErr(formErrors.amount)}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Transaction Date *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.transaction_date}
                                            onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                formErrors.transaction_date ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        />
                                        {formErrors.transaction_date && (
                                            <p className="text-red-500 text-sm mt-1">{getErr(formErrors.transaction_date)}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                            formErrors.description ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter transaction description"
                                    />
                                    {formErrors.description && (
                                        <p className="text-red-500 text-sm mt-1">{getErr(formErrors.description)}</p>
                                    )}
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Method <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.payment_method}
                                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                            formErrors.payment_method ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        required
                                    >
                                        <option value="">Select payment method</option>
                                        {paymentMethods.map(method => (
                                            <option key={method.value} value={method.value}>{method.label}</option>
                                        ))}
                                    </select>
                                    {formErrors.payment_method && (
                                        <p className="text-red-500 text-sm mt-1">{getErr(formErrors.payment_method)}</p>
                                    )}
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter additional notes"
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            setFormData(initialFormData);
                                            setFormErrors({});
                                            setSelectedRecord(null);
                                            setIsEditMode(false);
                                        }}
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isEditMode ? 'Update' : 'Create'} Transaction
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Partial Payment Follow-up Modal */}
            {isPartialPaymentModalOpen && partialPaymentRecord && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                Record Follow-up Payment for Partial Amount
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Patient: <span className="font-medium">{partialPaymentRecord.patient.name}</span>
                            </p>

                            {/* Payment Summary */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-600">Service Price</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {formatCurrency(totalServicePrice)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600">Paid Amount</p>
                                        <p className="text-lg font-semibold text-green-600">
                                            {formatCurrency(partialPaymentRecord.amount)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600">Remaining Balance</p>
                                        <p className="text-lg font-semibold text-red-600">
                                            {formatCurrency(remainingBalance)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600">Original Transaction</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            #{partialPaymentRecord.id}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmitPartialPayment} className="space-y-6">
                                {/* Amount */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Amount (?) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={remainingBalance}
                                        value={partialPaymentForm.amount}
                                        onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, amount: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                            partialPaymentErrors.amount ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="0.00"
                                    />
                                    {partialPaymentErrors.amount && (
                                        <p className="text-red-500 text-sm mt-1">{partialPaymentErrors.amount[0]}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                        Maximum: {formatCurrency(remainingBalance)}
                                    </p>
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Method *
                                    </label>
                                    <select
                                        value={partialPaymentForm.payment_method}
                                        onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, payment_method: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                            partialPaymentErrors.payment_method ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    >
                                        <option value="">Select payment method</option>
                                        {paymentMethods.map(method => (
                                            <option key={method.value} value={method.value}>{method.label}</option>
                                        ))}
                                    </select>
                                    {partialPaymentErrors.payment_method && (
                                        <p className="text-red-500 text-sm mt-1">{partialPaymentErrors.payment_method[0]}</p>
                                    )}
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        value={partialPaymentForm.notes}
                                        onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, notes: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter additional notes about this payment"
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPartialPaymentModalOpen(false);
                                            setPartialPaymentRecord(null);
                                            setPartialPaymentForm({ amount: '', payment_method: '', notes: '' });
                                            setPartialPaymentErrors({});
                                        }}
                                        disabled={isPartialPaymentSubmitting}
                                        className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPartialPaymentSubmitting}
                                        className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        Create Payment Transaction
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Verification Contract Modal */}
            {isVerificationModalOpen && verificationRecord && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Verification Contract
                            </h2>

                            {/* Contract Body */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 space-y-4">
                                <div className="text-sm text-gray-700">
                                    <p className="font-semibold font-mono text-center text-gray-900 mb-4">
                                        FINANCIAL RECORD VERIFICATION STATEMENT
                                    </p>
                                    <div className="space-y-3">
                                        <p>
                                            By signing this verification statement, I hereby attest and confirm that I have thoroughly reviewed and verified the following financial record for accuracy and compliance:
                                        </p>
                                        <div className="bg-white p-3 rounded border border-gray-300 space-y-2">
                                            <p><span className="font-medium">Record ID:</span> #{verificationRecord.id}</p>
                                            <p><span className="font-medium">Patient Name:</span> {verificationRecord.patient.name}</p>
                                            <p><span className="font-medium">Amount:</span> {formatCurrency(parseFloat(verificationRecord.amount))}</p>
                                            <p><span className="font-medium">Transaction Date:</span> {formatDate(verificationRecord.transaction_date)}</p>
                                        </div>
                                        <p>
                                            I confirm that:
                                        </p>
                                        <ul className="list-disc list-inside space-y-2 ml-2">
                                            <li>All financial record details are accurate and correct</li>
                                            <li>The transaction amount is verified and properly recorded</li>
                                            <li>No discrepancies or errors have been identified</li>
                                            <li>The record is ready for archival and audit purposes</li>
                                        </ul>
                                        <p className="italic text-gray-600 border-t border-gray-300 pt-3 mt-3">
                                            This verification serves as an administrative endorsement that this record has been reviewed and found to be in compliance with institutional financial standards.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Checkbox Confirmation */}
                            <div className="mb-6">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={verificationConfirmed}
                                        onChange={(e) => setVerificationConfirmed(e.target.checked)}
                                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                        <span className="font-medium">I confirm that this record has been verified.</span>
                                        <span className="block text-xs text-gray-500 mt-1">
                                            I take full responsibility for the accuracy of this verification.
                                        </span>
                                    </span>
                                </label>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsVerificationModalOpen(false);
                                        setVerificationRecord(null);
                                        setVerificationConfirmed(false);
                                    }}
                                    disabled={isVerificationSubmitting}
                                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitVerification}
                                    disabled={!verificationConfirmed || isVerificationSubmitting}
                                    className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isVerificationSubmitting ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={16} />
                                            Confirm Verification
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}


