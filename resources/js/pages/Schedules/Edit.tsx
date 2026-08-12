import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

interface Schedule {
    id: number;
    staff_id: number;
    date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
    notes?: string;
}

interface EditProps {
    schedule: Schedule;
    staff?: Array<{ id: number; name: string }>;
}

export default function Edit({ schedule, staff = [] }: EditProps) {
    const [formData, setFormData] = useState({
        staff_id: schedule.staff_id.toString(),
        date: schedule.date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_available: schedule.is_available,
        notes: schedule.notes || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.put(`/schedules/${schedule.id}`, formData);
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this schedule?')) {
            router.delete(`/schedules/${schedule.id}`);
        }
    };

    return (
        <AppLayout>
            <Head title="Edit Schedule" />
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">Edit Schedule</h1>
                <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Staff Member</label>
                        <select
                            value={formData.staff_id}
                            onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md"
                            required
                        >
                            <option value="">Select Staff</option>
                            {staff.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Time</label>
                            <input
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">End Time</label>
                            <input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.is_available}
                                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                                className="mr-2"
                            />
                            <span className="text-sm font-medium">Available</span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md"
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Update Schedule
                        </button>
                        <button
                            type="button"
                            onClick={() => router.visit('/schedules')}
                            className="px-4 py-2 border rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="ml-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                            Delete
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
