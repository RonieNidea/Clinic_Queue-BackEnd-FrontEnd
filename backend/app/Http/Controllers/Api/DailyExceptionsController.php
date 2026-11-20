<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\QueueEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DailyExceptionsController extends Controller
{
    private const DEPARTMENTS = [
        'General Medicine',
        'Nursing Assistance',
        'Basic First Aid',
        'Health Assessment',
    ];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            $user->approval_status !== 'approved' ||
            ! in_array($user->role, ['admin', 'staff'], true)
        ) {
            abort(403, 'Department staff or administrator access required.');
        }

        $validated = $request->validate([
            'date' => ['sometimes', 'required', 'date_format:Y-m-d'],
        ]);

        $date = $validated['date']
            ?? now('Asia/Manila')->toDateString();

        if ($user->role === 'staff') {
            if (! in_array($user->department, self::DEPARTMENTS, true)) {
                abort(403, 'A valid department assignment is required.');
            }

            $department = $user->department;
        } else {
            $selection = $request->validate([
                'department' => [
                    'sometimes',
                    'required',
                    Rule::in(['all', ...self::DEPARTMENTS]),
                ],
            ]);

            $department = $selection['department'] ?? 'all';
        }

        $appointmentQuery = Appointment::query()
            ->where('appointment_date', $date)
            ->whereIn('status', ['cancelled', 'no_show']);

        $queueQuery = QueueEntry::query()
            ->where('queue_date', $date)
            ->whereIn('status', ['cancelled', 'no_show']);

        if ($department !== 'all') {
            $appointmentQuery->where('department', $department);
            $queueQuery->where('department', $department);
        }

        $appointments = $appointmentQuery
            ->orderBy('appointment_time')
            ->orderBy('id')
            ->get([
                'id',
                'patient_name',
                'department',
                'appointment_date',
                'appointment_time',
                'status',
            ]);

        $queues = $queueQuery
            ->orderBy('id')
            ->get([
                'id',
                'queue_number',
                'patient_name',
                'department',
                'queue_date',
                'status',
            ]);

        return response()->json([
            'date' => $date,
            'department' => $department,
            'appointments' => $appointments,
            'queues' => $queues,
        ]);
    }
}