<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QueueEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StaffDashboardController extends Controller
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

        if ($user->role === 'staff') {
            if (! in_array($user->department, self::DEPARTMENTS, true)) {
                abort(403, 'A valid department assignment is required.');
            }

            $department = $user->department;
        } else {
            $validated = $request->validate([
                'department' => [
                    'sometimes',
                    'required',
                    Rule::in(['all', ...self::DEPARTMENTS]),
                ],
            ]);

            $department = $validated['department'] ?? 'all';
        }

        $today = now('Asia/Manila')->toDateString();

        $query = QueueEntry::query()
            ->where('queue_date', $today);

        if ($department !== 'all') {
            $query->where('department', $department);
        }

                $entries = (clone $query)->get(['created_at']);

        $hourCounts = array_fill(0, 24, 0);

        foreach ($entries as $entry) {
            $hour = $entry->created_at
                ->copy()
                ->timezone('Asia/Manila')
                ->hour;

            $hourCounts[$hour]++;
        }

        $hourlyActivity = [];

        for ($hour = 0; $hour < 24; $hour++) {
            $hourlyActivity[] = [
                'hour' => sprintf('%02d:00', $hour),
                'label' => ($hour % 12 ?: 12).' '.(
                    $hour >= 12 ? 'PM' : 'AM'
                ),
                'count' => $hourCounts[$hour],
            ];
        }

        $counts = $query
            ->selectRaw('status, COUNT(*) AS total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'date' => $today,
            'hourly_activity' => $hourlyActivity,
            'department' => $department,
            'stats' => [
                'total' => (int) $counts->sum(),
                'waiting' => (int) ($counts['waiting'] ?? 0),
                'serving' => (int) ($counts['serving'] ?? 0),
                'completed' => (int) ($counts['completed'] ?? 0),
                'cancelled' => (int) ($counts['cancelled'] ?? 0),
                'no_show' => (int) ($counts['no_show'] ?? 0),
            ],
        ]);
    }
}