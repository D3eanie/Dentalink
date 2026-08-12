<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\User;
use App\Models\Service;
use App\Models\Schedule;
use App\Models\Notification;
use App\Models\AuditLog;
use App\Jobs\ConfirmRaceCaseAppointment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Mail\AppointmentConfirmedMail;
use App\Mail\AppointmentSlotTakenMail;
use App\Mail\AppointmentUpdatedMail;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException; // Ensure this is imported for better type hinting

class AppointmentController extends Controller
{
    /**
     * Display a listing of the appointments.
     */
    public function index(Request $request)
    {
        try {
            $date = $request->input('date');
            $status = $request->input('status');
            $doctor = $request->input('doctor');
            $patient = $request->input('patient');
            $authenticatedUserId = Auth::id();
            $userRole = Auth::user()->role;

            // Build query based on user role
            // Include financial records only for staff/admin to reduce payload for patients
            $withRelations = ['doctor', 'service'];
            if ($userRole !== 'patient') {
                $withRelations[] = 'patient';
                $withRelations[] = 'financialRecords';
            }
            $query = Appointment::with($withRelations);

            // Only filter by patient_id for patient role
            if ($userRole === 'patient') {
                $query->where('patient_id', $authenticatedUserId);
            }

            if ($userRole === 'staff') {
                // Staff sees only appointments assigned to them
                $query->where('doctor_id', $authenticatedUserId);
            }

            // Admin can see all appointments (no patient_id filter)

            // Apply filters
            $query->when($date, function ($q, $date) {
                return $q->whereDate('appointment_date', $date);
            })
            ->when($status, function ($q, $status) {
                // Handle transition: if filtering for 'not_available', also include old 'in_progress' values
                if ($status === 'not_available') {
                    return $q->whereIn('status', ['not_available', 'in_progress']);
                }
                // If filtering for old 'in_progress', map to new 'not_available'
                if ($status === 'in_progress') {
                    return $q->whereIn('status', ['not_available', 'in_progress']);
                }
                return $q->where('status', $status);
            })
            ->when($doctor, function ($q, $doctor) {
                return $q->where('doctor_id', $doctor);
            })
            ->when($patient, function ($q, $patient) {
                return $q->whereHas('patient', function($subQ) use ($patient) {
                    $subQ->where('name', 'like', '%' . $patient . '%')
                         ->orWhere('id', $patient);
                });
            });

            $appointments = $query->orderBy('appointment_date', 'desc')
                                 ->orderBy('appointment_time', 'desc')
                                 ->get();

            Log::info('Query result: ' . $appointments->count() . ' appointments found');
            // Calculate stats based on role
            $statsQuery = Appointment::query();
            if ($userRole === 'patient') {
                $statsQuery->where('patient_id', $authenticatedUserId);
            }
            if ($userRole === 'staff') {
                $statsQuery->where('doctor_id', $authenticatedUserId);
            }

            $stats = [
                'today' => (clone $statsQuery)->whereDate('appointment_date', today())->count(),
                'thisWeek' => (clone $statsQuery)->whereBetween('appointment_date', [
                    now()->startOfWeek(),
                    now()->endOfWeek()
                ])->count(),
                'completed' => (clone $statsQuery)->where('status', 'completed')->count(),
                'cancelled' => (clone $statsQuery)->where('status', 'cancelled')->count(),
            ];

            // Map appointments with financial records for both API and Inertia
            $mappedAppointments = $appointments->map(function ($appointment) use ($userRole) {
                // Convert financial records to array to ensure proper serialization
                $financialRecordsArray = [];
                if ($userRole !== 'patient' && $appointment->financialRecords && count($appointment->financialRecords) > 0) {
                    $financialRecordsArray = $appointment->financialRecords->map(function ($record) {
                        return [
                            'id' => $record->id,
                            'appointment_id' => $record->appointment_id,
                            'amount' => $record->amount,
                            'balance' => $record->balance,
                            'is_partial_payment' => $record->is_partial_payment,
                            'payment_method' => $record->payment_method,
                            'transaction_date' => $record->transaction_date,
                            'description' => $record->description,
                            'notes' => $record->notes,
                            'created_at' => $record->created_at,
                            'updated_at' => $record->updated_at,
                        ];
                    })->toArray();
                }

                return [
                    'id' => $appointment->id,
                    'patient_id' => $appointment->patient_id,
                    'doctor_id' => $appointment->doctor_id,
                    'service_id' => $appointment->service_id,
                    'appointment_date' => $appointment->appointment_date ? $appointment->appointment_date->format('Y-m-d') : null,
                    'appointment_time' => $appointment->appointment_time,
                    'duration_minutes' => $appointment->duration_minutes,
                    'status' => $appointment->status,
                    'balance' => $appointment->balance,
                    'notes' => $appointment->notes,
                    'checked_in_at' => $appointment->checked_in_at,
                    'created_at' => $appointment->created_at,
                    'updated_at' => $appointment->updated_at,
                    'patient' => $userRole !== 'patient' ? $appointment->patient : null,
                    'doctor' => $appointment->doctor,
                    'service' => $appointment->service,
                    'financial_records' => $financialRecordsArray,
                ];
            });

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => true,
                    'data' => $mappedAppointments,
                    'stats' => $stats,
                    'filters' => $request->only(['date', 'status', 'doctor', 'patient']),
                ]);
            }

            $doctors = User::staff()->where('position', 'dentist')->get();

            return Inertia::render('Appointments/Index', [
                'appointments' => $mappedAppointments,
                'doctors' => $doctors,
                'stats' => $stats,
                'filters' => $request->only(['date', 'status', 'doctor', 'patient']),
            ]);

        } catch (\Exception $e) {
            Log::error('Error in AppointmentController@index: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch appointments',
                    'error' => $e->getMessage()
                ], 500);
            }

            return back()->with('error', 'Failed to load appointments');
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $patients = User::patients()->active()->orderBy('name')->get();
        $doctors = User::staff()->where('position', 'dentist')->active()->get();
        $services = Service::active()->orderBy('name')->get();

        return Inertia::render('Appointments/Create', [
            'patients' => $patients,
            'doctors' => $doctors,
            'services' => $services,
        ]);
    }

    /**
     * Store a newly created appointment in storage.
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'patient_id' => 'required|exists:users,id',
                'service_id' => 'required|exists:services,id',
                'doctor_id' => 'required|exists:users,id',
                'appointment_date' => 'required|date|after_or_equal:today',
                'appointment_time' => 'required|date_format:H:i',
                'notes' => 'nullable|string',
                // Removed 'duration_minutes' validation as it's derived from 'service_id'
            ]);

            // --- FIXED LOGIC: Fetch Service and use its duration ---
            $service = Service::find($validated['service_id']);
            if (!$service) {
                // If service is not found, throw a validation error manually
                throw ValidationException::withMessages([
                    'service_id' => ['The selected service is invalid or unavailable.'],
                ]);
            }

            // Validate service is active
            if (!$service->is_active) {
                throw ValidationException::withMessages([
                    'service_id' => ['The selected service is currently inactive. Please choose another service.'],
                ]);
            }

            // Get duration with fallback to prevent null duration
            $durationMinutes = $service->duration_minutes ?? 30; // Default to 30 minutes if null

            if ($durationMinutes <= 0) {
                throw ValidationException::withMessages([
                    'service_id' => ['The selected service has an invalid duration. Please contact support.'],
                ]);
            }
            // --- END FIXED LOGIC ---

            // --- LUNCH BREAK VALIDATION: Reject appointments during 12:00-12:59 ---
            $appointmentHour = (int) Carbon::createFromFormat('H:i', $validated['appointment_time'])->format('H');
            if ($appointmentHour === 12) {
                throw ValidationException::withMessages([
                    'appointment_time' => ['Appointments cannot be booked during lunch break (12:00 PM - 1:00 PM). Please choose a different time.'],
                ]);
            }
            // --- END LUNCH BREAK VALIDATION ---

            // --- NEW: Enforce doctor schedule availability ---
            // Ensure the requested slot falls within one of the doctor's available schedules
            $schedules = Schedule::where('staff_id', $validated['doctor_id'])
                ->whereDate('date', $validated['appointment_date'])
                ->where('is_available', true)
                ->get();

            if ($schedules->isEmpty()) {
                throw ValidationException::withMessages([
                    'appointment_time' => ['The selected doctor has no available schedule on this date. Please choose another date or doctor.'],
                ]);
            }

            $appointmentStart = Carbon::createFromFormat('Y-m-d H:i', $validated['appointment_date'] . ' ' . $validated['appointment_time']);
            $appointmentEnd = $appointmentStart->copy()->addMinutes($durationMinutes);

            $hasValidSchedule = false;
            foreach ($schedules as $schedule) {
                // start_time / end_time are cast to datetime, but we only care about time on the given date
                $scheduleStart = Carbon::parse($schedule->date->format('Y-m-d') . ' ' . $schedule->start_time->format('H:i:s'));
                $scheduleEnd = Carbon::parse($schedule->date->format('Y-m-d') . ' ' . $schedule->end_time->format('H:i:s'));

                if ($appointmentStart->greaterThanOrEqualTo($scheduleStart) &&
                    $appointmentEnd->lessThanOrEqualTo($scheduleEnd)) {
                    $hasValidSchedule = true;
                    break;
                }
            }

            if (!$hasValidSchedule) {
                throw ValidationException::withMessages([
                    'appointment_time' => ['The selected time is outside of the doctor\'s available schedule. Please choose another time.'],
                ]);
            }
            // --- END NEW SCHEDULE CHECK ---

            // --- LUNCH BREAK OVERLAP CHECK: Prevent appointments that span into lunch break ---
            // If appointment ends at 12:00 PM or passes into hour 12, and starts before noon
            if ($appointmentEnd->hour === 12 && $appointmentStart->hour !== 12) {
                // Appointment spans from before noon into noon (lunch break)
                throw ValidationException::withMessages([
                    'appointment_time' => ['This appointment would extend into the lunch break (12:00 PM - 1:00 PM). Please choose a different time.'],
                ]);
            }
            // --- END LUNCH BREAK OVERLAP CHECK ---

            // Use database transaction with locking to prevent race conditions
            $appointment = DB::transaction(function () use ($validated, $durationMinutes) {
                // Lock existing appointments for this doctor/date to prevent simultaneous bookings
                $timeWithSeconds = $validated['appointment_time'] . ':00';

                // RACE CASE LOGIC: Check if there's already a confirmed appointment for this slot
                $confirmedAppointment = Appointment::where('doctor_id', $validated['doctor_id'])
                    ->whereDate('appointment_date', $validated['appointment_date'])
                    ->where('appointment_time', $validated['appointment_time'])
                    ->where('status', 'confirmed')
                    ->lockForUpdate()
                    ->first();

                if ($confirmedAppointment) {
                    // This slot is already taken! Reject the booking attempt
                    $takenAt = $confirmedAppointment->booking_confirmed_at
                        ? $confirmedAppointment->booking_confirmed_at->format('M d, Y \a\t h:i:s A \P\H\P')
                        : $confirmedAppointment->created_at->format('M d, Y \a\t h:i:s A \P\H\P');

                    // Send apology email immediately for slot already taken
                    try {
                        $patient = User::find($validated['patient_id']);
                        $doctor = User::find($validated['doctor_id']);
                        $service = Service::find($validated['service_id']);

                        // Create a temporary appointment object for email (not saved to DB)
                        $tempAppointment = new Appointment([
                            'patient_id' => $validated['patient_id'],
                            'doctor_id' => $validated['doctor_id'],
                            'service_id' => $validated['service_id'],
                            'appointment_date' => $validated['appointment_date'],
                            'appointment_time' => $validated['appointment_time'],
                            'duration_minutes' => $durationMinutes,
                            'status' => 'cancelled'
                        ]);
                        $tempAppointment->setRelation('patient', $patient);
                        $tempAppointment->setRelation('doctor', $doctor);
                        $tempAppointment->setRelation('service', $service);

                        Mail::to($patient->email)->send(
                            new AppointmentSlotTakenMail($tempAppointment, $takenAt)
                        );
                        Log::info("Apology email sent immediately: Patient {$validated['patient_id']} lost race for slot at {$takenAt}");
                    } catch (\Exception $e) {
                        Log::error("Error sending immediate apology email: " . $e->getMessage());
                    }

                    throw ValidationException::withMessages([
                        'appointment_time' => [
                            "This time slot has just been taken by another patient at {$takenAt}. Please choose a different time.",
                            'slot_taken_at' => $confirmedAppointment->booking_confirmed_at
                        ],
                    ]);
                }

                // Lock and check for conflicts atomically
                // For race case: lock all pending_confirmation AND confirmed appointments
                $conflictingAppointments = Appointment::where('doctor_id', $validated['doctor_id'])
                    ->whereDate('appointment_date', $validated['appointment_date'])
                    ->whereNotIn('status', ['scheduled', 'cancelled', 'no_show'])
                    ->lockForUpdate()
                    ->get();

                // Check for conflicts with locked appointments
                // Only reject if service times actually conflict, not buffer overlap
                $proposedStart = Carbon::createFromFormat('H:i:s', $timeWithSeconds);
                $proposedEnd = $proposedStart->copy()->addMinutes($durationMinutes);
                $bufferMinutes = config('app.appointment.buffer_minutes', 15);

                foreach ($conflictingAppointments as $existing) {
                    $existingStart = Carbon::createFromFormat('H:i:s', $existing->appointment_time);
                    $existingServiceEnd = $existingStart->copy()->addMinutes($existing->duration_minutes);

                    // Check if appointments + their buffers conflict
                    $proposedEndWithBuffer = $proposedEnd->copy()->addMinutes($bufferMinutes);
                    $existingEndWithBuffer = $existingServiceEnd->copy()->addMinutes($bufferMinutes);

                    if ($proposedStart->lessThan($existingEndWithBuffer) && $proposedEndWithBuffer->greaterThan($existingStart)) {
                        throw ValidationException::withMessages([
                            'appointment_time' => ['This time slot conflicts with another appointment. Please choose a different time.'],
                        ]);
                    }
                }

                // Create appointment in pending_confirmation status for race case
                $appointment = Appointment::create([
                    'patient_id' => $validated['patient_id'],
                    'doctor_id' => $validated['doctor_id'],
                    'service_id' => $validated['service_id'],
                    'appointment_date' => $validated['appointment_date'],
                    'appointment_time' => $validated['appointment_time'],
                    'duration_minutes' => $durationMinutes,
                    'status' => 'pending_confirmation', // Race case: pending confirmation
                    'notes' => !empty($validated['notes']) ? $validated['notes'] : null,
                ]);

                return $appointment;
            });

            // Load relationships
            $appointment->load(['patient', 'doctor', 'service']);

            // Send confirmation email immediately (not after 2 minutes)
            try {
                Mail::to($appointment->patient->email)->send(
                    new AppointmentConfirmedMail($appointment)
                );
                Log::info("Confirmation email sent immediately: Appointment {$appointment->id} for patient {$appointment->patient_id}");
            } catch (\Exception $e) {
                Log::error("Error sending immediate confirmation email: " . $e->getMessage());
            }

            // Dispatch job to confirm appointment after 2 minutes (first-come-first-served)
            // Note: Job will now only handle final confirmation, not email (email sent above)
            ConfirmRaceCaseAppointment::dispatch($appointment->id)
                ->delay(now()->addMinutes(2));

            // Return JSON response for API calls
            return response()->json([
                'success' => true,
                'message' => 'Appointment request submitted. You will be notified within 2 minutes if the slot is confirmed.',
                'data' => $appointment,
                'race_case' => true,
                'confirmation_window' => 120, // 2 minutes in seconds
            ], 201);  // 201 = Created

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            Log::error('Appointment creation error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create appointment',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error'
            ], 500);
        }
    }

    /**
     * Display the specified appointment.
     */
    public function show(Appointment $appointment)
    {
        try {
            $appointment->load(['patient', 'doctor', 'service']);

            if (request()->expectsJson() || request()->is('api/*')) {
                return response()->json([
                    'success' => true,
                    'data' => $appointment,
                ]);
            }

            $appointment->load(['patient.patient', 'doctor', 'service', 'patientRecords']);

            return Inertia::render('Appointments/Show', [
                'appointment' => $appointment,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in AppointmentController@show: ' . $e->getMessage());

            if (request()->expectsJson() || request()->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch appointment',
                    'error' => $e->getMessage()
                ], 500);
            }

            return back()->with('error', 'Failed to load appointment');
        }
    }

    /**
     * Show the form for editing the specified appointment.
     */
    public function edit(Appointment $appointment)
    {
        $user = Auth::user();

        if ($user->role === 'staff' && $appointment->doctor_id !== $user->id) {
            abort(403);
        }
        if ($user->role === 'patient' && $appointment->patient_id !== $user->id) {
            abort(403);
        }

        $appointment->load(['patient', 'doctor', 'service']);
        $appointment = $appointment->toArray();

        if ($user->role === 'admin') {
            $patients = User::patients()->active()->orderBy('name')->get();
            $doctors = User::staff()->where('position', 'dentist')->active()->get();
        } else {
            $patients = [$appointment['patient']];
            $doctors = [$appointment['doctor']];
        }

        $services = Service::active()->orderBy('name')->get();

        $component = match ($user->role) {
            'admin' => 'Admin/Appointments/Edit',
            'staff' => 'Staff/Appointments/Edit',
            default => abort(403),
        };

        return Inertia::render($component, [
            'appointment' => $appointment,
            'patients' => $patients,
            'doctors' => $doctors,
            'services' => $services,
        ]);
    }

    /**
     * Update the specified appointment in storage.
     */
    public function update(Request $request, Appointment $appointment)
    {
        try {
            $appointment->loadMissing(['patient', 'doctor', 'service']);
            $previousDetails = [
                'doctor_name' => $appointment->doctor?->name,
                'service_name' => $appointment->service?->name,
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time,
                'status' => $appointment->status,
                'notes' => $appointment->notes,
            ];

            $validated = $request->validate([
                'patient_id' => 'required|exists:users,id',
                'doctor_id' => 'required|exists:users,id',
                'service_id' => 'required|exists:services,id',
                'appointment_date' => 'required|date',
                'appointment_time' => 'required|date_format:H:i',
                'status' => 'required|in:scheduled,confirmed,checked_in,not_available,completed,cancelled,no_show',
                'notes' => 'nullable|string',
            ]);

            $service = Service::find($validated['service_id']);

            // Validate service exists and is active
            if (!$service) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'The selected service is invalid or unavailable.',
                        'errors' => [
                            'service_id' => ['The selected service is invalid or unavailable.'],
                        ],
                    ], 422);
                }
                throw ValidationException::withMessages([
                    'service_id' => ['The selected service is invalid or unavailable.'],
                ]);
            }

            if (!$service->is_active) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'The selected service is currently inactive.',
                        'errors' => [
                            'service_id' => ['The selected service is currently inactive. Please choose another service.'],
                        ],
                    ], 422);
                }
                throw ValidationException::withMessages([
                    'service_id' => ['The selected service is currently inactive. Please choose another service.'],
                ]);
            }

            // --- NEW: Enforce doctor schedule availability on update ---
            // Get duration with fallback to prevent null duration
            $durationMinutes = $service->duration_minutes ?? $appointment->duration_minutes ?? 30;

            if ($durationMinutes <= 0) {
                $durationMinutes = 30; // Fallback to default
            }

            // --- LUNCH BREAK VALIDATION ON UPDATE: Check if appointment is during lunch ---
            $updateHour = (int) Carbon::createFromFormat('H:i', $validated['appointment_time'])->format('H');
            if ($updateHour === 12) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Appointments cannot be booked during lunch break.',
                        'errors' => [
                            'appointment_time' => ['Appointments cannot be booked during lunch break (12:00 PM - 1:00 PM). Please choose a different time.'],
                        ],
                    ], 422);
                }
                throw ValidationException::withMessages([
                    'appointment_time' => ['Appointments cannot be booked during lunch break (12:00 PM - 1:00 PM). Please choose a different time.'],
                ]);
            }
            // --- END LUNCH BREAK VALIDATION ON UPDATE ---

            $schedules = Schedule::where('staff_id', $validated['doctor_id'])
                ->whereDate('date', $validated['appointment_date'])
                ->where('is_available', true)
                ->get();

            if ($schedules->isEmpty()) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'The selected doctor has no available schedule on this date.',
                        'errors' => [
                            'appointment_time' => ['The selected doctor has no available schedule on this date. Please choose another date or doctor.'],
                        ],
                    ], 422);
                }

                throw ValidationException::withMessages([
                    'appointment_time' => ['The selected doctor has no available schedule on this date. Please choose another date or doctor.'],
                ]);
            }

            $appointmentStart = Carbon::createFromFormat('Y-m-d H:i', $validated['appointment_date'] . ' ' . $validated['appointment_time']);
            $appointmentEnd = $appointmentStart->copy()->addMinutes($durationMinutes);

            $hasValidSchedule = false;
            foreach ($schedules as $schedule) {
                $scheduleStart = Carbon::parse($schedule->date->format('Y-m-d') . ' ' . $schedule->start_time->format('H:i:s'));
                $scheduleEnd = Carbon::parse($schedule->date->format('Y-m-d') . ' ' . $schedule->end_time->format('H:i:s'));

                if ($appointmentStart->greaterThanOrEqualTo($scheduleStart) &&
                    $appointmentEnd->lessThanOrEqualTo($scheduleEnd)) {
                    $hasValidSchedule = true;
                    break;
                }
            }

            if (!$hasValidSchedule) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'The selected time is outside of the doctor\'s available schedule.',
                        'errors' => [
                            'appointment_time' => ['The selected time is outside of the doctor\'s available schedule. Please choose another time.'],
                        ],
                    ], 422);
                }

                throw ValidationException::withMessages([
                    'appointment_time' => ['The selected time is outside of the doctor\'s available schedule. Please choose another time.'],
                ]);
            }

            // --- LUNCH BREAK OVERLAP CHECK ON UPDATE: Prevent spanning into lunch ---
            if ($appointmentEnd->hour === 12 && $appointmentStart->hour !== 12) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Appointment would extend into lunch break.',
                        'errors' => [
                            'appointment_time' => ['This appointment would extend into the lunch break (12:00 PM - 1:00 PM). Please choose a different time.'],
                        ],
                    ], 422);
                }
                throw ValidationException::withMessages([
                    'appointment_time' => ['This appointment would extend into the lunch break (12:00 PM - 1:00 PM). Please choose a different time.'],
                ]);
            }
            // --- END LUNCH BREAK OVERLAP CHECK ON UPDATE ---
            // --- END NEW SCHEDULE CHECK ON UPDATE ---

            // Use database transaction with locking to prevent race conditions
            $previousStatus = $appointment->status;
            $previousDoctorId = $appointment->doctor_id;
            $previousServiceId = $appointment->service_id;
            $previousDate = $appointment->appointment_date;
            $previousTime = $appointment->appointment_time;
            $previousTimeShort = substr($previousTime, 0, 5);

            // Detect if this is a reschedule (changing date/time) or just an update
            $isReschedule = (
                $validated['appointment_date'] !== $previousDate->format('Y-m-d') ||
                $validated['appointment_time'] !== $previousTime
            );

            DB::transaction(function () use ($appointment, $validated, $durationMinutes, $request, $isReschedule) {
                // Lock existing appointments for this doctor/date to prevent simultaneous updates
                $timeWithSeconds = $validated['appointment_time'] . ':00';

                // RACE CASE LOGIC: If rescheduling, check if new slot is already taken
                if ($isReschedule) {
                    $confirmedAppointment = Appointment::where('doctor_id', $validated['doctor_id'])
                        ->whereDate('appointment_date', $validated['appointment_date'])
                        ->where('appointment_time', $validated['appointment_time'])
                        ->where('id', '!=', $appointment->id)
                        ->where('status', 'confirmed')
                        ->lockForUpdate()
                        ->first();

                    if ($confirmedAppointment) {
                        // This slot is already taken! Reject the reschedule attempt
                        $takenAt = $confirmedAppointment->booking_confirmed_at
                            ? $confirmedAppointment->booking_confirmed_at->format('M d, Y \a\t h:i:s A \P\H\P')
                            : $confirmedAppointment->created_at->format('M d, Y \a\t h:i:s A \P\H\P');

                        throw ValidationException::withMessages([
                            'appointment_time' => [
                                "This time slot has just been taken by another patient at {$takenAt}. Please choose a different time.",
                                'slot_taken_at' => $confirmedAppointment->booking_confirmed_at
                            ],
                        ]);
                    }
                }

                // Lock and check for conflicts atomically (excluding current appointment)
                $conflictingAppointments = Appointment::where('doctor_id', $validated['doctor_id'])
                    ->whereDate('appointment_date', $validated['appointment_date'])
                    ->where('id', '!=', $appointment->id)
                    ->whereNotIn('status', ['scheduled', 'cancelled', 'no_show'])
                    ->lockForUpdate()
                    ->get();

                // Check for conflicts with locked appointments
                // Only reject if service times actually conflict, not buffer overlap
                $bufferMinutes = config('app.appointment.buffer_minutes', 15);
                $proposedStart = Carbon::createFromFormat('H:i:s', $timeWithSeconds);
                $proposedEnd = $proposedStart->copy()->addMinutes($durationMinutes);

                foreach ($conflictingAppointments as $existing) {
                    $existingStart = Carbon::createFromFormat('H:i:s', $existing->appointment_time);
                    $existingServiceEnd = $existingStart->copy()->addMinutes($existing->duration_minutes);

                    // Check if appointments + their buffers conflict
                    $proposedEndWithBuffer = $proposedEnd->copy()->addMinutes($bufferMinutes);
                    $existingEndWithBuffer = $existingServiceEnd->copy()->addMinutes($bufferMinutes);

                    if ($proposedStart->lessThan($existingEndWithBuffer) && $proposedEndWithBuffer->greaterThan($existingStart)) {
                        if ($request->expectsJson()) {
                            throw ValidationException::withMessages([
                                'appointment_time' => ['This time slot conflicts with another appointment. Please choose a different time.']
                            ]);
                        }
                        throw ValidationException::withMessages([
                            'appointment_time' => ['This time slot conflicts with another appointment. Please choose a different time.']
                        ]);
                    }
                }

                // Update appointment within transaction
                // Only apply pending_confirmation for patient reschedules (via API)
                // Admin/Staff reschedules should keep confirmed status since they have authority to confirm
                $newStatus = $validated['status'];
                $user = Auth::user();
                $isPatientReschedule = $isReschedule && $user && $user->role === 'patient';

                if ($isPatientReschedule && $newStatus === 'confirmed') {
                    $newStatus = 'pending_confirmation';
                }

                $appointment->update([
                    'patient_id' => $validated['patient_id'],
                    'doctor_id' => $validated['doctor_id'],
                    'service_id' => $validated['service_id'],
                    'appointment_date' => $validated['appointment_date'],
                    'appointment_time' => $validated['appointment_time'] . ':00',
                    'duration_minutes' => $durationMinutes,
                    'status' => $newStatus,
                    'notes' => $validated['notes'] ?? null,
                ]);
            });

            // Refresh the appointment from database to ensure all attributes are up-to-date
            // This ensures the model reflects database state after transaction completion
            $appointment->refresh();

            // If rescheduling (patient only), dispatch job to confirm after 2 minutes (race case)
            $user = Auth::user();
            $isPatientReschedule = $isReschedule && $user && $user->role === 'patient';
            if ($isPatientReschedule && $appointment->status === 'pending_confirmation') {
                ConfirmRaceCaseAppointment::dispatch($appointment->id)
                    ->delay(now()->addMinutes(2));
            }

            Log::info('Appointment status change check', [
                'appointment_id' => $appointment->id,
                'previous_status' => $previousStatus,
                'new_status' => $validated['status'],
                'will_create_notification' => ($validated['status'] === 'not_available' && $previousStatus !== 'not_available')
            ]);

            $financialRecord = null;
            if ($validated['status'] === 'completed' && $previousStatus !== 'completed') {
                // Ensure related models are loaded before creating record
                $appointment->loadMissing(['service', 'doctor', 'patient']);
                $financialRecord = $appointment->createFinancialRecordIfNotExists();
            }

            $appointment->load(['patient', 'doctor', 'service']);

            $changes = [];
            if ((int) $validated['doctor_id'] !== (int) $previousDoctorId) {
                $changes[] = [
                    'label' => 'Doctor',
                    'from' => $previousDetails['doctor_name'] ?? 'N/A',
                    'to' => $appointment->doctor->name ?? 'N/A',
                ];
            }
            if ((int) $validated['service_id'] !== (int) $previousServiceId) {
                $changes[] = [
                    'label' => 'Service',
                    'from' => $previousDetails['service_name'] ?? 'N/A',
                    'to' => $appointment->service->name ?? 'N/A',
                ];
            }

            $dateChanged = $validated['appointment_date'] !== $previousDate->format('Y-m-d');
            $timeChanged = $validated['appointment_time'] !== $previousTimeShort;
            if ($dateChanged || $timeChanged) {
                $previousDateTime = $this->formatDateTimeValue($previousDate, $previousTimeShort);
                $currentDateTime = $this->formatAppointmentDateTime($appointment);
                $changes[] = [
                    'label' => 'Date/Time',
                    'from' => $previousDateTime,
                    'to' => $currentDateTime,
                ];
            }

            if ($validated['status'] !== $previousStatus) {
                $changes[] = [
                    'label' => 'Status',
                    'from' => $previousStatus,
                    'to' => $validated['status'],
                ];
            }

            $previousNotes = (string) ($previousDetails['notes'] ?? '');
            $currentNotes = (string) ($appointment->notes ?? '');
            if (trim($previousNotes) !== trim($currentNotes)) {
                $changes[] = [
                    'label' => 'Notes',
                    'from' => $previousNotes !== '' ? $previousNotes : 'None',
                    'to' => $currentNotes !== '' ? $currentNotes : 'None',
                ];
            }

            if (!empty($changes) && $appointment->patient?->email) {
                try {
                    Mail::to($appointment->patient->email)->send(
                        new AppointmentUpdatedMail($appointment, $changes)
                    );
                    Log::info("Appointment update email sent: Appointment {$appointment->id}");
                } catch (\Exception $e) {
                    Log::error('Error sending appointment update email: ' . $e->getMessage());
                }
            }

            // Notify patient about the appointment update
            $this->notifyPatientAboutAppointment(
                $appointment,
                'Appointment Updated',
                "Your appointment has been updated. It is now set with Dr. {$appointment->doctor->name} on " . $this->formatAppointmentDateTime($appointment) . '.'
            );

            if ($validated['status'] === 'not_available' && $previousStatus !== 'not_available') {
                try {
                    Log::info('Creating notification for not_available status', [
                        'appointment_id' => $appointment->id,
                        'patient_id' => $appointment->patient_id,
                        'appointment_date' => $appointment->appointment_date,
                        'appointment_time' => $appointment->appointment_time
                    ]);

                    // Format the date/time properly - appointment_date is already a Carbon instance due to model cast
                    try {
                        $appointmentDate = $appointment->appointment_date;
                        if (!$appointmentDate instanceof \Carbon\Carbon) {
                            $appointmentDate = Carbon::parse($appointment->appointment_date);
                        }

                        // appointment_time is a string in format H:i:s, parse it
                        $timeStr = $appointment->appointment_time;
                        if (is_string($timeStr)) {
                            $timeParts = explode(':', $timeStr);
                            $appointmentTime = Carbon::createFromTime(
                                (int)($timeParts[0] ?? 0),
                                (int)($timeParts[1] ?? 0),
                                (int)($timeParts[2] ?? 0)
                            );
                        } else {
                            $appointmentTime = Carbon::parse($timeStr);
                        }

                        $appointmentDateTime = $appointmentDate->format('M d, Y') . ' at ' . $appointmentTime->format('g:i A');
                    } catch (\Exception $dateError) {
                        Log::warning('Error parsing appointment date/time for notification', [
                            'error' => $dateError->getMessage(),
                            'appointment_date' => $appointment->appointment_date,
                            'appointment_time' => $appointment->appointment_time
                        ]);
                        // Fallback to a simpler format
                        $appointmentDateTime = $appointment->appointment_date . ' ' . $appointment->appointment_time;
                    }

                    $serviceName = $appointment->service->name ?? 'your appointment';
                    $doctorName = $appointment->doctor->name ?? 'our clinic';

                    $notification = Notification::createAppointmentNotification(
                        $appointment->patient_id,
                        'Appointment Status Update',
                        "Your appointment with Dr. {$doctorName} on {$appointmentDateTime} has been marked as 'Not Available'. Please contact the clinic for rescheduling."
                    );

                    Log::info('Notification created successfully for appointment status change', [
                        'appointment_id' => $appointment->id,
                        'patient_id' => $appointment->patient_id,
                        'notification_id' => $notification->id,
                        'notification_user_id' => $notification->user_id,
                        'status' => 'not_available',
                        'notification_title' => $notification->title,
                        'notification_message' => $notification->message
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to create notification for appointment status change', [
                        'appointment_id' => $appointment->id,
                        'patient_id' => $appointment->patient_id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            } else {
                Log::info('Notification NOT created - condition not met', [
                    'appointment_id' => $appointment->id,
                    'previous_status' => $previousStatus,
                    'new_status' => $validated['status'],
                    'condition_met' => ($validated['status'] === 'not_available' && $previousStatus !== 'not_available')
                ]);
            }

            try {
                AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'appointments', $appointment->id, [
                    'updated_fields' => array_keys($validated),
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to create audit log: ' . $e->getMessage());
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Appointment updated successfully.',
                    'data' => $appointment,
                    'financial_record' => $financialRecord
                ], 200);
            }

            return redirect()->route('appointments.show', $appointment)->with('success', 'Appointment updated successfully.');

        } catch (ValidationException $e) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $e->errors()
                ], 422);
            }
            throw $e;
        } catch (\Exception $e) {
            Log::error('Error updating appointment: ' . $e->getMessage());

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to update appointment.',
                    'error' => $e->getMessage()
                ], 500);
            }

            return back()->with('error', 'Failed to update appointment: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified appointment from storage.
     */
    public function destroy(Request $request, $id)
    {
        try {
            $appointment = Appointment::find($id);

            if (!$appointment) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Appointment not found. It may have been already deleted.'
                    ], 404);
                }
                return back()->with('error', 'Appointment not found.');
            }

            $appointmentData = [
                'patient_name' => $appointment->patient->name,
                'doctor_name' => $appointment->doctor->name,
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time,
            ];

            $appointment->delete();

            try {
                AuditLog::logDelete(Auth::id(), Auth::user()->role, 'appointments', $appointment->id, $appointmentData);
            } catch (\Exception $e) {
                Log::warning('Failed to create audit log: ' . $e->getMessage());
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Appointment deleted successfully.'
                ], 200);
            }

            return redirect()->route('appointments.index')->with('success', 'Appointment deleted successfully.');

        } catch (\Exception $e) {
            Log::error('Error deleting appointment: ' . $e->getMessage());

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to delete appointment.',
                    'error' => $e->getMessage()
                ], 500);
            }

            return back()->with('error', 'Failed to delete appointment: ' . $e->getMessage());
        }
    }

    /**
     * Check in the specified appointment.
     */
    public function checkIn(Request $request, Appointment $appointment)
    {
        try {
            if ($appointment->checkIn()) {
                try {
                    AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'appointments', $appointment->id, [
                        'action' => 'checked_in',
                    ]);
                } catch (\Exception $e) {
                    Log::warning('Failed to create audit log: ' . $e->getMessage());
                }

                $appointment->load(['patient', 'doctor', 'service']);

                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Patient checked in successfully.',
                        'data' => $appointment
                    ], 200);
                }

                return back()->with('success', 'Patient checked in successfully.');
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unable to check in patient.'
                ], 400);
            }

            return back()->with('error', 'Unable to check in patient.');

        } catch (\Exception $e) {
            Log::error('Error checking in appointment: ' . $e->getMessage());

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to check in patient.',
                    'error' => $e->getMessage()
                ], 500);
            }

            return back()->with('error', 'Failed to check in patient.');
        }
    }

    /**
     * Start completion flow without changing status until a financial record is created.
     */
    public function complete(Request $request, Appointment $appointment)
    {
        try {
            // Load relationships before completing
            $appointment->load(['patient', 'doctor', 'service']);

            // Do not change status here. Status updates when a financial record is created.

            try {
                AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'appointments', $appointment->id, [
                    'action' => 'completion_started',
                    'completion_notes' => $request->input('completion_notes'),
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to create audit log: ' . $e->getMessage());
            }

            // Include any existing financial record if already created
            $financialRecord = $appointment->getFinancialRecord();

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Redirecting to transaction form. Appointment will be completed once a financial record is created.',
                    'data' => $appointment,
                    'financial_record' => $financialRecord
                ], 200);
            }

            return back()->with('success', 'Redirecting to transaction form. Appointment will be completed once a financial record is created.');

        } catch (\Exception $e) {
            Log::error('Error completing appointment: ' . $e->getMessage());

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to complete appointment.',
                    'error' => $e->getMessage()
                ], 500);
            }

            return back()->with('error', 'Failed to complete appointment.');
        }
    }

    /**
     * Confirm payment for a completed appointment's financial record
     */
    public function confirmPayment(Request $request, Appointment $appointment)
    {
        try {
            // Check if appointment is completed
            if ($appointment->status !== 'completed') {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Payment can only be confirmed for completed appointments.'
                    ], 422);
                }
                return back()->with('error', 'Payment can only be confirmed for completed appointments.');
            }

            // Get or create financial record
            $financialRecord = $appointment->getFinancialRecord();

            if (!$financialRecord) {
                // Create financial record if it doesn't exist
                $financialRecord = $appointment->createFinancialRecordIfNotExists();
            }

            if (!$financialRecord) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unable to create financial record. Service may not have a price set.'
                    ], 422);
                }
                return back()->with('error', 'Unable to create financial record.');
            }

            // Validate payment method with default to cash
            $validated = $request->validate([
                'payment_method' => 'nullable|in:cash,credit_card,debit_card,bank_transfer,insurance',
                'notes' => 'nullable|string',
            ]);

            // Default payment method to cash if not provided
            $validated['payment_method'] = $validated['payment_method'] ?? 'cash';

            // IMMUTABLE BLOCKCHAIN ARCHITECTURE: Check if this is a follow-up payment
            // If the record has a balance > 0, this is a partial payment that needs a follow-up record
            $remainingBalance = (float) $financialRecord->balance;

            if ($remainingBalance > 0) {
                // Create follow-up payment record instead of modifying existing record
                // Get the original description without "Partial payment for " prefix
                $originalDescription = $financialRecord->description;
                if (strpos($originalDescription, 'Partial payment for ') === 0) {
                    $originalDescription = substr($originalDescription, strlen('Partial payment for '));
                }

                $followUpPayment = FinancialRecord::create([
                    'patient_id' => $financialRecord->patient_id,
                    'appointment_id' => $financialRecord->appointment_id,
                    'parent_record_id' => $financialRecord->parent_record_id ?? $financialRecord->id,
                    'amount' => $remainingBalance,
                    'balance' => 0,
                    'is_partial_payment' => false,
                    'total_service_amount' => $financialRecord->total_service_amount,
                    'payment_method' => $validated['payment_method'],
                    'transaction_date' => now(),
                    'description' => "Follow-up payment for " . $originalDescription,
                    'notes' => $validated['notes'] ?? "Completing partial payment",
                ]);

                // Use the newly created record for blockchain recording
                $financialRecord = $followUpPayment;

                Log::info('Follow-up payment created for partial payment', [
                    'original_record_id' => $financialRecord->parent_record_id ?? $financialRecord->id,
                    'follow_up_record_id' => $followUpPayment->id,
                    'payment_amount' => $remainingBalance,
                ]);
            } else {
                // Payment already complete
                Log::warning('Attempted to confirm payment on already paid record', [
                    'record_id' => $financialRecord->id,
                    'appointment_id' => $appointment->id,
                    'balance' => $financialRecord->balance,
                ]);

                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This record is already fully paid.'
                    ], 422);
                }
                return back()->with('error', 'This record is already fully paid.');
            }

            // Audit log
            try {
                AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'financial_records', $financialRecord->id, [
                    'action' => 'payment_confirmed',
                    'appointment_id' => $appointment->id,
                    'payment_method' => $validated['payment_method'],
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to create audit log: ' . $e->getMessage());
            }

            $appointment->load(['patient', 'doctor', 'service', 'financialRecords']);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Payment confirmed successfully.',
                    'data' => $appointment,
                    'financial_record' => $financialRecord->fresh()->load(['patient', 'appointment'])
                ], 200);
            }

            return back()->with('success', 'Payment confirmed successfully.');

        } catch (\Exception $e) {
            Log::error('Error confirming payment: ' . $e->getMessage());

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to confirm payment.',
                    'error' => $e->getMessage()
                ], 500);
            }

            return back()->with('error', 'Failed to confirm payment.');
        }
    }

    /**
     * Quick confirm - Change appointment status from scheduled to confirmed
     */
    public function quickConfirm(Request $request, Appointment $appointment)
    {
        try {
            // Check if appointment can be confirmed
            if (!in_array($appointment->status, ['scheduled'])) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Only scheduled appointments can be confirmed.'
                    ], 422);
                }
                return back()->with('error', 'Only scheduled appointments can be confirmed.');
            }

            // Update status to confirmed
            $appointment->update(['status' => 'confirmed']);

            // Notify patient about confirmation
            $this->notifyPatientAboutAppointment(
                $appointment,
                'Appointment Confirmed',
                "Your appointment with Dr. {$appointment->doctor->name} on " . $this->formatAppointmentDateTime($appointment) . " has been confirmed."
            );

            // Audit log
            try {
                AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'appointments', $appointment->id, [
                    'action' => 'quick_confirmed',
                    'previous_status' => 'scheduled',
                    'new_status' => 'confirmed',
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to create audit log: ' . $e->getMessage());
            }

            $appointment->load(['patient', 'doctor', 'service']);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Appointment confirmed successfully.',
                    'data' => $appointment
                ], 200);
            }

            return back()->with('success', 'Appointment confirmed successfully.');

        } catch (\Exception $e) {
            Log::error('Error confirming appointment: ' . $e->getMessage());

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to confirm appointment.',
                    'error' => $e->getMessage()
                ], 500);
            }

            return back()->with('error', 'Failed to confirm appointment.');
        }
    }

    /**
     * Cancel the specified appointment.
     */
    public function cancel(Request $request, Appointment $appointment)
    {
        try {
            $user = Auth::user();
            $reason = $request->input('reason') ?? $request->input('cancellation_reason');

            // Authorization checks based on role
            if ($user->isPatient() && $appointment->patient_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only cancel your own appointments.'
                ], 403);
            }

            if ($user->isStaff() && $appointment->doctor_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only cancel appointments assigned to you.'
                ], 403);
            }

            $reason = $request->input('reason') ?? $request->input('cancellation_reason');

            // This calls the Model method, which enforces the canCancel() check
            if ($appointment->cancel($reason)) {
                try {
                    AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'appointments', $appointment->id, [
                        'action' => 'cancelled',
                        'reason' => $reason,
                    ]);
                } catch (\Exception $e) {
                    Log::warning('Failed to create audit log: ' . $e->getMessage());
                }

                $appointment->load(['patient', 'doctor', 'service']);

                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Appointment cancelled successfully.',
                        'data' => $appointment
                    ], 200);
                }

                return back()->with('success', 'Appointment cancelled successfully.');
            }

            // Failure: canCancel() returned false (e.g., appointment is past or already completed)
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unable to cancel appointment. Check its status or date/time.'
                ], 400);
            }

            return back()->with('error', 'Unable to cancel appointment. Check its status or date/time.');

        } catch (\Exception $e) {
            Log::error('Error cancelling appointment: ' . $e->getMessage());

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to cancel appointment.',
                    'error' => $e->getMessage()
                ], 500);
            }

            return back()->with('error', 'Failed to cancel appointment.');
        }
    }

    /**
     * Get available time slots for a doctor and date.
     */
    public function getAvailableSlots(Request $request)
    {
        try {
            // Validate the correct field names
            $validated = $request->validate([
                'doctor_id' => 'required|exists:users,id',
                'date' => 'required|date|after_or_equal:today',
                'duration' => 'required|integer|min:15',
            ]);

            // Use 'date' instead of 'appointment_date'
            $schedule = Schedule::where('staff_id', $validated['doctor_id'])
                ->where('date', $validated['date'])
                ->where('is_available', true)
                ->first();

            if (!$schedule) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'No schedule available for this date'
                ]);
            }

            // Assuming $schedule->getAvailableTimeSlots is defined in the Schedule model
            // Pass duration, buffer time, and slot interval (15-minute intervals for better availability display)
            $bufferMinutes = config('app.appointment.buffer_minutes', 15);
            $slotIntervalMinutes = 15; // Display slots in 15-minute intervals
            $slots = $schedule->getAvailableTimeSlots($validated['duration'], $bufferMinutes, $slotIntervalMinutes);

            return response()->json([
                'success' => true,
                'data' => $slots
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting available slots: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to get available slots.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper to format appointment date/time for notifications.
     */
    private function formatAppointmentDateTime(Appointment $appointment): string
    {
        try {
            $systemTimezone = date_default_timezone_get();
            $appointmentDate = $appointment->appointment_date instanceof Carbon
                ? $appointment->appointment_date->timezone($systemTimezone)
                : Carbon::parse($appointment->appointment_date, $systemTimezone)->timezone($systemTimezone);

            $timeParts = explode(':', $appointment->appointment_time);
            $appointmentTime = Carbon::createFromTime(
                (int)($timeParts[0] ?? 0),
                (int)($timeParts[1] ?? 0),
                (int)($timeParts[2] ?? 0)
            )->timezone($systemTimezone);

            return $appointmentDate->format('M d, Y') . ' at ' . $appointmentTime->format('g:i A');
        } catch (\Exception $e) {
            Log::warning('Failed to format appointment date/time', [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage(),
            ]);
            return $appointment->appointment_date . ' ' . $appointment->appointment_time;
        }
    }

    private function formatDateTimeValue($dateValue, string $timeValue): string
    {
        try {
            $systemTimezone = date_default_timezone_get();
            $appointmentDate = $dateValue instanceof Carbon
                ? $dateValue->timezone($systemTimezone)
                : Carbon::parse($dateValue, $systemTimezone)->timezone($systemTimezone);

            $timeParts = explode(':', $timeValue);
            $appointmentTime = Carbon::createFromTime(
                (int)($timeParts[0] ?? 0),
                (int)($timeParts[1] ?? 0),
                (int)($timeParts[2] ?? 0)
            )->timezone($systemTimezone);

            return $appointmentDate->format('M d, Y') . ' at ' . $appointmentTime->format('g:i A');
        } catch (\Exception $e) {
            Log::warning('Failed to format appointment date/time value', [
                'date' => $dateValue,
                'time' => $timeValue,
                'error' => $e->getMessage(),
            ]);
            return $dateValue . ' ' . $timeValue;
        }
    }

    /**
     * Helper to send notifications to patients about appointment changes.
     */
    private function notifyPatientAboutAppointment(Appointment $appointment, string $title, string $message): void
    {
        try {
            Notification::createAppointmentNotification(
                $appointment->patient_id,
                $title,
                $message
            );
        } catch (\Exception $e) {
            Log::error('Failed to send appointment notification', [
                'appointment_id' => $appointment->id,
                'patient_id' => $appointment->patient_id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Helper to send notifications to staff about new bookings.
     */
    private function notifyStaffAboutAppointment(Appointment $appointment, string $title, string $message): void
    {
        if (!$appointment->doctor_id) {
            return;
        }

        try {
            Notification::createAppointmentNotification(
                $appointment->doctor_id,
                $title,
                $message
            );
        } catch (\Exception $e) {
            Log::error('Failed to send staff appointment notification', [
                'appointment_id' => $appointment->id,
                'doctor_id' => $appointment->doctor_id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Check if an appointment conflicts with existing appointments (including buffer)
     *
     * @param int $doctorId
     * @param string $date
     * @param string $time
     * @param int $duration
     * @param int|null $excludeAppointmentId
     * @param int $bufferMinutes Buffer minutes (uses config if not provided)
     * @return bool True if there's a conflict, false otherwise
     */
    private function hasAppointmentConflict(
        int $doctorId,
        string $date,
        string $time,
        int $duration,
        ?int $excludeAppointmentId = null,
        ?int $bufferMinutes = null
    ): bool {
        $bufferMinutes = $bufferMinutes ?? config('app.appointment.buffer_minutes', 15);
        // Parse the proposed appointment time
        $proposedStart = Carbon::createFromFormat('H:i:s', $time);
        $proposedEnd = $proposedStart->copy()->addMinutes($duration);

        // Get all existing appointments for this doctor on this date
        $query = Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->whereNotIn('status', ['cancelled', 'no_show']);

        if ($excludeAppointmentId) {
            $query->where('id', '!=', $excludeAppointmentId);
        }

        $existingAppointments = $query->get();

        foreach ($existingAppointments as $existing) {
            $existingStart = Carbon::createFromFormat('H:i:s', $existing->appointment_time);
            // Add buffer time to the end of existing appointment
            $existingEnd = $existingStart->copy()->addMinutes($existing->duration_minutes + $bufferMinutes);

            // Check if proposed appointment overlaps with existing + buffer
            if ($proposedStart->lessThan($existingEnd) && $proposedEnd->greaterThan($existingStart)) {
                return true; // Conflict found
            }
        }

        return false; // No conflict
    }
}
