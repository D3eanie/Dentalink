import React from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

export default function Index() {
    return (
        <AppLayout>
            <Head title="Schedules" />
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">Schedules</h1>
                <p>Schedule management page</p>
            </div>
        </AppLayout>
    );
}
