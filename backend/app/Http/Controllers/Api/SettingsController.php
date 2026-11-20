<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    private function settingsData(Request $request): array
    {
        $user = $request->user();

        return [
            'walk_in_alerts' => $user->walk_in_alerts,
            'record_visibility' => $user->record_visibility,
        ];
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'settings' => $this->settingsData($request),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'walk_in_alerts' => [
                'required_without:record_visibility',
                'boolean',
            ],
            'record_visibility' => [
                'required_without:walk_in_alerts',
                Rule::in(['department_staff', 'admin_only']),
            ],
        ]);

        $user = $request->user();

        if (array_key_exists('walk_in_alerts', $validated)) {
            $user->walk_in_alerts = $validated['walk_in_alerts'];
        }

        if (array_key_exists('record_visibility', $validated)) {
            $user->record_visibility = $validated['record_visibility'];
        }

        $user->save();

        return response()->json([
            'message' => 'Your settings have been saved.',
            'settings' => $this->settingsData($request),
        ]);
    }
}