<?php

namespace App\Http\Controllers;

use App\Models\ToothRecord;
use App\Models\ToothChart;
use App\Models\PatientRecord;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ToothRecordController extends Controller
{
    /**
     * Display list of tooth records
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ToothRecord::class);

        $user = Auth::user();

        $search = $request->input('search');
        $patientId = $request->input('patient_id');
        $toothNumber = $request->input('tooth_number');
        $treatmentType = $request->input('treatment_type');
        $status = $request->input('status');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $records = ToothRecord::query()
            ->with(['patient', 'dentist', 'patientRecord'])
            ->when($user && $user->role === 'staff', function ($query) use ($user) {
                return $query->where('doctor_id', $user->id);
            })
            ->when($search, function ($query, $search) {
                return $query->whereHas('patient', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%");
                });
            })
            ->when($patientId, function ($query, $patientId) {
                return $query->where('patient_id', $patientId);
            })
            ->when($toothNumber, function ($query, $toothNumber) {
                return $query->where('tooth_number', $toothNumber);
            })
            ->when($treatmentType, function ($query, $treatmentType) {
                return $query->where('treatment_type', $treatmentType);
            })
            ->when($status, function ($query, $status) {
                return $query->where('tooth_status', $status);
            })
            ->when($dateFrom, function ($query, $dateFrom) {
                return $query->whereDate('treatment_date', '>=', $dateFrom);
            })
            ->when($dateTo, function ($query, $dateTo) {
                return $query->whereDate('treatment_date', '<=', $dateTo);
            })
            ->orderBy('treatment_date', 'desc')
            ->paginate(20);

        $treatmentTypes = [
            'Cleaning',
            'Filling',
            'Root Canal',
            'Crown',
            'Bridge',
            'Extraction',
            'Implant',
            'Whitening',
            'Scaling',
            'Bonding',
            'Veneer',
            'Examination',
        ];

        $statuses = ['healthy', 'treatment_needed', 'treated', 'extracted', 'missing', 'implant'];

        return Inertia::render('ToothRecords/Index', [
            'records' => $records,
            'treatmentTypes' => $treatmentTypes,
            'statuses' => $statuses,
            'filters' => $request->only(['search', 'patient_id', 'tooth_number', 'treatment_type', 'status', 'date_from', 'date_to']),
        ]);
    }

    /**
     * Show patient's tooth history
     */
    public function patientHistory($patientId, Request $request)
    {
        $this->authorize('view', [ToothRecord::class, $patientId]);

        $user = Auth::user();

        $patient = User::findOrFail($patientId);

        $toothNumber = $request->input('tooth_number');
        $treatmentType = $request->input('treatment_type');

        $records = ToothRecord::byPatient($patientId)
            ->with(['dentist', 'patientRecord'])
            ->when($user && $user->role === 'staff', function ($query) use ($user) {
                return $query->where('doctor_id', $user->id);
            })
            ->when($toothNumber, function ($query) use ($toothNumber) {
                return $query->where('tooth_number', $toothNumber);
            })
            ->when($treatmentType, function ($query) use ($treatmentType) {
                return $query->where('treatment_type', $treatmentType);
            })
            ->orderBy('treatment_date', 'desc')
            ->paginate(15);

        $charts = ToothChart::byPatient($patientId)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $toothPositions = ToothRecord::getToothPositions();

        return Inertia::render('ToothRecords/PatientHistory', [
            'patient' => $patient,
            'records' => $records,
            'charts' => $charts,
            'toothPositions' => $toothPositions,
            'filters' => $request->only(['tooth_number', 'treatment_type']),
        ]);
    }

    /**
     * Show tooth chart visualization
     */
    public function toothChart($patientId, Request $request)
    {
        $this->authorize('view', [ToothRecord::class, $patientId]);

        $user = Auth::user();

        $patient = User::findOrFail($patientId);

        // Get current tooth statuses
        $toothRecords = ToothRecord::byPatient($patientId)
            ->select('tooth_number', 'tooth_status', 'treatment_type', 'treatment_date')
            ->with('dentist')
            ->when($user && $user->role === 'staff', function ($query) use ($user) {
                return $query->where('doctor_id', $user->id);
            })
            ->get()
            ->keyBy('tooth_number');

        $toothChart = [];
        $toothPositions = ToothRecord::getToothPositions();

        foreach ($toothPositions as $number => $position) {
            $record = $toothRecords->get($number);
            $toothChart[$number] = [
                'status' => $record?->tooth_status ?? 'healthy',
                'treatment' => $record?->treatment_type,
                'date' => $record?->treatment_date,
                'dentist' => $record?->dentist?->name,
                'position' => $position,
            ];
        }

        // Get saved charts for comparison
        $savedCharts = ToothChart::byPatient($patientId)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return Inertia::render('ToothRecords/ToothChart', [
            'patient' => $patient,
            'toothChart' => $toothChart,
            'savedCharts' => $savedCharts,
            'toothPositions' => $toothPositions,
        ]);
    }

    /**
     * Create new tooth record
     */
    public function create(Request $request)
    {
        $this->authorize('create', ToothRecord::class);

        $patientRecordId = $request->input('patient_record_id');
        $patientId = $request->input('patient_id');

        $patientRecord = null;
        if ($patientRecordId) {
            $patientRecord = PatientRecord::with('patient')->find($patientRecordId);
            $patientId = $patientRecord?->patient_id;
        }

        $patient = $patientId ? User::findOrFail($patientId) : null;
        $toothPositions = ToothRecord::getToothPositions();

        $treatmentTypes = [
            'Cleaning',
            'Filling',
            'Root Canal',
            'Crown',
            'Bridge',
            'Extraction',
            'Implant',
            'Whitening',
            'Scaling',
            'Bonding',
            'Veneer',
            'Examination',
        ];

        $statuses = ['healthy', 'treatment_needed', 'treated', 'extracted', 'missing', 'implant'];
        $conditions = ['intact', 'decay', 'crack', 'wear', 'trauma'];
        $surfaces = ['Occlusal', 'Mesial', 'Distal', 'Buccal', 'Lingual', 'Incisal'];

        return Inertia::render('ToothRecords/Create', [
            'patientRecord' => $patientRecord,
            'patient' => $patient,
            'toothPositions' => $toothPositions,
            'treatmentTypes' => $treatmentTypes,
            'statuses' => $statuses,
            'conditions' => $conditions,
            'surfaces' => $surfaces,
        ]);
    }

    /**
     * Store new tooth record
     */
    public function store(Request $request)
    {
        $this->authorize('create', ToothRecord::class);

        $validated = $request->validate([
            'patient_record_id' => 'nullable|exists:patient_records,id',
            'patient_id' => 'required|exists:users,id',
            'tooth_number' => 'required|integer|between:1,48',
            'treatment_type' => 'required|string|max:50',
            'surface' => 'nullable|string|max:50',
            'treatment_description' => 'nullable|string',
            'material_type' => 'nullable|string|max:50',
            'materials_used' => 'nullable|array',
            'tooth_status' => 'required|in:healthy,treatment_needed,treated,extracted,missing,implant',
            'tooth_condition' => 'nullable|in:intact,decay,crack,wear,trauma',
            'clinical_notes' => 'nullable|string',
            'image_path' => 'nullable|string',
            'treatment_date' => 'required|date',
            'next_review_date' => 'nullable|date|after:treatment_date',
        ]);

        $validated['doctor_id'] = Auth::id();

        $toothRecord = ToothRecord::create($validated);

        return redirect()
            ->route('tooth-records.patient-history', $toothRecord->patient_id)
            ->with('success', "Tooth #{$toothRecord->tooth_number} record created successfully");
    }

    /**
     * Show tooth record details
     */
    public function show($id)
    {
        $record = ToothRecord::with(['patient', 'dentist', 'patientRecord'])->findOrFail($id);

        $user = Auth::user();
        if ($user && $user->role === 'staff') {
            $recordDoctorId = $record->doctor_id ?? $record->dentist_id;
            if (!$recordDoctorId || $recordDoctorId !== $user->id) {
                abort(403);
            }
        }

        $this->authorize('view', $record);

        $history = $record->getHistory();
        $toothPositions = ToothRecord::getToothPositions();

        return Inertia::render('ToothRecords/Show', [
            'record' => $record,
            'history' => $history,
            'toothPositions' => $toothPositions,
        ]);
    }

    /**
     * Get tooth records by appointment
     */
    public function getByAppointment(Request $request, $appointmentId)
    {
        try {
            $recordsQuery = ToothRecord::where('appointment_id', $appointmentId)
                ->with(['patient', 'dentist', 'service', 'appointment'])
                ->orderBy('created_at', 'asc');

            $user = Auth::user();
            if ($user && $user->role === 'staff') {
                $recordsQuery->where('doctor_id', $user->id);
            }

            $records = $recordsQuery->get();

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => true,
                    'data' => $records
                ], 200);
            }

            return $records;
        } catch (\Exception $e) {
            \Log::error('Error fetching tooth records by appointment: ' . $e->getMessage());

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch tooth records',
                    'error' => $e->getMessage()
                ], 500);
            }

            return [];
        }
    }

    /**
     * Edit tooth record
     */
    public function edit($id)
    {
        $record = ToothRecord::findOrFail($id);

        $this->authorize('update', $record);

        $toothPositions = ToothRecord::getToothPositions();

        $treatmentTypes = [
            'Cleaning',
            'Filling',
            'Root Canal',
            'Crown',
            'Bridge',
            'Extraction',
            'Implant',
            'Whitening',
            'Scaling',
            'Bonding',
            'Veneer',
            'Examination',
        ];

        $statuses = ['healthy', 'treatment_needed', 'treated', 'extracted', 'missing', 'implant'];
        $conditions = ['intact', 'decay', 'crack', 'wear', 'trauma'];
        $surfaces = ['Occlusal', 'Mesial', 'Distal', 'Buccal', 'Lingual', 'Incisal'];

        return Inertia::render('ToothRecords/Edit', [
            'record' => $record,
            'toothPositions' => $toothPositions,
            'treatmentTypes' => $treatmentTypes,
            'statuses' => $statuses,
            'conditions' => $conditions,
            'surfaces' => $surfaces,
        ]);
    }

    /**
     * Update tooth record
     */
    public function update(Request $request, $id)
    {
        $record = ToothRecord::findOrFail($id);

        $this->authorize('update', $record);

        $validated = $request->validate([
            'treatment_type' => 'required|string|max:50',
            'surface' => 'nullable|string|max:50',
            'treatment_description' => 'nullable|string',
            'material_type' => 'nullable|string|max:50',
            'materials_used' => 'nullable|array',
            'tooth_status' => 'required|in:healthy,treatment_needed,treated,extracted,missing,implant',
            'tooth_condition' => 'nullable|in:intact,decay,crack,wear,trauma',
            'clinical_notes' => 'nullable|string',
            'next_review_date' => 'nullable|date',
        ]);

        $record->update($validated);

        return redirect()
            ->route('tooth-records.show', $id)
            ->with('success', 'Tooth record updated successfully');
    }

    /**
     * Delete tooth record
     */
    public function destroy($id)
    {
        $record = ToothRecord::findOrFail($id);

        $this->authorize('delete', $record);

        $patientId = $record->patient_id;
        $toothNumber = $record->tooth_number;

        $record->delete();

        return redirect()
            ->route('tooth-records.patient-history', $patientId)
            ->with('success', "Tooth #{$toothNumber} record deleted successfully");
    }

    /**
     * Generate tooth chart snapshot
     */
    public function generateChart(Request $request)
    {
        $this->authorize('create', ToothChart::class);

        $validated = $request->validate([
            'patient_id' => 'required|exists:users,id',
            'chart_type' => 'required|in:examination,treatment_plan,post_treatment',
            'notes' => 'nullable|string',
        ]);

        $chart = ToothChart::generateFromToothRecords(
            $validated['patient_id'],
            $validated['chart_type'],
            $validated['notes'],
            Auth::id()
        );

        return redirect()
            ->route('tooth-records.patient-history', $validated['patient_id'])
            ->with('success', 'Tooth chart generated successfully');
    }

    /**
     * Get teeth needing review
     */
    public function needingReview(Request $request)
    {
        $this->authorize('viewAny', ToothRecord::class);

        $records = ToothRecord::needingReview()
            ->with(['patient', 'dentist'])
            ->orderBy('next_review_date')
            ->paginate(20);

        return Inertia::render('ToothRecords/NeedingReview', [
            'records' => $records,
        ]);
    }

    /**
     * Mark tooth as reviewed
     */
    public function markReviewed($id, Request $request)
    {
        $record = ToothRecord::findOrFail($id);

        $this->authorize('update', $record);

        $validated = $request->validate([
            'review_days' => 'nullable|integer|min:30|max:730',
        ]);

        $reviewDays = $validated['review_days'] ?? 180;
        $record->markReviewed($reviewDays);

        return response()->json([
            'success' => true,
            'message' => "Tooth #{$record->tooth_number} marked as reviewed",
            'next_review_date' => $record->next_review_date,
        ]);
    }

    /**
     * Get tooth history for a specific tooth
     */
    public function toothHistory($patientId, $toothNumber)
    {
        $this->authorize('view', [ToothRecord::class, $patientId]);

        $patient = User::findOrFail($patientId);

        $records = ToothRecord::byPatient($patientId)
            ->byTooth($toothNumber)
            ->with(['dentist', 'patientRecord'])
            ->orderBy('treatment_date', 'desc')
            ->get();

        $toothPositions = ToothRecord::getToothPositions();
        $toothInfo = $toothPositions[$toothNumber] ?? null;

        return Inertia::render('ToothRecords/ToothHistory', [
            'patient' => $patient,
            'toothNumber' => $toothNumber,
            'toothInfo' => $toothInfo,
            'records' => $records,
        ]);
    }
}
