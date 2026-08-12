<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Schedule;
use App\Models\Appointment;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules;
use Inertia\Inertia;

class StaffController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $position = $request->input('position');
        $status = $request->input('status');

        $staff = User::staff()
            ->when($search, function ($query, $search) {
                return $query->where('name', 'like', "%{$search}%")
                           ->orWhere('email', 'like', "%{$search}%")
                           ->orWhere('employee_id', 'like', "%{$search}%");
            })
            ->when($position, function ($query, $position) {
                return $query->where('position', $position);
            })
            ->when($status, function ($query, $status) {
                return $query->where('status', $status);
            })
            ->orderBy('name')
            ->paginate(15);

        return Inertia::render('Staff/Index', [
            'staff' => $staff,
            'filters' => $request->only(['search', 'position', 'status']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Staff/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'employee_id' => 'required|string|unique:users,employee_id',
            'position' => 'required|in:dentist,hygienist,receptionist,assistant',
            'license_number' => 'nullable|string|max:100',
            'license_expiry' => 'nullable|date|after:today',
            'hire_date' => 'required|date|before_or_equal:today',
            'hourly_rate' => 'nullable|numeric|min:0',
            'specializations' => 'nullable|array',
            'bio' => 'nullable|string',
            'years_experience' => 'nullable|integer|min:0',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'address' => $validated['address'],
            'password' => Hash::make($validated['password']),
            'role' => 'staff',
            'status' => 'active',
            'employee_id' => $validated['employee_id'],
            'position' => $validated['position'],
            'license_number' => $validated['license_number'],
            'license_expiry' => $validated['license_expiry'],
            'hire_date' => $validated['hire_date'],
            'hourly_rate' => $validated['hourly_rate'],
            'specializations' => $validated['specializations'],
            'bio' => $validated['bio'],
            'years_experience' => $validated['years_experience'],
        ]);

        AuditLog::logCreate(Auth::id(), Auth::user()->role, 'staff', $user->id, [
            'name' => $user->name,
            'employee_id' => $user->employee_id,
            'position' => $user->position,
        ]);

        return redirect()->route('staff.show', $user)->with('success', 'Staff member created successfully.');
    }

    public function show(User $staff)
    {
        $staff->load(['schedules', 'doctorAppointments.patient', 'createdPatientRecords']);

        $upcomingAppointments = $staff->doctorAppointments()
            ->upcoming()
            ->with(['patient', 'service'])
            ->limit(10)
            ->get();

        $thisWeekSchedules = $staff->schedules()
            ->thisWeek()
            ->orderBy('date')
            ->get();

        $stats = [
            'total_appointments' => $staff->doctorAppointments()->count(),
            'completed_treatments' => $staff->createdPatientRecords()->count(),
            'appointments_this_week' => $staff->doctorAppointments()->thisWeek()->count(),
            'patient_count' => $staff->doctorAppointments()->distinct('patient_id')->count(),
        ];

        return Inertia::render('Staff/Show', [
            'staff' => $staff,
            'upcomingAppointments' => $upcomingAppointments,
            'thisWeekSchedules' => $thisWeekSchedules,
            'stats' => $stats,
        ]);
    }

    public function edit(User $staff)
    {
        return Inertia::render('Staff/Edit', [
            'staff' => $staff,
        ]);
    }

    public function update(Request $request, User $staff)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $staff->id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'status' => 'required|in:active,inactive',
            'employee_id' => 'required|string|unique:users,employee_id,' . $staff->id,
            'position' => 'required|in:dentist,hygienist,receptionist,assistant',
            'license_number' => 'nullable|string|max:100',
            'license_expiry' => 'nullable|date',
            'hire_date' => 'required|date|before_or_equal:today',
            'hourly_rate' => 'nullable|numeric|min:0',
            'specializations' => 'nullable|array',
            'bio' => 'nullable|string',
            'years_experience' => 'nullable|integer|min:0',
        ]);

        $staff->update($validated);

        AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'staff', $staff->id, [
            'updated_fields' => array_keys($validated),
        ]);

        return redirect()->route('staff.show', $staff)->with('success', 'Staff member updated successfully.');
    }

    public function destroy(User $staff)
    {
        if ($staff->doctorAppointments()->exists()) {
            return back()->with('error', 'Cannot delete staff member with existing appointments.');
        }

        AuditLog::logDelete(Auth::id(), Auth::user()->role, 'staff', $staff->id, [
            'name' => $staff->name,
            'employee_id' => $staff->employee_id,
        ]);

        $staff->delete();

        return redirect()->route('staff.index')->with('success', 'Staff member deleted successfully.');
    }
}