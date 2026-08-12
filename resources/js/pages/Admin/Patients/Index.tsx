import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiAdmin from '@/services/ApiAdmin';
import {
    Users, Search, Filter, Plus, Edit, Trash2, Eye, Phone, Mail,
    Calendar, RefreshCw, Download, AlertCircle, MapPin, X, Loader2,
    CheckCircle, XCircle, Smile
} from 'lucide-react';

interface Patient {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address?: string;
    date_of_birth?: string;
    birthday?: string;
    gender?: string;
    medical_history?: string;
    created_at: string;
    appointments_count?: number;
    last_appointment?: string;
    is_active?: boolean;
    status?: string;
}

interface PatientFilters {
    search: string;
    gender: string;
    status: string;
    per_page: number;
}

interface PatientFormData {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    gender: string;
    address: string;
    medical_history: string;
    role: string;
}

const initialFormData: PatientFormData = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    medical_history: '',
    role: 'patient'
};

// Helper to transform frontend data to backend format
const transformToBackendFormat = (formData: PatientFormData, isEdit: boolean = false) => {
    const data: any = {
        name: `${formData.first_name} ${formData.last_name}`.trim(),
        email: formData.email,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        birthday: formData.date_of_birth || undefined,
        gender: formData.gender ? formData.gender.toLowerCase() : undefined,
        medical_history: formData.medical_history || undefined,
        role: 'patient',
        is_active: true,
        status: 'active'
    };

    // For create, add password (required by backend)
    if (!isEdit) {
        data.password = 'TempPassword123!';
        data.password_confirmation = 'TempPassword123!';
    }

    // Remove undefined values
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
    );
};

// Helper to transform backend data to frontend format
const transformToFrontendFormat = (patient: Patient): PatientFormData => {
    // Handle name splitting
    const firstName = patient.first_name || '';
    const lastName = patient.last_name || '';

    // Format date for input[type=date]
    let formattedDate = '';
    const dateField = patient.date_of_birth || patient.birthday;
    if (dateField) {
        try {
            const date = new Date(dateField);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toISOString().split('T')[0];
            }
        } catch (e) {
            console.warn('Invalid date format:', dateField);
        }
    }

    return {
        first_name: firstName,
        last_name: lastName,
        email: patient.email || '',
        phone: patient.phone || '',
        date_of_birth: formattedDate,
        gender: patient.gender || '',
        address: patient.address || '',
        medical_history: patient.medical_history || '',
        role: 'patient'
    };
};

const breadcrumbs = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Patients', href: '/admin/patients' }
];

export default function AdminPatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [formData, setFormData] = useState<PatientFormData>(initialFormData);
    const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filters, setFilters] = useState<PatientFilters>({
        search: '',
        gender: '',
        status: '',
        per_page: 10
    });
    const [summary, setSummary] = useState({
        total: 0,
        male: 0,
        female: 0,
        active: 0,
        inactive: 0
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Fetch patients from API
    const fetchPatients = async () => {
        try {
            setLoading(true);
            const response = await apiAdmin.getPatients({
                ...filters,
                page: currentPage
            });

            console.log('Raw API response:', response);

            // Extract patients data from various possible response structures
            let patientsData = [];

            if (Array.isArray(response.data)) {
                patientsData = response.data;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                patientsData = response.data.data;
            } else if (response.patients && Array.isArray(response.patients)) {
                patientsData = response.patients;
            } else if (Array.isArray(response)) {
                patientsData = response;
            }

            console.log('Extracted patients data:', patientsData);

            setPatients(patientsData);

            // Set pagination
            setTotalPages(response?.last_page || response?.data?.last_page || 1);

            // Calculate summary
            const total = patientsData.length;
            const male = patientsData.filter((p: Patient) =>
                p.gender?.toLowerCase() === 'male'
            ).length;
            const female = patientsData.filter((p: Patient) =>
                p.gender?.toLowerCase() === 'female'
            ).length;
            const active = patientsData.filter((p: Patient) =>
                p.is_active === true || p.status === 'active'
            ).length;
            const inactive = patientsData.filter((p: Patient) =>
                p.is_active === false || p.status === 'inactive'
            ).length;

            setSummary({
                total: response.meta?.total || response.data?.meta?.total || total,
                male: response.summary?.male || response.data?.summary?.male || male,
                female: response.summary?.female || response.data?.summary?.female || female,
                active: response.summary?.active || response.data?.summary?.active || active,
                inactive: response.summary?.inactive || response.data?.summary?.inactive || inactive,
            });
        } catch (error) {
            console.error('Error fetching patients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, [filters.search, filters.gender, filters.status, filters.per_page, currentPage]);

    // Handle form submission (Create or Update)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormErrors({});

        // Client-side validation
        if (!formData.first_name || !formData.last_name || !formData.email) {
            setFormErrors({
                _form: ['Please fill in all required fields (First Name, Last Name, Email).']
            });
            setIsSubmitting(false);
            return;
        }

        try {
            const submissionData = transformToBackendFormat(formData, isEditMode);

            console.log('Submitting data:', submissionData);
            console.log('Is edit mode:', isEditMode);

            if (isEditMode && selectedPatient) {
                console.log('Updating patient ID:', selectedPatient.id);
                await apiAdmin.updateUser(selectedPatient.id, submissionData);
            } else {
                console.log('Creating new patient');
                await apiAdmin.createUser(submissionData);
            }

            console.log('Success! Closing modal...');
            setIsModalOpen(false);
            setFormData(initialFormData);
            setSelectedPatient(null);
            setIsEditMode(false);
            fetchPatients();

        } catch (error: any) {
            console.error('Submit error:', error);

            let validationErrors: Record<string, string[]> = {};

            if (error.response?.status === 422) {
                validationErrors = error.response?.data?.errors || {};
            } else if (error.errors) {
                validationErrors = error.errors;
            }

            if (Object.keys(validationErrors).length > 0) {
                setFormErrors(validationErrors);
            } else {
                setFormErrors({
                    _form: [error.message || 'An unexpected error occurred. Please try again.']
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle patient deletion
    const handleDelete = async (patient: Patient) => {
        try {
            const fullName = `${patient.first_name} ${patient.last_name}`;
            const result = await apiAdmin.deleteUser(patient.id, fullName);

            if (result !== null) {
                fetchPatients();
            }
        } catch (error) {
            console.error('Error deleting patient:', error);
        }
    };

    // Handle edit button click
    const handleEdit = (patient: Patient) => {
        setSelectedPatient(patient);
        setFormData(transformToFrontendFormat(patient));
        setIsEditMode(true);
        setIsModalOpen(true);
        setFormErrors({});
    };

    // Handle create new button click
    const handleCreateNew = () => {
        setSelectedPatient(null);
        setFormData(initialFormData);
        setIsEditMode(false);
        setIsModalOpen(true);
        setFormErrors({});
    };

    // Handle modal close
    const handleModalClose = () => {
        setIsModalOpen(false);
        setFormData(initialFormData);
        setFormErrors({});
        setSelectedPatient(null);
        setIsEditMode(false);
    };

    // Handle filter change
    const handleFilterChange = (key: keyof PatientFilters, value: string | number) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page on filter change
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({ search: '', gender: '', status: '', per_page: 10 });
        setCurrentPage(1);
    };

    // Export patients
    const handleExport = async () => {
        try {
            // Export new patients added for the current month
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

            // Export patients created in the current month
            await apiAdmin.exportPatients(startDate, endDate);
        } catch (error) {
            console.error('Export error:', error);
        }
    };

    const getAge = (dob: string | undefined): string => {
        if (!dob) return 'N/A';
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `${age} yrs`;
    };

    // Get status display
    const getStatusBadge = (patient: Patient) => {
        const isActive = patient.is_active === true || patient.status === 'active';
        return isActive ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                <CheckCircle className="w-3 h-3" />
                Active
            </span>
        ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                <XCircle className="w-3 h-3" />
                Inactive
            </span>
        );
    };

    // Render field error helper
    const renderFieldError = (fieldName: keyof PatientFormData) => {
        const errors = formErrors[fieldName];
        if (errors && errors.length > 0) {
            return (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors[0]}
                </p>
            );
        }
        return null;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Patients Management" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto px-4 py-6 sm:py-8">
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                                <Users className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    Patient Management
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    Manage patient profiles and health records
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2.5 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                            <button
                                onClick={fetchPatients}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2.5 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                            <button
                                onClick={handleCreateNew}
                                className="flex items-center gap-2 px-5 py-2.5 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                            >
                                <Plus className="w-4 h-4" />
                                Add Patient
                            </button>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
                                </div>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Male</p>
                                    <p className="text-3xl font-bold text-cyan-700 dark:text-cyan-400">{summary.male}</p>
                                </div>
                                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                                    <Users className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Female</p>
                                    <p className="text-3xl font-bold text-pink-700 dark:text-pink-400">{summary.female}</p>
                                </div>
                                <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                                    <Users className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                                    <p className="text-3xl font-bold text-green-700 dark:text-green-400">{summary.active}</p>
                                </div>
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactive</p>
                                    <p className="text-3xl font-bold text-red-700 dark:text-red-400">{summary.inactive}</p>
                                </div>
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters & Table Container */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                        {/* Filters */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                <div className="flex-1 w-full">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, email, or phone..."
                                            value={filters.search}
                                            onChange={(e) => handleFilterChange('search', e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <select
                                        value={filters.gender}
                                        onChange={(e) => handleFilterChange('gender', e.target.value)}
                                        className="w-full md:w-32 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                    >
                                        <option value="">All Genders</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                    <select
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                        className="w-full md:w-32 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                    >
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                    <select
                                        value={filters.per_page}
                                        onChange={(e) => handleFilterChange('per_page', parseInt(e.target.value))}
                                        className="w-full md:w-24 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                    >
                                        <option value="10">10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                    {(filters.search || filters.gender || filters.status) && (
                                        <button
                                            onClick={clearFilters}
                                            className="p-2.5 text-red-600 dark:text-red-400 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-red-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                                            title="Clear Filters"
                                        >
                                            <Filter className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Patients Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-750">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                                            Name
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                                            Contact Info
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                                            Demographics
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                <div className="flex justify-center">
                                                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                                </div>
                                                <p className="mt-2">Loading patient data...</p>
                                            </td>
                                        </tr>
                                    ) : patients.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                <div className="flex justify-center mb-2">
                                                    <Users className="w-8 h-8 text-gray-400" />
                                                </div>
                                                No patients found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        patients.map((patient) => (
                                            <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className={`p-2 rounded-full ${patient.gender === 'male' ? 'bg-cyan-100' : patient.gender === 'female' ? 'bg-pink-100' : 'bg-gray-100'} dark:bg-gray-700 mr-3`}>
                                                            <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {patient.first_name} {patient.last_name}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                ID: {patient.id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden sm:table-cell">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                                                            <Mail className="w-3.5 h-3.5 mr-1 text-blue-500" />
                                                            {patient.email}
                                                        </div>
                                                        {patient.phone && (
                                                            <div className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                                                                <Phone className="w-3.5 h-3.5 mr-1 text-green-500" />
                                                                {patient.phone}
                                                            </div>
                                                        )}
                                                        {patient.address && (
                                                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                                                <MapPin className="w-3.5 h-3.5 mr-1" />
                                                                {patient.address}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {patient.date_of_birth || patient.birthday ? getAge(patient.date_of_birth || patient.birthday) : 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                                        {patient.gender || 'Unknown'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden lg:table-cell">
                                                    {getStatusBadge(patient)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        <button
                                                            onClick={() => window.location.href = `/admin/tooth-records?patient_id=${patient.id}`}
                                                            className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                            title="View Service Transactions"
                                                        >
                                                            <Smile className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(patient)}
                                                            className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                            title="Edit Patient"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(patient)}
                                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                            title="Delete Patient"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal for Create/Edit Patient */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="sticky top-0 bg-blue-600 dark:bg-blue-700 rounded-t-2xl px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold text-white">
                                {isEditMode ? 'Edit Patient Profile' : 'Add New Patient'}
                            </h2>
                            <button
                                onClick={handleModalClose}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="h-6 w-6 text-white" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* General Form Error */}
                            {formErrors._form && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                                        <AlertCircle className="h-5 w-5" />
                                        <p className="text-sm font-medium">{formErrors._form[0]}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* First Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        First Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                            formErrors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="John"
                                    />
                                    {renderFieldError('first_name')}
                                </div>

                                {/* Last Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Last Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                            formErrors.last_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="Doe"
                                    />
                                    {renderFieldError('last_name')}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                            formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="john.doe@example.com"
                                    />
                                    {renderFieldError('email')}
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                            formErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="(+63) 9xxxxxxxxx"
                                    />
                                    {renderFieldError('phone')}
                                </div>

                                {/* Date of Birth */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={formData.date_of_birth}
                                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                            formErrors.date_of_birth ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {renderFieldError('date_of_birth')}
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Gender</label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                            formErrors.gender ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {renderFieldError('gender')}
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                        formErrors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="Complete street address"
                                />
                                {renderFieldError('address')}
                            </div>

                            {/* Medical History */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Medical History (Pre-existing conditions, allergies, etc.)
                                </label>
                                <textarea
                                    value={formData.medical_history}
                                    onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                                    rows={3}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                        formErrors.medical_history ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="Type any relevant medical information here..."
                                />
                                {renderFieldError('medical_history')}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={handleModalClose}
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-gray-700 dark:text-gray-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-3 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isEditMode ? 'Update Patient' : 'Create Patient'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
