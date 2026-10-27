<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    private const DEPARTMENTS = [
        'General Medicine',
        'Nursing Assistance',
        'Basic First Aid',
        'Health Assessment',
    ];

    private function scheduledTimes(string $date): array
    {
        $day = CarbonImmutable::parse($date, 'Asia/Manila');

        if ($day->isSunday()) {
            return [];
        }

        $closingHour = $day->isSaturday() ? 12 : 17;
        $times = [];

        for ($hour = 8; $hour < $closingHour; $hour++) {
            $times[] = sprintf('%02d:00', $hour);
            $times[] = sprintf('%02d:30', $hour);
        }

        return $times;
    }

    private function slotHasPassed(string $date, string $time): bool
    {
        return CarbonImmutable::parse(
            "{$date} {$time}",
            'Asia/Manila'
        )->lessThanOrEqualTo(CarbonImmutable::now('Asia/Manila'));
    }

    public function index(Request $request): JsonResponse
    {
        $appointments = Appointment::query()
            ->where('user_id', $request->user()->id)
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get();

        return response()->json([
            'appointments' => $appointments,
        ]);
    }

    public function availableSlots(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'appointment_date' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:today',
            ],
            'department' => [
                'required',
                Rule::in(self::DEPARTMENTS),
            ],
        ]);

        $date = $validated['appointment_date'];
        $department = $validated['department'];
        $scheduledTimes = $this->scheduledTimes($date);

        $bookedTimes = Appointment::query()
            ->where('appointment_date', $date)
            ->where('department', $department)
            ->where('status', 'booked')
            ->pluck('appointment_time')
            ->all();

        $slots = [];

        foreach ($scheduledTimes as $time) {
            if (in_array($time, $bookedTimes, true)) {
                $status = 'booked';
            } elseif ($this->slotHasPassed($date, $time)) {
                $status = 'past';
            } else {
                $status = 'available';
            }

            $slots[] = [
                'time' => $time,
                'status' => $status,
                'available' => $status === 'available',
            ];
        }

        return response()->json([
            'date' => $date,
            'department' => $department,
            'clinic_closed' => $scheduledTimes === [],
            'slots' => $slots,
            'message' => $scheduledTimes === []
                ? 'The clinic is closed on Sundays.'
                : null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_name' => ['required', 'string', 'max:255'],
            'department' => [
                'required',
                Rule::in(self::DEPARTMENTS),
            ],
            'appointment_date' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:today',
            ],
            'appointment_time' => ['required', 'date_format:H:i'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $date = $validated['appointment_date'];
        $time = $validated['appointment_time'];

        if (! in_array($time, $this->scheduledTimes($date), true)) {
            throw ValidationException::withMessages([
                'appointment_time' => [
                    'Please choose a time within clinic operating hours.',
                ],
            ]);
        }

        if ($this->slotHasPassed($date, $time)) {
            throw ValidationException::withMessages([
                'appointment_time' => [
                    'Please choose a future appointment time.',
                ],
            ]);
        }

        // The unique database field prevents two active bookings
        // for the same department, date, and time.
        $activeSlot = implode('|', [
            $validated['department'],
            $date,
            $time,
        ]);

        try {
            $appointment = Appointment::create([
                'user_id' => $request->user()->id,
                'patient_name' => $validated['patient_name'],
                'department' => $validated['department'],
                'appointment_date' => $date,
                'appointment_time' => $time,
                'reason' => $validated['reason'] ?? null,
                'status' => 'booked',
                'active_slot' => $activeSlot,
            ]);
        } catch (UniqueConstraintViolationException $exception) {
            return response()->json([
                'message' => 'This time is unavailable. Please choose another slot.',
            ], 409);
        }

        return response()->json([
            'message' => 'Your appointment has been booked successfully.',
            'appointment' => $appointment,
        ], 201);
    }

    public function cancel(
        Request $request,
        Appointment $appointment
    ): JsonResponse {
        if ((int) $appointment->user_id !== (int) $request->user()->id) {
            abort(403, 'You cannot cancel another user\'s appointment.');
        }

        return DB::transaction(function () use ($appointment) {
            $booking = Appointment::query()
                ->whereKey($appointment->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($booking->status !== 'booked') {
                return response()->json([
                    'message' => 'This appointment is already cancelled.',
                ], 409);
            }

            $booking->update([
                'status' => 'cancelled',
                'active_slot' => null,
            ]);

            return response()->json([
                'message' => 'Your appointment has been cancelled.',
                'appointment' => $booking->fresh(),
            ]);
        });
    }
}