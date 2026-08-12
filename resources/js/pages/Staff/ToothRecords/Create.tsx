import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiStaff from '@/services/ApiStaff';
import { formatAppointmentDate, formatAppointmentTime } from '@/utils/dateTime';
import {
    ArrowLeft,
    Smile,
    Loader2,
    Plus,
    Trash2,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

interface Appointment {
    id: number;
    patient: { id: number; first_name: string; last_name: string; email: string };
    doctor: { id: number; name: string };
    service: { id: number; name: string; requires_multiple_teeth?: boolean };
    appointment_date: string;
    appointment_time: string;
    status: string;
}

interface ToothRecordForm {
    tooth_number: number | string; // Can be a number like 11 or a range like "11-18"
    service: string;
    date_done: string;
    notes: string;
}

const toothRanges = [
    { value: '11-18', label: 'Upper Right Arch (11-18)' },
    { value: '21-28', label: 'Upper Left Arch (21-28)' },
    { value: '11-28', label: 'Full Upper Arch (11-28)' },
    { value: '31-38', label: 'Lower Left Arch (31-38)' },
    { value: '41-48', label: 'Lower Right Arch (41-48)' },
    { value: '31-48', label: 'Full Lower Arch (31-48)' },
    { value: '11-48', label: 'Full Mouth (11-48)' }
];

const toothNumbers = [
    // Upper Right Quadrant (11-18)
    { value: 11, label: '11 - Upper Right Central Incisor' },
    { value: 12, label: '12 - Upper Right Lateral Incisor' },
    { value: 13, label: '13 - Upper Right Canine' },
    { value: 14, label: '14 - Upper Right First Premolar' },
    { value: 15, label: '15 - Upper Right Second Premolar' },
    { value: 16, label: '16 - Upper Right First Molar' },
    { value: 17, label: '17 - Upper Right Second Molar' },
    { value: 18, label: '18 - Upper Right Third Molar' },
    // Upper Left Quadrant (21-28)
    { value: 21, label: '21 - Upper Left Central Incisor' },
    { value: 22, label: '22 - Upper Left Lateral Incisor' },
    { value: 23, label: '23 - Upper Left Canine' },
    { value: 24, label: '24 - Upper Left First Premolar' },
    { value: 25, label: '25 - Upper Left Second Premolar' },
    { value: 26, label: '26 - Upper Left First Molar' },
    { value: 27, label: '27 - Upper Left Second Molar' },
    { value: 28, label: '28 - Upper Left Third Molar' },
    // Lower Left Quadrant (31-38)
    { value: 31, label: '31 - Lower Left Central Incisor' },
    { value: 32, label: '32 - Lower Left Lateral Incisor' },
    { value: 33, label: '33 - Lower Left Canine' },
    { value: 34, label: '34 - Lower Left First Premolar' },
    { value: 35, label: '35 - Lower Left Second Premolar' },
    { value: 36, label: '36 - Lower Left First Molar' },
    { value: 37, label: '37 - Lower Left Second Molar' },
    { value: 38, label: '38 - Lower Left Third Molar' },
    // Lower Right Quadrant (41-48)
    { value: 41, label: '41 - Lower Right Central Incisor' },
    { value: 42, label: '42 - Lower Right Lateral Incisor' },
    { value: 43, label: '43 - Lower Right Canine' },
    { value: 44, label: '44 - Lower Right First Premolar' },
    { value: 45, label: '45 - Lower Right Second Premolar' },
    { value: 46, label: '46 - Lower Right First Molar' },
    { value: 47, label: '47 - Lower Right Second Molar' },
    { value: 48, label: '48 - Lower Right Third Molar' }
];

const initialToothRecord: ToothRecordForm = {
    tooth_number: 0,
    service: '',
    date_done: new Date().toISOString().split('T')[0],
    notes: ''
};

export default function StaffToothRecordsCreatePage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [toothRecords, setToothRecords] = useState<ToothRecordForm[]>([initialToothRecord]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            console.log('[ToothRecordsCreate] Loading appointments...');

            const appointmentsRes = await apiStaff.getAppointments({ per_page: 100 });

            const appointmentsList = appointmentsRes.data || appointmentsRes.appointments || [];
            // Filter only confirmed or checked_in appointments
            const validAppointments = appointmentsList.filter(apt =>
                apt.status === 'completed');
            setAppointments(validAppointments);
            console.log(`[ToothRecordsCreate] Appointments loaded: ${validAppointments.length} out of ${appointmentsList.length} total`);
        } catch (error) {
            console.error('[ToothRecordsCreate] Error loading initial data:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error Loading Data',
                text: 'Failed to load appointments. Please try again.',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAppointment = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        // Pre-fill from appointment information
        const toothRecord: ToothRecordForm = {
            tooth_number: 0,
            service: appointment.service?.name || '',
            date_done: new Date().toISOString().split('T')[0],
            notes: ''
        };
        setToothRecords([toothRecord]);
    };

    const handleAddToothRecord = () => {
        // Copy the service and use today's date for new records
        const newRecord: ToothRecordForm = {
            tooth_number: 0,
            service: toothRecords[0]?.service || (selectedAppointment?.service?.name || ''),
            date_done: new Date().toISOString().split('T')[0],
            notes: ''
        };
        setToothRecords([...toothRecords, newRecord]);
    };

    const handleBulkSelectUpperArch = () => {
        // Upper Arch: Range 11-28 (teeth 11-18 upper right, 21-28 upper left)
        const service = selectedAppointment?.service?.name || toothRecords[0]?.service || '';
        const date = new Date().toISOString().split('T')[0];

        const newRecord: ToothRecordForm = {
            tooth_number: '11-28',  // Range string
            service,
            date_done: date,
            notes: ''
        };
        setToothRecords([newRecord]);
    };

    const handleBulkSelectLowerArch = () => {
        // Lower Arch: Range 31-48 (teeth 31-38 lower left, 41-48 lower right)
        const service = selectedAppointment?.service?.name || toothRecords[0]?.service || '';
        const date = new Date().toISOString().split('T')[0];

        const newRecord: ToothRecordForm = {
            tooth_number: '31-48',  // Range string
            service,
            date_done: date,
            notes: ''
        };
        setToothRecords([newRecord]);
    };

    const handleBulkSelectFullMouth = () => {
        // Full Mouth: Range 11-48 (all 32 teeth)
        const service = selectedAppointment?.service?.name || toothRecords[0]?.service || '';
        const date = new Date().toISOString().split('T')[0];

        const newRecord: ToothRecordForm = {
            tooth_number: '11-48',  // Range string
            service,
            date_done: date,
            notes: ''
        };
        setToothRecords([newRecord]);
    };

    const handleRemoveToothRecord = (index: number) => {
        if (toothRecords.length === 1) {
            Swal.fire({
                icon: 'warning',
                title: 'Cannot Remove',
                text: 'At least one tooth record is required'
            });
            return;
        }
        setToothRecords(toothRecords.filter((_, i) => i !== index));
    };

    const handleToothRecordChange = (index: number, field: string, value: any) => {
        const updated = [...toothRecords];
        updated[index] = { ...updated[index], [field]: value };
        setToothRecords(updated);
    };

    // Helper function to expand tooth ranges to individual teeth
    const expandToothRanges = (records: ToothRecordForm[]): ToothRecordForm[] => {
        const expandedRecords: ToothRecordForm[] = [];

        records.forEach(record => {
            const toothValue = record.tooth_number;

            if (typeof toothValue === 'string' && toothValue.includes('-')) {
                // This is a range like "11-18"
                const [start, end] = toothValue.split('-').map(Number);
                for (let i = start; i <= end; i++) {
                    expandedRecords.push({
                        ...record,
                        tooth_number: i
                    });
                }
            } else {
                // Individual tooth number
                expandedRecords.push(record);
            }
        });

        return expandedRecords;
    };

    const getToothDisplayLabel = (toothValue: number | string): string => {
        if (typeof toothValue === 'string') {
            const range = toothRanges.find(r => r.value === toothValue);
            return range ? range.label : toothValue;
        }
        const tooth = toothNumbers.find(t => t.value === toothValue);
        return tooth ? tooth.label : `Tooth #${toothValue}`;
    };

    const handleSave = async () => {
        try {
            console.log(`[ToothRecordsCreate] Starting save process with ${toothRecords.length} records`);

            if (!selectedAppointment) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Appointment Required',
                    text: 'Please select an appointment first',
                    confirmButtonColor: '#F59E0B'
                });
                return;
            }

            if (toothRecords.length === 0) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'No Records',
                    text: 'Please add at least one tooth record before saving',
                    confirmButtonColor: '#F59E0B'
                });
                return;
            }

            // Check if all records have required fields
            for (let i = 0; i < toothRecords.length; i++) {
                const record = toothRecords[i];
                if (!record.tooth_number || record.tooth_number === 0) {
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Missing Tooth Number',
                        text: `Please select a tooth number for record ${i + 1}`,
                        confirmButtonColor: '#F59E0B'
                    });
                    return;
                }
                if (!record.service) {
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Missing Service',
                        text: `Please enter a service for tooth record ${i + 1}`,
                        confirmButtonColor: '#F59E0B'
                    });
                    return;
                }
                if (!record.date_done) {
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Missing Date',
                        text: `Please enter a date for tooth record ${i + 1}`,
                        confirmButtonColor: '#F59E0B'
                    });
                    return;
                }
            }

            console.log('[ToothRecordsCreate] Validation passed, saving tooth records...');
            setSaving(true);

            // Save each tooth record as-is (ranges stored as strings, individual teeth as numbers)
            for (let i = 0; i < toothRecords.length; i++) {
                const record = toothRecords[i];
                console.log(`[ToothRecordsCreate] Saving record ${i + 1}/${toothRecords.length}:`, record);

                const payload = {
                    patient_id: selectedAppointment.patient.id,
                    doctor_id: selectedAppointment.doctor.id,
                    appointment_id: selectedAppointment.id,
                    tooth_number: record.tooth_number,
                    service: record.service,
                    date_done: record.date_done,
                    notes: record.notes
                };

                console.log('[ToothRecordsCreate] Request payload:', JSON.stringify(payload, null, 2));

                const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
                console.log('[ToothRecordsCreate] CSRF Token present:', !!csrfToken);

                const response = await fetch('/api/tooth-records', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken || ''
                    },
                    body: JSON.stringify(payload)
                });

                console.log(`[ToothRecordsCreate] Response status: ${response.status}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('[ToothRecordsCreate] API Error:', errorData);
                    throw new Error(errorData.message || `Failed to save tooth record: ${response.statusText}`);
                }

                const responseData = await response.json();
                console.log(`[ToothRecordsCreate] Successfully saved record ${i + 1}/${toothRecords.length}:`, responseData);
            }

            console.log('[ToothRecordsCreate] All tooth records saved successfully');

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: `${toothRecords.length} tooth record(s) created successfully!`,
                confirmButtonColor: '#10B981'
            });

            console.log('[ToothRecordsCreate] Redirecting to tooth records list');
            window.location.href = '/staff/tooth-records';
        } catch (error: any) {
            console.error('[ToothRecordsCreate] Error saving tooth records:', error);

            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save tooth records. Please try again.';

            await Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: errorMessage,
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <Head title="Create Service Transaction - DentalinkCare" />
                <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Head title="Create Service Transaction - DentalinkCare" />
            <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <Link
                            href="/staff/tooth-records"
                            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Service Transactions
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-3 rounded-lg">
                                <Smile className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Create Service Transaction</h1>
                                <p className="text-gray-600 mt-1">Select an appointment and add service transactions</p>
                            </div>
                        </div>
                    </div>

                    {/* Appointment Selection */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Appointment</h2>

                        <select
                            value={selectedAppointment?.id || ''}
                            onChange={(e) => {
                                const appointment = appointments.find(a => a.id === parseInt(e.target.value));
                                if (appointment) {
                                    handleSelectAppointment(appointment);
                                }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                        >
                            <option value="">-- Select an appointment --</option>
                            {appointments.map(apt => (
                                <option key={apt.id} value={apt.id}>
                                    {apt.patient.first_name} {apt.patient.last_name} - {apt.service.name} - {formatAppointmentDate(apt.appointment_date)} {formatAppointmentTime(apt.appointment_time)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Appointment Info Card */}
                    {selectedAppointment && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointment Information</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Patient</p>
                                    <p className="text-gray-900 font-semibold">
                                        {selectedAppointment.patient.first_name} {selectedAppointment.patient.last_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Email</p>
                                    <p className="text-gray-900">{selectedAppointment.patient.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Doctor</p>
                                    <p className="text-gray-900">{selectedAppointment.doctor.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Service</p>
                                    <p className="text-gray-900">{selectedAppointment.service.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Date</p>
                                    <p className="text-gray-900">{formatAppointmentDate(selectedAppointment.appointment_date)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Time</p>
                                    <p className="text-gray-900">{formatAppointmentTime(selectedAppointment.appointment_time)}</p>
                                </div>
                            </div>

                            {/* Service Requirements Info */}
                            {selectedAppointment.service && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    {(selectedAppointment.service as any).requires_multiple_teeth ? (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                            <Smile className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h3 className="font-semibold text-blue-900">Multiple Teeth Service</h3>
                                                <p className="text-blue-800 text-sm">
                                                    This service may involve treatment on multiple teeth. You can add additional tooth records below.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h3 className="font-semibold text-green-900">Single Tooth Service</h3>
                                                <p className="text-green-800 text-sm">
                                                    This service is typically performed on a single tooth.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tooth Records Section */}
                    {selectedAppointment && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Service Transactions</h2>
                                <button
                                    onClick={handleAddToothRecord}
                                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Tooth
                                </button>
                            </div>

                            {/* Bulk Selection Buttons */}
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-medium text-blue-900 mb-3">Bulk Selection</p>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={handleBulkSelectUpperArch}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                                    >
                                        Upper Arch
                                    </button>
                                    <button
                                        onClick={handleBulkSelectLowerArch}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                                    >
                                        Lower Arch
                                    </button>
                                    <button
                                        onClick={handleBulkSelectFullMouth}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                                    >
                                        Full Mouth
                                    </button>
                                </div>
                            </div>

                            {toothRecords.length === 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-yellow-900">No teeth added</h3>
                                        <p className="text-yellow-800 text-sm">Click "Add Tooth" to start adding service transactions</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                {toothRecords.map((record, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-base font-semibold text-gray-900">Service Transaction {index + 1}</h3>
                                            {toothRecords.length > 1 && (
                                                <button
                                                    onClick={() => handleRemoveToothRecord(index)}
                                                    className="text-red-600 hover:text-red-700 transition-colors"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Tooth Number */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Tooth / Range *
                                                </label>
                                                <select
                                                    value={record.tooth_number}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        handleToothRecordChange(index, 'tooth_number', value);
                                                    }}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                >
                                                    <option value="">Select tooth or range...</option>
                                                    <optgroup label="Bulk Ranges">
                                                        {toothRanges.map(range => (
                                                            <option key={range.value} value={range.value}>
                                                                {range.label}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                    <optgroup label="Individual Teeth">
                                                        {toothNumbers.map(tooth => (
                                                            <option key={tooth.value} value={tooth.value}>
                                                                {tooth.label}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                </select>
                                            </div>

                                            {/* Service */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Service *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={record.service}
                                                    onChange={(e) => handleToothRecordChange(index, 'service', e.target.value)}
                                                    placeholder="e.g., Filling, Crown, Root Canal, Extraction, Cleaning"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                />
                                            </div>

                                            {/* Date Done */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Date Done *
                                                </label>
                                                <input
                                                    type="date"
                                                    value={record.date_done}
                                                    onChange={(e) => handleToothRecordChange(index, 'date_done', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                />
                                            </div>

                                            {/* Notes */}
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Notes
                                                </label>
                                                <textarea
                                                    value={record.notes}
                                                    onChange={(e) => handleToothRecordChange(index, 'notes', e.target.value)}
                                                    placeholder="Additional notes about this service transaction..."
                                                    rows={2}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-gray-200">
                                <Link
                                    href="/staff/tooth-records"
                                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </Link>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !selectedAppointment || toothRecords.length === 0}
                                    className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {saving ? 'Saving...' : 'Save Service Transactions'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
