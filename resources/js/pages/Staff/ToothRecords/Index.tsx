import React, { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiStaff from '@/services/ApiStaff';
import {
    Smile,
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    Eye,
    RefreshCw,
    AlertCircle,
    X,
    Loader2,
    Download,
    FileText,
    Calendar,
    User,
    CheckCircle,
    ChevronDown,
    ChevronRight
} from 'lucide-react';

interface ToothRecord {
    id: number;
    patient_id: number;
    doctor_id: number;
    tooth_number: number | string;  // Can be number (11, 12...) or range string ("11-28")
    service: string;
    date_done: string;
    notes?: string;
    created_at: string;
    patient?: {
        id: number;
        name: string;
        email: string;
    };
    doctor?: {
        id: number;
        name: string;
    };
}

interface ToothRecordGroup {
    patient_id: number;
    service: string;
    doctor_id: number;
    date_done: string;
    patient_name: string;
    doctor_name: string;
    tooth_ids: number[];
    tooth_numbers: (number | string)[];  // Can be numbers or range strings
    records: ToothRecord[];
}

interface ToothRecordFilters {
    search: string;
    service?: string;
    per_page: number;
}

const conditionOptions = [
    { value: 'healthy', label: 'Healthy', color: 'bg-green-100 text-green-800' },
    { value: 'cavity', label: 'Cavity', color: 'bg-red-100 text-red-800' },
    { value: 'root_canal', label: 'Root Canal Needed', color: 'bg-orange-100 text-orange-800' },
    { value: 'extraction', label: 'Extraction Needed', color: 'bg-red-100 text-red-800' },
    { value: 'crown', label: 'Crown Needed', color: 'bg-blue-100 text-blue-800' },
    { value: 'missing', label: 'Missing', color: 'bg-gray-100 text-gray-800' }
];

const statusOptions = [
    { value: 'pending', label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'reviewed', label: 'Reviewed', color: 'bg-blue-100 text-blue-800' },
    { value: 'treated', label: 'Treated', color: 'bg-green-100 text-green-800' }
];

export default function StaffToothRecordsPage() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const patientIdFromUrl = urlParams.get('patient_id');

    const [records, setRecords] = useState<ToothRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<ToothRecordFilters>({
        search: '',
        service: '',
        per_page: 10
    });
    const [patientId, setPatientId] = useState<string>(patientIdFromUrl || '');
    const [summary, setSummary] = useState({
        total: 0,
        addedToday: 0,
        uniquePatients: 0,
        serviceBreakdown: {} as Record<string, number>
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Fetch tooth records from API
    const fetchToothRecords = async () => {
        try {
            setLoading(true);
            const filterParams = { ...filters };
            if (patientId) {
                filterParams.patient_id = patientId;
            }
            console.log('[ToothRecords] apiStaff methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(apiStaff)).filter(m => !m.startsWith('_')));
            console.log('[ToothRecords] Fetching with filters:', filterParams);
            const response = await apiStaff.getToothRecords(filterParams);
            console.log('[ToothRecords] API Response:', response);

            // Handle different response structures
            const data = response?.data || response?.records || response || [];
            console.log('[ToothRecords] Extracted data:', data);
            console.log('[ToothRecords] Data is array?', Array.isArray(data));
            console.log('[ToothRecords] Data length:', Array.isArray(data) ? data.length : 'N/A');

            setRecords(Array.isArray(data) ? data : []);
            setTotalPages(response?.pagination?.last_page || 1);
        } catch (error) {
            console.error('[ToothRecords] Error fetching tooth records:', error);
            console.error('[ToothRecords] Error details:', {
                message: error?.message,
                response: error?.response,
                status: error?.response?.status
            });
        } finally {
            setLoading(false);
        }
    };

    // Effect hook to fetch records on component mount and when filters change
    useEffect(() => {
        fetchToothRecords();
    }, [filters, patientId]);

    // Calculate summary stats from grouped records (actual transaction rows)
    useEffect(() => {
        if (records.length === 0) {
            setSummary({ total: 0, addedToday: 0, uniquePatients: 0, serviceBreakdown: {} });
            return;
        }

        // Group records to count actual transaction rows
        const groupedData = groupRecords(records);

        // Total rows in current filtered view (grouped transactions)
        const total = groupedData.length;

        // Records added today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const addedToday = records.filter((record: any) => {
            const recordDate = new Date(record.created_at);
            recordDate.setHours(0, 0, 0, 0);
            return recordDate.getTime() === today.getTime();
        }).length;

        // Unique patients in filtered results
        const uniquePatientIds = new Set(groupedData.map((g: any) => g.patient_id));
        const uniquePatients = uniquePatientIds.size;

        // Service breakdown - count occurrences of each service in filtered results
        const serviceBreakdown: Record<string, number> = {};
        groupedData.forEach((group: any) => {
            const serviceName = group.service || 'Unknown';
            serviceBreakdown[serviceName] = (serviceBreakdown[serviceName] || 0) + 1;
        });

        setSummary({ total, addedToday, uniquePatients, serviceBreakdown });
    }, [records]);

    const handleFilterChange = (key: string, value: string | number) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
        setCurrentPage(1);
    };

    const handleRefresh = () => {
        fetchToothRecords();
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this service transaction?')) {
            try {
                await apiStaff.deleteToothRecord(id);
                fetchToothRecords();
            } catch (error) {
                console.error('Error deleting record:', error);
            }
        }
    };

    const handleMarkReviewed = async (id: number) => {
        try {
            await apiStaff.markToothRecordReviewed(id);
            fetchToothRecords();
        } catch (error) {
            console.error('Error marking record as reviewed:', error);
        }
    };

    // Group records by patient, service, doctor, and date
    const detectToothRange = (toothNumbers: number[]): string | null => {
        // Common ranges in FDI notation
        const ranges = [
            { teeth: [11, 12, 13, 14, 15, 16, 17, 18], label: '11-18' },
            { teeth: [21, 22, 23, 24, 25, 26, 27, 28], label: '21-28' },
            { teeth: [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28], label: '11-28' },
            { teeth: [31, 32, 33, 34, 35, 36, 37, 38], label: '31-38' },
            { teeth: [41, 42, 43, 44, 45, 46, 47, 48], label: '41-48' },
            { teeth: [31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48], label: '31-48' },
            { teeth: [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48], label: '11-48' }
        ];

        const sorted = [...toothNumbers].sort((a, b) => a - b);

        for (const range of ranges) {
            const rangeTeeth = range.teeth.sort((a, b) => a - b);
            if (sorted.length === rangeTeeth.length && sorted.every((t, i) => t === rangeTeeth[i])) {
                return range.label;
            }
        }

        return null;
    };

    const groupRecords = (recordsList: ToothRecord[]): ToothRecordGroup[] => {
        const grouped: { [key: string]: ToothRecordGroup } = {};

        recordsList.forEach(record => {
            const key = `${record.patient_id}_${record.service}_${record.doctor_id}_${record.date_done}`;

            if (!grouped[key]) {
                grouped[key] = {
                    patient_id: record.patient_id,
                    service: record.service,
                    doctor_id: record.doctor_id,
                    date_done: record.date_done,
                    patient_name: record.patient?.name || 'Unknown',
                    doctor_name: record.doctor?.name || 'N/A',
                    tooth_ids: [],
                    tooth_numbers: [],
                    records: []
                };
            }

            grouped[key].tooth_ids.push(record.id);
            grouped[key].tooth_numbers.push(record.tooth_number);
            grouped[key].records.push(record);
        });

        // Sort tooth numbers within each group (numbers only)
        Object.values(grouped).forEach(group => {
            const numericValues = group.tooth_numbers.filter(n => typeof n === 'number') as number[];
            const stringValues = group.tooth_numbers.filter(n => typeof n === 'string') as string[];
            numericValues.sort((a, b) => a - b);
            group.tooth_numbers = [...stringValues, ...numericValues];
        });

        return Object.values(grouped);
    };

    const toggleGroupExpanded = (groupKey: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupKey)) {
            newExpanded.delete(groupKey);
        } else {
            newExpanded.add(groupKey);
        }
        setExpandedGroups(newExpanded);
    };

    const getGroupKey = (group: ToothRecordGroup): string => {
        return `${group.patient_id}_${group.service}_${group.doctor_id}_${group.date_done}`;
    };

    const getConditionColor = (condition: string) => {
        const option = conditionOptions.find(o => o.value === condition);
        return option?.color || 'bg-gray-100 text-gray-800';
    };

    const getStatusColor = (status: string) => {
        const option = statusOptions.find(o => o.value === status);
        return option?.color || 'bg-gray-100 text-gray-800';
    };

    const getStatusLabel = (status: string) => {
        const option = statusOptions.find(o => o.value === status);
        return option?.label || status;
    };

    return (
        <AppLayout>
            <Head title="Service Transactions - DentalinkCare" />
            <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-100 p-3 rounded-lg">
                                    <Smile className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">Service Transactions</h1>
                                    <p className="text-gray-600 mt-1">Review and manage service transactions</p>
                                </div>
                            </div>
                            <Link
                                href="/staff/tooth-records/create"
                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                New Record
                            </Link>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                            <p className="text-gray-600 text-sm font-medium">Services Completed</p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">{summary.total}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                            <p className="text-gray-600 text-sm font-medium">Done Today</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">{summary.addedToday}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                            <p className="text-gray-600 text-sm font-medium">Unique Patients</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">{summary.uniquePatients}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                            <p className="text-gray-600 text-sm font-medium">Services Breakdown</p>
                            <p className="text-3xl font-bold text-orange-600 mt-2">{Object.keys(summary.serviceBreakdown).length}</p>
                        </div>
                    </div>


                    {/* Filters and Actions */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Filter className="w-5 h-5" />
                                Filters
                                {patientId && (
                                    <span className="ml-2 px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                        Patient ID: {patientId}
                                    </span>
                                )}
                            </h2>
                            <div className="flex items-center gap-2">
                                {patientId && (
                                    <button
                                        onClick={() => {
                                            setPatientId('');
                                            window.history.pushState({}, '', '/staff/tooth-records');
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        Clear Patient Filter
                                    </button>
                                )}
                                <button
                                    onClick={handleRefresh}
                                    disabled={loading}
                                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search (Patient Name)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Service
                                </label>
                                <input
                                    type="text"
                                    placeholder="Filter by service..."
                                    value={filters.service || ''}
                                    onChange={(e) => handleFilterChange('service', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Records Table */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                            </div>
                        ) : records.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                                <p className="text-gray-600 text-lg">No service transactions found</p>
                                <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or create a new record</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Patient</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Teeth</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Service</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Doctor</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date Done</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {groupRecords(records).map((group, groupIndex) => {
                                            const groupKey = getGroupKey(group);
                                            const isExpanded = expandedGroups.has(groupKey);
                                            // Check if tooth_number is a range string (like "11-28")
                                            const isRangeStored = group.tooth_numbers.some(n => typeof n === 'string');
                                            const rangeValue = isRangeStored ? (group.tooth_numbers.find(n => typeof n === 'string') as string) : null;
                                            const detectedRange = !isRangeStored ? detectToothRange(group.tooth_numbers as number[]) : null;
                                            const teethDisplay = rangeValue
                                                ? `Teeth Range: ${rangeValue}`
                                                : (detectedRange
                                                    ? `Teeth Range: ${detectedRange}`
                                                    : (group.tooth_numbers.length > 3
                                                        ? `Teeth #${group.tooth_numbers.slice(0, 2).join(', #')}... (+${group.tooth_numbers.length - 2})`
                                                        : `Teeth #${group.tooth_numbers.join(', #')}`));

                                            return (
                                                <React.Fragment key={groupKey}>
                                                    {/* Group Header Row */}
                                                    <tr
                                                        onClick={() => toggleGroupExpanded(groupKey)}
                                                        className="hover:bg-blue-50 transition-colors cursor-pointer bg-blue-25"
                                                    >
                                                        <td className="px-6 py-4 text-sm">
                                                            <p className="font-medium text-gray-900">
                                                                {group.patient_name}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            <div className="flex items-center gap-2">
                                                                {group.tooth_numbers.length > 1 && !detectedRange && !rangeValue && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleGroupExpanded(groupKey);
                                                                        }}
                                                                        className="text-gray-500 hover:text-gray-700"
                                                                    >
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="w-4 h-4" />
                                                                        ) : (
                                                                            <ChevronRight className="w-4 h-4" />
                                                                        )}
                                                                    </button>
                                                                )}
                                                                <span className="text-gray-900 font-medium">
                                                                    {teethDisplay}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                                                {group.service}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900">
                                                            {group.doctor_name}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">
                                                            {new Date(group.date_done).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Link
                                                                    href={`/staff/tooth-records/${group.records[0].id}`}
                                                                    className="text-purple-600 hover:text-purple-900 transition-colors"
                                                                    title="View"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Eye className="w-5 h-5" />
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Detail Rows - Only show if not a range and not detected range */}
                                                    {!detectedRange && !rangeValue && isExpanded && group.records.map((record) => (
                                                        <tr key={`expanded_${record.id}`} className="bg-gray-50 hover:bg-gray-100 transition-colors border-l-4 border-blue-400">
                                                            <td className="px-6 py-4 text-sm pl-12">
                                                                <p className="text-gray-600 text-xs">Detail</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                                                Tooth #{record.tooth_number}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm">
                                                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                                                                    {record.service}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                                {record.notes ? record.notes.substring(0, 30) + (record.notes.length > 30 ? '...' : '') : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                                <span className="text-xs">(grouped)</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Link
                                                                        href={`/staff/tooth-records/${record.id}/edit`}
                                                                        className="text-purple-600 hover:text-purple-900 transition-colors"
                                                                        title="Edit"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </Link>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDelete(record.id);
                                                                        }}
                                                                        className="text-red-600 hover:text-red-900 transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
