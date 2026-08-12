<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;


// ================================
// PUBLIC ROUTES (No authentication required)
// ================================
Route::get('/csrf-token', function () {
    $token = csrf_token();

    return response()
        ->json([
            'csrfToken' => $token,
        ])
        ->withCookie(cookie(
            name: 'XSRF-TOKEN',
            value: $token,
            minutes: 120,
            path: '/',
            domain: null,
            secure: false,
            httpOnly: false,
            raw: false,
            sameSite: 'Lax'
        ));
})->name('csrf-token');

Route::get('/', function () {
    // Redirect authenticated users to their dashboard
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }
    return Inertia::render('welcome');
})->name('home');

// ================================
// AUTHENTICATED ROUTES
// ================================
Route::middleware(['auth', 'verified'])->group(function () {

    // Default dashboard route - redirect based on medical clinic roles
    Route::get('/dashboard', function () {
        $user = Auth::user();

        if ($user->role === 'admin') {
            return redirect()->route('admin.dashboard');
        } elseif ($user->role === 'staff') {
            return redirect()->route('staff.dashboard');
        } elseif ($user->role === 'patient') {
            return redirect()->route('patient.dashboard');
        }

        // Default fallback dashboard
        return Inertia::render('Dashboard');
    })->name('dashboard');
   // ================================
    // ADMIN ROUTES - System Administration for Smart Medical Clinic
    // ================================
    Route::middleware([\App\Http\Middleware\CheckRole::class.':admin'])->group(function () {
        Route::get('/admin/dashboard', [\App\Http\Controllers\AdminDashboardController::class, 'index'])->name('admin.dashboard');

        // User Management
        Route::get('/admin/users', function () {
            return Inertia::render('Admin/Users/Index');
        })->name('admin.users');

        // Staff Management
        Route::get('/admin/staff', function () {
            return Inertia::render('Admin/Staff/Index');
        })->name('admin.staff');

        // Patients Overview
        Route::get('/admin/patients', function () {
            return Inertia::render('Admin/Patients/Index');
        })->name('admin.patients');

        // Appointments Management
        Route::get('/admin/appointments', function () {
            return Inertia::render('Admin/Appointments/Index');
        })->name('admin.appointments');

        // Financial Management
        Route::get('/admin/financial', function () {
            return Inertia::render('Admin/Financial/Index');
        })->name('admin.financial');

        // Services Management
        Route::get('/admin/services', function () {
            return Inertia::render('Admin/Services/Index');
        })->name('admin.services');

        // Schedule Management
        Route::get('/admin/schedules', function () {
            return Inertia::render('Admin/Schedules/Index');
        })->name('admin.schedules');

        // Schedule Resource Routes
        Route::resource('schedules', \App\Http\Controllers\ScheduleController::class);

        // System Monitoring
        Route::get('/admin/monitoring', function () {
            return Inertia::render('Admin/SystemMonitoring');
        })->name('admin.monitoring');

        // Reports
        Route::get('/admin/reports', function () {
            return Inertia::render('Admin/Reports');
        })->name('admin.reports');

        // System Settings
        Route::get('/admin/settings', function () {
            return Inertia::render('Admin/Settings/Index');
        })->name('admin.settings');

        // System Security
        Route::get('/admin/security', function () {
            return Inertia::render('Admin/Security/Index');
        })->name('admin.security');

        // Audit Logs
        Route::get('/admin/audit', function () {
            return Inertia::render('Admin/Audit/Index');
        })->name('admin.audit');

        // ADDITIONAL ADMIN APPOINTMENT ROUTES
        Route::prefix('admin/appointments')->name('admin.appointments.')->group(function () {
            Route::get('/calendar', function () {
                return Inertia::render('Admin/Appointments/Calendar');
            })->name('calendar');

            Route::get('/create', function () {
                return Inertia::render('Admin/Appointments/Create');
            })->name('create');

            Route::get('/{appointment}', function ($appointment) {
                return Inertia::render('Admin/Appointments/Show', ['appointmentId' => $appointment]);
            })->name('show');

            Route::get('/{appointment}/edit', function ($appointment) {
                return Inertia::render('Admin/Appointments/Edit', ['appointmentId' => $appointment]);
            })->name('edit');

            // Appointment-specific Tooth Records (Check-in workflow)
            Route::get('/{appointment}/tooth-records', function ($appointment) {
                return Inertia::render('Admin/Appointments/ToothRecords', ['appointmentId' => $appointment]);
            })->name('tooth-records');
        });

        // ADMIN TOOTH RECORDS ROUTES
        Route::prefix('admin/tooth-records')->name('admin.tooth-records.')->group(function () {
            Route::get('/', function () {
                return Inertia::render('Admin/ToothRecords/Index');
            })->name('index');

            Route::get('/create', function () {
                return Inertia::render('Admin/ToothRecords/Create');
            })->name('create');

            Route::get('/{tooth_record}', function ($tooth_record) {
                return Inertia::render('Admin/ToothRecords/Show', ['toothRecordId' => $tooth_record]);
            })->name('show');

            Route::get('/{tooth_record}/edit', function ($tooth_record) {
                return Inertia::render('Admin/ToothRecords/Edit', ['toothRecordId' => $tooth_record]);
            })->name('edit');
        });

    });

    // ================================
    // STAFF ROUTES - Medical staff (doctors, nurses, technicians, etc.)
    // ================================
    Route::middleware([\App\Http\Middleware\CheckRole::class.':staff'])->group(function () {
        Route::get('/staff/dashboard', [\App\Http\Controllers\StaffDashboardController::class, 'index'])->name('staff.dashboard');

        Route::get('/staff/appointments', function () {
            return Inertia::render('Staff/Appointments/Index');
        })->name('staff.appointments');

        Route::get('/staff/patients', function () {
            return Inertia::render('Staff/Patients/Index');
        })->name('staff.patients');

        Route::get('/staff/schedule', function () {
            return Inertia::render('Staff/Schedule/Index');
        })->name('staff.schedule');

        Route::get('/staff/patient-records', function () {
            return Inertia::render('Staff/PatientRecords/Index');
        })->name('staff.patient-records');

        // STAFF TOOTH RECORDS ROUTES
        Route::prefix('staff/tooth-records')->name('staff.tooth-records.')->group(function () {
            Route::get('/', function () {
                return Inertia::render('Staff/ToothRecords/Index');
            })->name('index');

            Route::get('/create', function () {
                return Inertia::render('Staff/ToothRecords/Create');
            })->name('create');

            Route::get('/{tooth_record}', function ($tooth_record) {
                return Inertia::render('Staff/ToothRecords/Show', ['toothRecordId' => $tooth_record]);
            })->name('show');

            Route::get('/{tooth_record}/edit', function ($tooth_record) {
                return Inertia::render('Staff/ToothRecords/Edit', ['toothRecordId' => $tooth_record]);
            })->name('edit');
        });

        // ================================
        // TOOTH RECORDS MANAGEMENT API (Shared between Staff & Admin)
        // ================================
        Route::prefix('tooth-records')->name('tooth-records.')->group(function () {
            Route::get('/', [\App\Http\Controllers\ToothRecordController::class, 'index'])->name('index');
            Route::get('/patient/{patient_id}/history', [\App\Http\Controllers\ToothRecordController::class, 'patientHistory'])->name('patient-history');
            Route::get('/patient/{patient_id}/chart', [\App\Http\Controllers\ToothRecordController::class, 'toothChart'])->name('tooth-chart');
            Route::get('/needing-review', [\App\Http\Controllers\ToothRecordController::class, 'needingReview'])->name('needing-review');
            Route::get('/tooth/{patient_id}/{tooth_number}', [\App\Http\Controllers\ToothRecordController::class, 'toothHistory'])->name('tooth-history');
            Route::get('/create', [\App\Http\Controllers\ToothRecordController::class, 'create'])->name('create');
            Route::post('/', [\App\Http\Controllers\ToothRecordController::class, 'store'])->name('store');
            Route::get('/{tooth_record}', [\App\Http\Controllers\ToothRecordController::class, 'show'])->name('show');
            Route::get('/{tooth_record}/edit', [\App\Http\Controllers\ToothRecordController::class, 'edit'])->name('edit');
            Route::put('/{tooth_record}', [\App\Http\Controllers\ToothRecordController::class, 'update'])->name('update');
            Route::delete('/{tooth_record}', [\App\Http\Controllers\ToothRecordController::class, 'destroy'])->name('destroy');
            Route::post('/{tooth_record}/mark-reviewed', [\App\Http\Controllers\ToothRecordController::class, 'markReviewed'])->name('mark-reviewed');
            Route::post('/chart/generate', [\App\Http\Controllers\ToothRecordController::class, 'generateChart'])->name('generate-chart');
        });

            Route::get('/staff/financial', function () {
            return Inertia::render('Staff/Financial/Index');
        })->name('staff.financial');

        Route::get('/staff/notifications', function () {
            return Inertia::render('Staff/Notifications/Index');
        })->name('staff.notifications');

        Route::get('/staff/treatment-plans', function () {
            return Inertia::render('Staff/TreatmentPlans/Index');
        })->name('staff.treatment-plans');

        Route::get('/staff/performance', function () {
            return Inertia::render('Staff/Performance/Index');
        })->name('staff.performance');

        Route::get('/staff/billing', function () {
            return Inertia::render('Staff/Billing/Index');
        })->name('staff.billing');

        // ADDITIONAL STAFF APPOINTMENT ROUTES
        Route::prefix('staff/appointments')->name('staff.appointments.')->group(function () {
            Route::get('/calendar', function () {
                return Inertia::render('Staff/Appointments/Calendar');
            })->name('calendar');

            Route::get('/today', function () {
                return Inertia::render('Staff/Appointments/Today');
            })->name('today');

            Route::get('/{appointment}', function ($appointment) {
                return Inertia::render('Staff/Appointments/Show', ['appointmentId' => $appointment]);
            })->name('show');

            // Appointment-specific Tooth Records (Check-in workflow)
            Route::get('/{appointment}/tooth-records', function ($appointment) {
                return Inertia::render('Staff/Appointments/ToothRecords', ['appointmentId' => $appointment]);
            })->name('tooth-records');
        });
    });

    // ================================
    // PATIENT ROUTES - Patient portal
    // ================================
    Route::middleware([\App\Http\Middleware\CheckRole::class.':patient'])->group(function () {
        Route::get('/patient/dashboard', function () {
            return Inertia::render('Patient/Dashboard');
        })->name('patient.dashboard');

        Route::get('/patient/appointments', function () {
            return Inertia::render('Patient/Appointments/Index');
        })->name('patient.appointments');

        Route::get('/patient/book-appointment', function () {
            return Inertia::render('Patient/Appointments/Book');
        })->name('patient.book-appointment');

        Route::get('/patient/medical-records', function () {
            return Inertia::render('Patient/Records/Index');
        })->name('patient.records');

        Route::get('/patient/treatment-plans', function () {
            return Inertia::render('Patient/TreatmentPlans/Index');
        })->name('patient.treatment-plans');

        Route::get('/patient/billing', function () {
            return Inertia::render('Patient/Billing/Index');
        })->name('patient.billing');

        Route::get('/patient/profile', function () {
            return Inertia::render('Patient/Profile/Edit');
        })->name('patient.profile');

        Route::get('/patient/notifications', function () {
          return Inertia::render('Patient/Notifications/Index');
        })->name('patient.notifications');

        Route::get('/patient/notifications/{id}', function ($id) {
            return Inertia::render('Patient/Notifications/Show', ['notificationId' => $id]);
        })->name('patient.notifications.show');

        Route::get('/patient/tooth-records', function () {
            return Inertia::render('Patient/ToothRecords/Index');
        })->name('patient.tooth-records');

        // ADDITIONAL PATIENT APPOINTMENT ROUTES
        Route::prefix('patient/appointments')->name('patient.appointments.')->group(function () {
            Route::get('/history', function () {
                return Inertia::render('Patient/Appointments/History');
            })->name('history');

            Route::get('/{appointment}', function ($appointment) {
                return Inertia::render('Patient/Appointments/Show', ['appointmentId' => $appointment]);
            })->name('show');

            Route::get('/{appointment}/reschedule', function ($appointment) {
                return Inertia::render('Patient/Appointments/Reschedule', ['appointmentId' => $appointment]);
            })->name('reschedule');
        });
    });

});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/api.php';
