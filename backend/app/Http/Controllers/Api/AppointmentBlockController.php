<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentBlock;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AppointmentBlockController extends Controller
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

    public function index(Request $request): JsonResponse
    {
        $department = $this->departmentFor($request);

        $validated = $request->validate([
            'block_date' => ['required', 'date_format:Y-m-d'],
        ]);

        $blocks = AppointmentBlock::query()
            ->where('department', $department)
            ->where('block_date', $validated['block_date'])
            ->orderBy('start_time')
            ->get();

        return response()->json([
            'department' => $department,
            'blocks' => $blocks,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $department = $this->departmentFor($request);

        $validated = $request->validate([
            'block_date' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:today',
            ],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => [
                'required',
                'date_format:H:i',
                'after:start_time',
            ],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $date = $validated['block_date'];
        $start = $validated['start_time'];
        $end = $validated['end_time'];

        $overlap = AppointmentBlock::query()
            ->where('department', $department)
            ->where('block_date', $date)
            ->where('start_time', '<', $end)
            ->where('end_time', '>', $start)
            ->exists();

        if ($overlap) {
            throw ValidationException::withMessages([
                'start_time' => [
                    'This period overlaps an existing block.',
                ],
            ]);
        }

        $bookings = Appointment::query()
            ->where('department', $department)
            ->where('appointment_date', $date)
            ->where('status', 'booked')
            ->pluck('appointment_time');

        foreach ($bookings as $time) {
            $bookingEnd = CarbonImmutable::parse(
                "{$date} {$time}",
                'Asia/Manila'
            )->addMinutes(30)->format('H:i');

            if ($time < $end && $bookingEnd > $start) {
                throw ValidationException::withMessages([
                    'start_time' => [
                        'An existing appointment overlaps this period. Choose another period or arrange the booking change first.',
                    ],
                ]);
            }
        }

        $block = AppointmentBlock::create([
            'department' => $department,
            'block_date' => $date,
            'start_time' => $start,
            'end_time' => $end,
            'reason' => trim($validated['reason']),
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Appointment times blocked successfully.',
            'block' => $block,
        ], 201);
    }

    public function destroy(
        Request $request,
        AppointmentBlock $block
    ): JsonResponse {
        $department = $this->departmentFor($request);

        if ($block->department !== $department) {
            abort(403, 'You cannot remove another department\'s block.');
        }

        $block->delete();

        return response()->json([
            'message' => 'The block has been removed.',
        ]);
    }
}