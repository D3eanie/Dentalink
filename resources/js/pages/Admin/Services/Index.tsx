import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiAdmin from '@/services/ApiAdmin';
import { 
    Plus, 
    Search, 
    Filter, 
    Edit, 
    Trash2, 
    Eye, 
    Clock,
    MoreHorizontal,
    Download,
    RefreshCw,
    Activity,
    AlertCircle,
    // FIX: Add 'X' to the imports for the modal close button
    X 
} from 'lucide-react';

// TypeScript interfaces
interface Service {
    id: number;
    name: string;
    description: string;
    price: number;
    duration_minutes: number;
    category: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    appointments_count?: number;
    formatted_price?: string;
    category_display?: string;
}

interface ServiceFilters {
    search: string;
    category: string;
    is_active: string;
}

interface ServiceFormData {
    name: string;
    description: string;
    price: string;
    duration_minutes: string;
    category: string;
    is_active: boolean;
}

const initialFormData: ServiceFormData = {
    name: '',
    description: '',
    price: '',
    duration_minutes: '30',
    category: 'preventive',
    is_active: true
};

const serviceCategories = [
    { value: 'preventive', label: 'Preventive Care' },
    { value: 'restorative', label: 'Restorative' },
    { value: 'cosmetic', label: 'Cosmetic' },
    { value: 'surgical', label: 'Surgical' },
    { value: 'emergency', label: 'Emergency' }
];

const breadcrumbs = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Services', href: '/admin/services' }
];

export default function AdminServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [formData, setFormData] = useState<ServiceFormData>(initialFormData);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [filters, setFilters] = useState<ServiceFilters>({
        search: '',
        category: '',
        is_active: ''
    });
    const [summary, setSummary] = useState({
        total: 0,
        active: 0,
        inactive: 0
    });

    // Fetch services from API
    const fetchServices = async () => {
        try {
            setLoading(true);
            const response = await apiAdmin.getServices(filters);
            setServices(response.data || response.services || []);
            setSummary(response.summary || summary);
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce filter changes for search
        const debounce = setTimeout(() => {
            fetchServices();
        }, 300);
        return () => clearTimeout(debounce);
    }, [filters.search, filters.category, filters.is_active]);

    // Initial load/Refresh button
    useEffect(() => {
        fetchServices();
    }, []);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors({});

        try {
            const serviceData = {
                ...formData,
                price: parseFloat(formData.price),
                duration_minutes: parseInt(formData.duration_minutes)
            };

            if (isEditMode && selectedService) {
                await apiAdmin.updateService(selectedService.id, serviceData);
                // apiAdmin.updateService shows a success Swal internally
            } else {
                await apiAdmin.createService(serviceData);
                // apiAdmin.createService shows a success Swal internally
            }

            setIsModalOpen(false);
            setFormData(initialFormData);
            setSelectedService(null);
            setIsEditMode(false);
            fetchServices();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                const errorMap: Record<string, string> = {};
                Object.keys(errors).forEach(key => {
                    errorMap[key] = errors[key][0];
                });
                setFormErrors(errorMap);
                // apiAdmin.showErrorToast('Please correct the form errors.');
            } else {
                // apiAdmin methods already show an error Swal on API failure
                console.error(`Failed to ${isEditMode ? 'update' : 'create'} service:`, error);
                // The error is logged here, but the user is notified via the Swal toast from apiAdmin
            }
        }
    };

    // Handle service deletion
    const handleDelete = async (service: Service) => {
        try {
            // apiAdmin.deleteService handles the Swal confirmation dialog, the DELETE API call, 
            // and shows the success/error Swal messages internally. This prevents the ReferenceError in Index.tsx.
            const result = await apiAdmin.deleteService(service.id, service.name);
            
            // Only refresh the service list if the delete operation was confirmed AND successful.
            if (result !== null) {
                fetchServices();
            }
        } catch (error) {
            // The error is logged here. The user is notified via the Swal error toast from apiAdmin
            console.error('Error deleting service:', error);
        }
    };

    // Handle edit
    const handleEdit = (service: Service) => {
        setSelectedService(service);
        setFormData({
            name: service.name,
            description: service.description || '',
            price: service.price.toString(),
            duration_minutes: service.duration_minutes.toString(),
            category: service.category,
            is_active: service.is_active
        });
        setIsEditMode(true);
        setIsModalOpen(true);
        setFormErrors({});
    };

    // Handle create new
    const handleCreateNew = () => {
        setSelectedService(null);
        setFormData(initialFormData);
        setIsEditMode(false);
        setIsModalOpen(true);
        setFormErrors({});
    };

    // Handle filter change
    const handleFilterChange = (key: keyof ServiceFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({ search: '', category: '', is_active: '' });
    };

    // Export services
    const handleExport = async () => {
        try {
            await apiAdmin.exportServices();
        } catch (error) {
            console.error('Export error:', error);
        }
    };

    const getCategoryColor = (category: string) => {
        const colors = {
            preventive: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            restorative: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            cosmetic: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            surgical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            emergency: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
        };
        return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Services Management" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto px-4 py-6 sm:py-8">
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                                <Activity className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    Services Management
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    Manage dental services, pricing, and categories
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
                                onClick={fetchServices}
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
                                Add Service
                            </button>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Services</p>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
                                </div>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Services</p>
                                    <p className="text-3xl font-bold text-green-700 dark:text-green-400">{summary.active}</p>
                                </div>
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactive Services</p>
                                    <p className="text-3xl font-bold text-red-700 dark:text-red-400">{summary.inactive}</p>
                                </div>
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                    <Activity className="w-6 h-6 text-red-600 dark:text-red-400" />
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
                                            placeholder="Search by name or description..."
                                            value={filters.search}
                                            onChange={(e) => handleFilterChange('search', e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <select
                                        value={filters.category}
                                        onChange={(e) => handleFilterChange('category', e.target.value)}
                                        className="w-full md:w-40 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                    >
                                        <option value="">All Categories</option>
                                        {serviceCategories.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={filters.is_active}
                                        onChange={(e) => handleFilterChange('is_active', e.target.value)}
                                        className="w-full md:w-32 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                    >
                                        <option value="">All Status</option>
                                        <option value="1">Active</option>
                                        <option value="0">Inactive</option>
                                    </select>
                                    {(filters.search || filters.category || filters.is_active) && (
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

                        {/* Services Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-750">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                                            Service
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                                            Category
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                            Price
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                                            Duration
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
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
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                <div className="flex justify-center">
                                                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                                                </div>
                                                <p className="mt-2">Loading services...</p>
                                            </td>
                                        </tr>
                                    ) : services.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                <div className="flex justify-center mb-2">
                                                    <Activity className="w-8 h-8 text-gray-400" />
                                                </div>
                                                No services found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        services.map((service) => (
                                            <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {service.name}
                                                        </div>
                                                        {service.description && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs md:max-w-none">
                                                                {service.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden sm:table-cell">
                                                    <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${getCategoryColor(service.category)}`}>
                                                        {serviceCategories.find(cat => cat.value === service.category)?.label || service.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {/* FIX: Use Number() to convert the price string/unknown type to a number before calling toFixed() */}
                                                        {/* This addresses: Uncaught TypeError: service.price.toFixed is not a function at Index.tsx:429:73 */}
                                                        ₱{Number(service.price).toFixed(2)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                        <Clock className="w-4 h-4 mr-1" />
                                                        {service.duration_minutes} min
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${
                                                        service.is_active 
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                    }`}>
                                                        {service.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        <button
                                                            onClick={() => handleEdit(service)}
                                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                            title="Edit Service"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(service)}
                                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                            title="Delete Service"
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
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="sticky top-0 bg-blue-600 dark:bg-blue-700 rounded-t-2xl px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold text-white">
                                {isEditMode ? 'Edit Service' : 'Add New Service'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="h-6 w-6 text-white" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Service Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Service Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                        formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="Enter service name (e.g., Dental Check-up)"
                                />
                                {formErrors.name && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {formErrors.name}
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                        formErrors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="Brief description of the service"
                                />
                                {formErrors.description && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {formErrors.description}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                {/* Price */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Price (₱) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                            formErrors.price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="0.00"
                                    />
                                    {formErrors.price && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {formErrors.price}
                                        </p>
                                    )}
                                </div>

                                {/* Duration */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Duration (minutes) *
                                    </label>
                                    <input
                                        type="number"
                                        min="15"
                                        step="15"
                                        value={formData.duration_minutes}
                                        onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                            formErrors.duration_minutes ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {formErrors.duration_minutes && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {formErrors.duration_minutes}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Category *
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                        formErrors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                >
                                    {serviceCategories.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                                {formErrors.category && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {formErrors.category}
                                    </p>
                                )}
                            </div>

                            {/* Active Status */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="h-5 w-5 text-blue-600 dark:bg-gray-600 border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Active Service
                                    </span>
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-8">
                                    Inactive services cannot be booked for appointments.
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setFormData(initialFormData);
                                        setFormErrors({});
                                        setSelectedService(null);
                                        setIsEditMode(false);
                                    }}
                                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-gray-700 dark:text-gray-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                                >
                                    {isEditMode ? 'Update Service' : 'Create Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}