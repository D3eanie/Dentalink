// components/ScheduleModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Save } from 'lucide-react';

interface ScheduleFormData {
    schedule_date: string;
    shift_start: string;
    shift_end: string;
    break_start: string;
    break_end: string;
    shift_type: 'morning' | 'afternoon' | 'night' | 'full_day';
    notes: string;
}

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    loading?: boolean;
}

export default function ScheduleModal({ isOpen, onClose, onSubmit, loading = false }: ScheduleModalProps) {
    const [formData, setFormData] = useState<ScheduleFormData>({
        schedule_date: new Date().toISOString().split('T')[0],
        shift_start: '08:00',
        shift_end: '16:00',
        break_start: '12:00',
        break_end: '13:00',
        shift_type: 'morning',
        notes: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            // Reset form when modal opens
            setFormData({
                schedule_date: new Date().toISOString().split('T')[0],
                shift_start: '08:00',
                shift_end: '16:00',
                break_start: '12:00',
                break_end: '13:00',
                shift_type: 'morning',
                notes: ''
            });
        }
    }, [isOpen]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.schedule_date) newErrors.schedule_date = 'Date is required';
        if (!formData.shift_start) newErrors.shift_start = 'Start time is required';
        if (!formData.shift_end) newErrors.shift_end = 'End time is required';

        // Validate time logic
        if (formData.shift_start && formData.shift_end) {
            const startTime = new Date(`2000-01-01T${formData.shift_start}`);
            const endTime = new Date(`2000-01-01T${formData.shift_end}`);

            if (startTime >= endTime) {
                newErrors.shift_end = 'End time must be after start time';
            }
        }

        // Validate break times
        if (formData.break_start && formData.break_end) {
            const breakStart = new Date(`2000-01-01T${formData.break_start}`);
            const breakEnd = new Date(`2000-01-01T${formData.break_end}`);
            const shiftStart = new Date(`2000-01-01T${formData.shift_start}`);
            const shiftEnd = new Date(`2000-01-01T${formData.shift_end}`);

            if (breakStart >= breakEnd) {
                newErrors.break_end = 'Break end must be after break start';
            }
            if (breakStart < shiftStart || breakEnd > shiftEnd) {
                newErrors.break_start = 'Break times must be within shift hours';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        const submitData = {
            ...formData,
            shift_start: `${formData.schedule_date}T${formData.shift_start}:00`,
            shift_end: `${formData.schedule_date}T${formData.shift_end}:00`,
            break_start: formData.break_start ? `${formData.schedule_date}T${formData.break_start}:00` : null,
            break_end: formData.break_end ? `${formData.schedule_date}T${formData.break_end}:00` : null,
        };

        onSubmit(submitData);
    };

    const updateFormData = (field: keyof ScheduleFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    if (!isOpen) return null;

    return (

        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold">Create New Schedule</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Date and Shift Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="h-4 w-4 inline mr-1" />
                                Schedule Date *
                            </label>
                            <input
                                type="date"
                                value={formData.schedule_date}
                                onChange={(e) => updateFormData('schedule_date', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.schedule_date ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.schedule_date && (
                                <p className="text-red-500 text-xs mt-1">{errors.schedule_date}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Shift Type *
                            </label>
                            <select
                                value={formData.shift_type}
                                onChange={(e) => updateFormData('shift_type', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="morning">Morning Shift</option>
                                <option value="afternoon">Afternoon Shift</option>
                                <option value="night">Night Shift</option>
                                <option value="full_day">Full Day</option>
                            </select>
                        </div>
                    </div>

                    {/* Shift Times */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Clock className="h-4 w-4 inline mr-1" />
                                Shift Start *
                            </label>
                            <input
                                type="time"
                                value={formData.shift_start}
                                onChange={(e) => updateFormData('shift_start', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.shift_start ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.shift_start && (
                                <p className="text-red-500 text-xs mt-1">{errors.shift_start}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Clock className="h-4 w-4 inline mr-1" />
                                Shift End *
                            </label>
                            <input
                                type="time"
                                value={formData.shift_end}
                                onChange={(e) => updateFormData('shift_end', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.shift_end ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.shift_end && (
                                <p className="text-red-500 text-xs mt-1">{errors.shift_end}</p>
                            )}
                        </div>
                    </div>

                    {/* Break Times */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Break Start
                            </label>
                            <input
                                type="time"
                                value={formData.break_start}
                                onChange={(e) => updateFormData('break_start', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.break_start ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.break_start && (
                                <p className="text-red-500 text-xs mt-1">{errors.break_start}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Break End
                            </label>
                            <input
                                type="time"
                                value={formData.break_end}
                                onChange={(e) => updateFormData('break_end', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.break_end ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.break_end && (
                                <p className="text-red-500 text-xs mt-1">{errors.break_end}</p>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => updateFormData('notes', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Any additional notes or instructions..."
                        />
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {loading ? 'Saving...' : 'Create Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
