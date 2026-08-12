import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
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
    tooth_number: number | string;
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

const wisdomTeethValues = new Set([18, 28, 38, 48]);
const archRangeValues = new Set(['11-28', '31-48', '11-48']);

const getToothOptionsForService = (serviceName?: string) => {
    const name = (serviceName || '').toLowerCase().trim();

    if (name.includes('dental crown')) {
        return { ranges: [], teeth: toothNumbers };
    }

    if (name.includes('dental restoration') || name.includes('filling')) {
        return { ranges: [], teeth: toothNumbers };
    }

    if (name.includes('root canal')) {
        return { ranges: [], teeth: toothNumbers };
    }

    if (name.includes('tooth extraction') || name.includes('extraction')) {
        return { ranges: [], teeth: toothNumbers };
    }

    if (name.includes('dentures')) {
        return { ranges: toothRanges.filter(range => archRangeValues.has(range.value)), teeth: [] };
    }

    if (name.includes('odontectomy')) {
        return { ranges: [], teeth: toothNumbers.filter(tooth => wisdomTeethValues.has(tooth.value)) };
    }

    if (name.includes('oral prophylaxis')) {
        return { ranges: toothRanges.filter(range => range.value === '11-48'), teeth: [] };
    }

    if (name.includes('orthodontics')) {
        return { ranges: toothRanges.filter(range => archRangeValues.has(range.value)), teeth: [] };
    }

    return { ranges: toothRanges, teeth: toothNumbers };
};

const initialToothRecord: ToothRecordForm = {
    tooth_number: 0,
    service: '',
    date_done: new Date().toISOString().split('T')[0],
    notes: ''
};

const StaffAppointmentToothRecordsPage = ({ appointmentId }: { appointmentId: string }) => {
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [toothRecords, setToothRecords] = useState<ToothRecordForm[]>([initialToothRecord]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAppointmentAndServices();
    }, []);

    const fetchAppointmentAndServices = async () => {
        try {
            setLoading(true);
            console.log(`[ToothRecords] Loading appointment ${appointmentId}...`);

            const appointmentRes = await apiStaff.getAppointment(parseInt(appointmentId));
            const apt = appointmentRes.data || appointmentRes;
            setAppointment(apt);
            console.log(`[ToothRecords] Appointment loaded:`, apt);

            // Initialize with one record pre-filled from appointment
            if (apt?.service?.name) {
                const toothRecord: ToothRecordForm = {
                    tooth_number: 0,
                    service: apt.service.name,
                    date_done: new Date().toISOString().split('T')[0],
                    notes: ''
                };
                setToothRecords([toothRecord]);
            }
        } catch (error) {
            console.error('[ToothRecords] Error fetching appointment:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error Loading Data',
                text: 'Failed to load appointment. Please try again.',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddToothRecord = () => {
        // Copy the service and use today's date for new records
        const newRecord: ToothRecordForm = {
            tooth_number: 0,
            service: toothRecords[0]?.service || (appointment?.service?.name || ''),
            date_done: new Date().toISOString().split('T')[0],
            notes: ''
        };
        setToothRecords([...toothRecords, { ...newRecord }]);
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
            console.log(`[ToothRecords] Starting save process with ${toothRecords.length} records`);

            // Validation
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
                if (!record.tooth_number) {
                    console.log(`[ToothRecords] Validation failed: Record ${i} missing tooth number`);
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Missing Tooth Number',
                        text: `Please select a tooth number for record ${i + 1}`,
                        confirmButtonColor: '#F59E0B'
                    });
                    return;
                }
                if (!record.service) {
                    console.log(`[ToothRecords] Validation failed: Record ${i} missing service`);
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Missing Service',
                        text: `Please enter a service for tooth record ${i + 1}`,
                        confirmButtonColor: '#F59E0B'
                    });
                    return;
                }
                if (!record.date_done) {
                    console.log(`[ToothRecords] Validation failed: Record ${i} missing date`);
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Missing Date',
                        text: `Please select a date for record ${i + 1}`,
                        confirmButtonColor: '#F59E0B'
                    });
                    return;
                }
            }

            console.log('[ToothRecords] Validation passed, saving tooth records...');
            setSaving(true);

            // Save each tooth record as-is (ranges stored as strings, individual teeth as numbers)
            for (let i = 0; i < toothRecords.length; i++) {
                const record = toothRecords[i];
                console.log(`[ToothRecords] Saving record ${i + 1}/${toothRecords.length}:`, record);

                const payload = {
                    patient_id: appointment.patient.id,
                    doctor_id: appointment.doctor.id,
                    appointment_id: appointment.id,
                    tooth_number: record.tooth_number,
                    service: record.service,
                    date_done: record.date_done,
                    notes: record.notes
                };

                console.log('[ToothRecords] Request payload:', JSON.stringify(payload, null, 2));

                const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
                console.log('[ToothRecords] CSRF Token present:', !!csrfToken);

                const response = await fetch('/api/tooth-records', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken || ''
                    },
                    body: JSON.stringify(payload)
                });

                console.log(`[ToothRecords] Response status: ${response.status}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('[ToothRecords] API Error:', errorData);
                    throw new Error(errorData.message || `Failed to save tooth record: ${response.statusText}`);
                }

                const responseData = await response.json();
                console.log(`[ToothRecords] Successfully saved record ${i + 1}/${toothRecords.length}:`, responseData);
            }

            console.log('[ToothRecords] All tooth records saved, checking in appointment...');

            // Check in appointment
            await apiStaff.checkInAppointment(parseInt(appointmentId));

            console.log('[ToothRecords] Appointment checked in successfully');

            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: `${toothRecords.length} tooth record(s) saved and appointment checked in!`,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                },
                timer: 2000,
                timerProgressBar: true,
            }).then(() => {
                // Redirect after showing success message
                console.log('[ToothRecords] Redirecting to appointments list');
                window.location.href = '/staff/appointments';
            });
        } catch (error: any) {
            console.error('[ToothRecords] Error saving tooth records:', error);

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
                <Head title="Check-in & Create Service Transactions - DentalinkCare" />
                <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
            </AppLayout>
        );
    }

    if (!appointment) {
        return (
            <AppLayout>
                <Head title="Check-in & Create Service Transactions - DentalinkCare" />
                <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                            <p className="text-red-800">Appointment not found</p>
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Head title="Check-in & Create Service Transactions - DentalinkCare" />
            <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <Link
                            href="/staff/appointments"
                            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Appointments
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-3 rounded-lg">
                                <Smile className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Check-in & Create Service Transactions</h1>
                                <p className="text-gray-600 mt-1">Select teeth and services being worked on during this appointment</p>
                            </div>
                        </div>
                    </div>

                    {/* Appointment Info Card */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointment Information</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Patient</p>
                                <p className="text-gray-900 font-semibold">
                                    {appointment.patient.first_name} {appointment.patient.last_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Email</p>
                                <p className="text-gray-900">{appointment.patient.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Doctor</p>
                                <p className="text-gray-900">{appointment.doctor.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Service</p>
                                <p className="text-gray-900">{appointment.service.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Date</p>
                                <p className="text-gray-900">{formatAppointmentDate(appointment.appointment_date)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Time</p>
                                <p className="text-gray-900">{formatAppointmentTime(appointment.appointment_time)}</p>
                            </div>
                        </div>

                        {/* Service Requirements Info */}
                        {appointment.service && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                {(appointment.service as any).requires_multiple_teeth ? (
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

                    {/* Tooth Records Section */}
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
                                        {(() => {
                                            const serviceName = record.service || appointment?.service?.name || '';
                                            const { ranges: allowedRanges, teeth: allowedTeeth } = getToothOptionsForService(serviceName);
                                            return (
                                                <>
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
                                                {allowedRanges.length > 0 && (
                                                    <optgroup label="Bulk Ranges">
                                                        {allowedRanges.map(range => (
                                                            <option key={range.value} value={range.value}>
                                                                {range.label}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}
                                                {allowedTeeth.length > 0 && (
                                                    <optgroup label="Individual Teeth">
                                                        {allowedTeeth.map(tooth => (
                                                            <option key={tooth.value} value={tooth.value}>
                                                                {tooth.label}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}
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
                                                placeholder="Enter service performed..."
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            />
                                        </div>
                                                </>
                                            );
                                        })()}

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
                                                placeholder="Any additional notes..."
                                                rows={3}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-4">
                        <Link
                            href="/staff/appointments"
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Check In & Save Records
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

export default StaffAppointmentToothRecordsPage;
