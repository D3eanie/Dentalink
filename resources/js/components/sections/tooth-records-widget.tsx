import React from 'react';
import { Link } from '@inertiajs/react';
import { Smile, TrendingUp, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

interface ToothRecord {
    id: number;
    patient?: {
        id: number;
        name: string;
    };
    patient_id?: number;
    tooth_number: number;
    service?: string;
    status?: string;
    date_done?: string;
    date_recorded?: string;
    created_at?: string;
}

interface ToothRecordsWidgetProps {
    records?: ToothRecord[];
    stats?: {
        total: number;
        addedToday: number;
        uniquePatients: number;
    };
    userRole: 'admin' | 'staff' | 'patient';
}

export default function ToothRecordsWidget({ records = [], stats, userRole }: ToothRecordsWidgetProps) {
    console.log('[ToothRecordsWidget] === WIDGET RENDER ===');
    console.log('[ToothRecordsWidget] records:', records);
    console.log('[ToothRecordsWidget] records length:', Array.isArray(records) ? records.length : 'not array');
    console.log('[ToothRecordsWidget] stats:', stats);
    console.log('[ToothRecordsWidget] userRole:', userRole);

    const dashboardUrl = userRole === 'admin'
        ? '/admin/tooth-records'
        : '/staff/tooth-records';

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            'healthy': 'bg-green-100 text-green-700',
            'treatment_needed': 'bg-red-100 text-red-700',
            'under_treatment': 'bg-yellow-100 text-yellow-700',
            'treated': 'bg-blue-100 text-blue-700',
            'missing': 'bg-gray-100 text-gray-700',
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    const getStatusLabel = (status: string) => {
        const labels: { [key: string]: string } = {
            'healthy': 'Healthy',
            'treatment_needed': 'Treatment Needed',
            'under_treatment': 'Under Treatment',
            'treated': 'Treated',
            'missing': 'Missing',
        };
        return labels[status] || status;
    };

    // Calculate stats from `records` (used when `stats` prop is not provided)
    const calculatedStats = {
        total: Array.isArray(records) ? records.length : 0,
        addedToday: Array.isArray(records) ? records.filter((r: any) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const recordDate = new Date(r.date_done || r.date_recorded || r.created_at || new Date());
            recordDate.setHours(0, 0, 0, 0);
            return recordDate.getTime() === today.getTime();
        }).length : 0,
        uniquePatients: Array.isArray(records) ? new Set(records.map((r: any) => r.patient_id || r.patient?.id)).size : 0
    };

    // Use provided stats if available, otherwise calculate from records
    const displayStats = stats ?? calculatedStats;

    console.log('[ToothRecordsWidget] displayStats:', displayStats);

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Smile className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Service Transactions</h3>
                        <p className="text-xs text-gray-500">Patient oral health tracking</p>
                    </div>
                </div>
                <Link
                    href={dashboardUrl}
                    className="text-blue-600 hover:text-blue-700 transition"
                >
                    <ArrowRight className="w-5 h-5" />
                </Link>
            </div>

            {/* Statistics - summaries-only (no detailed recent records) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Total Records</p>
                    <p className="text-xl font-bold text-blue-600">{displayStats.total}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Added Today</p>
                    <p className="text-xl font-bold text-green-600">{displayStats.addedToday}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Unique Patients</p>
                    <p className="text-xl font-bold text-purple-600">{displayStats.uniquePatients}</p>
                </div>
            </div>

            {/* Action Button */}
            <Link
                href={dashboardUrl}
                className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center text-sm font-medium flex items-center justify-center gap-2"
            >
                <Smile className="w-4 h-4" />
                View All Tooth Records
            </Link>
        </div>
    );
}
