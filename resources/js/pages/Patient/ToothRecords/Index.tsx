import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiPatient from '@/services/ApiPatient';
import {
    Smile,
    Search,
    RefreshCw,
    AlertCircle,
    Loader2,
    FileText,
    Calendar,
    User,
    ChevronRight,
    XCircle
} from 'lucide-react';

interface ToothRecord {
    id: number;
    patient_id: number;
    doctor_id: number;
    tooth_number: number;
    service: string;
    date_done: string;
    notes?: string;
    created_at: string;
    doctor?: {
        id: number;
        name: string;
    };
}

interface Filters {
    search: string;
    tooth_number: string;
}

export default function PatientToothRecordsPage() {
    const { auth } = usePage().props as any;
    const currentUser = auth?.user;

    const [records, setRecords] = useState<ToothRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Filters>({
        search: '',
        tooth_number: ''
    });
    const [selectedRecord, setSelectedRecord] = useState<ToothRecord | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        uniqueTeeth: 0,
        recentTreatments: 0
    });

    // Fetch tooth records from API
    const fetchToothRecords = async () => {
        if (!currentUser?.id) return;

        try {
            setLoading(true);
            // Using the API endpoint that fetches patient's tooth records
            const response = await apiPatient.getMyToothRecords(currentUser.id);

            const data = response?.data || response || [];
            const recordsArray = Array.isArray(data) ? data : [];

            setRecords(recordsArray);

            // Calculate stats
            const total = recordsArray.length;
            const uniqueTeethSet = new Set(recordsArray.map((r: ToothRecord) => r.tooth_number));
            const uniqueTeeth = uniqueTeethSet.size;

            // Recent treatments (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentTreatments = recordsArray.filter((r: ToothRecord) => {
                const recordDate = new Date(r.date_done);
                return recordDate >= thirtyDaysAgo;
            }).length;

            setStats({ total, uniqueTeeth, recentTreatments });
        } catch (error) {
            console.error('[PatientToothRecords] Error fetching tooth records:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchToothRecords();
    }, [currentUser?.id]);

    const handleViewDetails = (record: ToothRecord) => {
        setSelectedRecord(record);
        setShowDetailsModal(true);
    };

    const handleFilterChange = (key: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({ search: '', tooth_number: '' });
    };

    const formatDate = (date: string) => {
        try {
            const cleanDateString = date.split('T')[0];
            const dateObj = new Date(cleanDateString);

            if (isNaN(dateObj.getTime())) {
                return date;
            }

            return dateObj.toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            console.error('Error formatting date:', e);
            return date;
        }
    };

    // Filter records by search and tooth number
    const filteredRecords = records.filter(record => {
        const matchesSearch = !filters.search ||
            record.service?.toLowerCase().includes(filters.search.toLowerCase()) ||
            record.notes?.toLowerCase().includes(filters.search.toLowerCase()) ||
            record.doctor?.name?.toLowerCase().includes(filters.search.toLowerCase());

        const matchesToothNumber = !filters.tooth_number ||
            record.tooth_number.toString() === filters.tooth_number;

        return matchesSearch && matchesToothNumber;
    });

    return (
        <AppLayout>
            <Head title="My Service Transactions - DentalinkCare" />
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-100 p-3 rounded-lg">
                                    <Smile className="w-8 h-8 text-purple-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">My Service Transactions</h1>
                                    <p className="text-gray-600 mt-1">View your dental treatment history</p>
                                </div>
                            </div>
                            <button
                                onClick={fetchToothRecords}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Treatments</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                                </div>
                                <FileText className="w-8 h-8 text-gray-600" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Treated Teeth</p>
                                    <p className="text-2xl font-bold text-purple-600">{stats.uniqueTeeth}</p>
                                </div>
                                <Smile className="w-8 h-8 text-purple-600" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Recent (30 days)</p>
                                    <p className="text-2xl font-bold text-blue-600">{stats.recentTreatments}</p>
                                </div>
                                <Calendar className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search by service, notes, or doctor..."
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <input
                                    type="number"
                                    placeholder="Tooth #"
                                    value={filters.tooth_number}
                                    onChange={(e) => handleFilterChange('tooth_number', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 w-28"
                                    min="1"
                                    max="32"
                                />
                                <button
                                    onClick={clearFilters}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Records List */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 text-purple-600 animate-spin mr-2" />
                                <span className="text-gray-600">Loading records...</span>
                            </div>
                        ) : filteredRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Smile className="w-16 h-16 text-gray-300 mb-4" />
                                <p className="text-gray-600 font-medium">No service transactions found</p>
                                <p className="text-gray-400 text-sm mt-1">Your dental treatment history will appear here</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {filteredRecords.map(record => (
                                    <div
                                        key={record.id}
                                        className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => handleViewDetails(record)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        Tooth #{record.tooth_number}
                                                    </h3>
                                                    <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
                                                        {record.service}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                        <span>Dr. {record.doctor?.name || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                        <span>{formatDate(record.date_done)}</span>
                                                    </div>
                                                </div>

                                                {record.notes && (
                                                    <div className="mt-3 text-sm text-gray-600">
                                                        <span className="font-medium">Notes: </span>
                                                        <span>{record.notes.substring(0, 100)}{record.notes.length > 100 ? '...' : ''}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Details Modal */}
                {showDetailsModal && selectedRecord && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-gray-900">
                                            Tooth #{selectedRecord.tooth_number} - {selectedRecord.service}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">Treatment Details</p>
                                    </div>
                                    <button
                                        onClick={() => setShowDetailsModal(false)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                    {/* Doctor Info */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Treating Dentist</label>
                                        <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                                <User className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">Dr. {selectedRecord.doctor?.name || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Treatment Info */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Treatment Details</label>
                                        <div className="mt-2 bg-gray-50 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm text-gray-500">Date</p>
                                                    <p className="text-gray-900 font-medium">{formatDate(selectedRecord.date_done)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Smile className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm text-gray-500">Service</p>
                                                    <p className="text-gray-900 font-medium">{selectedRecord.service}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                {selectedRecord.notes && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Treatment Notes</label>
                                        <div className="mt-2 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                            <p className="text-gray-900 whitespace-pre-wrap">{selectedRecord.notes}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Info Banner */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-blue-900 text-sm">Treatment Record Information</p>
                                            <p className="text-sm text-blue-700 mt-1">
                                                This is your dental treatment record. If you have questions or concerns,
                                                please contact your dentist.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => setShowDetailsModal(false)}
                                        className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
