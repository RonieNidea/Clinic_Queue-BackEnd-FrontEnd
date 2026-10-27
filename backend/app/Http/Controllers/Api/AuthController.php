<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use App\Models\StaffInvitation;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{

    public function registerStaff(Request $request): JsonResponse
    {
        $request->merge([
            'email' => strtolower(trim(
                (string) $request->input('email')
            )),
            'invitation_code' => strtoupper(trim(
                (string) $request->input('invitation_code')
            )),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
            'invitation_code' => [
                'required',
                'string',
                'regex:/^[A-F0-9]{32}$/',
            ],
        ]);

        try {
            DB::transaction(function () use ($validated) {
                $invitation = StaffInvitation::query()
                    ->where(
                        'code_hash',
                        hash('sha256', $validated['invitation_code'])
                    )
                    ->where('email', $validated['email'])
                    ->lockForUpdate()
                    ->first();

                if (
                    ! $invitation ||
                    $invitation->used_at !== null ||
                    $invitation->expires_at->lessThanOrEqualTo(now())
                ) {
                    throw ValidationException::withMessages([
                        'invitation_code' => [
                            'The invitation is invalid, expired, already used, or does not match your email.',
                        ],
                    ]);
                }

                $user = new User();
                $user->name = $validated['name'];
                $user->email = $validated['email'];
                $user->password = $validated['password'];
                $user->role = 'staff';
                $user->department = $invitation->department;
                $user->approval_status = 'pending';
                $user->save();

                $invitation->used_at = now();
                $invitation->save();
            });
        } catch (UniqueConstraintViolationException $exception) {
            throw ValidationException::withMessages([
                'email' => ['This email is already registered. Please log in.'],
            ]);
        }

        return response()->json([
            'message' => 'Staff registration submitted. Please wait for administrator approval before logging in.',
            'approval_required' => true,
        ], 201);
    }
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
            'account_type' => [
                'sometimes',
                'required',
                Rule::in(['patient']),
            ],
            'department' => [
                'exclude_unless:account_type,staff',
                'required',
                Rule::in([
                    'General Medicine',
                    'Nursing Assistance',
                    'Basic First Aid',
                    'Health Assessment',
                ]),
            ],
        ]);

        $isStaff = ($validated['account_type'] ?? 'patient') === 'staff';

        $user = new User();
        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->password = $validated['password'];
        $user->role = $isStaff ? 'staff' : 'patient';
        $user->department = $isStaff
            ? $validated['department']
            : null;
        $user->approval_status = $isStaff ? 'pending' : 'approved';
        $user->save();

        if ($isStaff) {
            return response()->json([
                'message' => 'Staff registration submitted. Please wait for administrator approval before logging in.',
                'approval_required' => true,
            ], 201);
        }

        return response()->json([
            'message' => 'Your account was created successfully.',
            'user' => $user,
            'token' => $user->createToken('clinicqueue-web')->plainTextToken,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The email or password is incorrect.'],
            ]);
        }

        if ($user->approval_status !== 'approved') {
            return response()->json([
                'message' => $user->approval_status === 'pending'
                    ? 'Your staff account is awaiting administrator approval.'
                    : 'Your account has not been approved. Please contact the administrator.',
            ], 403);
        }

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user,
            'token' => $user->createToken('clinicqueue-web')->plainTextToken,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'You have logged out successfully.',
        ]);
    }
}