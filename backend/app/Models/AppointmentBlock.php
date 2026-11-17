<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'department',
    'block_date',
    'start_time',
    'end_time',
    'reason',
    'created_by',
])]
class AppointmentBlock extends Model
{
    protected function casts(): array
    {
        return [
            'block_date' => 'date:Y-m-d',
        ];
    }
}