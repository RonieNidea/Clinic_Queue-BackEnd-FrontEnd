<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnnouncementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['page' => ['sometimes', 'integer', 'min:1']]);

        return response()->json([
            'announcements' => Announcement::query()
                ->where('is_published', true)
                ->where('published_at', '<=', now())
                ->orderByDesc('published_at')
                ->orderByDesc('id')
                ->paginate(10, ['id', 'title', 'category', 'content', 'published_at']),
        ]);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $request->validate(['page' => ['sometimes', 'integer', 'min:1']]);

        return response()->json([
            'announcements' => Announcement::query()
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->paginate(10),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'category' => ['nullable', 'string', 'max:60'],
            'content' => ['required', 'string', 'max:10000'],
            'is_published' => ['sometimes', 'required', 'boolean'],
            'created_by' => ['prohibited'],
            'published_at' => ['prohibited'],
        ]);

        $announcement = new Announcement;
        $announcement->fill($validated);
        $announcement->category = $validated['category'] ?? 'Clinic update';
        $announcement->is_published = $validated['is_published'] ?? false;
        $announcement->published_at = $announcement->is_published ? now() : null;
        $announcement->created_by = $request->user()->id;
        $announcement->save();

        return response()->json([
            'message' => $announcement->is_published
                ? 'Announcement published on the homepage.'
                : 'Draft saved. It is not visible on the homepage.',
            'announcement' => $announcement->fresh(),
        ], 201);
    }

    public function update(Request $request, Announcement $announcement): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:180'],
            'category' => ['sometimes', 'nullable', 'string', 'max:60'],
            'content' => ['sometimes', 'required', 'string', 'max:10000'],
            'is_published' => ['sometimes', 'required', 'boolean'],
            'created_by' => ['prohibited'],
            'published_at' => ['prohibited'],
        ]);

        $updated = DB::transaction(function () use ($announcement, $validated) {
            $record = Announcement::query()->whereKey($announcement->id)->lockForUpdate()->firstOrFail();
            $record->fill($validated);

            if (array_key_exists('category', $validated)) {
                $record->category = $validated['category'] ?? 'Clinic update';
            }

            if (array_key_exists('is_published', $validated)) {
                $record->published_at = $record->is_published ? ($record->published_at ?? now()) : null;
            }

            $record->save();

            return $record->fresh();
        });

        return response()->json([
            'message' => $updated->is_published
                ? 'Announcement updated and published on the homepage.'
                : 'Draft saved. It is not visible on the homepage.',
            'announcement' => $updated,
        ]);
    }

    public function destroy(Announcement $announcement): JsonResponse
    {
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted.']);
    }
}
