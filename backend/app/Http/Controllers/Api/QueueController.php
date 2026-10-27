<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QueueEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class QueueController extends Controller
{
    private const DEPARTMENTS = [
        'General Medicine',
        'Nursing Assistance',
        'Basic First Aid',
        'Health Assessment',
    ];

        public function liveBoard(): JsonResponse
    {
        $today = now('Asia/Manila')->toDateString();

        $entries = QueueEntry::query()
            ->where('queue_date', $today)
            ->whereIn('status', ['waiting', 'serving'])
            ->orderBy('id')
            ->get(['id', 'queue_number', 'department', 'status']);

        $departments = [];

        foreach (self::DEPARTMENTS as $department) {
            $departmentEntries = $entries
                ->where('department', $department);

            $serving = $departmentEntries
                ->firstWhere('status', 'serving');

            $waiting = $departmentEntries
                ->where('status', 'waiting')
                ->values();

            $departments[] = [
                'department' => $department,
                'now_serving' => $serving?->queue_number,
                'waiting_numbers' => $waiting
                    ->pluck('queue_number')
                    ->all(),
            ];
        }

        return response()->json([
            'date' => $today,
            'average_service_minutes' => 10,
            'departments' => $departments,
        ]);
    }

    public function receptionIndex(): JsonResponse
    {
        $queues = QueueEntry::query()
            ->where('queue_date', now('Asia/Manila')->toDateString())
            ->orderByDesc('id')
            ->get([
                'id',
                'queue_number',
                'patient_name',
                'department',
                'queue_date',
                'status',
                'registration_type',
                'created_at',
            ]);

        return response()->json([
            'queues' => $queues,
        ]);
    }

    public function storeWalkIn(Request $request): JsonResponse
    {
        $request->merge([
            'patient_name' => trim(
                (string) $request->input('patient_name')
            ),
        ]);

        $validated = $request->validate([
            'patient_name' => ['required', 'string', 'max:255'],
            'department' => [
                'required',
                Rule::in(self::DEPARTMENTS),
            ],
        ]);

        $queue = DB::transaction(function () use ($request, $validated) {
            $entry = QueueEntry::create([
                'patient_name' => $validated['patient_name'],
                'department' => $validated['department'],
                'queue_date' => now('Asia/Manila')->toDateString(),
                'status' => 'waiting',
                'registration_type' => 'walk_in',
                'registered_by' => $request->user()->id,
            ]);

            $entry->update([
                'queue_number' => 'Q-'.str_pad(
                    (string) $entry->id,
                    6,
                    '0',
                    STR_PAD_LEFT
                ),
            ]);

            return $entry->fresh();
        });

        return response()->json([
            'message' => 'Walk-in patient registered successfully.',
            'queue' => $queue,
        ], 201);
    }
}