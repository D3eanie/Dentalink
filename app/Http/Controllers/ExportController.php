<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Appointment;
use App\Models\FinancialRecord;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Barryvdh\DomPDF\Facade\Pdf as PDF;
use Carbon\Carbon;

class ExportController extends Controller
{
    public function exportPatients(Request $request)
    {
        $startDate = $request->input('start_date'); // Optional start date filter
        $endDate = $request->input('end_date'); // Optional end date filter

        $query = User::where('role', 'patient')
            ->with(['patient', 'patientAppointments', 'patientRecords']);

        // Filter by creation date if provided
        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [$startDate, $endDate]);
        } elseif ($startDate) {
            $query->where('created_at', '>=', $startDate);
        } elseif ($endDate) {
            $query->where('created_at', '<=', $endDate);
        }

        $patients = $query->orderBy('created_at', 'desc')
            ->orderBy('name')
            ->get();

        $data = [
            'patients' => $patients,
            'startDate' => $startDate ? Carbon::parse($startDate)->format('F d, Y') : null,
            'endDate' => $endDate ? Carbon::parse($endDate)->format('F d, Y') : null,
            'exportDate' => now()->format('F d, Y'),
            'exportedBy' => Auth::user()->name ?? 'System',
            'totalPatients' => $patients->count(),
        ];

        $pdf = PDF::loadView('exports.patients', $data);
        $filename = 'patients_' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    public function exportAppointments(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());

        $appointments = Appointment::with(['patient', 'doctor', 'service'])
            ->whereBetween('appointment_date', [$startDate, $endDate])
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get();

        $data = [
            'appointments' => $appointments,
            'startDate' => Carbon::parse($startDate)->format('F d, Y'),
            'endDate' => Carbon::parse($endDate)->format('F d, Y'),
            'exportDate' => now()->format('F d, Y'),
            'exportedBy' => Auth::user()->name ?? 'System',
            'totalAppointments' => $appointments->count(),
            'summary' => [
                'by_status' => $appointments->groupBy('status')->map->count(),
                'by_service' => $appointments->groupBy('service.name')->map->count(),
            ],
        ];

        $pdf = PDF::loadView('exports.appointments', $data);
        $filename = 'appointments_' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    public function exportFinancialRecords(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());

        $records = FinancialRecord::with(['patient', 'appointment'])
            ->whereBetween('transaction_date', [$startDate, $endDate])
            ->orderBy('transaction_date')
            ->get();

        $data = [
            'records' => $records,
            'startDate' => Carbon::parse($startDate)->format('F d, Y'),
            'endDate' => Carbon::parse($endDate)->format('F d, Y'),
            'exportDate' => now()->format('F d, Y'),
            'exportedBy' => Auth::user()->name ?? 'System',
            'totalRecords' => $records->count(),
            'summary' => [
                'total_amount' => $records->sum('amount'),
                'paid_amount' => $records->sum('amount'),
                'pending_amount' => $records->sum('balance'),
                'by_payment_method' => $records->groupBy('payment_method')->map(function ($group) {
                    return [
                        'count' => $group->count(),
                        'total' => $group->sum('amount'),
                    ];
                }),
            ],
        ];

        $pdf = PDF::loadView('exports.financial-records', $data);
        $filename = 'financial_records_' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    public function exportReport(Request $request, $type)
    {
        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());

        switch ($type) {
            case 'financial':
                return $this->exportFinancialReport($startDate, $endDate);
            case 'appointments':
                return $this->exportAppointmentsReport($startDate, $endDate);
            case 'patients':
                return $this->exportPatientsReport($startDate, $endDate);
            case 'services':
                return $this->exportServicesReport($startDate, $endDate);
            case 'users':
                return $this->exportUsersReport($startDate, $endDate);
            default:
                abort(404, 'Report type not found');
        }
    }

    private function exportFinancialReport($startDate, $endDate)
    {
        $reports = [
            'total_revenue' => FinancialRecord::getTotalRevenue($startDate, $endDate),
            'outstanding_balance' => FinancialRecord::getOutstandingBalance(),
            'payment_method_breakdown' => FinancialRecord::getPaymentMethodBreakdown($startDate, $endDate),
            'monthly_trends' => FinancialRecord::selectRaw('MONTH(transaction_date) as month, YEAR(transaction_date) as year, SUM(amount) as total')
                ->paid()
                ->whereBetween('transaction_date', [$startDate, $endDate])
                ->groupBy('year', 'month')
                ->orderBy('year')
                ->orderBy('month')
                ->get(),
        ];

        $data = [
            'reports' => $reports,
            'startDate' => Carbon::parse($startDate)->format('F d, Y'),
            'endDate' => Carbon::parse($endDate)->format('F d, Y'),
            'exportDate' => now()->format('F d, Y'),
            'exportedBy' => Auth::user()->name ?? 'System',
        ];

        $pdf = PDF::loadView('exports.reports.financial', $data);
        $filename = 'financial_report_' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    private function exportAppointmentsReport($startDate, $endDate)
    {
        $reports = [
            'total_appointments' => Appointment::whereBetween('appointment_date', [$startDate, $endDate])->count(),
            'appointments_by_status' => Appointment::selectRaw('status, COUNT(*) as count')
                ->whereBetween('appointment_date', [$startDate, $endDate])
                ->groupBy('status')
                ->get(),
            'appointments_by_service' => \App\Models\Service::selectRaw('services.name, COUNT(appointments.id) as count')
                ->join('appointments', 'services.id', '=', 'appointments.service_id')
                ->whereBetween('appointments.appointment_date', [$startDate, $endDate])
                ->groupBy('services.id', 'services.name')
                ->orderBy('count', 'desc')
                ->get(),
        ];

        $data = [
            'reports' => $reports,
            'startDate' => Carbon::parse($startDate)->format('F d, Y'),
            'endDate' => Carbon::parse($endDate)->format('F d, Y'),
            'exportDate' => now()->format('F d, Y'),
            'exportedBy' => Auth::user()->name ?? 'System',
        ];

        $pdf = PDF::loadView('exports.reports.appointments', $data);
        $filename = 'appointments_report_' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    private function exportPatientsReport($startDate, $endDate)
    {
        $reports = [
            'total_patients' => User::patients()->count(),
            'new_patients' => User::patients()
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count(),
        ];

        $data = [
            'reports' => $reports,
            'startDate' => Carbon::parse($startDate)->format('F d, Y'),
            'endDate' => Carbon::parse($endDate)->format('F d, Y'),
            'exportDate' => now()->format('F d, Y'),
            'exportedBy' => Auth::user()->name ?? 'System',
        ];

        $pdf = PDF::loadView('exports.reports.patients', $data);
        $filename = 'patients_report_' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    public function exportServices(Request $request)
    {
        $services = Service::withCount('appointments')
            ->orderBy('name')
            ->get();

        $data = [
            'services' => $services,
            'exportDate' => now()->format('F d, Y'),
            'exportedBy' => Auth::user()->name ?? 'System',
            'totalServices' => $services->count(),
            'summary' => [
                'active' => $services->where('is_active', true)->count(),
                'inactive' => $services->where('is_active', false)->count(),
                'by_category' => $services->groupBy('category')->map->count(),
                'total_revenue' => $services->sum('price'),
            ],
        ];

        $pdf = PDF::loadView('exports.services', $data);
        $filename = 'services_' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    public function exportUsers(Request $request)
    {
        $role = $request->input('role'); // Optional filter by role
        $startDate = $request->input('start_date'); // Optional start date filter
        $endDate = $request->input('end_date'); // Optional end date filter

        $query = User::with(['patient']);

        if ($role) {
            $query->where('role', $role);
        }

        // Filter by creation date if provided
        if ($startDate && $endDate) {
            // Set start date to beginning of day and end date to end of day
            $start = Carbon::parse($startDate)->startOfDay();
            $end = Carbon::parse($endDate)->endOfDay();
            $query->whereBetween('created_at', [$start, $end]);
        } elseif ($startDate) {
            $query->where('created_at', '>=', Carbon::parse($startDate)->startOfDay());
        } elseif ($endDate) {
            $query->where('created_at', '<=', Carbon::parse($endDate)->endOfDay());
        }

        $users = $query->orderBy('created_at', 'desc')
            ->orderBy('name')
            ->get();

        $data = [
            'users' => $users,
            'role' => $role,
            'startDate' => $startDate ? Carbon::parse($startDate)->format('F d, Y') : null,
            'endDate' => $endDate ? Carbon::parse($endDate)->format('F d, Y') : null,
            'exportDate' => now()->format('F d, Y'),
            'exportedBy' => Auth::user()->name ?? 'System',
            'totalUsers' => $users->count(),
            'summary' => [
                'by_role' => $users->groupBy('role')->map->count(),
                'active' => $users->where('status', 'active')->count(),
                'inactive' => $users->where('status', 'inactive')->count(),
            ],
        ];

        $pdf = PDF::loadView('exports.users', $data);

        // Generate filename based on filters
        if ($startDate && $endDate) {
            $monthYear = Carbon::parse($startDate)->format('Y-m');
            $filename = 'new_users_' . $monthYear . '.pdf';
        } elseif ($role) {
            $filename = $role . '_users_' . now()->format('Y-m-d') . '.pdf';
        } else {
            $filename = 'all_users_' . now()->format('Y-m-d') . '.pdf';
        }

        return $pdf->download($filename);
    }

    public function exportServicesReport($startDate, $endDate)
    {
        $reports = [
            'total_services' => Service::count(),
            'active_services' => Service::where('is_active', true)->count(),
            'services_by_category' => Service::selectRaw('category, COUNT(*) as count')
                ->groupBy('category')
                ->get(),
            'top_services_by_appointments' => Service::selectRaw('services.*, COUNT(appointments.id) as appointments_count')
                ->leftJoin('appointments', 'services.id', '=', 'appointments.service_id')
                ->whereBetween('appointments.appointment_date', [$startDate, $endDate])
                ->groupBy('services.id')
                ->orderBy('appointments_count', 'desc')
                ->limit(10)
                ->get(),
        ];

        $data = [
            'reports' => $reports,
            'startDate' => Carbon::parse($startDate)->format('F d, Y'),
            'endDate' => Carbon::parse($endDate)->format('F d, Y'),
            'exportDate' => now()->format('F d, Y'),
            'exportedBy' => Auth::user()->name ?? 'System',
        ];

        $pdf = PDF::loadView('exports.reports.services', $data);
        $filename = 'services_report_' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    public function exportUsersReport($startDate, $endDate)
    {
        $reports = [
            'total_users' => User::count(),
            'users_by_role' => User::selectRaw('role, COUNT(*) as count')
                ->groupBy('role')
                ->get(),
            'new_users' => User::whereBetween('created_at', [$startDate, $endDate])->count(),
            'active_users' => User::where('status', 'active')->count(),
            'users_by_status' => User::selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->get(),
        ];

        $data = [
            'reports' => $reports,
            'startDate' => Carbon::parse($startDate)->format('F d, Y'),
            'endDate' => Carbon::parse($endDate)->format('F d, Y'),
            'exportDate' => now()->format('F d, Y'),
            'exportedBy' => Auth::user()->name ?? 'System',
        ];

        $pdf = PDF::loadView('exports.reports.users', $data);
        $filename = 'users_report_' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }
}

