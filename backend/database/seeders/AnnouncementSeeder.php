<?php

namespace Database\Seeders;

use App\Models\Announcement;
use Illuminate\Database\Seeder;

class AnnouncementSeeder extends Seeder
{
    public function run(): void
    {
        Announcement::query()->firstOrCreate(
            ['title' => 'Welcome to ClinicQueue'],
            [
                'category' => 'Clinic update',
                'content' => 'Check the clinic hours and services before your visit. Contact the clinic for assistance.',
                'is_published' => false,
            ],
        );
    }
}
