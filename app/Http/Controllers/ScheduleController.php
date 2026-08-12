<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Carbon\Carbon;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $staff = $request->input('staff');
        $week = $request->input('week', now()->format('Y-m-d'));

        $startOfWeek = Carbon::parse($week)->startOfWeek();
        $endOfWeek = Carbon::parse($week)->endOfWeek();

        // If staff member is accessing, only show their own schedules
        // Admins can see all schedules or filter by staff
        $schedules = Schedule::with(['staff', 'appointments'])
            ->when(Auth::user()->isStaff(), function ($query) {
                // Staff can only see their own schedules
                return $query->where('staff_id', Auth::id());
            })
            ->when($staff && Auth::user()->isAdmin(), function ($query, $staff) {
                // Admins can filter by staff
                return $query->where('staff_id', $staff);
            })
            ->byDateRange($startOfWeek, $endOfWeek)
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();

        $staffMembers = User::staff()->active()->get();

        // ✅ FIX: Check for API/JSON requests FIRST before Inertia
        // This ensures API calls get JSON responses, not HTML
        if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => true,
                'data' => $schedules,
                'staff_members' => $staffMembers,
                'current_week' => $startOfWeek->format('Y-m-d'),
            ]);
        }

        // For web requests, return Inertia
        return Inertia::render('Schedules/Index', [
            'schedules' => $schedules,
            'staffMembers' => $staffMembers,
            'currentWeek' => $startOfWeek->format('Y-m-d'),
            'filters' => $request->only(['staff', 'week']),
        ]);
    }

    public function create()
    {
        $staffMembers = User::staff()->active()->get();

        return Inertia::render('Schedules/Create', [
            'staffMembers' => $staffMembers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'staff_id' => 'nullable|exists:users,id',
            'date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'is_available' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        // Auto-fill staff_id for staff members (they can only create their own schedules)
        if (Auth::user()->isStaff() || Auth::user()->isAdmin()) {
            // If staff_id is provided and user is admin, allow it. Otherwise, use authenticated user's ID
            if (!isset($validated['staff_id']) || (Auth::user()->isStaff() && $validated['staff_id'] != Auth::id())) {
                $validated['staff_id'] = Auth::id();
            }
        } else {
            // For non-staff users, staff_id is required
            if (!isset($validated['staff_id'])) {
                if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Staff ID is required.',
                        'errors' => ['staff_id' => ['Staff ID is required.']]
                    ], 422);
                }
                return back()->withErrors(['staff_id' => 'Staff ID is required.']);
            }
        }

        // Check for existing schedule on the same date
        $existingSchedule = Schedule::where('staff_id', $validated['staff_id'])
            ->where('date', $validated['date'])
            ->first();

        if ($existingSchedule) {
            if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Schedule already exists for this staff member on this date.',
                    'errors' => [
                        'date' => ['Schedule already exists for this staff member on this date.']
                    ]
                ], 422);
            }
            return back()->withErrors(['date' => 'Schedule already exists for this staff member on this date.']);
        }

        // Create datetime objects for proper storage
        $date = $validated['date'];
        $startDateTime = Carbon::parse($date . ' ' . $validated['start_time']);
        $endDateTime = Carbon::parse($date . ' ' . $validated['end_time']);

        $schedule = Schedule::create([
            'staff_id' => $validated['staff_id'],
            'date' => $validated['date'],
            'start_time' => $startDateTime,
            'end_time' => $endDateTime,
            'is_available' => $validated['is_available'] ?? true,
            'notes' => $validated['notes'] ?? null,
        ]);

        try {
            AuditLog::logCreate(Auth::id(), Auth::user()->role, 'schedules', $schedule->id, [
                'staff_name' => $schedule->staff->name,
                'date' => $schedule->formatted_date,
                'time_range' => $schedule->time_range,
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to create audit log: ' . $e->getMessage());
        }

        if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => true,
                'message' => 'Schedule created successfully.',
                'data' => $schedule->fresh()->load('staff')
            ], 201);
        }

        return redirect()->route('schedules.index')->with('success', 'Schedule created successfully.');
    }

    public function edit(Schedule $schedule)
    {
        if (!$schedule->canBeModified()) {
            if (request()->expectsJson() || request()->wantsJson() || request()->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'This schedule cannot be modified.'
                ], 403);
            }
            return back()->with('error', 'This schedule cannot be modified.');
        }

        $schedule->load('staff');
        $staffMembers = User::staff()->active()->get();

        if (request()->expectsJson() || request()->wantsJson() || request()->is('api/*')) {
            return response()->json([
                'schedule' => $schedule,
                'staff_members' => $staffMembers
            ]);
        }

        return Inertia::render('Schedules/Edit', [
            'schedule' => $schedule,
            'staffMembers' => $staffMembers,
        ]);
    }

    public function update(Request $request, Schedule $schedule)
    {
        // Check if user can modify this schedule
        // Staff can only modify their own schedules
        if (Auth::user()->isStaff() && $schedule->staff_id != Auth::id()) {
            if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only modify your own schedules.'
                ], 403);
            }
            return back()->with('error', 'You can only modify your own schedules.');
        }

        if (!$schedule->canBeModified()) {
            if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'This schedule cannot be modified.'
                ], 403);
            }
            return back()->with('error', 'This schedule cannot be modified.');
        }

        $validated = $request->validate([
            'staff_id' => 'nullable|exists:users,id',
            'date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'is_available' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        // Auto-fill staff_id for staff members
        if (Auth::user()->isStaff()) {
            $validated['staff_id'] = Auth::id();
        } elseif (!isset($validated['staff_id'])) {
            $validated['staff_id'] = $schedule->staff_id; // Keep existing if not provided
        }

        // Create datetime objects for proper storage
        $date = $validated['date'];
        $startDateTime = Carbon::parse($date . ' ' . $validated['start_time']);
        $endDateTime = Carbon::parse($date . ' ' . $validated['end_time']);

        $schedule->update([
            'staff_id' => $validated['staff_id'],
            'date' => $validated['date'],
            'start_time' => $startDateTime,
            'end_time' => $endDateTime,
            'is_available' => $validated['is_available'] ?? true,
            'notes' => $validated['notes'] ?? null,
        ]);

        try {
            AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'schedules', $schedule->id, [
                'updated_fields' => array_keys($validated),
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to create audit log: ' . $e->getMessage());
        }

        if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => true,
                'message' => 'Schedule updated successfully.',
                'data' => $schedule->fresh()->load('staff')
            ]);
        }

        return redirect()->route('schedules.index')->with('success', 'Schedule updated successfully.');
    }

    public function destroy(Request $request, Schedule $schedule)
    {
        if (!$schedule->canBeModified()) {
            if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'This schedule cannot be deleted.'
                ], 403);
            }
            return back()->with('error', 'This schedule cannot be deleted.');
        }

        // Check if there are appointments on this schedule
        if ($schedule->getBookedAppointmentsCount() > 0) {
            if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete schedule with existing appointments.'
                ], 422);
            }
            return back()->with('error', 'Cannot delete schedule with existing appointments.');
        }

        try {
            AuditLog::logDelete(Auth::id(), Auth::user()->role, 'schedules', $schedule->id, [
                'staff_name' => $schedule->staff->name,
                'date' => $schedule->formatted_date,
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to create audit log: ' . $e->getMessage());
        }

        $schedule->delete();

        if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => true,
                'message' => 'Schedule deleted successfully.'
            ]);
        }

        return redirect()->route('schedules.index')->with('success', 'Schedule deleted successfully.');
    }

    public function makeUnavailable(Request $request, Schedule $schedule)
    {
        $reason = $request->input('reason');
        $schedule->makeUnavailable($reason);

        try {
            AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'schedules', $schedule->id, [
                'action' => 'made_unavailable',
                'reason' => $reason,
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to create audit log: ' . $e->getMessage());
        }

        if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => true,
                'message' => 'Schedule marked as unavailable.',
                'data' => $schedule->fresh()->load('staff')
            ]);
        }

        return back()->with('success', 'Schedule marked as unavailable.');
    }

    public function makeAvailable(Request $request, Schedule $schedule)
    {
        $schedule->makeAvailable();

        try {
            AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'schedules', $schedule->id, [
                'action' => 'made_available',
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to create audit log: ' . $e->getMessage());
        }

        if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => true,
                'message' => 'Schedule marked as available.',
                'data' => $schedule->fresh()->load('staff')
            ]);
        }

        return back()->with('success', 'Schedule marked as available.');
    }

    /**
     * Get schedules for the authenticated staff member
     */
    public function getMySchedule(Request $request)
    {
        $week = $request->input('week', now()->format('Y-m-d'));

        $startOfWeek = Carbon::parse($week)->startOfWeek();
        $endOfWeek = Carbon::parse($week)->endOfWeek();

        $schedules = Schedule::with(['appointments'])
            ->where('staff_id', Auth::id())
            ->byDateRange($startOfWeek, $endOfWeek)
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();

        if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => true,
                'data' => $schedules,
                'current_week' => $startOfWeek->format('Y-m-d'),
            ]);
        }

        return Inertia::render('Staff/Schedule/Index', [
            'schedules' => $schedules,
            'currentWeek' => $startOfWeek->format('Y-m-d'),
        ]);
    }
}
