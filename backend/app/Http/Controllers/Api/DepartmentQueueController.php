<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\QueueEntry;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DepartmentQueueController extends Controller
{
    private const DEPARTMENTS = [
        'General Medicine',
        'Nursing Assistance',
        'Basic First Aid',
        'Health Assessment',
    ];

    private function departmentFor(Request $request): string
    {
        $user = $request->user();

        if (
            $user->approval_status !== 'approved' ||
            ! in_array($user->role, ['admin', 'staff'], true)
        ) {
            abort(403, 'Department staff or administrator access required.');
        }

        if ($user->role === 'staff') {
            if (! in_array($user->department, self::DEPARTMENTS, true)) {
                abort(403, 'A valid department assignment is required.');
            }

            return $user->department;
        }

        $validated = $request->validate([
            'department' => ['required', Rule::in(self::DEPARTMENTS)],
        ]);

        return $validated['department'];
    }

    private function lockedQueue(
        int $id,
        string $department
    ): QueueEntry {
        return QueueEntry::query()
            ->whereKey($id)
            ->where('department', $department)
            ->where('queue_date', now('Asia/Manila')->toDateString())
            ->lockForUpdate()
            ->firstOrFail();
    }

    public function index(Request $request): JsonResponse
    {
        $department = $this->departmentFor($request);

        $queues = QueueEntry::query()
            ->where('department', $department)
            ->where('queue_date', now('Asia/Manila')->toDateString())
            ->orderBy('id')
            ->get([
                'id',
                'queue_number',
                'patient_name',
                'department',
                'status',
                'registration_type',
                'called_at',
                'arrived_at',
                'started_at',
                'completed_at',
                'no_show_at',
            ]);

        $current = $queues->firstWhere('status', 'serving');

        return response()->json([
            'department' => $department,
            'queues' => $queues,
            'now_serving' => $current,
            'arrival_deadline' => $current?->called_at
                ? $current->called_at->copy()->addMinutes(5)->toIso8601String()
                : null,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    public function callNext(Request $request): JsonResponse
    {
        $department = $this->departmentFor($request);
        $today = now('Asia/Manila')->toDateString();

        try {
            return DB::transaction(function () use (
                $request,
                $department,
                $today
            ) {
                $current = QueueEntry::query()
                    ->where('department', $department)
                    ->where('queue_date', $today)
                    ->where('status', 'serving')
                    ->lockForUpdate()
                    ->first();

                if ($current) {
                    return response()->json([
                        'message' => 'Complete the current visit or mark the absent patient as a no-show first.',
                    ], 409);
                }

                $next = QueueEntry::query()
                    ->where('department', $department)
                    ->where('queue_date', $today)
                    ->where('status', 'waiting')
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->first();

                if (! $next) {
                    return response()->json([
                        'message' => 'No patients are waiting.',
                    ], 422);
                }

                $next->update([
                    'status' => 'serving',
                    'called_at' => now(),
                    'arrived_at' => null,
                    'started_at' => null,
                    'handled_by' => $request->user()->id,
                    'serving_key' => $today.'|'.$department,
                ]);

                return response()->json([
                    'message' => 'Patient called. The five-minute arrival window has started.',
                    'queue' => $next->fresh(),
                ]);
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return response()->json([
                'message' => 'Another staff member has already called a patient. Refresh the queue.',
            ], 409);
        }
    }

    public function arrive(
        Request $request,
        QueueEntry $queue
    ): JsonResponse {
        $department = $this->departmentFor($request);

        return DB::transaction(function () use (
            $queue,
            $department,
            $request
        ) {
            $entry = $this->lockedQueue($queue->id, $department);

            if ($entry->status !== 'serving' || ! $entry->called_at) {
                return response()->json([
                    'message' => 'Only a called patient can be confirmed as arrived.',
                ], 422);
            }

            if ($entry->arrived_at) {
                return response()->json([
                    'message' => 'Arrival has already been confirmed.',
                    'queue' => $entry,
                ]);
            }

            $entry->update([
                'arrived_at' => now(),
                'started_at' => now(),
                'handled_by' => $request->user()->id,
            ]);

            return response()->json([
                'message' => 'Arrival confirmed. Record and complete the visit after care is provided.',
                'queue' => $entry->fresh(),
            ]);
        }, 3);
    }

    public function noShow(
        Request $request,
        QueueEntry $queue
    ): JsonResponse {
        $department = $this->departmentFor($request);

        return DB::transaction(function () use (
            $queue,
            $department,
            $request
        ) {
            $entry = $this->lockedQueue($queue->id, $department);

            if (
                $entry->status !== 'serving' ||
                ! $entry->called_at ||
                $entry->arrived_at
            ) {
                return response()->json([
                    'message' => 'Only a called patient without confirmed arrival can be marked as a no-show.',
                ], 422);
            }

            $deadline = $entry->called_at->copy()->addMinutes(5);

            if (now()->lessThan($deadline)) {
                return response()->json([
                    'message' => 'The five-minute arrival window has not ended.',
                ], 422);
            }

            $entry->update([
                'status' => 'no_show',
                'no_show_at' => now(),
                'handled_by' => $request->user()->id,
                'active_patient_key' => null,
                'serving_key' => null,
            ]);

            if ($entry->appointment_id !== null) {
                Appointment::query()
                    ->whereKey($entry->appointment_id)
                    ->where('status', 'booked')
                    ->update([
                        'status' => 'no_show',
                        'active_slot' => null,
                    ]);
            }

            return response()->json([
                'message' => 'Patient marked as a no-show. You can call the next patient.',
                'queue' => $entry->fresh(),
            ]);
        }, 3);
    }
}