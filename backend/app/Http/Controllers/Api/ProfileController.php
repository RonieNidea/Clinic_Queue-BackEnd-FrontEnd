<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ProfileController extends Controller
{
    private function profileData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'course' => $user->course,
            'role' => $user->role,
            'department' => $user->department,
            'approval_status' => $user->approval_status,
            'photo_url' => $user->photo_path
                ? url('/storage/'.$user->photo_path)
                : null,
        ];
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->profileData($request->user()),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'course' => ['nullable', 'string', 'max:150'],
            'photo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ]);

        $user = $request->user();
        $oldPhoto = $user->photo_path;
        $newPhoto = null;

        if ($request->hasFile('photo')) {
            $newPhoto = $request->file('photo')
                ->store('profile-photos', 'public');

            if (! $newPhoto) {
                abort(500, 'The photo could not be saved. Please try again.');
            }
        }

        try {
            $user->name = trim($validated['name']);
            $user->course = isset($validated['course'])
                ? trim($validated['course'])
                : null;

            if ($newPhoto !== null) {
                $user->photo_path = $newPhoto;
            }

            $user->save();
        } catch (Throwable $exception) {
            if ($newPhoto !== null) {
                Storage::disk('public')->delete($newPhoto);
            }

            throw $exception;
        }

        if ($newPhoto !== null && $oldPhoto) {
            try {
                Storage::disk('public')->delete($oldPhoto);
            } catch (Throwable $exception) {
                Log::warning('Old profile photo could not be removed.');
            }
        }

        return response()->json([
            'message' => 'Your profile has been updated.',
            'user' => $this->profileData($user->fresh()),
        ]);
    }
}