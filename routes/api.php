<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\TreatmentPlanController;
use App\Http\Controllers\PatientRecordController;
use App\Http\Controllers\FinancialRecordController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\PatientDoctorController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ToothRecordController;
use App\Http\Controllers\BlockchainController;

// ================================
// PUBLIC ROUTES (NO AUTH REQUIRED)
// ================================
Route::prefix('api')->group(function () {
    // Public service information (for website display)
    Route::get('/services', [ServiceController::class, 'index']);
    Route::get('/services/{service}', [ServiceController::class, 'show']);

    // Available appointment slots (for booking widget)
    Route::get('/appointments/available-slots', [AppointmentController::class, 'getAvailableSlots']);
});

// ================================
// SESSION KEEP-ALIVE ROUTE
// ================================
Route::middleware('web')->prefix('api')->group(function () {
    // Ping endpoint to keep session alive - supports both GET and HEAD
    Route::match(['get', 'head'], '/ping', function (Request $request) {
        if ($request->getMethod() === 'HEAD') {
            return response()->noContent();
        }
        return response()->json(['status' => 'alive']);
    });
});

// ================================
// PROTECTED ROUTES (REQUIRE AUTH)
// ================================
// Note: API routes need session middleware for web-based session auth
Route::middleware([
    'web', // Load all web middleware including session
    'auth',  // Require authentication
])->prefix('api')->group(function () {

    // ================================
    // ADMIN ONLY ROUTES
    // ================================
    Route::middleware([\App\Http\Middleware\CheckRole::class.':admin'])->group(function () {

        // User Management (Admin only)
        Route::prefix('users')->group(function () {
            Route::get('/', [UserController::class, 'index']);
            Route::post('/', [UserController::class, 'store']);
            Route::get('/stats', [UserController::class, 'getStats']);
            Route::get('/role/{role}', [UserController::class, 'getUsersByRole']);
            Route::post('/bulk-update', [UserController::class, 'bulkUpdate']);
            Route::post('/bulk-update-status', [UserController::class, 'bulkUpdateStatus']);
            Route::put('/{id}', [UserController::class, 'update']);
            Route::patch('/{id}', [UserController::class, 'update']);
            Route::delete('/{id}', [UserController::class, 'destroy']);
            Route::get('/{id}/activity', [UserController::class, 'getActivitySummary']);
            Route::patch('/{user}/activate', [UserController::class, 'activate']);
            Route::patch('/{user}/deactivate', [UserController::class, 'deactivate']);
            Route::patch('/{user}/reset-password', [UserController::class, 'resetPassword']);
            Route::get('/export-data/{user}', [UserController::class, 'exportData']);
        });

        // Staff Management (Admin only)
        Route::prefix('staff')->group(function () {
            Route::get('/', [StaffController::class, 'index']);
            Route::post('/', [StaffController::class, 'store']);
            Route::get('/{staff}', [StaffController::class, 'show']);
            Route::put('/{staff}', [StaffController::class, 'update']);
            Route::patch('/{staff}', [StaffController::class, 'update']);
            Route::delete('/{staff}', [StaffController::class, 'destroy']);
        });

        // System Administration Dashboard
        Route::prefix('admin')->group(function () {
            // NEW: General stats endpoint (matches your expectation)
            Route::get('/stats', [DashboardController::class, 'getAdminStats']);

            // Existing detailed dashboard routes
            Route::get('/dashboard-stats', [DashboardController::class, 'adminDashboard']);
            Route::get('/system-health', [DashboardController::class, 'getSystemHealth']);
            Route::get('/analytics', [DashboardController::class, 'getSystemAnalytics']);
            Route::get('/user-activity', [DashboardController::class, 'getUserActivity']);
            Route::get('/financial-summary', [DashboardController::class, 'getFinancialSummary']);
            Route::post('/backup-system', [DashboardController::class, 'backupSystem']);
        });

        // Blockchain Verification and Reports (Admin only)
        Route::prefix('blockchain')->group(function () {
            Route::get('/index', [BlockchainController::class, 'index']);
            Route::post('/verify-chain', [BlockchainController::class, 'verifyChain']);
            Route::get('/record-chain', [BlockchainController::class, 'getRecordChain']);
            Route::get('/verify-single/{logId}', [BlockchainController::class, 'verifySingleRecord']);
            Route::get('/suspicious-activity', [BlockchainController::class, 'getSuspiciousActivity']);
            Route::get('/export-chain', [BlockchainController::class, 'exportChain']);
            Route::post('/rebuild-chain', [BlockchainController::class, 'rebuildChain']);
            Route::get('/verification-history', [BlockchainController::class, 'getVerificationHistory']);
            Route::get('/statistics', [BlockchainController::class, 'getStatistics']);
            Route::get('/search-logs', [BlockchainController::class, 'searchLogs']);
            Route::post('/compare-hashes', [BlockchainController::class, 'compareHashes']);

            // Detailed verification report endpoints
            Route::post('/generate-detailed-report', [BlockchainController::class, 'generateDetailedVerificationReport']);
            Route::get('/detailed-reports', [BlockchainController::class, 'getDetailedVerificationReports']);
            Route::get('/detailed-reports/{filename}', [BlockchainController::class, 'viewDetailedVerificationReport']);
        });

        // Data Export (Admin only)
        Route::prefix('export')->group(function () {
            Route::get('/patients', [ExportController::class, 'exportPatients']);
            Route::get('/appointments', [ExportController::class, 'exportAppointments']);
            Route::get('/financial-records', [ExportController::class, 'exportFinancialRecords']);
            Route::get('/services', [ExportController::class, 'exportServices']);
            Route::get('/users', [ExportController::class, 'exportUsers']);
            Route::get('/reports/{type}', [ExportController::class, 'exportReport']);
        });

        // Bulk Operations (Admin only)
        Route::prefix('bulk')->group(function () {
            // Bulk appointment actions
            Route::post('/appointments/cancel', function (Request $request) {
                $request->validate([
                    'appointment_ids' => 'required|array',
                    'appointment_ids.*' => 'exists:appointments,id',
                    'reason' => 'nullable|string'
                ]);

                $count = 0;
                foreach ($request->appointment_ids as $id) {
                    $appointment = \App\Models\Appointment::find($id);
                    if ($appointment && $appointment->canCancel()) {
                        $appointment->cancel($request->reason);
                        $count++;
                    }
                }

                return response()->json(['cancelled_count' => $count]);
            });

            // Bulk notification creation
            Route::post('/notifications/create', function (Request $request) {
                $request->validate([
                    'user_ids' => 'required|array',
                    'user_ids.*' => 'exists:users,id',
                    'title' => 'required|string|max:255',
                    'message' => 'required|string',
                    'type' => 'required|in:appointment,reminder,treatment,transaction,system'
                ]);

                $notifications = [];
                foreach ($request->user_ids as $userId) {
                    $notifications[] = [
                        'user_id' => $userId,
                        'title' => $request->title,
                        'message' => $request->message,
                        'type' => $request->type,
                        'is_read' => false,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                \App\Models\Notification::insert($notifications);

                return response()->json(['created_count' => count($notifications)]);
            });
        });
    });

    // ================================
    // STAFF SPECIFIC ROUTES
    // ================================
    Route::middleware([\App\Http\Middleware\CheckRole::class.':staff'])->group(function () {
        // Staff Dashboard
        Route::prefix('staff')->group(function () {
            Route::get('/dashboard-stats', [DashboardController::class, 'staffDashboard']);
            Route::get('/my-appointments', [AppointmentController::class, 'getStaffAppointments']);
            Route::get('/my-patients', [PatientController::class, 'getStaffPatients']);
            Route::get('/my-schedule', [ScheduleController::class, 'getMySchedule']);
            Route::get('/performance', [StaffController::class, 'getMyPerformance']);
        });
    });

    // ================================
    // PATIENT SPECIFIC ROUTES
    // ================================
    Route::middleware([\App\Http\Middleware\CheckRole::class.':patient'])->group(function () {
        // Patient Dashboard
        Route::prefix('patient')->group(function () {
            Route::get('/dashboard-stats', [DashboardController::class, 'patientDashboard']);
            Route::get('/my-appointments', [AppointmentController::class, 'getMyAppointments']);
            Route::get('/my-records', [PatientRecordController::class, 'getMyRecords']);
            Route::get('/my-treatment-plans', [TreatmentPlanController::class, 'getMyTreatmentPlans']);
            Route::get('/my-billing', [FinancialRecordController::class, 'getMyBilling']);
            Route::post('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
            // Doctors list for patient booking – only doctors with available schedules
            Route::get('/doctors', [PatientDoctorController::class, 'index']);
        });
    });

    // ================================
    // ADMIN + STAFF ROUTES
    // ================================
    // Patient Management
    Route::prefix('patients')->group(function () {
        Route::get('/', [PatientController::class, 'index']);
        Route::post('/', [PatientController::class, 'store']);
        Route::get('/{patient}', [PatientController::class, 'show']);
        Route::put('/{patient}', [PatientController::class, 'update']);
        Route::patch('/{patient}', [PatientController::class, 'update']);
        Route::delete('/{patient}', [PatientController::class, 'destroy']);
    });

    // Appointment Management
    Route::prefix('appointments')->group(function () {
        Route::get('/', [AppointmentController::class, 'index']);
        Route::post('/', [AppointmentController::class, 'store']);
        Route::get('/appointments/available-slots', [AppointmentController::class, 'getAvailableSlots']);
        Route::post('/{appointment}/check-in', [AppointmentController::class, 'checkIn']);
        Route::get('/{appointment}/tooth-records', [ToothRecordController::class, 'getByAppointment']);
        Route::post('/{appointment}/complete', [AppointmentController::class, 'complete']);
        Route::post('/{appointment}/quick-confirm', [AppointmentController::class, 'quickConfirm']);
        Route::post('/{appointment}/confirm-payment', [AppointmentController::class, 'confirmPayment']);
        Route::post('/{appointment}/cancel', [AppointmentController::class, 'cancel']);
        Route::get('/{appointment}/edit', [AppointmentController::class, 'edit']);
        Route::get('/{appointment}', [AppointmentController::class, 'show']);
        Route::put('/{appointment}', [AppointmentController::class, 'update']);
        Route::patch('/{appointment}', [AppointmentController::class, 'update']);
        Route::delete('/{appointment}', [AppointmentController::class, 'destroy']);
    });

    // Service Management
    Route::prefix('services')->group(function () {
        Route::get('/', [ServiceController::class, 'index']);
        Route::post('/', [ServiceController::class, 'store']);
        Route::get('/{service}', [ServiceController::class, 'show']);
        Route::put('/{service}', [ServiceController::class, 'update']);
        Route::patch('/{service}', [ServiceController::class, 'update']);
        Route::delete('/{service}', [ServiceController::class, 'destroy']);
    });

    // Patient Records Management
    Route::prefix('patient-records')->group(function () {
        Route::get('/', [PatientRecordController::class, 'index']);
        Route::post('/', [PatientRecordController::class, 'store']);
        Route::get('/{patientRecord}', [PatientRecordController::class, 'show']);
        Route::put('/{patientRecord}', [PatientRecordController::class, 'update']);
        Route::patch('/{patientRecord}', [PatientRecordController::class, 'update']);
        Route::delete('/{patientRecord}', [PatientRecordController::class, 'destroy']);
    });

    // Treatment Plan Management
    Route::prefix('treatment-plans')->group(function () {
        Route::get('/', [TreatmentPlanController::class, 'index']);
        Route::post('/', [TreatmentPlanController::class, 'store']);
        Route::get('/{treatmentPlan}', [TreatmentPlanController::class, 'show']);
        Route::put('/{treatmentPlan}', [TreatmentPlanController::class, 'update']);
        Route::patch('/{treatmentPlan}', [TreatmentPlanController::class, 'update']);
        Route::delete('/{treatmentPlan}', [TreatmentPlanController::class, 'destroy']);
        Route::post('/{treatmentPlan}/approve', [TreatmentPlanController::class, 'approve']);
        Route::post('/{treatmentPlan}/start', [TreatmentPlanController::class, 'start']);
        Route::post('/{treatmentPlan}/complete', [TreatmentPlanController::class, 'complete']);
    });

    // Financial Records Management
    Route::prefix('financial-records')->group(function () {
        Route::get('/', [FinancialRecordController::class, 'index']);
        Route::post('/', [FinancialRecordController::class, 'store']);
        Route::get('/reports/summary', [FinancialRecordController::class, 'reports']);
        Route::get('/form-data/from-appointment/{appointmentId}', [FinancialRecordController::class, 'getFormDataFromAppointment']);
        Route::get('/{financialRecord}', [FinancialRecordController::class, 'show']);
        Route::put('/{financialRecord}', [FinancialRecordController::class, 'update']);
        Route::patch('/{financialRecord}', [FinancialRecordController::class, 'update']);
        Route::delete('/{financialRecord}', [FinancialRecordController::class, 'destroy']);
        Route::post('/{financialRecord}/mark-as-paid', [FinancialRecordController::class, 'markAsPaid']);
        Route::post('/{financialRecord}/mark-as-verified', [FinancialRecordController::class, 'markAsVerified']);
        Route::get('/{financialRecord}/remaining-balance', [FinancialRecordController::class, 'calculateRemainingBalance']);
        Route::post('/{financialRecord}/create-partial-followup', [FinancialRecordController::class, 'createPartialPaymentFollowUp']);

        // Blockchain Verification Routes
        Route::get('/blockchain/statistics', [FinancialRecordController::class, 'blockchainStatistics']);
        Route::post('/blockchain/verify-chain', [FinancialRecordController::class, 'verifyChain']);
        Route::get('/{financialRecord}/blockchain/verify', [FinancialRecordController::class, 'verifyRecord']);
        Route::get('/{financialRecord}/blockchain/chain', [FinancialRecordController::class, 'getBlockchainChain']);

        // Admin only - Rebuild blockchain and data integrity
        Route::middleware([\App\Http\Middleware\CheckRole::class.':admin'])->group(function () {
            Route::post('/blockchain/rebuild', [FinancialRecordController::class, 'rebuildBlockchain']);
            Route::post('/data-integrity/repair', [FinancialRecordController::class, 'repairDataIntegrity']);
            Route::get('/data-integrity/reports', [FinancialRecordController::class, 'getIntegrityRepairReports']);
            Route::get('/data-integrity/reports/{filename}', [FinancialRecordController::class, 'downloadIntegrityRepairReport']);
        });
    });

    // Schedule Management
    Route::prefix('schedules')->group(function () {
        Route::get('/', [ScheduleController::class, 'index']);
        Route::post('/', [ScheduleController::class, 'store']);
        Route::get('/{schedule}', [ScheduleController::class, 'show']);
        Route::put('/{schedule}', [ScheduleController::class, 'update']);
        Route::patch('/{schedule}', [ScheduleController::class, 'update']);
        Route::delete('/{schedule}', [ScheduleController::class, 'destroy']);
        Route::post('/{schedule}/make-unavailable', [ScheduleController::class, 'makeUnavailable']);
        Route::post('/{schedule}/make-available', [ScheduleController::class, 'makeAvailable']);
    });

    // Reports (Admin and Staff only)
    Route::prefix('reports')->group(function () {
        Route::get('/', [ReportsController::class, 'index']);
        Route::get('/financial', [ReportsController::class, 'financial']);
        Route::get('/appointments', [ReportsController::class, 'appointments']);
        Route::get('/patients', [ReportsController::class, 'patients']);
        Route::get('/staff', [ReportsController::class, 'staff']);
        Route::get('/audit', [ReportsController::class, 'audit']);
    });

    // Staff export route for financial records (staff users only) to generate PDF
    Route::get('/export/financial-records-staff', [ExportController::class, 'exportFinancialRecords'])
        ->middleware(\App\Http\Middleware\CheckRole::class . ':staff');

    // ================================
    // GENERAL DASHBOARD ROUTES
    // ================================
    Route::prefix('dashboard')->group(function () {
        Route::get('/data', [DashboardController::class, 'index']);
        Route::get('/stats', [DashboardController::class, 'getStats']);
        Route::get('/recent-activity', [DashboardController::class, 'getRecentActivity']);
        Route::get('/alerts', [DashboardController::class, 'getAlerts']);
    });

    // ================================
    // USER PROFILE ROUTES
    // ================================
    Route::prefix('users')->group(function () {
        Route::get('/profile', [UserController::class, 'profile']);
        Route::put('/profile', [UserController::class, 'updateProfile']);
        Route::patch('/profile', [UserController::class, 'updateProfile']);
        Route::post('/change-password', [UserController::class, 'changePassword']);
        Route::patch('/preferences', [UserController::class, 'updatePreferences']);
        Route::get('/search', [UserController::class, 'search']);
        Route::get('/notifications', [UserController::class, 'notifications']);
        Route::post('/notifications/mark-read', [UserController::class, 'markNotificationsRead']);
        Route::get('/{id}', [UserController::class, 'show']);
    });

    // ================================
    // NOTIFICATION ROUTES
    // ================================
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'getUnreadCount']);
        Route::get('/recent', [NotificationController::class, 'getRecent']);
        Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
        Route::patch('/{notification}/mark-read', [NotificationController::class, 'markAsRead']);
        Route::patch('/{notification}/mark-unread', [NotificationController::class, 'markAsUnread']);
        Route::delete('/{notification}', [NotificationController::class, 'destroy']);
    });

    // ================================
    // TOOTH RECORDS API ROUTES
    // ================================
    Route::prefix('tooth-records')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'store']);
        Route::get('/needing-review', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'needingReview']);
        Route::get('/patient/{patient_id}', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'patientRecords']);
        Route::get('/patient/{patient_id}/chart', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'toothChart']);
        Route::get('/patient/{patient_id}/history/{tooth_number}', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'toothHistory']);
        Route::get('/{toothRecord}', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'show']);
        Route::put('/{toothRecord}', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'update']);
        Route::delete('/{toothRecord}', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'destroy']);
        Route::post('/{toothRecord}/mark-reviewed', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'markReviewed']);
        Route::post('/chart/generate', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'generateChart']);
        Route::post('/batch-update', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'batchUpdate']);
        Route::get('/export/records', [\App\Http\Controllers\Api\ToothRecordApiController::class, 'export']);
    });

    // ================================
    // SYSTEM STATUS ROUTES
    // ================================
    Route::prefix('system')->group(function () {
        Route::get('/status', [DashboardController::class, 'getSystemStatus']);
        Route::get('/version', [DashboardController::class, 'getSystemVersion']);
    });
});

// ================================
// FALLBACK ROUTES
// ================================
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found'
    ], 404);
});
