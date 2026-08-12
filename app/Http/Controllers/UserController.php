<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Patient;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $role = $request->input('role');
        $status = $request->input('status');
        
        $users = User::when($search, function ($query, $search) {
                return $query->where('name', 'like', "%{$search}%")
                           ->orWhere('email', 'like', "%{$search}%")
                           ->orWhere('employee_id', 'like', "%{$search}%");
            })
            ->when($role, function ($query, $role) {
                return $query->where('role', $role);
            })
            ->when($status, function ($query, $status) {
                return $query->where('status', $status);
            })
            ->with('patient') // Eager load patient data
            ->orderBy('name')
            ->paginate(15);

        // Calculate statistics
        $stats = [
            'total_users' => User::count(),
            'total_patients' => User::patients()->count(),
            'total_staff' => User::staff()->count(),
            'total_admins' => User::where('role', 'admin')->count(),
            'active_users' => User::where('status', 'active')->count(),
            'inactive_users' => User::where('status', 'inactive')->count(),
        ];

        // ✅ Handle JSON requests for API calls
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'users' => $users->items(),
                'data' => $users->items(), // Some frontends expect 'data' key
                'stats' => $stats,
                'filters' => $request->only(['search', 'role', 'status']),
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                    'from' => $users->firstItem(),
                    'to' => $users->lastItem(),
                ],
            ]);
        }

        // For web requests using Inertia
        return Inertia::render('Users/Index', [
            'users' => $users,
            'stats' => $stats,
            'filters' => $request->only(['search', 'role', 'status']),
        ]);
    }

    public function create()
    {
        // ✅ Handle JSON requests
        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'roles' => ['patient', 'staff', 'admin'],
                'statuses' => ['active', 'inactive'],
                'positions' => ['dentist', 'hygienist', 'assistant', 'receptionist'],
            ]);
        }

        return Inertia::render('Users/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|in:patient,staff,admin',
            'status' => 'required|in:active,inactive',
            'employee_id' => 'nullable|string|unique:users,employee_id',
            'position' => 'nullable|string|in:dentist,hygienist,assistant,receptionist',
            'license_number' => 'nullable|string|max:100',
            'license_expiry' => 'nullable|date|after:today',
            'hire_date' => 'nullable|date|before_or_equal:today',
            'hourly_rate' => 'nullable|numeric|min:0',
            'specializations' => 'nullable|array',
            'bio' => 'nullable|string',
            'years_experience' => 'nullable|integer|min:0',
            // Patient-specific fields
            'birthday' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
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

        // Create user
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'status' => $validated['status'],
            'employee_id' => $validated['employee_id'] ?? null,
            'position' => $validated['position'] ?? null,
            'license_number' => $validated['license_number'] ?? null,
            'license_expiry' => $validated['license_expiry'] ?? null,
            'hire_date' => $validated['hire_date'] ?? null,
            'hourly_rate' => $validated['hourly_rate'] ?? null,
            'specializations' => $validated['specializations'] ?? null,
            'bio' => $validated['bio'] ?? null,
            'years_experience' => $validated['years_experience'] ?? 0,
        ]);

        // Create patient record if role is patient
        if ($user->role === 'patient') {
            Patient::create([
                'user_id' => $user->id,
                'birthday' => $validated['birthday'] ?? null,
                'gender' => $validated['gender'] ?? null,
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
        }

        // Log the action
        AuditLog::logCreate(Auth::id(), Auth::user()->role, 'users', $user->id, [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ]);

        // ✅ Handle JSON requests for API calls
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'User created successfully.',
                'user' => $user->fresh()->load('patient'),
            ], 201);
        }

        return redirect()->route('users.show', $user)
            ->with('success', 'User created successfully.');
    }

    public function show($id)
    {
        $user = User::with(['patient', 'patientAppointments', 'doctorAppointments', 'notifications'])
            ->findOrFail($id);

        // ✅ Handle JSON requests
        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'user' => $user,
            ]);
        }

        return Inertia::render('Users/Show', [
            'user' => $user,
        ]);
    }

    public function edit($id)
    {
        $user = User::with('patient')->findOrFail($id);

        // ✅ Handle JSON requests
        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'user' => $user,
                'roles' => ['patient', 'staff', 'admin'],
                'statuses' => ['active', 'inactive'],
                'positions' => ['dentist', 'hygienist', 'assistant', 'receptionist'],
            ]);
        }

        return Inertia::render('Users/Edit', [
            'user' => $user,
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'role' => 'required|in:patient,staff,admin',
            'status' => 'required|in:active,inactive',
            'employee_id' => 'nullable|string|unique:users,employee_id,' . $user->id,
            'position' => 'nullable|string|in:dentist,hygienist,assistant,receptionist',
            'password' => 'nullable|string|min:8|confirmed',
            'license_number' => 'nullable|string|max:100',
            'license_expiry' => 'nullable|date',
            'hire_date' => 'nullable|date|before_or_equal:today',
            'hourly_rate' => 'nullable|numeric|min:0',
            'specializations' => 'nullable|array',
            'bio' => 'nullable|string',
            'years_experience' => 'nullable|integer|min:0',
            // Patient-specific fields
            'birthday' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
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

        // Update user data
        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'role' => $validated['role'],
            'status' => $validated['status'] ?? $user->status,
            'employee_id' => $validated['employee_id'] ?? null,
            'position' => $validated['position'] ?? null,
            'license_number' => $validated['license_number'] ?? null,
            'license_expiry' => $validated['license_expiry'] ?? null,
            'hire_date' => $validated['hire_date'] ?? null,
            'hourly_rate' => $validated['hourly_rate'] ?? null,
            'specializations' => $validated['specializations'] ?? null,
            'bio' => $validated['bio'] ?? null,
            'years_experience' => $validated['years_experience'] ?? $user->years_experience,
        ];

        // Only update password if provided
        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        // Update patient-specific data if user is a patient
        if ($user->role === 'patient') {
            $user->patient()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'birthday' => $validated['birthday'] ?? null,
                    'gender' => $validated['gender'] ?? null,
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
        }

        // Log the action
        AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'users', $user->id, [
            'updated_fields' => array_keys($validated),
        ]);

        // ✅ Handle JSON requests for API calls
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'User updated successfully.',
                'user' => $user->fresh()->load('patient'),
            ]);
        }

        return redirect()->route('users.show', $user)
            ->with('success', 'User updated successfully.');
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        
        // Prevent deletion of current user
        if ($user->id === Auth::id()) {
            if (request()->expectsJson() || request()->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'You cannot delete your own account.',
                ], 403);
            }
            return back()->with('error', 'You cannot delete your own account.');
        }

        // Log before deletion
        AuditLog::logDelete(Auth::id(), Auth::user()->role, 'users', $user->id, [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ]);

        // Delete patient record if exists
        if ($user->patient) {
            $user->patient->delete();
        }

        $user->delete();

        // ✅ Handle JSON requests for API calls
        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully.',
            ]);
        }

        return redirect()->route('users.index')
            ->with('success', 'User deleted successfully.');
    }

    // Additional methods for user management

    public function getStats()
    {
        $stats = [
            'total_users' => User::count(),
            'total_patients' => User::patients()->count(),
            'total_staff' => User::staff()->count(),
            'total_admins' => User::where('role', 'admin')->count(),
            'active_users' => User::where('status', 'active')->count(),
            'inactive_users' => User::where('status', 'inactive')->count(),
            'new_users_this_month' => User::whereMonth('created_at', now()->month)->count(),
        ];

        return response()->json($stats);
    }

    public function getUsersByRole($role)
    {
        $users = User::where('role', $role)
            ->with('patient')
            ->orderBy('name')
            ->get();

        return response()->json([
            'users' => $users,
            'role' => $role,
            'count' => $users->count(),
        ]);
    }

    public function getActivitySummary($id)
    {
        $user = User::findOrFail($id);
        
        $activity = [
            'total_appointments' => $user->patientAppointments()->count(),
            'completed_appointments' => $user->patientAppointments()->where('status', 'completed')->count(),
            'upcoming_appointments' => $user->patientAppointments()->where('appointment_date', '>=', now())->count(),
            'total_records' => $user->patientRecords()->count(),
            'unread_notifications' => $user->notifications()->where('is_read', false)->count(),
            'last_login' => $user->last_login_at,
        ];

        return response()->json($activity);
    }

    public function activate($id)
    {
        $user = User::findOrFail($id);
        $user->update(['status' => 'active']);

        AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'users', $user->id, [
            'action' => 'activated',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User activated successfully.',
            'user' => $user->fresh(),
        ]);
    }

    public function deactivate($id)
    {
        $user = User::findOrFail($id);
        $user->update(['status' => 'inactive']);

        AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'users', $user->id, [
            'action' => 'deactivated',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User deactivated successfully.',
            'user' => $user->fresh(),
        ]);
    }

    public function resetPassword(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        $tempPassword = bin2hex(random_bytes(4)); // Generate 8-character password
        
        $user->update([
            'password' => Hash::make($tempPassword),
        ]);

        AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'users', $user->id, [
            'action' => 'password_reset',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully.',
            'temporary_password' => $tempPassword,
        ]);
    }

    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'status' => 'required|in:active,inactive',
        ]);

        $updatedCount = User::whereIn('id', $validated['user_ids'])
            ->update(['status' => $validated['status']]);

        // Log each update
        foreach ($validated['user_ids'] as $userId) {
            AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'users', $userId, [
                'bulk_status_changed' => $validated['status'],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => "{$updatedCount} users updated successfully.",
            'count' => $updatedCount,
        ]);
    }
}