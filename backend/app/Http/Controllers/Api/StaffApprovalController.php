<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StaffApprovalController extends Controller
{
    public function index(): JsonResponse
    {
        $staff = User::query()
            ->whereIn('role', ['staff', 'reception'])
            ->latest('id')
            ->get([
                'id',
                'name',
                'email',
                'department',
                'approval_status',
                'approved_at',
                'created_at',
            ]);

        return response()->json([
            'staff' => $staff,
        ]);
    }

    public function update(Request $request, User $staff): JsonResponse
    {
        $validated = $request->validate([
            'approval_status' => [
                'required',
                Rule::in(['approved', 'rejected']),
            ],
        ]);

        return DB::transaction(function () use (
            $request,
            $staff,
            $validated
        ) {
            $applicant = User::query()
                ->whereKey($staff->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($applicant->role !== 'staff') {
                abort(404, 'Staff application not found.');
            }

            if ($applicant->approval_status !== 'pending') {
                return response()->json([
                    'message' => 'This application has already been reviewed. Refresh the list.',
                ], 409);
            }

            $approved = $validated['approval_status'] === 'approved';

            $applicant->approval_status = $validated['approval_status'];
            $applicant->approved_by = $approved
                ? $request->user()->id
                : null;
            $applicant->approved_at = $approved ? now() : null;
            $applicant->save();

            // Ensure the next login uses the new approval decision.
            $applicant->tokens()->delete();

            return response()->json([
                'message' => $approved
                    ? 'Staff account approved. They can now log in.'
                    : 'Staff application rejected.',
            ]);
        });
    }
}