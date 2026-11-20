<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

#[Fillable([
    'name',
    'service_name',
    'fee',
    'is_active',
])]
class Department extends Model
{
    protected function casts(): array
    {
        return [
            'fee' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Department $department) {
            $department->code = (string) Str::uuid();
        });

        static::updating(function (Department $department) {
            if ($department->isDirty('code')) {
                throw new \LogicException(
                    'The department code cannot be changed.'
                );
            }
        });
    }
}