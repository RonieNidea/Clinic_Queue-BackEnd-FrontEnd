<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class VisitDateFilteringTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(Carbon::parse('2026-11-28 10:00:00', 'Asia/Manila'));
    }

    public function test_daily_sheet_includes_date_only_and_timestamp_records_for_the_selected_day(): void
    {
        $staff = $this->makeUser('staff', 'General Medicine');
        $ids = [
            $this->makeVisit(['visit_date' => '2026-11-28', 'patient_name' => 'Patient A']),
            $this->makeVisit(['visit_date' => '2026-11-28 00:00:00', 'patient_name' => 'Patient B']),
            $this->makeVisit(['visit_date' => '2026-11-28 09:30:00', 'patient_name' => 'Patient C']),
        ];

        $this->makeVisit(['visit_date' => '2026-11-27 23:59:59']);
        $this->makeVisit(['visit_date' => '2026-11-29 00:00:00']);
        $this->makeVisit(['status' => 'draft', 'completed_at' => null]);
        $this->makeVisit(['completed_at' => null]);
        $this->makeVisit(['completed_at' => now()->addDay()]);
        $this->makeVisit(['department' => 'Nursing Assistance']);

        $privatePatient = $this->makeUser('patient', visibility: 'admin_only');
        $this->makeVisit(['user_id' => $privatePatient->id]);

        Sanctum::actingAs($staff);

        $response = $this->getJson('/api/staff/daily-visit-sheet?date=2026-11-28');

        $response->assertOk()
            ->assertJsonPath('date', '2026-11-28')
            ->assertJsonPath('department', 'General Medicine')
            ->assertJsonPath('department_filter', 'General Medicine')
            ->assertJsonPath('available_departments', ['General Medicine'])
            ->assertJsonPath('total', 3)
            ->assertJsonCount(3, 'visits');

        $this->assertSame($ids, array_column($response->json('visits'), 'id'));
    }

    public function test_admin_daily_sheet_includes_all_departments_and_private_patient_visits(): void
    {
        $admin = $this->makeUser('admin');
        $privatePatient = $this->makeUser('patient', visibility: 'admin_only');

        $this->makeVisit();
        $this->makeVisit(['department' => 'Nursing Assistance', 'user_id' => $privatePatient->id]);
        $this->makeVisit(['status' => 'draft', 'completed_at' => null]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/staff/daily-visit-sheet?date=2026-11-28')
            ->assertOk()
            ->assertJsonPath('department', 'All departments')
            ->assertJsonPath('department_filter', 'all')
            ->assertJsonCount(4, 'available_departments')
            ->assertJsonPath('total', 2)
            ->assertJsonCount(2, 'visits');

        $this->getJson('/api/staff/daily-visit-sheet?date=2026-11-28&department=all')
            ->assertOk()
            ->assertJsonPath('department_filter', 'all')
            ->assertJsonPath('total', 2);
    }

    #[DataProvider('departmentProvider')]
    public function test_each_department_has_a_daily_sheet_scoped_to_its_staff(string $department): void
    {
        $visitIds = [];

        foreach (self::departmentProvider() as [$name]) {
            $visitIds[$name] = $this->makeVisit(['department' => $name]);
        }

        Sanctum::actingAs($this->makeUser('staff', $department));

        $response = $this->getJson('/api/staff/daily-visit-sheet?date=2026-11-28');

        $response->assertOk()
            ->assertJsonPath('department', $department)
            ->assertJsonPath('department_filter', $department)
            ->assertJsonPath('available_departments', [$department])
            ->assertJsonPath('total', 1)
            ->assertJsonCount(1, 'visits')
            ->assertJsonPath('visits.0.id', $visitIds[$department]);

        $this->getJson('/api/staff/daily-visit-sheet?'.http_build_query([
            'date' => '2026-11-28',
            'department' => $department,
        ]))->assertOk()
            ->assertJsonPath('visits.0.id', $visitIds[$department]);
    }

    public function test_staff_cannot_request_another_department_or_all_departments(): void
    {
        $this->makeVisit(['department' => 'Nursing Assistance']);

        Sanctum::actingAs($this->makeUser('staff', 'General Medicine'));

        foreach (['Nursing Assistance', 'all'] as $department) {
            $this->getJson('/api/staff/daily-visit-sheet?'.http_build_query([
                'date' => '2026-11-28',
                'department' => $department,
            ]))->assertForbidden();
        }
    }

    public function test_admin_can_select_a_department_including_its_private_patient_visits(): void
    {
        $privatePatient = $this->makeUser('patient', visibility: 'admin_only');
        $this->makeVisit(['department' => 'General Medicine']);
        $privateVisit = $this->makeVisit([
            'department' => 'Nursing Assistance',
            'user_id' => $privatePatient->id,
        ]);
        $walkInVisit = $this->makeVisit(['department' => 'Nursing Assistance']);
        $this->makeVisit(['department' => 'Nursing Assistance', 'visit_date' => '2026-11-27']);
        $this->makeVisit(['department' => 'Nursing Assistance', 'status' => 'draft']);

        Sanctum::actingAs($this->makeUser('admin'));

        $response = $this->getJson('/api/staff/daily-visit-sheet?'.http_build_query([
            'date' => '2026-11-28',
            'department' => 'Nursing Assistance',
        ]));

        $response->assertOk()
            ->assertJsonPath('department', 'Nursing Assistance')
            ->assertJsonPath('department_filter', 'Nursing Assistance')
            ->assertJsonPath('total', 2)
            ->assertJsonCount(2, 'visits');

        $this->assertEqualsCanonicalizing(
            [$privateVisit, $walkInVisit],
            array_column($response->json('visits'), 'id'),
        );
    }

    public function test_admin_department_selection_must_be_valid(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));

        foreach (['Unknown department', '', ['General Medicine']] as $department) {
            $this->getJson('/api/staff/daily-visit-sheet?'.http_build_query([
                'date' => '2026-11-28',
                'department' => $department,
            ]))->assertUnprocessable()
                ->assertJsonValidationErrors('department');
        }
    }

    public function test_staff_without_an_approved_department_assignment_cannot_read_sheets(): void
    {
        $unapproved = $this->makeUser('staff', 'General Medicine');
        $unapproved->approval_status = 'pending';
        $unapproved->save();

        foreach ([$unapproved, $this->makeUser('staff'), $this->makeUser('staff', 'Unknown department')] as $staff) {
            Sanctum::actingAs($staff);

            $this->getJson('/api/staff/daily-visit-sheet?date=2026-11-28')
                ->assertForbidden();
        }
    }

    /**
     * @return array<string, array{string}>
     */
    public static function departmentProvider(): array
    {
        return [
            'medicine' => ['General Medicine'],
            'nursing' => ['Nursing Assistance'],
            'first aid' => ['Basic First Aid'],
            'assessment' => ['Health Assessment'],
        ];
    }

    public function test_visit_search_date_filter_matches_both_formats_and_keeps_other_filters(): void
    {
        $staff = $this->makeUser('staff', 'General Medicine');

        $first = $this->makeVisit(['visit_date' => '2026-11-28']);
        $second = $this->makeVisit(['visit_date' => '2026-11-28 00:00:00']);
        $this->makeVisit(['visit_date' => '2026-11-27 00:00:00']);
        $this->makeVisit(['service' => 'Other service']);
        $this->makeVisit(['status' => 'draft']);
        $this->makeVisit(['department' => 'Nursing Assistance']);
        $privatePatient = $this->makeUser('patient', visibility: 'admin_only');
        $this->makeVisit(['user_id' => $privatePatient->id]);

        Sanctum::actingAs($staff);

        $parameters = http_build_query([
            'visit_date' => '2026-11-28',
            'service' => 'General Consultation',
            'status' => 'completed',
            'search' => 'TEST-001',
        ]);

        $response = $this->getJson('/api/staff/visits?'.$parameters);

        $response->assertOk()
            ->assertJsonPath('visits.total', 2)
            ->assertJsonCount(2, 'visits.data');

        $this->assertEqualsCanonicalizing(
            [$first, $second],
            array_column($response->json('visits.data'), 'id'),
        );
    }

    public function test_daily_sheet_returns_an_empty_list_for_a_day_without_completed_visits(): void
    {
        $this->makeVisit();

        Sanctum::actingAs($this->makeUser('staff', 'General Medicine'));

        $this->getJson('/api/staff/daily-visit-sheet?date=2026-11-27')
            ->assertOk()
            ->assertJsonPath('total', 0)
            ->assertJsonCount(0, 'visits');
    }

    public function test_daily_sheet_requires_a_valid_date(): void
    {
        Sanctum::actingAs($this->makeUser('staff', 'General Medicine'));

        $this->getJson('/api/staff/daily-visit-sheet')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('date');

        $this->getJson('/api/staff/daily-visit-sheet?date=not-a-date')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('date');
    }

    public function test_daily_sheet_requires_authentication(): void
    {
        $this->getJson('/api/staff/daily-visit-sheet?date=2026-11-28')
            ->assertUnauthorized();
    }

    public function test_patient_and_reception_accounts_cannot_read_the_staff_daily_sheet(): void
    {
        foreach (['patient', 'reception'] as $role) {
            Sanctum::actingAs($this->makeUser($role));

            $this->getJson('/api/staff/daily-visit-sheet?date=2026-11-28')
                ->assertForbidden();
        }
    }

    private function makeUser(
        string $role,
        ?string $department = null,
        string $visibility = 'department_staff',
    ): User {
        return User::factory()->create([
            'role' => $role,
            'department' => $department,
            'approval_status' => 'approved',
            'record_visibility' => $visibility,
        ]);
    }

    private function makeVisit(array $overrides = []): int
    {
        // Insert raw values to cover both historical SQLite date representations.
        return DB::table('visits')->insertGetId(array_replace([
            'patient_name' => 'Test Patient',
            'student_number' => 'TEST-001',
            'department' => 'General Medicine',
            'service' => 'General Consultation',
            'visit_date' => '2026-11-28 00:00:00',
            'summary' => 'Completed test visit',
            'care_given' => 'Test care',
            'status' => 'completed',
            'completed_at' => now()->subMinute(),
            'created_at' => now(),
            'updated_at' => now(),
        ], $overrides));
    }
}
