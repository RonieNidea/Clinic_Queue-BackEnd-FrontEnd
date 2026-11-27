<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\QueueEntry;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitReport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StaffVisitController extends Controller
{
    private const DEPARTMENTS = [
        'General Medicine',
        'Nursing Assistance',
        'Basic First Aid',
        'Health Assessment',
    ];

    private function restrictPatientPrivacy(Builder $query): void
    {
        $query->where(function (Builder $allowed) {
            $allowed->whereNull('user_id')
                ->orWhereIn(
                    'user_id',
                    User::query()
                        ->select('id')
                        ->where('record_visibility', 'department_staff')
                );
        });
    }

    private function recordsQuery(Request $request): Builder
    {
        $user = $request->user();

        if (
            $user->approval_status !== 'approved' ||
            ! in_array($user->role, ['admin', 'staff'], true)
        ) {
            abort(403, 'Department staff or administrator access required.');
        }

        $query = Visit::query();

        if ($user->role === 'staff') {
            if (! in_array($user->department, self::DEPARTMENTS, true)) {
                abort(403, 'A valid department assignment is required.');
            }

            $query->where('department', $user->department);
            $this->restrictPatientPrivacy($query);
        }

        return $query;
    }

    public function index(Request $request): JsonResponse
    {
        $query = $this->recordsQuery($request);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'visit_date' => ['nullable', 'date_format:Y-m-d'],
            'service' => ['nullable', 'string', 'max:255'],
            'status' => [
                'nullable',
                Rule::in(['draft', 'completed']),
            ],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        // Service choices come only from records this user can access.
        $services = (clone $query)
            ->select('service')
            ->distinct()
            ->orderBy('service')
            ->pluck('service');

        $search = trim($validated['search'] ?? '');

        if ($search !== '') {
            $query->where(function (Builder $match) use ($search) {
                $match->where('patient_name', 'like', '%'.$search.'%')
                    ->orWhere('student_number', 'like', '%'.$search.'%');
            });
        }

        if (! empty($validated['visit_date'])) {
            $query->whereDate('visit_date', $validated['visit_date']);
        }

        if (! empty($validated['service'])) {
            $query->where('service', $validated['service']);
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $visits = $query
            ->orderByDesc('visit_date')
            ->orderByDesc('id')
            ->paginate(15, [
                'id',
                'patient_name',
                'student_number',
                'department',
                'service',
                'visit_date',
                'status',
            ]);

        return response()->json([
            'visits' => $visits,
            'services' => $services,
        ]);

    }

    public function history(Request $request, Visit $visit): JsonResponse
    {
        $query = $this->recordsQuery($request);

        // Confirm this staff member can access the selected record.
        $selected = (clone $query)
            ->whereKey($visit->id)
            ->firstOrFail();

        if ($selected->user_id !== null) {
            $query->where('user_id', $selected->user_id);
        } else {
            // Do not combine unrelated walk-ins by matching names.
            $query->whereKey($selected->id);
        }

        $visits = $query
            ->orderByDesc('visit_date')
            ->orderByDesc('id')
            ->paginate(10, [
                'id',
                'patient_name',
                'student_number',
                'department',
                'service',
                'visit_date',
                'status',
                'reason',
                'summary',
                'care_given',
                'health_notes',
            ]);

        return response()->json([
            'patient' => [
                'name' => $selected->patient_name,
                'student_number' => $selected->student_number,
                'account_linked' => $selected->user_id !== null,
            ],
            'visits' => $visits,
        ]);
    }

    public function candidates(Request $request): JsonResponse
    {
        // Apply the existing role and department-assignment checks.
        $this->recordsQuery($request);

        $query = QueueEntry::query()
            ->where('queue_date', now('Asia/Manila')->toDateString())
            ->whereIn('status', ['waiting', 'serving', 'completed']);

        if ($request->user()->role === 'staff') {
            $query->where('department', $request->user()->department);
            $this->restrictPatientPrivacy($query);
        }

        $queues = $query
            ->whereDoesntHave('visit', function (Builder $visit) {
                $visit->where('status', 'completed');
            })
            ->with('visit')
            ->orderBy('id')
            ->get([
                'id',
                'user_id',
                'patient_name',
                'department',
                'queue_date',
                'queue_number',
                'status',
            ]);

        return response()->json([
            'queues' => $queues,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->recordsQuery($request);

        $validated = $request->validate([
            'queue_entry_id' => ['required', 'integer'],
            'student_number' => ['nullable', 'string', 'max:100'],
            'service' => ['required', 'string', 'max:255'],
            'reason' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', Rule::in(['draft', 'completed'])],
            'summary' => [
                'required_if:status,completed',
                'nullable',
                'string',
                'max:10000',
            ],
            'care_given' => [
                'required_if:status,completed',
                'nullable',
                'string',
                'max:10000',
            ],
            'health_notes' => ['nullable', 'string', 'max:10000'],
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $query = QueueEntry::query()
                ->whereKey($validated['queue_entry_id'])
                ->where('queue_date', now('Asia/Manila')->toDateString());

            if ($request->user()->role === 'staff') {
                $query->where('department', $request->user()->department);
            }

            $queue = $query->lockForUpdate()->firstOrFail();

            if (
                $validated['status'] === 'completed' &&
                (
                    $queue->status !== 'serving' ||
                    $queue->arrived_at === null
                )
            ) {
                return response()->json([
                    'message' => 'Call the patient and confirm arrival before completing this visit.',
                ], 422);
            }

            if (! in_array(
                $queue->status,
                ['waiting', 'serving', 'completed'],
                true
            )) {
                return response()->json([
                    'message' => 'Cancelled or no-show queue entries cannot be recorded as visits.',
                ], 422);
            }

            $visit = Visit::query()
                ->where('queue_entry_id', $queue->id)
                ->lockForUpdate()
                ->first();

            if ($visit && $visit->status === 'completed') {
                return response()->json([
                    'message' => 'This visit is already completed and cannot be overwritten.',
                ], 409);
            }

            $visit ??= new Visit;

            $completed = $validated['status'] === 'completed';

            // Patient identity comes from the queue, not the form.
            $visit->user_id = $queue->user_id;
            $visit->queue_entry_id = $queue->id;
            $visit->patient_name = $queue->patient_name;
            $visit->department = $queue->department;
            $visit->visit_date = $queue->queue_date;
            $visit->recorded_by = $request->user()->id;

            $visit->student_number = $validated['student_number'] ?? null;
            $visit->service = $validated['service'];
            $visit->reason = $validated['reason'] ?? null;
            $visit->summary = $validated['summary'] ?? null;
            $visit->care_given = $validated['care_given'] ?? null;
            $visit->health_notes = $validated['health_notes'] ?? null;
            $visit->status = $validated['status'];
            $visit->completed_at = $completed ? now() : null;
            $visit->save();

            if ($completed) {
                $queue->update([
                    'status' => 'completed',
                    'completed_at' => $queue->completed_at ?? now(),
                    'active_patient_key' => null,
                    'serving_key' => null,
                ]);

                if ($queue->appointment_id !== null) {
                    Appointment::query()
                        ->whereKey($queue->appointment_id)
                        ->update([
                            'status' => 'completed',
                            'active_slot' => null,
                        ]);
                }
            }

            return response()->json([
                'message' => $completed
                    ? 'Visit completed. The summary is now available to the linked patient account.'
                    : 'Draft saved. It is not visible to the patient yet.',
                'visit' => $visit->fresh(),
            ]);
        }, 3);
    }

    public function slip(Request $request, Visit $visit): JsonResponse
    {
        $record = $this->recordsQuery($request)
            ->whereKey($visit->id)
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->where('completed_at', '<=', now())
            ->firstOrFail();

        return response()->json([
            'visit' => $record->only([
                'id',
                'patient_name',
                'student_number',
                'department',
                'service',
                'visit_date',
                'summary',
                'care_given',
            ]),
        ]);

    }

    public function report(Request $request, Visit $visit): JsonResponse
    {
        $record = $this->recordsQuery($request)
            ->whereKey($visit->id)
            ->firstOrFail();

        $validated = $request->validate([
            'field' => [
                'required',
                Rule::in([
                    'patient_name',
                    'student_number',
                    'department',
                    'service',
                    'visit_date',
                    'reason',
                    'summary',
                    'care_given',
                    'health_notes',
                    'other',
                ]),
            ],
            'details' => ['required', 'string', 'max:2000'],
            'suggested_correction' => [
                'nullable',
                'string',
                'max:2000',
            ],
        ]);

        $report = VisitReport::create([
            'visit_id' => $record->id,
            'reported_by' => $request->user()->id,
            'field' => $validated['field'],
            'details' => $validated['details'],
            'suggested_correction' => $validated['suggested_correction'] ?? null,
            'status' => 'open',
        ]);

        return response()->json([
            'message' => 'The incorrect details have been reported for review.',
            'report' => [
                'id' => $report->id,
                'visit_id' => $report->visit_id,
                'status' => $report->status,
            ],
        ], 201);
    }

    public function dailySheet(Request $request): JsonResponse
    {
        $query = $this->recordsQuery($request);

        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'department' => [
                'sometimes',
                'required',
                'string',
                Rule::in(['all', ...self::DEPARTMENTS]),
            ],
        ]);

        $user = $request->user();
        $isAdmin = $user->role === 'admin';
        $department = $isAdmin
            ? ($validated['department'] ?? 'all')
            : $user->department;

        if (! $isAdmin && isset($validated['department']) && $validated['department'] !== $department) {
            abort(403, 'You can view only your own department\'s daily visit sheet.');
        }

        if ($isAdmin && $department !== 'all') {
            $query->where('department', $department);
        }

        $visits = $query
            ->whereDate('visit_date', $validated['date'])
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->where('completed_at', '<=', now())
            ->orderBy('department')
            ->orderBy('patient_name')
            ->orderBy('id')
            ->get([
                'id',
                'patient_name',
                'student_number',
                'department',
                'service',
                'visit_date',
            ]);

        return response()->json([
            'date' => $validated['date'],
            'department' => $department === 'all'
                ? 'All departments'
                : $department,
            'department_filter' => $department,
            'available_departments' => $isAdmin ? self::DEPARTMENTS : [$department],
            'prepared_by' => $user->name,
            'total' => $visits->count(),
            'visits' => $visits,
        ]);
    }
}
