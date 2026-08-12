import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiAdmin from '@/services/ApiAdmin';
import { ArrowLeft, Smile, Loader2, Calendar, User, Stethoscope, FileText } from 'lucide-react';

interface ToothRecord {
    id: number;
    patient_id: number;
    doctor_id: number;
    tooth_number: number;
    service: string;
    date_done: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    patient?: {
        id: number;
        name: string;
        email?: string;
    };
    doctor?: {
        id: number;
        name: string;
    };
}

export default function AdminToothRecordsShowPage({ toothRecordId }: Readonly<{ toothRecordId: string }>) {
    const [record, setRecord] = useState<ToothRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRecord = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await apiAdmin.getToothRecord(Number(toothRecordId));
                setRecord(data as ToothRecord);
            } catch (err: any) {
                setError(err?.message || 'Failed to load tooth record.');
            } finally {
                setLoading(false);
            }
        };

        fetchRecord();
    }, [toothRecordId]);

    const formatDate = (value?: string) => {
        if (!value) return '-';
        const clean = value.split('T')[0];
        const date = new Date(clean);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <AppLayout>
            <Head title="View Service Transaction - DentalinkCare Admin" />
            <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        <Link
                            href="/admin/tooth-records"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Service Transactions
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-3 rounded-lg">
                                <Smile className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Service Transaction Details</h1>
                                <p className="text-gray-600 mt-1">View service transaction information (ID: {toothRecordId})</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-8">
                        {loading && (
                            <div className="flex items-center justify-center py-10 text-gray-600">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Loading tooth record...
                            </div>
                        )}

                        {!loading && error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                                {error}
                            </div>
                        )}

                        {!loading && !error && record && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            Tooth #{record.tooth_number}
                                        </h2>
                                        <p className="text-gray-600">Record ID: {record.id}</p>
                                    </div>
                                    <Link
                                        href={`/admin/tooth-records/${record.id}/edit`}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Edit Record
                                    </Link>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-gray-700 mb-2">
                                            <User className="w-4 h-4" />
                                            <span className="font-medium">Patient</span>
                                        </div>
                                        <p className="text-gray-900">
                                            {record.patient?.name || 'Unknown'}
                                        </p>
                                        {record.patient?.email && (
                                            <p className="text-sm text-gray-500">{record.patient.email}</p>
                                        )}
                                    </div>

                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-gray-700 mb-2">
                                            <Stethoscope className="w-4 h-4" />
                                            <span className="font-medium">Doctor</span>
                                        </div>
                                        <p className="text-gray-900">{record.doctor?.name || 'Unknown'}</p>
                                    </div>

                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-gray-700 mb-2">
                                            <FileText className="w-4 h-4" />
                                            <span className="font-medium">Service</span>
                                        </div>
                                        <p className="text-gray-900">{record.service || '-'}</p>
                                    </div>

                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-gray-700 mb-2">
                                            <Calendar className="w-4 h-4" />
                                            <span className="font-medium">Date Done</span>
                                        </div>
                                        <p className="text-gray-900">{formatDate(record.date_done)}</p>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-gray-700 mb-2">
                                        <FileText className="w-4 h-4" />
                                        <span className="font-medium">Notes</span>
                                    </div>
                                    <p className="text-gray-900 whitespace-pre-wrap">
                                        {record.notes || 'No notes provided.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
