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
use App\Models\QueueEntry;


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

    public function reschedule(
        Request $request,
        Appointment $appointment
    ): JsonResponse {
        if ((int) $appointment->user_id !== (int) $request->user()->id) {
            abort(403, 'You cannot reschedule another user\'s appointment.');
        }

        $validated = $request->validate([
            'appointment_date' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:today',
            ],
            'appointment_time' => [
                'required',
                'date_format:H:i',
            ],
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

        try {
            return DB::transaction(function () use (
                $appointment,
                $date,
                $time
            ) {
                $booking = Appointment::query()
                    ->whereKey($appointment->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($booking->checked_in_at !== null) {
                    return response()->json([
                        'message' => 'Checked-in appointments cannot be changed. Please contact reception.',
                    ], 422);
                }

                if ($booking->status !== 'booked') {
                    return response()->json([
                        'message' => 'Only booked appointments can be rescheduled.',
                    ], 422);
                }

                $originalDate = $booking->appointment_date->format('Y-m-d');

                if ($this->slotHasPassed(
                    $originalDate,
                    $booking->appointment_time
                )) {
                    return response()->json([
                        'message' => 'Past appointments cannot be rescheduled.',
                    ], 422);
                }

                if (
                    $originalDate === $date &&
                    $booking->appointment_time === $time
                ) {
                    return response()->json([
                        'message' => 'Please choose a different date or time.',
                    ], 422);
                }

                $booking->update([
                    'appointment_date' => $date,
                    'appointment_time' => $time,
                    'active_slot' => implode('|', [
                        $booking->department,
                        $date,
                        $time,
                    ]),
                ]);

                return response()->json([
                    'message' => 'Your appointment has been rescheduled.',
                    'appointment' => $booking->fresh(),
                ]);
            });
        } catch (UniqueConstraintViolationException $exception) {
            return response()->json([
                'message' => 'That slot has just been taken. Please choose another time.',
            ], 409);
        }
    }

        public function checkIn(
        Request $request,
        Appointment $appointment
    ): JsonResponse {
        if ((int) $appointment->user_id !== (int) $request->user()->id) {
            abort(403, 'You cannot check in for another user\'s appointment.');
        }

        try {
            return DB::transaction(function () use ($appointment) {
                $booking = Appointment::query()
                    ->whereKey($appointment->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $existing = QueueEntry::query()
                    ->where('appointment_id', $booking->id)
                    ->first();

                if ($existing) {
                    return response()->json([
                        'message' => 'You have already checked in.',
                        'queue' => $existing,
                    ]);
                }

                if ($booking->status !== 'booked') {
                    return response()->json([
                        'message' => 'Only booked appointments can be checked in.',
                    ], 422);
                }

                $today = now('Asia/Manila')->toDateString();

                if ($booking->appointment_date->format('Y-m-d') !== $today) {
                    return response()->json([
                        'message' => 'You can check in only on your appointment date.',
                    ], 422);
                }

                if ($booking->checked_in_at !== null) {
                    return response()->json([
                        'message' => 'This appointment is already checked in. Please contact reception for your queue number.',
                    ], 409);
                }

                $entry = QueueEntry::create([
                    'appointment_id' => $booking->id,
                    'patient_name' => $booking->patient_name,
                    'department' => $booking->department,
                    'queue_date' => $today,
                    'status' => 'waiting',
                    'registration_type' => 'appointment',
                    'registered_by' => $booking->user_id,
                    'user_id' => $booking->user_id,
                    'active_patient_key' => $booking->user_id.'|'.$today,
                ]);

                $entry->update([
                    'queue_number' => 'Q-'.str_pad(
                        (string) $entry->id,
                        6,
                        '0',
                        STR_PAD_LEFT
                    ),
                ]);

                $booking->update([
                    'checked_in_at' => now(),
                ]);

                return response()->json([
                    'message' => 'Check-in successful. You have joined the queue.',
                    'queue' => $entry->fresh(),
                ], 201);
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            $existing = QueueEntry::query()
                ->where('appointment_id', $appointment->id)
                ->first();

                        if (! $existing) {
                $activeQueue = QueueEntry::query()
                    ->where(
                        'active_patient_key',
                        $appointment->user_id.'|'.
                        now('Asia/Manila')->toDateString()
                    )
                    ->first();

                if ($activeQueue) {
                    return response()->json([
                        'message' => 'You already have an active queue entry today. Please finish that visit before checking in.',
                    ], 409);
                }

                throw $exception;
            }

            return response()->json([
                'message' => 'You have already checked in.',
                'queue' => $existing,
            ]);
        }
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