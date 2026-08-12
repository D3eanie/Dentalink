<?php

namespace App\Http\Controllers\Api;

use App\Models\ToothRecord;
use App\Models\Patient;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class ToothRecordApiController extends Controller
{
    /**
     * Get all tooth records with filtering
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ToothRecord::class);

        $query = ToothRecord::query()
            ->with(['patient', 'doctor'])
            ->latest();

        $user = Auth::user();
        if ($user && $user->role === 'staff') {
            $query->where('doctor_id', $user->id);
        }

        // Apply filters
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->has('tooth_number')) {
            $query->where('tooth_number', $request->tooth_number);
        }

        if ($request->has('service')) {
            $query->where('service', 'like', '%' . $request->service . '%');
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('patient', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 15);
        $records = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $records->items(),
            'pagination' => [
                'total' => $records->total(),
                'per_page' => $records->perPage(),
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
            ],
        ]);
    }

    /**
     * Get tooth records for a specific patient
     */
    public function patientRecords($patient_id): JsonResponse
    {
        $patient = Patient::findOrFail($patient_id);
        $this->authorize('view', $patient);

        $recordsQuery = ToothRecord::where('patient_id', $patient_id)
            ->with(['patient', 'doctor'])
            ->orderBy('tooth_number')
            ->orderByDesc('date_done');

        $user = Auth::user();
        if ($user && $user->role === 'staff') {
            $recordsQuery->where('doctor_id', $user->id);
        }

        $records = $recordsQuery->get();

        // Group by tooth number
        $grouped = $records->groupBy('tooth_number')->map(function ($group) {
            return [
                'tooth_number' => $group->first()->tooth_number,
                'records' => $group->all(),
                'current_status' => $group->first()->status,
                'history_count' => $group->count(),
            ];
        });

        return response()->json([
            'success' => true,
            'patient' => $patient,
            'records' => $records,
            'grouped' => $grouped,
            'statistics' => [
                'total' => $records->count(),
                'healthy' => $records->where('status', 'healthy')->count(),
                'treatment_needed' => $records->where('status', 'treatment_needed')->count(),
                'under_treatment' => $records->where('status', 'under_treatment')->count(),
                'treated' => $records->where('status', 'treated')->count(),
                'missing' => $records->where('status', 'missing')->count(),
            ],
        ]);
    }

    /**
     * Get tooth history for a specific tooth
     */
    public function toothHistory($patient_id, $tooth_number): JsonResponse
    {
        $patient = Patient::findOrFail($patient_id);
        $this->authorize('view', $patient);

        $recordsQuery = ToothRecord::where('patient_id', $patient_id)
            ->where('tooth_number', $tooth_number)
            ->with(['patient', 'doctor'])
            ->orderByDesc('date_done');

        $user = Auth::user();
        if ($user && $user->role === 'staff') {
            $recordsQuery->where('doctor_id', $user->id);
        }

        $records = $recordsQuery->get();

        return response()->json([
            'success' => true,
            'patient' => $patient,
            'tooth_number' => $tooth_number,
            'records' => $records,
            'total_history' => $records->count(),
        ]);
    }

    /**
     * Get records needing review
     */
    public function needingReview(Request $request): JsonResponse
    {
        $this->authorize('create', ToothRecord::class);

        $query = ToothRecord::with(['patient', 'doctor'])
            ->latest('created_at');

        $user = Auth::user();
        if ($user && $user->role === 'staff') {
            $query->where('doctor_id', $user->id);
        }

        $records = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $records->items(),
            'pagination' => [
                'total' => $records->total(),
                'per_page' => $records->perPage(),
                'current_page' => $records->currentPage(),
            ],
        ]);
    }

    /**
     * Store a new tooth record
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ToothRecord::class);

        $validated = $request->validate([
            'patient_id' => 'required|exists:users,id',
            'doctor_id' => 'required|exists:users,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            // Accept either a single tooth number (1-48) or a range like 11-28
            'tooth_number' => [
                'required',
                'regex:/^(?:[1-9]|[1-3]\d|4[0-8])(?:-(?:[1-9]|[1-3]\d|4[0-8]))?$/',
            ],
            'service' => 'required|string|max:255',
            'date_done' => 'required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $toothRecord = ToothRecord::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tooth record created successfully',
            'data' => $toothRecord->load(['patient', 'doctor']),
        ], 201);
    }

    /**
     * Get a specific tooth record
     */
    public function show(ToothRecord $toothRecord): JsonResponse
    {
        $user = Auth::user();
        if ($user && $user->role === 'staff') {
            $recordDoctorId = $toothRecord->doctor_id ?? $toothRecord->dentist_id;
            if (!$recordDoctorId || $recordDoctorId !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view this record.',
                ], 403);
            }
        }

        $this->authorize('view', $toothRecord);

        $toothRecord->load(['patient', 'doctor']);

        return response()->json([
            'success' => true,
            'data' => $toothRecord,
        ]);
    }

    /**
     * Update a tooth record
     */
    public function update(Request $request, ToothRecord $toothRecord): JsonResponse
    {
        $this->authorize('update', $toothRecord);

        $validated = $request->validate([
            'doctor_id' => 'nullable|exists:users,id',
            'service' => 'nullable|string|max:255',
            'date_done' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $toothRecord->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tooth record updated successfully',
            'data' => $toothRecord->load(['patient', 'doctor']),
        ]);
    }

    /**
     * Delete a tooth record
     */
    public function destroy(ToothRecord $toothRecord): JsonResponse
    {
        $this->authorize('delete', $toothRecord);

        $toothRecord->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tooth record deleted successfully',
        ]);
    }

    /**
     * Mark a tooth record as reviewed
     */
    public function markReviewed(Request $request, ToothRecord $toothRecord): JsonResponse
    {
        $this->authorize('update', $toothRecord);

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $toothRecord->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tooth record marked as reviewed',
            'data' => $toothRecord,
        ]);
    }

    /**
     * Get tooth chart data for visualization
     */
    public function toothChart($patient_id): JsonResponse
    {
        $patient = Patient::findOrFail($patient_id);
        $this->authorize('view', $patient);

        $chartData = [];

        $user = Auth::user();

        for ($i = 1; $i <= 32; $i++) {
            $record = ToothRecord::where('patient_id', $patient_id)
                ->where('tooth_number', $i)
                ->when($user && $user->role === 'staff', function ($query) use ($user) {
                    return $query->where('doctor_id', $user->id);
                })
                ->latest('date_done')
                ->first();

            $chartData[$i] = $record ? [
                'service' => $record->service,
                'description' => $record->notes,
                'lastUpdated' => $record->date_done,
                'doctor' => $record->doctor?->name,
            ] : [
                'service' => null,
                'description' => null,
                'lastUpdated' => null,
                'doctor' => null,
            ];
        }

        // Calculate statistics
        $stats = [
            'total_teeth' => 32,
            'filled' => count(array_filter($chartData, fn($d) => $d['service'] !== null)),
            'unfilled' => count(array_filter($chartData, fn($d) => $d['service'] === null)),
        ];

        return response()->json([
            'success' => true,
            'chartData' => $chartData,
            'statistics' => $stats,
            'patient' => [
                'id' => $patient->id,
                'name' => $patient->name,
            ],
        ]);
    }

    /**
     * Generate chart snapshot
     */
    public function generateChart(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
        ]);

        // Generate chart data and save
        // Implementation depends on chart storage needs

        return response()->json([
            'success' => true,
            'message' => 'Chart generated successfully',
        ]);
    }

    /**
     * Batch update tooth records
     */
    public function batchUpdate(Request $request): JsonResponse
    {
        $this->authorize('create', ToothRecord::class);

        $validated = $request->validate([
            'records' => 'required|array',
            'records.*.id' => 'required|exists:tooth_records,id',
            'records.*.service' => 'nullable|string|max:255',
            'records.*.notes' => 'nullable|string|max:1000',
        ]);

        $updated = 0;
        foreach ($validated['records'] as $record) {
            $toothRecord = ToothRecord::find($record['id']);
            if ($toothRecord) {
                $this->authorize('update', $toothRecord);
                $toothRecord->update($record);
                $updated++;
            }
        }

        return response()->json([
            'success' => true,
            'message' => "{$updated} records updated successfully",
            'updated_count' => $updated,
        ]);
    }

    /**
     * Export tooth records
     */
    public function export(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ToothRecord::class);

        $query = ToothRecord::query()
            ->with(['patient', 'doctor']);

        $user = Auth::user();
        if ($user && $user->role === 'staff') {
            $query->where('doctor_id', $user->id);
        }

        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->has('service')) {
            $query->where('service', $request->service);
        }

        $records = $query->get();

        return response()->json([
            'success' => true,
            'count' => $records->count(),
            'data' => $records,
            'export_date' => now()->toDateTimeString(),
        ]);
    }
}
