<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Patient;
use App\Models\Appointment;
use App\Models\PatientRecord;
use App\Models\TreatmentPlan;
use App\Models\FinancialRecord;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $status = $request->input('status');
        $gender = $request->input('gender');
        
        $query = User::where('role', 'patient')
            ->with('patient')
            ->when($search, function ($query, $search) {
                return $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($status, function ($query, $status) {
                return $query->where('status', $status);
            })
            ->when($gender, function ($query, $gender) {
                return $query->whereHas('patient', function($q) use ($gender) {
                    $q->where('gender', strtolower($gender));
                });
            })
            ->latest();

        $patients = $query->paginate(15);

        // Transform patient data to include flattened structure
        $transformedPatients = $patients->getCollection()->map(function ($user) {
            $patientData = $user->patient;
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'address' => $user->address,
                'status' => $user->status,
                'created_at' => $user->created_at,
                // Split name into first_name and last_name for frontend
                'first_name' => explode(' ', $user->name)[0] ?? '',
                'last_name' => implode(' ', array_slice(explode(' ', $user->name), 1)) ?: '',
                // Patient-specific fields
                'date_of_birth' => $patientData->birthday ?? null,
                'gender' => $patientData->gender ?? null,
                'medical_history' => $patientData->medical_history ?? null,
                'blood_type' => $patientData->blood_type ?? null,
                'allergies' => $patientData->allergies ?? null,
                // Appointment counts
                'appointments_count' => $user->patientAppointments()->count(),
                'last_appointment' => $user->patientAppointments()->latest('appointment_date')->first()?->appointment_date,
            ];
        });

        // Handle both API and web requests
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'data' => $transformedPatients,
                'meta' => [
                    'current_page' => $patients->currentPage(),
                    'last_page' => $patients->lastPage(),
                    'total' => $patients->total(),
                    'per_page' => $patients->perPage(),
                ],
                'summary' => [
                    'total' => $patients->total(),
                    'male' => User::where('role', 'patient')
                        ->whereHas('patient', fn($q) => $q->where('gender', 'male'))
                        ->count(),
                    'female' => User::where('role', 'patient')
                        ->whereHas('patient', fn($q) => $q->where('gender', 'female'))
                        ->count(),
                ]
            ]);
        }

        return Inertia::render('Admin/Patients/Index', [
            'patients' => $transformedPatients,
            'pagination' => [
                'current_page' => $patients->currentPage(),
                'last_page' => $patients->lastPage(),
                'total' => $patients->total(),
            ],
            'filters' => $request->only(['search', 'status', 'gender']),
        ]);
    }

    public function show(User $patient)
    {
        $patient->load([
            'patient',
            'patientAppointments.service',
            'patientAppointments.doctor',
            'patientRecords.createdBy',
            'patientTreatmentPlans.doctor',
            'financialRecords'
        ]);

        $upcomingAppointments = $patient->patientAppointments()
            ->where('appointment_date', '>=', now())
            ->with(['service', 'doctor'])
            ->orderBy('appointment_date')
            ->get();

        $recentRecords = $patient->patientRecords()
            ->with('createdBy')
            ->latest()
            ->limit(5)
            ->get();

        // Transform for consistent response
        $transformedPatient = [
            'id' => $patient->id,
            'name' => $patient->name,
            'email' => $patient->email,
            'phone' => $patient->phone,
            'address' => $patient->address,
            'status' => $patient->status,
            'created_at' => $patient->created_at,
            'first_name' => explode(' ', $patient->name)[0] ?? '',
            'last_name' => implode(' ', array_slice(explode(' ', $patient->name), 1)) ?: '',
            'date_of_birth' => $patient->patient->birthday ?? null,
            'gender' => $patient->patient->gender ?? null,
            'medical_history' => $patient->patient->medical_history ?? null,
        ];

        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'data' => $transformedPatient,
                'relationships' => [
                    'upcomingAppointments' => $upcomingAppointments,
                    'recentRecords' => $recentRecords,
                ]
            ]);
        }

        return Inertia::render('Admin/Patients/Show', [
            'patient' => $transformedPatient,
            'upcomingAppointments' => $upcomingAppointments,
            'recentRecords' => $recentRecords,
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Patients/Create');
    }

    public function store(Request $request)
    {
        // Accept both 'name' and 'first_name'+'last_name' formats
        $name = $request->input('name');
        if (!$name && ($request->has('first_name') || $request->has('last_name'))) {
            $name = trim($request->input('first_name', '') . ' ' . $request->input('last_name', ''));
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'first_name' => 'nullable|required_without:name|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'password' => 'nullable|string|min:8',
            'birthday' => 'nullable|date',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other,Male,Female,Other',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relationship' => 'nullable|string|max:100',
            'insurance_provider' => 'nullable|string|max:255',
            'insurance_number' => 'nullable|string|max:100',
            'medical_history' => 'nullable|string',
            'allergies' => 'nullable|string',
            'current_medications' => 'nullable|string',
            'blood_type' => 'nullable|string|max:10',
        ]);

        // Use date_of_birth if birthday not provided
        $birthday = $validated['birthday'] ?? $validated['date_of_birth'] ?? null;

        // Generate random password if not provided
        $password = $validated['password'] ?? Str::random(12);

        $user = User::create([
            'name' => $name ?: 'New Patient',
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'password' => Hash::make($password),
            'role' => 'patient',
            'status' => 'active',
        ]);

        Patient::create([
            'user_id' => $user->id,
            'birthday' => $birthday,
            'gender' => isset($validated['gender']) ? strtolower($validated['gender']) : null,
            'emergency_contact_name' => $validated['emergency_contact_name'] ?? null,
            'emergency_contact_phone' => $validated['emergency_contact_phone'] ?? null,
            'emergency_contact_relationship' => $validated['emergency_contact_relationship'] ?? null,
            'insurance_provider' => $validated['insurance_provider'] ?? null,
            'insurance_number' => $validated['insurance_number'] ?? null,
            'medical_history' => $validated['medical_history'] ?? null,
            'allergies' => $validated['allergies'] ?? null,
            'current_medications' => $validated['current_medications'] ?? null,
            'blood_type' => $validated['blood_type'] ?? null,
        ]);

        if (Auth::check()) {
            AuditLog::logCreate(Auth::id(), Auth::user()->role, 'patients', $user->id, [
                'name' => $user->name,
                'email' => $user->email,
            ]);
        }

        // Transform response
        $transformedPatient = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'address' => $user->address,
            'status' => $user->status,
            'first_name' => explode(' ', $user->name)[0] ?? '',
            'last_name' => implode(' ', array_slice(explode(' ', $user->name), 1)) ?: '',
            'date_of_birth' => $birthday,
            'gender' => $validated['gender'] ?? null,
            'medical_history' => $validated['medical_history'] ?? null,
        ];

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Patient created successfully.',
                'data' => $transformedPatient
            ], 201);
        }

        return redirect()->route('admin.patients.show', $user)->with('success', 'Patient created successfully.');
    }

    public function edit(User $patient)
    {
        $patient->load('patient');
        
        return Inertia::render('Admin/Patients/Edit', [
            'patient' => $patient,
        ]);
    }

    public function update(Request $request, User $patient)
    {
        // Accept both 'name' and 'first_name'+'last_name' formats
        $name = $request->input('name');
        if (!$name && ($request->has('first_name') || $request->has('last_name'))) {
            $name = trim($request->input('first_name', '') . ' ' . $request->input('last_name', ''));
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'required|email|unique:users,email,' . $patient->id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'birthday' => 'nullable|date',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other,Male,Female,Other',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relationship' => 'nullable|string|max:100',
            'insurance_provider' => 'nullable|string|max:255',
            'insurance_number' => 'nullable|string|max:100',
            'medical_history' => 'nullable|string',
            'allergies' => 'nullable|string',
            'current_medications' => 'nullable|string',
            'blood_type' => 'nullable|string|max:10',
        ]);

        // Use date_of_birth if birthday not provided
        $birthday = $validated['birthday'] ?? $validated['date_of_birth'] ?? null;

        // Update user data
        $patient->update([
            'name' => $name ?: $patient->name,
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? $patient->phone,
            'address' => $validated['address'] ?? $patient->address,
            'status' => $validated['status'] ?? $patient->status,
        ]);

        // Update patient-specific data
        $patient->patient()->updateOrCreate(
            ['user_id' => $patient->id],
            [
                'birthday' => $birthday,
                'gender' => isset($validated['gender']) ? strtolower($validated['gender']) : null,
                'emergency_contact_name' => $validated['emergency_contact_name'] ?? null,
                'emergency_contact_phone' => $validated['emergency_contact_phone'] ?? null,
                'emergency_contact_relationship' => $validated['emergency_contact_relationship'] ?? null,
                'insurance_provider' => $validated['insurance_provider'] ?? null,
                'insurance_number' => $validated['insurance_number'] ?? null,
                'medical_history' => $validated['medical_history'] ?? null,
                'allergies' => $validated['allergies'] ?? null,
                'current_medications' => $validated['current_medications'] ?? null,
                'blood_type' => $validated['blood_type'] ?? null,
            ]
        );

        if (Auth::check()) {
            AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'patients', $patient->id, [
                'updated_fields' => array_keys($validated),
            ]);
        }

        // Refresh patient data
        $patient->refresh()->load('patient');

        // Transform response
        $transformedPatient = [
            'id' => $patient->id,
            'name' => $patient->name,
            'email' => $patient->email,
            'phone' => $patient->phone,
            'address' => $patient->address,
            'status' => $patient->status,
            'first_name' => explode(' ', $patient->name)[0] ?? '',
            'last_name' => implode(' ', array_slice(explode(' ', $patient->name), 1)) ?: '',
            'date_of_birth' => $patient->patient->birthday ?? null,
            'gender' => $patient->patient->gender ?? null,
            'medical_history' => $patient->patient->medical_history ?? null,
        ];

        // Handle both API and web requests
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Patient updated successfully.',
                'data' => $transformedPatient
            ]);
        }

        return redirect()->route('admin.patients.show', $patient)->with('success', 'Patient updated successfully.');
    }

    public function destroy(Request $request, User $patient)
    {
        if (Auth::check()) {
            AuditLog::logDelete(Auth::id(), Auth::user()->role, 'patients', $patient->id, [
                'name' => $patient->name,
                'email' => $patient->email,
            ]);
        }

        $patient->patient()->delete();
        $patient->delete();

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Patient deleted successfully.'
            ]);
        }

        return redirect()->route('admin.patients.index')->with('success', 'Patient deleted successfully.');
    }
}