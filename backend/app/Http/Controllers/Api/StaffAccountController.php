<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StaffAccountController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'email' => strtolower(trim(
                (string) $request->input('email')
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
            'role' => [
                'required',
                Rule::in(['staff', 'reception']),
            ],
            'department' => [
                'exclude_unless:role,staff',
                'required',
                Rule::in([
                    'General Medicine',
                    'Nursing Assistance',
                    'Basic First Aid',
                    'Health Assessment',
                ]),
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        $staff = new User();
        $staff->name = $validated['name'];
        $staff->email = $validated['email'];
        $staff->password = $validated['password'];
        $staff->role = $validated['role'];

        $staff->department = $validated['role'] === 'staff'
            ? $validated['department']
            : null;

        $staff->approval_status = 'approved';
        $staff->approved_by = $request->user()->id;
        $staff->approved_at = now();
        $staff->save();

        return response()->json([
            'message' => 'Staff account created. The staff member can now log in.',
            'staff' => [
                'id' => $staff->id,
                'name' => $staff->name,
                'email' => $staff->email,
                'role' => $staff->role,
                'department' => $staff->department,
                'approval_status' => $staff->approval_status,
            ],
        ], 201);
    }
}