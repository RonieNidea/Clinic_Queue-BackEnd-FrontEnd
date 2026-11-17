<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Visit;
use App\Models\VisitRating;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PatientVisitController extends Controller
{
    public function summaries(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            $user->role !== 'patient' ||
            $user->approval_status !== 'approved'
        ) {
            abort(403, 'Approved patient account required.');
        }

        $visits = Visit::query()
            ->with('rating:id,visit_id,score,comment')
            ->where('user_id', $user->id)
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->where('completed_at', '<=', now())
            ->orderByDesc('visit_date')
            ->orderByDesc('id')
            ->paginate(10, [
                'id',
                'visit_date',
                'department',
                'service',
                'summary',
                'care_given',
                'health_notes',
            ]);

        return response()->json([
            'visits' => $visits,
        ]);
    }

    public function rate(Request $request, Visit $visit): JsonResponse
    {
        $user = $request->user();

        if (
            $user->role !== 'patient' ||
            $user->approval_status !== 'approved'
        ) {
            abort(403, 'Approved patient account required.');
        }

        if ((int) $visit->user_id !== (int) $user->id) {
            abort(403, 'You can rate only your own visit.');
        }

        $validated = $request->validate([
            'score' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        return DB::transaction(function () use (
            $visit,
            $user,
            $validated
        ) {
            $record = Visit::query()
                ->whereKey($visit->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $record->user_id !== (int) $user->id) {
                abort(403, 'You can rate only your own visit.');
            }

            if (
                $record->status !== 'completed' ||
                ! $record->completed_at ||
                $record->completed_at->isFuture()
            ) {
                return response()->json([
                    'message' => 'You can rate a visit only after it is completed.',
                ], 422);
            }

            $rating = VisitRating::updateOrCreate(
                ['visit_id' => $record->id],
                [
                    'user_id' => $user->id,
                    'score' => $validated['score'],
                    'comment' => $validated['comment'] ?? null,
                ]
            );

            return response()->json([
                'message' => 'Thank you. Your visit rating has been saved.',
                'rating' => $rating->only([
                    'id',
                    'visit_id',
                    'score',
                    'comment',
                ]),
            ]);
        }, 3);
    }
}