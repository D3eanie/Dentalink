<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Appointment;
use App\Models\FinancialRecord;
use App\Models\PatientRecord;
use App\Models\Service;
use App\Models\AuditLog;
use App\Models\ToothRecord;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class AdminDashboardController extends Controller
{
    public function index()
    {
        // Dashboard statistics
        $stats = [
            'total_patients' => User::patients()->count(),
            'total_staff' => User::staff()->count(),
            'appointments_today' => Appointment::today()->count(),
            'appointments_this_week' => Appointment::thisWeek()->count(),
            'revenue_this_month' => FinancialRecord::getMonthlyRevenue(),
            'outstanding_balance' => FinancialRecord::getOutstandingBalance(),
            'recent_appointments' => Appointment::with(['patient', 'doctor', 'service'])
                ->upcoming()
                ->limit(10)
                ->get(),
            'recent_registrations' => User::patients()
                ->where('created_at', '>=', now()->subDays(7))
                ->count(),
        ];

        // Recent activities
        $recentActivities = AuditLog::with('performedBy')
            ->recent(7)
            ->limit(20)
            ->orderBy('timestamp', 'desc')
            ->get();

        // Tooth records
        $toothRecords = ToothRecord::with(['patient', 'doctor'])
            ->latest()
            ->limit(5)
            ->get();

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
            'recentActivities' => $recentActivities,
            'toothRecords' => $toothRecords,
        ]);
    }

    public function analytics(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());

        $analytics = [
            'revenue_by_month' => FinancialRecord::selectRaw('MONTH(transaction_date) as month, SUM(amount) as total')
                ->paid()
                ->whereYear('transaction_date', now()->year)
                ->groupBy('month')
                ->get(),
            'appointments_by_status' => Appointment::selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->get(),
            'services_popularity' => Service::withCount('appointments')
                ->orderBy('appointments_count', 'desc')
                ->limit(10)
                ->get(),
            'payment_methods' => FinancialRecord::getPaymentMethodBreakdown($startDate, $endDate),
        ];

        return Inertia::render('Admin/Analytics', [
            'analytics' => $analytics,
            'dateRange' => ['start' => $startDate, 'end' => $endDate],
        ]);
    }
}
