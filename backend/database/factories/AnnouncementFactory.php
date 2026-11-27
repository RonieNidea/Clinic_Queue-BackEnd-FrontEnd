<?php

namespace Database\Factories;

use App\Models\Announcement;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Announcement> */
class AnnouncementFactory extends Factory
{
    /** @return array{title: string, category: string, content: string, is_published: bool, published_at: null} */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(),
            'category' => 'Clinic update',
            'content' => fake()->paragraphs(2, true),
            'is_published' => false,
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_published' => true,
            'published_at' => now(),
        ]);
    }
}
