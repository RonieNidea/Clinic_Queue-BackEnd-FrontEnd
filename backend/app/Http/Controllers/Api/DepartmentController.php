<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DepartmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'include_inactive' => ['sometimes', 'boolean'],
        ]);

        $query = Department::query()->orderBy('name');

        if (! ($validated['include_inactive'] ?? false)) {
            $query->where('is_active', true);
        }

        return response()->json([
            'departments' => $query->get([
                'id',
                'code',
                'name',
                'service_name',
                'fee',
                'is_active',
            ]),
        ]);
    }

    public function adminIndex(): JsonResponse
    {
        return response()->json([
            'departments' => Department::query()
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['prohibited'],
            'name' => [
                'required',
                'string',
                'max:255',
                'unique:departments,name',
            ],
            'service_name' => ['required', 'string', 'max:255'],
            'fee' => [
                'nullable',
                'numeric',
                'min:0',
                'max:99999999.99',
                'decimal:0,2',
            ],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $department = Department::create([
            'name' => $validated['name'],
            'service_name' => $validated['service_name'],
            'fee' => $validated['fee'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Department created successfully.',
            'department' => $department,
        ], 201);
    }

    public function update(
        Request $request,
        Department $department
    ): JsonResponse {
        $validated = $request->validate([
            'code' => ['prohibited'],
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('departments', 'name')
                    ->ignore($department->id),
            ],
            'service_name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],
            'fee' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
                'max:99999999.99',
                'decimal:0,2',
            ],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        $department->update($validated);

        return response()->json([
            'message' => 'Department updated successfully.',
            'department' => $department->fresh(),
        ]);
    }
}