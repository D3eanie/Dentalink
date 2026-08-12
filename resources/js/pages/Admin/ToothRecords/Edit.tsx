import React, { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiAdmin from '@/services/ApiAdmin';
import { ArrowLeft, Smile, Loader2, User, Stethoscope } from 'lucide-react';

interface ToothRecord {
    id: number;
    patient_id: number;
    doctor_id: number;
    tooth_number: number;
    service: string;
    date_done: string;
    notes?: string;
    patient?: {
        id: number;
        name: string;
    };
    doctor?: {
        id: number;
        name: string;
    };
}

export default function AdminToothRecordsEditPage({ toothRecordId }: Readonly<{ toothRecordId: string }>) {
    const [record, setRecord] = useState<ToothRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        service: '',
        date_done: '',
        notes: ''
    });

    useEffect(() => {
        const fetchRecord = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await apiAdmin.getToothRecord(Number(toothRecordId));
                const recordData = data as ToothRecord;
                setRecord(recordData);
                setForm({
                    service: recordData.service || '',
                    date_done: recordData.date_done?.split('T')[0] || '',
                    notes: recordData.notes || ''
                });
            } catch (err: any) {
                setError(err?.message || 'Failed to load tooth record.');
            } finally {
                setLoading(false);
            }
        };

        fetchRecord();
    }, [toothRecordId]);

    const handleChange = (key: 'service' | 'date_done' | 'notes', value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!record) return;

        if (!form.service || !form.date_done) {
            setError('Service and date done are required.');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            await apiAdmin.updateToothRecord(record.id, {
                service: form.service,
                date_done: form.date_done,
                notes: form.notes
            });
            router.visit(`/admin/tooth-records/${record.id}`);
        } catch (err: any) {
            setError(err?.message || 'Failed to update tooth record.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Edit Service Transaction - DentalinkCare Admin" />
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
                                <h1 className="text-3xl font-bold text-gray-900">Edit Service Transaction</h1>
                                <p className="text-gray-600 mt-1">Update service transaction information (ID: {toothRecordId})</p>
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
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
                                {error}
                            </div>
                        )}

                        {!loading && record && (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-gray-700 mb-2">
                                            <User className="w-4 h-4" />
                                            <span className="font-medium">Patient</span>
                                        </div>
                                        <p className="text-gray-900">{record.patient?.name || 'Unknown'}</p>
                                    </div>

                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-gray-700 mb-2">
                                            <Stethoscope className="w-4 h-4" />
                                            <span className="font-medium">Doctor</span>
                                        </div>
                                        <p className="text-gray-900">{record.doctor?.name || 'Unknown'}</p>
                                    </div>

                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <p className="text-sm text-gray-600">Tooth Number</p>
                                        <p className="text-lg font-semibold text-gray-900">#{record.tooth_number}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="admin-tooth-record-service" className="block text-sm font-medium text-gray-700 mb-2">
                                            Service
                                        </label>
                                        <input
                                            id="admin-tooth-record-service"
                                            type="text"
                                            value={form.service}
                                            onChange={(e) => handleChange('service', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Service performed"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="admin-tooth-record-date" className="block text-sm font-medium text-gray-700 mb-2">
                                            Date Done
                                        </label>
                                        <input
                                            id="admin-tooth-record-date"
                                            type="date"
                                            value={form.date_done}
                                            onChange={(e) => handleChange('date_done', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="admin-tooth-record-notes" className="block text-sm font-medium text-gray-700 mb-2">
                                        Notes
                                    </label>
                                    <textarea
                                        id="admin-tooth-record-notes"
                                        value={form.notes}
                                        onChange={(e) => handleChange('notes', e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Additional notes about this record..."
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                    <Link
                                        href={`/admin/tooth-records/${record.id}`}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                                    >
                                        {saving ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </span>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
