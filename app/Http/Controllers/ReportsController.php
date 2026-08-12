<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Appointment;
use App\Models\FinancialRecord;
use App\Models\Service;
use App\Models\PatientRecord;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class ReportsController extends Controller
{
    public function index()
    {
        return Inertia::render('Reports/Index');
    }

    public function financial(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());

        $reports = [
            'total_revenue' => FinancialRecord::getTotalRevenue($startDate, $endDate),
            'outstanding_balance' => FinancialRecord::getOutstandingBalance(),
            'payment_method_breakdown' => FinancialRecord::getPaymentMethodBreakdown($startDate, $endDate),
            'monthly_trends' => FinancialRecord::selectRaw('MONTH(transaction_date) as month, YEAR(transaction_date) as year, SUM(amount) as total')
                ->whereBetween('transaction_date', [$startDate, $endDate])
                ->groupBy('year', 'month')
                ->orderBy('year')
                ->orderBy('month')
                ->get(),
            'top_services_by_revenue' => Service::selectRaw('services.*, SUM(financial_records.amount) as total_revenue')
                ->join('appointments', 'services.id', '=', 'appointments.service_id')
                ->join('financial_records', 'appointments.id', '=', 'financial_records.appointment_id')
                ->whereBetween('financial_records.transaction_date', [$startDate, $endDate])
                ->groupBy('services.id')
                ->orderBy('total_revenue', 'desc')
                ->limit(10)
                ->get(),
            'overdue_accounts' => FinancialRecord::with('patient')
                ->where('balance', '>', 0)
                ->orderBy('transaction_date')
                ->get(),
        ];

        // Handle API requests
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'reports' => $reports,
                'dateRange' => ['start' => $startDate, 'end' => $endDate],
            ]);
        }

        return Inertia::render('Reports/Financial', [
            'reports' => $reports,
            'dateRange' => ['start' => $startDate, 'end' => $endDate],
        ]);
    }

    public function appointments(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());

        $reports = [
            'total_appointments' => Appointment::whereBetween('appointment_date', [$startDate, $endDate])->count(),
            'appointments_by_status' => Appointment::selectRaw('status, COUNT(*) as count')
                ->whereBetween('appointment_date', [$startDate, $endDate])
                ->groupBy('status')
                ->get(),
            'appointments_by_service' => Service::selectRaw('services.name, COUNT(appointments.id) as count')
                ->join('appointments', 'services.id', '=', 'appointments.service_id')
                ->whereBetween('appointments.appointment_date', [$startDate, $endDate])
                ->groupBy('services.id', 'services.name')
                ->orderBy('count', 'desc')
                ->get(),
            'appointments_by_doctor' => User::selectRaw('users.name, COUNT(appointments.id) as count')
                ->join('appointments', 'users.id', '=', 'appointments.doctor_id')
                ->where('users.role', 'staff')
                ->whereBetween('appointments.appointment_date', [$startDate, $endDate])
                ->groupBy('users.id', 'users.name')
                ->orderBy('count', 'desc')
                ->get(),
            'daily_appointments' => Appointment::selectRaw('DATE(appointment_date) as date, COUNT(*) as count')
                ->whereBetween('appointment_date', [$startDate, $endDate])
                ->groupBy('date')
                ->orderBy('date')
                ->get(),
            'no_show_rate' => [
                'total' => Appointment::whereBetween('appointment_date', [$startDate, $endDate])->count(),
                'no_shows' => Appointment::whereBetween('appointment_date', [$startDate, $endDate])->where('status', 'no_show')->count(),
            ],
        ];

        $reports['no_show_rate']['percentage'] = $reports['no_show_rate']['total'] > 0
            ? round(($reports['no_show_rate']['no_shows'] / $reports['no_show_rate']['total']) * 100, 2)
            : 0;

        // Handle API requests
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'reports' => $reports,
                'dateRange' => ['start' => $startDate, 'end' => $endDate],
            ]);
        }

        return Inertia::render('Reports/Appointments', [
            'reports' => $reports,
            'dateRange' => ['start' => $startDate, 'end' => $endDate],
        ]);
    }

    public function patients(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());

        $reports = [
            'total_patients' => User::patients()->count(),
            'new_patients' => User::patients()
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count(),
            'patients_by_age_group' => DB::table('users')
                ->join('patients', 'users.id', '=', 'patients.user_id')
                ->selectRaw('
                    CASE
                        WHEN TIMESTAMPDIFF(YEAR, patients.birthday, CURDATE()) < 18 THEN "Under 18"
                        WHEN TIMESTAMPDIFF(YEAR, patients.birthday, CURDATE()) BETWEEN 18 AND 30 THEN "18-30"
                        WHEN TIMESTAMPDIFF(YEAR, patients.birthday, CURDATE()) BETWEEN 31 AND 50 THEN "31-50"
                        WHEN TIMESTAMPDIFF(YEAR, patients.birthday, CURDATE()) BETWEEN 51 AND 65 THEN "51-65"
                        ELSE "Over 65"
                    END as age_group,
                    COUNT(*) as count
                ')
                ->where('users.role', 'patient')
                ->whereNotNull('patients.birthday')
                ->groupBy('age_group')
                ->get(),
            'patients_by_gender' => DB::table('users')
                ->join('patients', 'users.id', '=', 'patients.user_id')
                ->selectRaw('patients.gender, COUNT(*) as count')
                ->where('users.role', 'patient')
                ->whereNotNull('patients.gender')
                ->groupBy('patients.gender')
                ->get(),
            'patients_with_insurance' => DB::table('users')
                ->join('patients', 'users.id', '=', 'patients.user_id')
                ->where('users.role', 'patient')
                ->whereNotNull('patients.insurance_provider')
                ->count(),
            'most_common_treatments' => PatientRecord::selectRaw('diagnosis, COUNT(*) as count')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy('diagnosis')
                ->orderBy('count', 'desc')
                ->limit(10)
                ->get(),
        ];

        // Handle API requests
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'reports' => $reports,
                'dateRange' => ['start' => $startDate, 'end' => $endDate],
            ]);
        }

        return Inertia::render('Reports/Patients', [
            'reports' => $reports,
            'dateRange' => ['start' => $startDate, 'end' => $endDate],
        ]);
    }

    public function staff(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());

        $reports = [
            'total_staff' => User::staff()->count(),
            'staff_by_position' => User::staff()
                ->selectRaw('position, COUNT(*) as count')
                ->groupBy('position')
                ->get(),
            'staff_productivity' => User::staff()
                ->with(['doctorAppointments' => function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('appointment_date', [$startDate, $endDate]);
                }])
                ->withCount(['doctorAppointments as appointments_count' => function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('appointment_date', [$startDate, $endDate]);
                }])
                ->withCount(['createdPatientRecords as records_count' => function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('created_at', [$startDate, $endDate]);
                }])
                ->orderBy('appointments_count', 'desc')
                ->get(),
            'license_expiries' => User::staff()
                ->whereNotNull('license_expiry')
                ->where('license_expiry', '<=', now()->addMonths(3))
                ->orderBy('license_expiry')
                ->get(),
        ];

        // Handle API requests
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'reports' => $reports,
                'dateRange' => ['start' => $startDate, 'end' => $endDate],
            ]);
        }

        return Inertia::render('Reports/Staff', [
            'reports' => $reports,
            'dateRange' => ['start' => $startDate, 'end' => $endDate],
        ]);
    }

    public function audit(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());
        $action = $request->input('action');
        $user = $request->input('user');

        $auditLogs = AuditLog::with('performedBy')
            ->when($action, function ($query, $action) {
                return $query->where('action', $action);
            })
            ->when($user, function ($query, $user) {
                return $query->where('performed_by', $user);
            })
            ->whereBetween('timestamp', [$startDate, $endDate])
            ->orderBy('timestamp', 'desc')
            ->paginate(50);

        $summary = [
            'total_actions' => AuditLog::whereBetween('timestamp', [$startDate, $endDate])->count(),
            'actions_by_type' => AuditLog::getActivitySummary($startDate, $endDate),
            'most_active_users' => AuditLog::selectRaw('performed_by, users.name, COUNT(*) as actions_count')
                ->join('users', 'audit_logs.performed_by', '=', 'users.id')
                ->whereBetween('timestamp', [$startDate, $endDate])
                ->groupBy('performed_by', 'users.name')
                ->orderBy('actions_count', 'desc')
                ->limit(10)
                ->get(),
        ];

        $users = User::active()->orderBy('name')->get();

        // Handle API requests
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'auditLogs' => $auditLogs,
                'summary' => $summary,
                'users' => $users,
                'dateRange' => ['start' => $startDate, 'end' => $endDate],
                'filters' => $request->only(['action', 'user']),
            ]);
        }

        return Inertia::render('Reports/Audit', [
            'auditLogs' => $auditLogs,
            'summary' => $summary,
            'users' => $users,
            'dateRange' => ['start' => $startDate, 'end' => $endDate],
            'filters' => $request->only(['action', 'user']),
        ]);
    }
}
