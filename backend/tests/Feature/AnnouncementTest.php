<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AnnouncementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-11-28 10:00:00', 'Asia/Manila'));
    }

    public function test_homepage_announcements_can_be_read_without_logging_in(): void
    {
        $published = Announcement::factory()->published()->create();
        Announcement::factory()->create(['title' => 'Private draft']);
        Announcement::factory()->published()->create(['published_at' => now()->addDay()]);

        $this->getJson('/api/announcements?is_published=0&include_drafts=1')
            ->assertOk()
            ->assertJsonCount(1, 'announcements.data')
            ->assertJsonPath('announcements.data.0.id', $published->id)
            ->assertJsonMissingPath('announcements.data.0.created_by')
            ->assertJsonMissingPath('announcements.data.0.is_published')
            ->assertJsonMissing(['title' => 'Private draft']);
    }

    public function test_public_announcements_are_paginated_and_newest_first(): void
    {
        Announcement::factory()->published()->count(11)->create(['published_at' => now()->subDay()]);
        $latest = Announcement::factory()->published()->create();

        $firstPage = $this->getJson('/api/announcements');
        $firstPage->assertOk()
            ->assertJsonCount(10, 'announcements.data')
            ->assertJsonPath('announcements.total', 12)
            ->assertJsonPath('announcements.last_page', 2)
            ->assertJsonPath('announcements.data.0.id', $latest->id);

        $secondPage = $this->getJson('/api/announcements?page=2');
        $secondPage->assertOk()->assertJsonCount(2, 'announcements.data');

        $this->assertEmpty(array_intersect(
            array_column($firstPage->json('announcements.data'), 'id'),
            array_column($secondPage->json('announcements.data'), 'id'),
        ));
    }

    public function test_an_empty_homepage_returns_no_demo_announcements(): void
    {
        $this->getJson('/api/announcements')
            ->assertOk()
            ->assertJsonCount(0, 'announcements.data');
    }

    public function test_admin_can_publish_an_announcement_and_it_appears_publicly(): void
    {
        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/admin/announcements', [
            'title' => 'Clinic hours update',
            'category' => 'Schedule',
            'content' => "The clinic opens at 9 AM tomorrow.\nPlease plan your visit.",
            'is_published' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('announcement.is_published', true)
            ->assertJsonPath('announcement.created_by', $admin->id);

        $id = $response->json('announcement.id');
        $this->assertDatabaseHas('announcements', [
            'id' => $id,
            'created_by' => $admin->id,
            'title' => 'Clinic hours update',
            'is_published' => true,
        ]);

        $this->getJson('/api/announcements')
            ->assertOk()
            ->assertJsonPath('announcements.data.0.id', $id)
            ->assertJsonPath('announcements.data.0.content', "The clinic opens at 9 AM tomorrow.\nPlease plan your visit.");
    }

    public function test_admin_can_save_a_draft_without_publishing_it(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/admin/announcements', [
            'title' => 'Draft update',
            'category' => '',
            'content' => 'Not ready for publication.',
        ])->assertCreated()
            ->assertJsonPath('announcement.is_published', false)
            ->assertJsonPath('announcement.published_at', null)
            ->assertJsonPath('announcement.category', 'Clinic update');

        $this->getJson('/api/announcements')->assertJsonCount(0, 'announcements.data');
        $this->getJson('/api/admin/announcements')->assertOk()->assertJsonCount(1, 'announcements.data');
    }

    public function test_admin_can_edit_publish_unpublish_and_delete_an_announcement(): void
    {
        $originalAdmin = $this->makeAdmin();
        $record = Announcement::factory()->create(['created_by' => $originalAdmin->id]);
        Sanctum::actingAs($this->makeAdmin());

        $url = '/api/admin/announcements/'.$record->id;
        $this->patchJson($url, ['title' => 'Corrected update', 'is_published' => true])
            ->assertOk()
            ->assertJsonPath('announcement.title', 'Corrected update')
            ->assertJsonPath('announcement.is_published', true)
            ->assertJsonPath('announcement.created_by', $originalAdmin->id);

        $publishedAt = $record->fresh()->published_at;
        $this->assertNotNull($publishedAt);
        $this->travel(5)->minutes();

        $this->patchJson($url, ['content' => 'Updated clinic instructions.'])
            ->assertOk()
            ->assertJsonPath('announcement.is_published', true);
        $this->assertTrue($record->fresh()->published_at->equalTo($publishedAt));

        $this->patchJson($url, ['is_published' => false])
            ->assertOk()
            ->assertJsonPath('announcement.published_at', null);
        $this->getJson('/api/announcements')->assertJsonCount(0, 'announcements.data');

        $this->travel(5)->minutes();
        $this->patchJson($url, ['is_published' => true])->assertOk();
        $this->assertTrue($record->fresh()->published_at->greaterThan($publishedAt));

        $this->deleteJson($url)->assertOk();
        $this->assertDatabaseMissing('announcements', ['id' => $record->id]);
        $this->getJson('/api/announcements')->assertJsonCount(0, 'announcements.data');
        $this->patchJson($url, ['title' => 'Deleted'])->assertNotFound();
    }

    public function test_admin_list_includes_drafts_and_is_paginated(): void
    {
        Announcement::factory()->count(12)->create();
        Sanctum::actingAs($this->makeAdmin());

        $this->getJson('/api/admin/announcements')
            ->assertOk()
            ->assertJsonPath('announcements.total', 12)
            ->assertJsonCount(10, 'announcements.data');

        $this->getJson('/api/admin/announcements?page=2')
            ->assertOk()
            ->assertJsonCount(2, 'announcements.data');
    }

    #[DataProvider('nonAdminProvider')]
    public function test_only_approved_admins_can_manage_announcements(string $role, string $approval): void
    {
        $record = Announcement::factory()->published()->create();
        Sanctum::actingAs(User::factory()->create(['role' => $role, 'approval_status' => $approval]));

        $this->getJson('/api/admin/announcements')->assertForbidden();
        $this->postJson('/api/admin/announcements', ['title' => 'Unauthorized', 'content' => 'No access.'])->assertForbidden();
        $this->patchJson('/api/admin/announcements/'.$record->id, ['is_published' => false])->assertForbidden();
        $this->deleteJson('/api/admin/announcements/'.$record->id)->assertForbidden();

        $this->assertDatabaseCount('announcements', 1);
        $this->assertTrue($record->fresh()->is_published);
    }

    public function test_guests_cannot_manage_announcements(): void
    {
        $record = Announcement::factory()->create();

        $this->getJson('/api/admin/announcements')->assertUnauthorized();
        $this->postJson('/api/admin/announcements', [])->assertUnauthorized();
        $this->patchJson('/api/admin/announcements/'.$record->id, [])->assertUnauthorized();
        $this->deleteJson('/api/admin/announcements/'.$record->id)->assertUnauthorized();
    }

    #[DataProvider('invalidAnnouncementProvider')]
    public function test_announcement_validation_prevents_invalid_posts(array $changes, string $field): void
    {
        Sanctum::actingAs($this->makeAdmin());
        $payload = array_replace(['title' => 'Valid title', 'content' => 'Valid content.'], $changes);

        $this->postJson('/api/admin/announcements', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors($field);

        $this->assertDatabaseCount('announcements', 0);
    }

    public function test_admin_cannot_replace_author_or_publication_time(): void
    {
        Sanctum::actingAs($this->makeAdmin());
        $record = Announcement::factory()->published()->create();

        $this->patchJson('/api/admin/announcements/'.$record->id, [
            'created_by' => 999,
            'published_at' => now()->addDay()->toIso8601String(),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['created_by', 'published_at']);
    }

    public function test_invalid_update_does_not_destroy_a_published_announcement(): void
    {
        Sanctum::actingAs($this->makeAdmin());
        $record = Announcement::factory()->published()->create();

        $this->patchJson('/api/admin/announcements/'.$record->id, ['content' => ' '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('content');

        $this->assertSame($record->content, $record->fresh()->content);
        $this->assertTrue($record->fresh()->is_published);
    }

    public function test_invalid_page_numbers_are_rejected(): void
    {
        $this->getJson('/api/announcements?page=0')->assertUnprocessable();
        Sanctum::actingAs($this->makeAdmin());
        $this->getJson('/api/admin/announcements?page=bad')->assertUnprocessable();
    }

    /** @return array<string, array{string, string}> */
    public static function nonAdminProvider(): array
    {
        return [
            'patient' => ['patient', 'approved'],
            'department staff' => ['staff', 'approved'],
            'reception' => ['reception', 'approved'],
            'unapproved administrator' => ['admin', 'pending'],
        ];
    }

    /** @return array<string, array{array<string, mixed>, string}> */
    public static function invalidAnnouncementProvider(): array
    {
        return [
            'blank title' => [['title' => '  '], 'title'],
            'long title' => [['title' => str_repeat('a', 181)], 'title'],
            'blank content' => [['content' => '  '], 'content'],
            'long content' => [['content' => str_repeat('a', 10001)], 'content'],
            'long category' => [['category' => str_repeat('a', 61)], 'category'],
            'invalid visibility' => [['is_published' => 'public'], 'is_published'],
        ];
    }

    private function makeAdmin(): User
    {
        return User::factory()->create(['role' => 'admin', 'approval_status' => 'approved']);
    }
}
