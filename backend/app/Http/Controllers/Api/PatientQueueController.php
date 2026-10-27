<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QueueEntry;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PatientQueueController extends Controller
{
    private function ensurePatient(Request $request): void
    {
        if (
            $request->user()->role !== 'patient' ||
            $request->user()->approval_status !== 'approved'
        ) {
            abort(403, 'Approved patient account required.');
        }
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensurePatient($request);

        $queues = QueueEntry::query()
            ->where('user_id', $request->user()->id)
            ->where('queue_date', now('Asia/Manila')->toDateString())
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'queues' => $queues,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensurePatient($request);

        $validated = $request->validate([
            'department' => [
                'required',
                Rule::in([
                    'General Medicine',
                    'Nursing Assistance',
                    'Basic First Aid',
                    'Health Assessment',
                ]),
            ],
        ]);

        $now = now('Asia/Manila');
        $closingHour = $now->isSaturday() ? 12 : 17;

        if (
            $now->isSunday() ||
            $now->hour < 8 ||
            $now->hour >= $closingHour
        ) {
            return response()->json([
                'message' => 'Remote joining is available only during clinic operating hours.',
            ], 422);
        }

        $user = $request->user();
        $today = $now->toDateString();
        $activeKey = $user->id.'|'.$today;

        try {
            $queue = DB::transaction(function () use (
                $user,
                $validated,
                $today,
                $activeKey
            ) {
                $entry = QueueEntry::create([
                    'user_id' => $user->id,
                    'patient_name' => $user->name,
                    'department' => $validated['department'],
                    'queue_date' => $today,
                    'status' => 'waiting',
                    'registration_type' => 'remote',
                    'registered_by' => $user->id,
                    'active_patient_key' => $activeKey,
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
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            $existing = QueueEntry::query()
                ->where('active_patient_key', $activeKey)
                ->first();

            if (! $existing) {
                throw $exception;
            }

            return response()->json([
                'message' => 'You already have an active queue entry today.',
                'queue' => $existing,
            ], 409);
        }

        return response()->json([
            'message' => 'You have joined the queue. Please arrive before your number is called.',
            'queue' => $queue,
        ], 201);
    }
}